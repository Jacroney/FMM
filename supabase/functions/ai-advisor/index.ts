import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCorsPreflightRequest, corsJsonResponse } from '../_shared/cors.ts';
import { createSupabaseClient, authenticateUser, sanitizeError } from '../_shared/auth.ts';
import { validateString, validateUuid } from '../_shared/validation.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-ada-002';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface KnowledgeBaseItem {
  id: string;
  content: string;
  content_type: string;
  similarity: number;
  source_metadata: any;
}

// Helper function to generate embedding for a query
async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(OPENAI_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      // SECURITY: Log error server-side only
      console.error('[OPENAI_ERROR] Failed to generate embedding');
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    // SECURITY: Log error server-side only
    console.error('[EMBEDDING_ERROR] Failed in generateQueryEmbedding');
    return null;
  }
}

// Helper function to retrieve relevant context from knowledge base
async function retrieveContext(
  supabase: any,
  chapterId: string,
  queryEmbedding: number[],
  limit: number = 8
): Promise<KnowledgeBaseItem[]> {
  try {
    const { data, error } = await supabase.rpc('search_knowledge_base', {
      p_chapter_id: chapterId,
      p_embedding: queryEmbedding,
      p_content_types: null,
      p_limit: limit,
    });

    if (error) {
      // SECURITY: Log error server-side only
      console.error('[DB_ERROR] Error searching knowledge base');
      return [];
    }

    return data || [];
  } catch (error) {
    // SECURITY: Log error server-side only
    console.error('[CONTEXT_ERROR] Failed in retrieveContext');
    return [];
  }
}

// Helper function to get real-time financial data
async function getRealTimeData(supabase: any, chapterId: string) {
  try {
    // Get current budget summary
    const { data: budgets } = await supabase
      .from('budget_summary')
      .select('*')
      .eq('chapter_id', chapterId)
      .limit(20);

    // Get recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentTransactions } = await supabase
      .from('expense_details')
      .select('*')
      .eq('chapter_id', chapterId)
      .gte('transaction_date', thirtyDaysAgo.toISOString())
      .order('transaction_date', { ascending: false })
      .limit(10);

    // Get bank balance (if Plaid connected)
    const { data: plaidAccounts } = await supabase
      .from('plaid_accounts')
      .select('current_balance, account_name')
      .eq('chapter_id', chapterId)
      .eq('is_active', true);

    const totalBankBalance = plaidAccounts?.reduce(
      (sum: number, acc: any) => sum + (acc.current_balance || 0),
      0
    ) || 0;

    return {
      budgets: budgets || [],
      recentTransactions: recentTransactions || [],
      bankBalance: totalBankBalance,
    };
  } catch (error) {
    // SECURITY: Log error server-side only
    console.error('[DATA_ERROR] Failed to fetch real-time data');
    return { budgets: [], recentTransactions: [], bankBalance: 0 };
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');

  // SECURITY: Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    // SECURITY: Authenticate user and get profile
    const supabase = createSupabaseClient();
    const user = await authenticateUser(req, supabase);

    // SECURITY: Validate input
    const body = await req.json();
    const message = validateString(body.message, 'message', 1, 2000);
    const conversation_id = body.conversation_id ? validateUuid(body.conversation_id, 'conversation_id') : undefined;

    // Get or create conversation
    let conversationId = conversation_id;
    if (!conversationId) {
      const { data: newConversation, error: convError } = await supabase
        .rpc('create_conversation', {
          p_chapter_id: user.chapter_id,
          p_user_id: user.id,
          p_title: null
        });

      if (convError) {
        console.error('[DB_ERROR] Failed to create conversation');
        throw new Error('Failed to create conversation');
      }

      conversationId = newConversation;
    }

    // Get conversation history (last 10 messages)
    const { data: history, error: historyError } = await supabase
      .rpc('get_conversation_history', {
        p_conversation_id: conversationId,
        p_limit: 10
      });

    if (historyError) {
      // SECURITY: Log error server-side only
      console.error('[DB_ERROR] Error fetching conversation history');
    }

    // ============================================================================
    // RAG: RETRIEVE RELEVANT CONTEXT
    // ============================================================================

    // Generate embedding for user query
    const queryEmbedding = await generateQueryEmbedding(message);
    let contextItems: KnowledgeBaseItem[] = [];
    let realTimeData: any = { budgets: [], recentTransactions: [], bankBalance: 0 };

    if (queryEmbedding) {
      // Retrieve relevant context from knowledge base
      contextItems = await retrieveContext(supabase, user.chapter_id, queryEmbedding, 8);
    }

    // Get real-time data
    realTimeData = await getRealTimeData(supabase, user.chapter_id);

    // Assemble context string
    let contextString = '';

    // Add real-time bank balance
    if (realTimeData.bankBalance > 0) {
      contextString += `\n\nCURRENT BANK BALANCE: $${realTimeData.bankBalance.toFixed(2)} (from connected bank accounts)\n`;
    }

    // Add retrieved knowledge base context
    if (contextItems.length > 0) {
      contextString += '\n\nRELEVANT FINANCIAL CONTEXT:\n';
      contextItems.forEach((item, idx) => {
        contextString += `${idx + 1}. [${item.content_type.toUpperCase()}] ${item.content}\n`;
      });
    }

    // Add real-time budget summary (top 5 categories)
    if (realTimeData.budgets.length > 0) {
      contextString += '\n\nCURRENT BUDGET STATUS:\n';
      realTimeData.budgets.slice(0, 5).forEach((b: any) => {
        const status = b.percent_used > 100 ? '⚠️ OVER' : b.percent_used > 80 ? '⚠️ NEAR LIMIT' : '✓';
        contextString += `- ${b.category}: $${b.spent.toFixed(2)} of $${b.allocated.toFixed(2)} (${b.percent_used.toFixed(1)}%) ${status}\n`;
      });
    }

    // Add recent transactions
    if (realTimeData.recentTransactions.length > 0) {
      contextString += '\n\nRECENT TRANSACTIONS (Last 10):\n';
      realTimeData.recentTransactions.forEach((t: any) => {
        const date = new Date(t.transaction_date).toLocaleDateString();
        contextString += `- ${date}: ${t.description} - $${Math.abs(t.amount).toFixed(2)} (${t.category_name})\n`;
      });
    }

    // Build conversation context with enhanced system prompt
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert AI treasurer advisor for a collegiate organization chapter.
Your role is to provide clear, actionable financial guidance and answer questions about budgeting, expenses, and financial management.

Key responsibilities:
- Help with budget planning and tracking
- Explain financial data and patterns
- Provide guidance on best practices
- Alert about potential issues
- Suggest optimizations and improvements

Always be:
- Professional and accurate
- Clear and concise
- Proactive in identifying issues
- Specific with numbers and data
- Helpful and educational

IMPORTANT: Use the financial context provided below to give accurate, data-driven answers. Always reference specific numbers from the context when available.${contextString}

When you don't have enough information from the context, ask clarifying questions or suggest what data would be helpful to answer the question better.`
      }
    ];

    // Add conversation history
    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    // Store user message in database
    const { error: userMsgError } = await supabase
      .rpc('add_message', {
        p_conversation_id: conversationId,
        p_role: 'user',
        p_content: message,
        p_context_used: null,
        p_tokens_used: null,
        p_model: null
      });

    if (userMsgError) {
      // SECURITY: Log error server-side only
      console.error('[DB_ERROR] Error storing user message');
    }

    // Call OpenAI API
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      // SECURITY: Log error server-side only, don't expose details to client
      console.error('[OPENAI_ERROR] AI response failed');
      return corsJsonResponse(
        { error: 'Failed to get AI response' },
        openaiResponse.status,
        origin
      );
    }

    const aiData = await openaiResponse.json();
    const aiMessage = aiData.choices[0].message.content;
    const tokensUsed = aiData.usage?.total_tokens || 0;

    // Store AI response in database with context metadata
    const contextMetadata = {
      retrieved_items: contextItems.length,
      context_types: contextItems.map(item => item.content_type),
      bank_balance: realTimeData.bankBalance,
      budgets_included: realTimeData.budgets.length,
      transactions_included: realTimeData.recentTransactions.length,
    };

    const { error: aiMsgError } = await supabase
      .rpc('add_message', {
        p_conversation_id: conversationId,
        p_role: 'assistant',
        p_content: aiMessage,
        p_context_used: contextMetadata,
        p_tokens_used: tokensUsed,
        p_model: 'gpt-3.5-turbo'
      });

    if (aiMsgError) {
      // SECURITY: Log error server-side only
      console.error('[DB_ERROR] Error storing AI message');
    }

    // SECURITY: Return only necessary data to client
    return corsJsonResponse(
      {
        message: aiMessage,
        conversation_id: conversationId,
        tokens_used: tokensUsed,
      },
      200,
      origin
    );
  } catch (error) {
    // SECURITY: Sanitize error for client response
    const { error: errorMessage, statusCode } = sanitizeError(error);
    return corsJsonResponse({ error: errorMessage }, statusCode, origin);
  }
});

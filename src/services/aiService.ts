import { supabase } from './supabaseClient';
import { isDemoModeEnabled } from '../utils/env';
import { demoHelpers } from '../demo/demoStore';

type DemoInsightState = {
  insights: AIInsight[];
  read: Set<string>;
  dismissed: Set<string>;
};

const demoInsightTemplates: Omit<AIInsight, 'id' | 'created_at'>[] = [
  {
    insight_type: 'forecast',
    title: 'Cash runway remains healthy',
    description: 'Current runway covers projected expenses for the next 5.5 months. Staying above 4 months helps maintain a strong safety buffer.',
    priority: 'medium',
    suggested_actions: [
      { text: 'Schedule a midpoint budget review with exec board.' }
    ]
  },
  {
    insight_type: 'budget_warning',
    title: 'Events budget trending 12% over plan',
    description: 'Event spending reached $8.4K vs. a $7.5K target for the semester. Catering and production costs were the primary drivers.',
    priority: 'high',
    suggested_actions: [
      { text: 'Freeze non-essential event purchases for 2 weeks.' },
      { text: 'Renegotiate vendor pricing for upcoming formal.' }
    ]
  },
  {
    insight_type: 'anomaly',
    title: 'Stripe processing fees spiked week-over-week',
    description: 'Fees increased 38% compared with last month due to higher credit card intake for dues.',
    priority: 'medium',
    suggested_actions: [
      { text: 'Encourage ACH payments in next member update.' }
    ]
  },
  {
    insight_type: 'alert',
    title: 'Leadership retreat invoice unpaid after 21 days',
    description: 'A $1,200 reimbursement is still pending. Paying after 30 days may incur a late fee.',
    priority: 'urgent',
    suggested_actions: [
      { text: 'Reach out to finance chair to finalize reimbursement.' }
    ]
  }
];

const demoInsightState: Record<string, DemoInsightState> = {};

const createDemoInsights = (chapterId: string): AIInsight[] =>
  demoInsightTemplates.map((template, index) => ({
    ...template,
    id: `${chapterId}-demo-insight-${index + 1}`,
    created_at: new Date(Date.now() - index * 2 * 60 * 60 * 1000).toISOString()
  }));

const ensureDemoInsightState = (chapterId: string): DemoInsightState => {
  if (!demoInsightState[chapterId]) {
    demoInsightState[chapterId] = {
      insights: createDemoInsights(chapterId),
      read: new Set(),
      dismissed: new Set()
    };
  }
  return demoInsightState[chapterId];
};

const resetDemoInsights = (chapterId: string) => {
  demoInsightState[chapterId] = {
    insights: createDemoInsights(chapterId),
    read: new Set(),
    dismissed: new Set()
  };
};

const buildDemoBreakdown = (insights: AIInsight[]) => {
  return insights.reduce(
    (acc, insight) => {
      switch (insight.insight_type) {
        case 'budget_warning':
          acc.budget_warnings += 1;
          break;
        case 'alert':
          acc.alerts += 1;
          break;
        case 'anomaly':
          acc.anomalies += 1;
          break;
        case 'forecast':
          acc.forecasts += 1;
          break;
        default:
          acc.recommendations += 1;
          break;
      }
      return acc;
    },
    {
      budget_warnings: 0,
      alerts: 0,
      anomalies: 0,
      forecasts: 0,
      recommendations: 0,
      optimizations: 0
    }
  );
};

type DemoConversation = {
  id: string;
  chapterId: string;
  title: string;
  messages: AIMessage[];
  started_at: string;
  last_message_at: string;
  message_count: number;
};

const demoConversations: Record<string, DemoConversation[]> = {};
const demoKnowledgeBaseStats: Record<string, {
  total: number;
  by_type: Record<string, number>;
  last_updated: string | null;
}> = {};

const createDemoKnowledgeStats = () => {
  const now = new Date().toISOString();
  return {
    total: 128,
    by_type: {
      transactions: 42,
      budgets: 28,
      documents: 18,
      reconciliations: 16,
      events: 24
    } as Record<string, number>,
    last_updated: now
  };
};

const ensureDemoKnowledgeStats = (chapterId: string) => {
  if (!demoKnowledgeBaseStats[chapterId]) {
    demoKnowledgeBaseStats[chapterId] = createDemoKnowledgeStats();
  }
  return demoKnowledgeBaseStats[chapterId];
};

const refreshDemoKnowledgeStats = (chapterId: string, forceReset: boolean) => {
  if (forceReset || !demoKnowledgeBaseStats[chapterId]) {
    demoKnowledgeBaseStats[chapterId] = createDemoKnowledgeStats();
    return { stats: demoKnowledgeBaseStats[chapterId], added: demoKnowledgeBaseStats[chapterId].total };
  }

  const current = demoKnowledgeBaseStats[chapterId];
  const deltas: Record<string, number> = {};
  Object.keys(current.by_type).forEach((key) => {
    const change = Math.floor(Math.random() * 3); // 0-2 new items per category
    deltas[key] = change;
    current.by_type[key] += change;
  });
  const added = Object.values(deltas).reduce((sum, val) => sum + val, 0);
  current.total += added;
  current.last_updated = new Date().toISOString();
  return { stats: current, added };
};

const createInitialDemoConversation = (chapterId: string): DemoConversation => {
  const now = new Date();
  const assistantMessage: AIMessage = {
    id: demoHelpers.nextId(),
    role: 'assistant',
    content: 'Welcome back! I can help summarize your bank balances, spending trends, or suggests next steps for dues collection. What would you like to review first?',
    created_at: now.toISOString(),
    tokens_used: 65
  };

  return {
    id: `${chapterId}-demo-conv-1`,
    chapterId,
    title: 'Getting started',
    messages: [assistantMessage],
    started_at: now.toISOString(),
    last_message_at: now.toISOString(),
    message_count: 1
  };
};

const ensureDemoConversations = (chapterId: string): DemoConversation[] => {
  if (!demoConversations[chapterId]) {
    demoConversations[chapterId] = [createInitialDemoConversation(chapterId)];
  }
  return demoConversations[chapterId];
};

const findDemoConversation = (conversationId: string): DemoConversation | undefined => {
  return Object.values(demoConversations)
    .flat()
    .find(conv => conv.id === conversationId);
};

const generateDemoAIResponse = (userMessage: string): { message: string; tokens: number } => {
  const lower = userMessage.toLowerCase();

  if (lower.includes('budget')) {
    return {
      message: 'Your events budget is currently at 70% usage while operations sits at 62%. I recommend pausing discretionary event purchases for two weeks to stay within plan.',
      tokens: 78
    };
  }

  if (lower.includes('dues') || lower.includes('collection')) {
    return {
      message: 'Dues collection is at 82% for Winter 2025. Sending a reminder to the six overdue members could recover $3,150 within the next week.',
      tokens: 72
    };
  }

  if (lower.includes('cash') || lower.includes('runway')) {
    return {
      message: 'With the current cash position of $39.5K, you have roughly 5.5 months of runway assuming the recent spending pace continues. Keeping it above four months maintains a healthy buffer.',
      tokens: 79
    };
  }

  if (lower.includes('trend') || lower.includes('spend')) {
    return {
      message: 'Spending spiked the week of June 10th due to the leadership retreat and catering invoices. Otherwise, weekly burn has averaged $2.1K—right on target.',
      tokens: 80
    };
  }

  return {
    message: 'I can review budgets, dues, cash flow, or create action items. For example, ask “Where did we overspend this month?” or “How can we improve collections?”',
    tokens: 68
  };
};

const createDemoConversation = (chapterId: string, title?: string): DemoConversation => {
  const id = demoHelpers.nextId();
  const now = new Date().toISOString();
  const conversation: DemoConversation = {
    id,
    chapterId,
    title: title || 'New conversation',
    messages: [],
    started_at: now,
    last_message_at: now,
    message_count: 0
  };
  const store = ensureDemoConversations(chapterId);
  store.unshift(conversation);
  return conversation;
};

const upsertDemoMessages = (
  conversation: DemoConversation,
  messages: AIMessage[]
) => {
  conversation.messages.push(...messages);
  conversation.last_message_at = messages[messages.length - 1]?.created_at ?? conversation.last_message_at;
  conversation.message_count = conversation.messages.length;
};

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens_used?: number;
}

export interface AIConversation {
  id: string;
  title: string | null;
  started_at: string;
  last_message_at: string;
  message_count: number;
}

export interface AISendMessageResponse {
  message: string;
  conversation_id: string;
  tokens_used: number;
}

export interface AIInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  suggested_actions?: any;
  related_data?: any;
}

export class AIService {
  /**
   * Generate embeddings for the knowledge base
   */
  static async generateEmbeddings(chapterId: string, forceRefresh: boolean = false): Promise<any> {
    try {
      if (isDemoModeEnabled()) {
        const currentStats = ensureDemoKnowledgeStats(chapterId);
        const previousTotal = forceRefresh ? 0 : currentStats.total;
        const { stats, added } = refreshDemoKnowledgeStats(chapterId, forceRefresh);
        return {
          success: true,
          chapter_id: chapterId,
          embeddings_created: Math.max(added ?? stats.total - previousTotal, 0),
          knowledge_base: stats
        };
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embeddings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chapter_id: chapterId,
            force_refresh: forceRefresh
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate embeddings');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate insights for a chapter
   */
  static async generateInsights(chapterId: string, clearExisting: boolean = false): Promise<any> {
    try {
      if (isDemoModeEnabled()) {
        if (clearExisting || !demoInsightState[chapterId]) {
          resetDemoInsights(chapterId);
        } else {
          // Refresh timestamps to simulate new analysis
          const state = ensureDemoInsightState(chapterId);
          state.insights = createDemoInsights(chapterId);
          state.read.clear();
          state.dismissed.clear();
        }

        const state = ensureDemoInsightState(chapterId);
        const activeInsights = state.insights.filter(
          insight => !state.dismissed.has(insight.id)
        );

        return {
          success: true,
          chapter_id: chapterId,
          insights_generated: activeInsights.length,
          breakdown: buildDemoBreakdown(activeInsights)
        };
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-insights`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chapter_id: chapterId,
            clear_existing: clearExisting
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate insights');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  /**
   * Get knowledge base statistics
   */
  static async getKnowledgeBaseStats(chapterId: string): Promise<any> {
    try {
      if (isDemoModeEnabled()) {
        const stats = ensureDemoKnowledgeStats(chapterId);
        return stats;
      }

      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('content_type, created_at')
        .eq('chapter_id', chapterId);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        by_type: {} as Record<string, number>,
        last_updated: data && data.length > 0
          ? new Date(Math.max(...data.map(d => new Date(d.created_at).getTime())))
          : null,
      };

      data?.forEach(item => {
        stats.by_type[item.content_type] = (stats.by_type[item.content_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching knowledge base stats:', error);
      throw error;
    }
  }

  /**
   * Send a message to the AI advisor
   */
  static async sendMessage(
    message: string,
    conversationId?: string
  ): Promise<AISendMessageResponse> {
    try {
      if (isDemoModeEnabled()) {
        const chapterId = demoHelpers.chapterId;
        const conversations = ensureDemoConversations(chapterId);

        let conversation = conversationId
          ? findDemoConversation(conversationId)
          : undefined;

        if (!conversation) {
          conversation = createDemoConversation(chapterId, this.generateConversationTitle(message));
          conversationId = conversation.id;
        }

        const now = new Date();
        const userMessage: AIMessage = {
          id: demoHelpers.nextId(),
          role: 'user',
          content: message,
          created_at: now.toISOString()
        };

        const aiResponse = generateDemoAIResponse(message);
        const assistantMessage: AIMessage = {
          id: demoHelpers.nextId(),
          role: 'assistant',
          content: aiResponse.message,
          created_at: new Date(now.getTime() + 500).toISOString(),
          tokens_used: aiResponse.tokens
        };

        upsertDemoMessages(conversation, [userMessage, assistantMessage]);
        conversation.message_count = conversation.messages.length;

        // keep store sorted by activity
        const index = conversations.findIndex(conv => conv.id === conversation!.id);
        if (index > 0) {
          conversations.splice(index, 1);
          conversations.unshift(conversation!);
        }

        return {
          message: assistantMessage.content,
          conversation_id: conversation.id,
          tokens_used: assistantMessage.tokens_used ?? 0
        };
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            conversation_id: conversationId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for the current user's chapter
   */
  static async getConversations(chapterId: string): Promise<AIConversation[]> {
    try {
      if (isDemoModeEnabled()) {
        const conversations = ensureDemoConversations(chapterId);
        return conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          started_at: conv.started_at,
          last_message_at: conv.last_message_at,
          message_count: conv.messages.length
        }));
      }

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  /**
   * Get messages for a specific conversation
   */
  static async getConversationMessages(conversationId: string): Promise<AIMessage[]> {
    try {
      if (isDemoModeEnabled()) {
        const conversation = findDemoConversation(conversationId);
        return conversation ? [...conversation.messages] : [];
      }

      const { data, error } = await supabase
        .rpc('get_conversation_history', {
          p_conversation_id: conversationId,
          p_limit: 100
        });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  static async createConversation(
    chapterId: string,
    userId: string,
    title?: string
  ): Promise<string> {
    try {
      if (isDemoModeEnabled()) {
        const conversation = createDemoConversation(chapterId, title);
        return conversation.id;
      }

      const { data, error } = await supabase
        .rpc('create_conversation', {
          p_chapter_id: chapterId,
          p_user_id: userId,
          p_title: title
        });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation (mark as inactive)
   */
  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      if (isDemoModeEnabled()) {
        Object.keys(demoConversations).forEach(chapterId => {
          demoConversations[chapterId] = demoConversations[chapterId].filter(
            conv => conv.id !== conversationId
          );
        });
        return;
      }

      const { error } = await supabase
        .from('ai_conversations')
        .update({ is_active: false })
        .eq('id', conversationId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  /**
   * Update conversation title
   */
  static async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    try {
      if (isDemoModeEnabled()) {
        const conversation = findDemoConversation(conversationId);
        if (conversation) {
          conversation.title = title;
        }
        return;
      }

      const { error } = await supabase
        .from('ai_conversations')
        .update({ title })
        .eq('id', conversationId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  }

  /**
   * Submit feedback for a message
   */
  static async submitMessageFeedback(
    messageId: string,
    rating: number,
    feedbackText?: string,
    wasHelpful?: boolean
  ): Promise<void> {
    try {
      if (isDemoModeEnabled()) {
        return;
      }

      const { error } = await supabase
        .from('ai_messages')
        .update({
          feedback_rating: rating,
          feedback_text: feedbackText,
          was_helpful: wasHelpful,
        })
        .eq('id', messageId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Get unread AI insights for a chapter
   */
  static async getUnreadInsights(chapterId: string): Promise<AIInsight[]> {
    try {
      if (isDemoModeEnabled()) {
        const state = ensureDemoInsightState(chapterId);
        return state.insights.filter(
          insight =>
            !state.dismissed.has(insight.id) &&
            !state.read.has(insight.id)
        );
      }

      const { data, error } = await supabase
        .rpc('get_unread_insights', {
          p_chapter_id: chapterId
        });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching insights:', error);
      throw error;
    }
  }

  /**
   * Mark insight as read
   */
  static async markInsightAsRead(insightId: string): Promise<void> {
    try {
      if (isDemoModeEnabled()) {
        const chapterEntry = Object.values(demoInsightState).find(state =>
          state.insights.some(insight => insight.id === insightId)
        );

        if (chapterEntry) {
          chapterEntry.read.add(insightId);
        }
        return;
      }

      const { error } = await supabase
        .from('ai_insights')
        .update({ is_read: true })
        .eq('id', insightId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error marking insight as read:', error);
      throw error;
    }
  }

  /**
   * Dismiss an insight
   */
  static async dismissInsight(insightId: string): Promise<void> {
    try {
      if (isDemoModeEnabled()) {
        const chapterEntry = Object.values(demoInsightState).find(state =>
          state.insights.some(insight => insight.id === insightId)
        );

        if (chapterEntry) {
          chapterEntry.dismissed.add(insightId);
          chapterEntry.read.delete(insightId);
        }
        return;
      }

      const { error } = await supabase
        .from('ai_insights')
        .update({ is_dismissed: true })
        .eq('id', insightId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error dismissing insight:', error);
      throw error;
    }
  }

  /**
   * Generate a conversation title from the first message
   */
  static generateConversationTitle(firstMessage: string): string {
    // Take first 50 characters and truncate at word boundary
    const truncated = firstMessage.substring(0, 50);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }
}

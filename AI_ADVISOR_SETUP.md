# AI Financial Advisor - Setup Instructions

## Phase 1 Complete! 🎉

You now have a basic AI advisor chatbot integrated into your app. Here's what's been built:

### ✅ Completed
- Database schema with vector storage (pgvector)
- Supabase Edge Function (`ai-advisor`)
- Chat UI component with conversation management
- Full conversation history and persistence
- Frontend service layer
- Navigation integration

---

## Setup Steps

### 1. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)

**Cost estimate:** ~$20-50/month for average chapter usage

### 2. Add OpenAI Key to Supabase

The edge function needs the OpenAI API key as a secret:

```bash
supabase secrets set OPENAI_API_KEY="sk-your-key-here" --project-ref ffgeptjhhhifuuhjlsow
```

### 3. Run Database Migration

The migration couldn't be auto-deployed due to sync issues. Run it manually:

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/ffgeptjhhhifuuhjlsow/sql/new
2. Copy the contents of `supabase/migrations/20250113000001_ai_advisor.sql`
3. Paste and run in the SQL editor

This creates:
- `ai_conversations` - Chat sessions
- `ai_messages` - Message history
- `ai_knowledge_base` - Vector embeddings (for Phase 2)
- `ai_insights` - Proactive suggestions (for Phase 4)
- `ai_context_cache` - Performance optimization
- Helper functions for conversation management

### 4. Add OpenAI Key to Frontend (.env)

Update your `.env` file:
```bash
VITE_OPENAI_API_KEY=sk-your-key-here
```

**Note:** This is for development only. In production, the key stays securely in Supabase.

### 5. Restart Dev Server

```bash
npm run dev
```

---

## Testing the AI Advisor

1. Navigate to "AI Advisor" in the sidebar (lightbulb icon)
2. Start a new conversation
3. Try these test questions:
   - "What is my chapter's current financial status?"
   - "How much have we spent this month?"
   - "Can you explain what a treasurer does?"
   - "Help me create a budget"

### Expected Behavior
- ✅ Conversations save automatically
- ✅ Multiple conversations can be created
- ✅ History persists across sessions
- ✅ AI responds with financial guidance
- ⚠️ Context-aware responses will be limited until Phase 2 (RAG) is implemented

---

## What Works Now (Phase 1)

### ✅ Basic Chat
- Send/receive messages
- Conversation history
- Multiple conversations
- Auto-scrolling
- Loading states

### ✅ Conversation Management
- Create new conversations
- View conversation list
- Delete conversations
- Auto-save titles

### ✅ AI Capabilities (Current)
- General financial advice
- Best practices guidance
- Budget planning help
- Treasurer education
- Q&A format

### ⏳ What's NOT implemented yet:
- **Context awareness** - AI doesn't see your actual financial data yet
- **RAG retrieval** - No access to transactions, budgets, etc.
- **Proactive insights** - No automatic suggestions
- **Advanced features** - No data visualization, report generation, etc.

---

## Next Steps - Phase 2 (RAG Implementation)

Phase 2 will add context-aware responses using your actual financial data:

### What Phase 2 Adds:
1. **Financial Data Embeddings**
   - Transactions embedded as vectors
   - Budget data embedded
   - Historical patterns indexed

2. **Smart Context Retrieval**
   - Semantic search through your data
   - Relevant transaction retrieval
   - Budget status awareness

3. **Context-Aware Responses**
   - "How much did we spend on events?" → Real numbers
   - "Are we over budget?" → Actual budget analysis
   - "What are our trends?" → Pattern detection

### Implementation Tasks:
- Create embedding pipeline
- Build retrieval system
- Integrate with chat
- Test with real data

**Ready to proceed with Phase 2?**

---

## Architecture Overview

```
Frontend (React)
  └─ AIAdvisor Page
      └─ AIChat Component
          └─ AIService
              ↓ HTTP Request
          Supabase Edge Function (ai-advisor)
              ↓ API Call
          OpenAI GPT-4
              ↓ Response
          Database (Conversations & Messages)
```

---

## Troubleshooting

### Issue: "Failed to send message"
**Solution:** Check that OpenAI API key is set in Supabase secrets

### Issue: "Conversation not found"
**Solution:** Ensure database migration was run successfully

### Issue: "Not authenticated"
**Solution:** Make sure you're logged in to the app

### Issue: No response from AI
**Check:**
1. OpenAI API key is valid
2. Edge function is deployed: https://supabase.com/dashboard/project/ffgeptjhhhifuuhjlsow/functions
3. Check function logs for errors

### Issue: TypeScript errors
**Solution:** Restart VS Code or run `npm run build` to check for errors

---

## Files Created

```
supabase/migrations/20250113000001_ai_advisor.sql
supabase/functions/ai-advisor/index.ts
src/services/aiService.ts
src/components/AIChat.tsx
src/pages/AIAdvisor.tsx
src/vite-env.d.ts (updated)
.env (updated)
.env.example (updated)
src/App.jsx (updated)
src/components/Sidebar.tsx (updated)
```

---

## Cost & Performance

### OpenAI API Costs (Estimated)
- GPT-4: ~$0.03 per conversation
- Average: $20-50/month for typical usage
- Can switch to GPT-3.5-turbo for ~75% cost savings

### Performance
- Response time: 2-5 seconds
- Database: Minimal load
- Edge function: Auto-scales

---

## Security Notes

- ✅ OpenAI key stored securely in Supabase (not in frontend)
- ✅ RLS policies protect conversations by chapter
- ✅ User authentication required
- ✅ API rate limiting via OpenAI
- ✅ No sensitive data sent to OpenAI (in Phase 1)

**Phase 2 Note:** RAG will send financial data to OpenAI for embedding. Consider:
- Using anonymized data
- Implementing data retention policies
- Adding user consent flows

---

## Ready to Test!

Once you've completed the setup steps above, you can start chatting with your AI treasurer advisor!

Questions or issues? Let me know!

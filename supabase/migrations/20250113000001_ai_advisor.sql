-- ============================================================================
-- AI FINANCIAL ADVISOR - Database Schema
-- ============================================================================
-- Supports AI-powered financial advice with RAG and conversation history
-- ============================================================================

-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. AI CONVERSATIONS TABLE
-- ============================================================================
-- Stores chat sessions between users and the AI advisor
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- Auto-generated from first message
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb -- Store conversation context/settings
);

CREATE INDEX ai_conversations_chapter_idx ON ai_conversations(chapter_id);
CREATE INDEX ai_conversations_user_idx ON ai_conversations(user_id);
CREATE INDEX ai_conversations_last_message_idx ON ai_conversations(last_message_at DESC);

COMMENT ON TABLE ai_conversations IS 'Chat sessions with the AI financial advisor';

-- ============================================================================
-- 2. AI MESSAGES TABLE
-- ============================================================================
-- Stores individual messages in conversations
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Context used for this message
  context_used JSONB, -- What data was retrieved for RAG
  tokens_used INTEGER, -- Track API usage
  model TEXT, -- Which model was used (e.g., 'gpt-4', 'gpt-3.5-turbo')

  -- Feedback and quality
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_text TEXT,
  was_helpful BOOLEAN,

  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX ai_messages_conversation_idx ON ai_messages(conversation_id);
CREATE INDEX ai_messages_created_at_idx ON ai_messages(created_at DESC);
CREATE INDEX ai_messages_role_idx ON ai_messages(role);

COMMENT ON TABLE ai_messages IS 'Individual messages in AI advisor conversations';

-- ============================================================================
-- 3. AI KNOWLEDGE BASE (Vector Store)
-- ============================================================================
-- Stores embeddings of financial data and best practices for RAG
CREATE TABLE ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,

  -- Content and embedding
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embeddings are 1536 dimensions

  -- Classification
  content_type TEXT NOT NULL CHECK (content_type IN (
    'transaction', 'budget', 'category', 'recurring',
    'insight', 'best_practice', 'policy', 'faq'
  )),

  -- Source tracking
  source_table TEXT, -- e.g., 'expenses', 'budget_allocations'
  source_id UUID, -- Reference to original record
  source_metadata JSONB, -- Additional context from source

  -- Timestamps and freshness
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,

  metadata JSONB DEFAULT '{}'::jsonb
);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor)
CREATE INDEX ai_knowledge_base_embedding_idx ON ai_knowledge_base
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX ai_knowledge_base_chapter_idx ON ai_knowledge_base(chapter_id);
CREATE INDEX ai_knowledge_base_type_idx ON ai_knowledge_base(content_type);
CREATE INDEX ai_knowledge_base_active_idx ON ai_knowledge_base(is_active) WHERE is_active = true;

COMMENT ON TABLE ai_knowledge_base IS 'Vector embeddings for RAG-powered AI advisor';

-- ============================================================================
-- 4. AI CONTEXT CACHE
-- ============================================================================
-- Cache frequently accessed context to reduce embedding lookups
CREATE TABLE ai_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  cache_key TEXT NOT NULL, -- Hash of query/context
  context_data JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  accessed_at TIMESTAMPTZ DEFAULT now(),
  access_count INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ,

  UNIQUE(chapter_id, cache_key)
);

CREATE INDEX ai_context_cache_chapter_key_idx ON ai_context_cache(chapter_id, cache_key);
CREATE INDEX ai_context_cache_expires_idx ON ai_context_cache(expires_at);

COMMENT ON TABLE ai_context_cache IS 'Cache for frequently accessed AI context data';

-- ============================================================================
-- 5. AI INSIGHTS (Proactive Suggestions)
-- ============================================================================
-- Store generated insights for proactive advisor features
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'budget_warning', 'anomaly', 'optimization', 'forecast',
    'pattern', 'recommendation', 'alert'
  )),

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Associated data
  related_data JSONB, -- Links to transactions, budgets, etc.
  suggested_actions JSONB, -- Array of action suggestions

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  is_acted_on BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- Auto-dismiss after date

  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX ai_insights_chapter_idx ON ai_insights(chapter_id);
CREATE INDEX ai_insights_type_idx ON ai_insights(insight_type);
CREATE INDEX ai_insights_priority_idx ON ai_insights(priority);
CREATE INDEX ai_insights_unread_idx ON ai_insights(is_read) WHERE is_read = false;
CREATE INDEX ai_insights_created_idx ON ai_insights(created_at DESC);

COMMENT ON TABLE ai_insights IS 'Proactive insights generated by AI advisor';

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Conversations: users can only access their chapter's conversations
DROP POLICY IF EXISTS ai_conversations_policy ON ai_conversations;
CREATE POLICY ai_conversations_policy ON ai_conversations
  FOR ALL
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Messages: access through conversation ownership
DROP POLICY IF EXISTS ai_messages_policy ON ai_messages;
CREATE POLICY ai_messages_policy ON ai_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM ai_conversations
      WHERE chapter_id IN (
        SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_conversations
      WHERE chapter_id IN (
        SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Knowledge base: chapter-scoped
DROP POLICY IF EXISTS ai_knowledge_base_policy ON ai_knowledge_base;
CREATE POLICY ai_knowledge_base_policy ON ai_knowledge_base
  FOR ALL
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Context cache: chapter-scoped
DROP POLICY IF EXISTS ai_context_cache_policy ON ai_context_cache;
CREATE POLICY ai_context_cache_policy ON ai_context_cache
  FOR ALL
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Insights: chapter-scoped
DROP POLICY IF EXISTS ai_insights_policy ON ai_insights;
CREATE POLICY ai_insights_policy ON ai_insights
  FOR ALL
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to search knowledge base with vector similarity
CREATE OR REPLACE FUNCTION search_knowledge_base(
  p_chapter_id UUID,
  p_embedding vector(1536),
  p_content_types TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  similarity FLOAT,
  source_metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.content_type,
    1 - (kb.embedding <=> p_embedding) as similarity,
    kb.source_metadata
  FROM ai_knowledge_base kb
  WHERE kb.chapter_id = p_chapter_id
    AND kb.is_active = true
    AND (p_content_types IS NULL OR kb.content_type = ANY(p_content_types))
  ORDER BY kb.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation history
CREATE OR REPLACE FUNCTION get_conversation_history(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  tokens_used INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.role,
    m.content,
    m.created_at,
    m.tokens_used
  FROM ai_messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new conversation
CREATE OR REPLACE FUNCTION create_conversation(
  p_chapter_id UUID,
  p_user_id UUID,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  INSERT INTO ai_conversations (chapter_id, user_id, title)
  VALUES (p_chapter_id, p_user_id, p_title)
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add message to conversation
CREATE OR REPLACE FUNCTION add_message(
  p_conversation_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_context_used JSONB DEFAULT NULL,
  p_tokens_used INTEGER DEFAULT NULL,
  p_model TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO ai_messages (
    conversation_id,
    role,
    content,
    context_used,
    tokens_used,
    model
  )
  VALUES (
    p_conversation_id,
    p_role,
    p_content,
    p_context_used,
    p_tokens_used,
    p_model
  )
  RETURNING id INTO v_message_id;

  -- Update conversation metadata
  UPDATE ai_conversations
  SET
    last_message_at = now(),
    message_count = message_count + 1
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread insights
CREATE OR REPLACE FUNCTION get_unread_insights(p_chapter_id UUID)
RETURNS TABLE (
  id UUID,
  insight_type TEXT,
  title TEXT,
  description TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ,
  suggested_actions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.insight_type,
    i.title,
    i.description,
    i.priority,
    i.created_at,
    i.suggested_actions
  FROM ai_insights i
  WHERE i.chapter_id = p_chapter_id
    AND i.is_read = false
    AND i.is_dismissed = false
    AND (i.expires_at IS NULL OR i.expires_at > now())
  ORDER BY
    CASE i.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for knowledge base
CREATE OR REPLACE FUNCTION update_ai_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_knowledge_base_updated_at_trigger ON ai_knowledge_base;
CREATE TRIGGER ai_knowledge_base_updated_at_trigger
  BEFORE UPDATE ON ai_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_knowledge_base_updated_at();

-- Auto-update accessed_at for context cache
CREATE OR REPLACE FUNCTION update_ai_context_cache_accessed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.accessed_at = now();
  NEW.access_count = NEW.access_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_context_cache_accessed_trigger ON ai_context_cache;
CREATE TRIGGER ai_context_cache_accessed_trigger
  BEFORE UPDATE ON ai_context_cache
  FOR EACH ROW
  WHEN (OLD.context_data IS DISTINCT FROM NEW.context_data)
  EXECUTE FUNCTION update_ai_context_cache_accessed_at();

-- ============================================================================
-- DONE!
-- ============================================================================

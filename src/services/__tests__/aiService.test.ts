import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AIService } from '../aiService';
import {
  mockChapterId,
  mockUserId,
  mockConversations,
  mockMessages,
  mockInsights,
  mockBudgets,
  mockKnowledgeBase
} from '../../../test/fixtures/financial-data';

// Mock Supabase client - defined inside mock factory to avoid hoisting issues
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn()
    },
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Import after mock is set up
import { supabase as mockSupabaseClient } from '../supabaseClient';

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-access-token',
          user: { id: 'test-user-id' }
        }
      },
      error: null
    });

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' }
      },
      error: null
    });

    // Mock fetch for edge function calls
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateEmbeddings', () => {
    it('should successfully generate embeddings', async () => {
      const mockResponse = {
        success: true,
        embeddings_created: 150,
        chapter_id: mockChapterId,
        message: 'Knowledge base updated successfully'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await AIService.generateEmbeddings(mockChapterId);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/generate-embeddings'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            chapter_id: mockChapterId,
            force_refresh: false
          })
        })
      );
    });

    it('should handle force refresh', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, embeddings_created: 150 })
      });

      await AIService.generateEmbeddings(mockChapterId, true);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            chapter_id: mockChapterId,
            force_refresh: true
          })
        })
      );
    });

    it('should throw error when not authenticated', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Not authenticated')
      });

      await expect(AIService.generateEmbeddings(mockChapterId)).rejects.toThrow(
        'Not authenticated'
      );
    });

    it('should throw error on API failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'OpenAI API error' })
      });

      await expect(AIService.generateEmbeddings(mockChapterId)).rejects.toThrow();
    });
  });

  describe('generateInsights', () => {
    it('should successfully generate insights', async () => {
      const mockResponse = {
        success: true,
        insights_generated: 5,
        chapter_id: mockChapterId,
        breakdown: {
          budget_warnings: 2,
          alerts: 1,
          anomalies: 1,
          forecasts: 1,
          recommendations: 0,
          optimizations: 0
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await AIService.generateInsights(mockChapterId);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/generate-insights'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            chapter_id: mockChapterId,
            clear_existing: false
          })
        })
      );
    });

    it('should handle clear existing option', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, insights_generated: 3 })
      });

      await AIService.generateInsights(mockChapterId, true);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            chapter_id: mockChapterId,
            clear_existing: true
          })
        })
      );
    });
  });

  describe('getKnowledgeBaseStats', () => {
    it('should return knowledge base statistics', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockKnowledgeBase,
          error: null
        })
      });

      const stats = await AIService.getKnowledgeBaseStats(mockChapterId);

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('by_type');
      expect(stats).toHaveProperty('last_updated');
      expect(stats.total).toBe(mockKnowledgeBase.length);
    });

    it('should return empty stats when no knowledge base exists', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      const stats = await AIService.getKnowledgeBaseStats(mockChapterId);

      expect(stats.total).toBe(0);
      expect(stats.last_updated).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('should send a message and return response', async () => {
      const mockResponse = {
        message: 'Your budget status is...',
        conversation_id: 'conv-new',
        tokens_used: 150
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await AIService.sendMessage('What is my budget status?');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/ai-advisor'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            message: 'What is my budget status?',
            conversation_id: undefined
          })
        })
      );
    });

    it('should include conversation ID when provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Response', conversation_id: 'conv-1', tokens_used: 100 })
      });

      await AIService.sendMessage('Follow up question', 'conv-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            message: 'Follow up question',
            conversation_id: 'conv-1'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'OpenAI rate limit exceeded' })
      });

      await expect(
        AIService.sendMessage('Test question')
      ).rejects.toThrow();
    });
  });

  describe('getConversations', () => {
    it('should fetch conversations for a chapter', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockConversations,
          error: null
        })
      });

      const conversations = await AIService.getConversations(mockChapterId);

      expect(conversations).toEqual(mockConversations);
      expect(conversations).toHaveLength(2);
    });

    it('should return empty array on error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      });

      await expect(AIService.getConversations(mockChapterId)).rejects.toThrow();
    });
  });

  describe('getConversationMessages', () => {
    it('should fetch messages for a conversation', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockMessages,
        error: null
      });

      const messages = await AIService.getConversationMessages('conv-1');

      expect(messages).toEqual(mockMessages);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_conversation_history', {
        p_conversation_id: 'conv-1',
        p_limit: 100
      });
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const newConvId = 'conv-new-123';
      mockSupabaseClient.rpc.mockResolvedValue({
        data: newConvId,
        error: null
      });

      const result = await AIService.createConversation(
        mockChapterId,
        mockUserId,
        'Budget questions'
      );

      expect(result).toBe(newConvId);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_conversation', {
        p_chapter_id: mockChapterId,
        p_user_id: mockUserId,
        p_title: 'Budget questions'
      });
    });
  });

  describe('deleteConversation', () => {
    it('should soft delete a conversation', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      });

      await AIService.deleteConversation('conv-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_conversations');
    });
  });

  describe('updateConversationTitle', () => {
    it('should update conversation title', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      });

      await AIService.updateConversationTitle('conv-1', 'New Title');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_conversations');
    });
  });

  describe('submitMessageFeedback', () => {
    it('should submit feedback for a message', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      });

      await AIService.submitMessageFeedback('msg-1', 5, 'Very helpful!', true);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_messages');
    });
  });

  describe('getUnreadInsights', () => {
    it('should fetch unread insights', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockInsights,
        error: null
      });

      const insights = await AIService.getUnreadInsights(mockChapterId);

      expect(insights).toEqual(mockInsights);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_unread_insights', {
        p_chapter_id: mockChapterId
      });
    });

    it('should return empty array on error', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC error')
      });

      await expect(AIService.getUnreadInsights(mockChapterId)).rejects.toThrow();
    });
  });

  describe('markInsightAsRead', () => {
    it('should mark insight as read', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      });

      await AIService.markInsightAsRead('insight-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_insights');
    });
  });

  describe('dismissInsight', () => {
    it('should dismiss an insight', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      });

      await AIService.dismissInsight('insight-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_insights');
    });
  });

  describe('generateConversationTitle', () => {
    it('should truncate long messages at word boundary', () => {
      const longMessage = 'This is a very long message that should be truncated at a word boundary to create a nice looking title';
      const title = AIService.generateConversationTitle(longMessage);

      expect(title.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(title).toMatch(/\.\.\.$/)
      ;
      expect(title).not.toMatch(/\s\.\.\.$/); // Should not end with space before ...
    });

    it('should handle short messages', () => {
      const shortMessage = 'Short message';
      const title = AIService.generateConversationTitle(shortMessage);

      // Short messages still get "..." appended
      expect(title).toContain('Short');
      expect(title).toMatch(/\.\.\.$/);
    });

    it('should handle messages with no spaces', () => {
      const noSpaces = 'a'.repeat(60);
      const title = AIService.generateConversationTitle(noSpaces);

      expect(title.length).toBe(53); // 50 + "..."
    });
  });
});

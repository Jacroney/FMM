import { supabase } from './supabaseClient';

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

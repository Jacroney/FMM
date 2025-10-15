import { supabase } from './supabaseClient';
import { Chapter } from './types';

export class ChapterService {
  static async getAllChapters(): Promise<Chapter[]> {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        // Return empty array if there's an error - the actual chapter should exist in DB
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  static async getChapterById(id: string): Promise<Chapter | null> {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async createChapter(chapter: Omit<Chapter, 'id' | 'created_at' | 'updated_at'>): Promise<Chapter> {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .insert([chapter])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async updateChapter(id: string, updates: Partial<Chapter>): Promise<Chapter> {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async deleteChapter(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  static async updateMemberCount(chapterId: string): Promise<void> {
    try {
      // Get current member count for this chapter
      const { count, error: countError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapterId)
        .eq('status', 'Active');

      if (countError) {
        throw countError;
      }

      // Update the chapter's member count
      const { error: updateError } = await supabase
        .from('chapters')
        .update({
          member_count: count || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', chapterId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      throw error;
    }
  }

  static async getChapterStats(chapterId: string) {
    try {
      const [
        { count: totalMembers },
        { count: activeMembers },
        { count: paidMembers }
      ] = await Promise.all([
        supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('chapter_id', chapterId),
        supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('chapter_id', chapterId)
          .eq('status', 'Active'),
        supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('chapter_id', chapterId)
          .eq('dues_paid', true)
      ]);

      return {
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        paidMembers: paidMembers || 0,
        duesPaymentRate: totalMembers ? ((paidMembers || 0) / totalMembers * 100).toFixed(1) : '0'
      };
    } catch (error) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        paidMembers: 0,
        duesPaymentRate: '0'
      };
    }
  }

  // ============================================================================
  // BRANDING METHODS
  // ============================================================================

  /**
   * Update chapter branding (colors, logo, greek letters)
   */
  static async updateBranding(
    chapterId: string,
    branding: {
      greek_letters?: string;
      primary_color?: string;
      secondary_color?: string;
      accent_color?: string;
      logo_url?: string;
      symbol_url?: string;
      theme_config?: Chapter['theme_config'];
    }
  ): Promise<Chapter> {
    return this.updateChapter(chapterId, branding);
  }

  /**
   * Get chapter branding configuration
   */
  static async getChapterBranding(chapterId: string): Promise<{
    greek_letters: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
    logo_url: string | null;
    symbol_url: string | null;
    theme_config: Chapter['theme_config'] | null;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('greek_letters, primary_color, secondary_color, accent_color, logo_url, symbol_url, theme_config')
        .eq('id', chapterId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching chapter branding:', error);
      return null;
    }
  }
}
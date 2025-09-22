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
        console.error('Error fetching chapters:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
      throw error;
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
        console.error('Error fetching chapter:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch chapter:', error);
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
        console.error('Error creating chapter:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create chapter:', error);
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
        console.error('Error updating chapter:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to update chapter:', error);
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
        console.error('Error deleting chapter:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete chapter:', error);
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
        console.error('Error counting members:', countError);
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
        console.error('Error updating member count:', updateError);
        throw updateError;
      }
    } catch (error) {
      console.error('Failed to update member count:', error);
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
      console.error('Failed to get chapter stats:', error);
      return {
        totalMembers: 0,
        activeMembers: 0,
        paidMembers: 0,
        duesPaymentRate: '0'
      };
    }
  }
}
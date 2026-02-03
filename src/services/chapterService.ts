import { supabase } from './supabaseClient';
import { Chapter } from './types';
import { isDemoModeEnabled } from '../utils/env';
import { demoStore, demoHelpers } from '../demo/demoStore';

export class ChapterService {
  static async getAllChapters(): Promise<Chapter[]> {
    if (isDemoModeEnabled()) {
      return demoStore.getState().chapters.map(chapter => ({ ...chapter }));
    }

    try {
      // Use RPC function that handles super admin logic server-side
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_all_chapters_for_user');

      if (!rpcError && rpcData && rpcData.length > 0) {
        // RPC worked, now fetch fraternity data for each chapter
        const chapterIds = rpcData.map((c: { id: string }) => c.id);
        const { data: chaptersWithFraternity } = await supabase
          .from('chapters')
          .select(`
            *,
            fraternity:fraternities(*)
          `)
          .in('id', chapterIds)
          .order('name', { ascending: true });

        return chaptersWithFraternity || rpcData;
      }

      // Fallback to direct query
      const { data, error } = await supabase
        .from('chapters')
        .select(`
          *,
          fraternity:fraternities(*)
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching chapters:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllChapters:', error);
      return [];
    }
  }

  static async getChapterById(id: string): Promise<Chapter | null> {
    if (isDemoModeEnabled()) {
      return demoStore.getState().chapters.find(chapter => chapter.id === id) || null;
    }

    try {
      const { data, error } = await supabase
        .from('chapters')
        .select(`
          *,
          fraternity:fraternities(*)
        `)
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
    if (isDemoModeEnabled()) {
      const newChapter: Chapter = {
        ...chapter,
        id: demoHelpers.nextId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoStore.setState({ chapters: [...demoStore.getState().chapters, newChapter] });
      return newChapter;
    }

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
    if (isDemoModeEnabled()) {
      let updatedChapter: Chapter | undefined;
      demoStore.setState({
        chapters: demoStore.getState().chapters.map(chapter => {
          if (chapter.id !== id) return chapter;
          updatedChapter = { ...chapter, ...updates, updated_at: new Date().toISOString() } as Chapter;
          return updatedChapter;
        })
      });
      if (!updatedChapter) {
        throw new Error('Chapter not found');
      }
      return updatedChapter;
    }

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
    if (isDemoModeEnabled()) {
      demoStore.setState({ chapters: demoStore.getState().chapters.filter(chapter => chapter.id !== id) });
      return;
    }

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
    if (isDemoModeEnabled()) {
      const memberCount = demoStore.getState().members.filter(member => member.chapter_id === chapterId && member.status === 'Active').length;
      demoStore.setState({
        chapters: demoStore.getState().chapters.map(chapter =>
          chapter.id === chapterId ? { ...chapter, member_count: memberCount } : chapter
        )
      });
      return;
    }

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
    if (isDemoModeEnabled()) {
      const members = demoStore.getState().members.filter(member => member.chapter_id === chapterId);
      const totalMembers = members.length;
      const activeMembers = members.filter(member => member.status === 'Active').length;
      const paidMembers = members.filter(member => member.duesPaid).length;
      return {
        totalMembers,
        activeMembers,
        paidMembers,
        duesPaymentRate: totalMembers ? ((paidMembers / totalMembers) * 100).toFixed(1) : '0'
      };
    }

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
    if (isDemoModeEnabled()) {
      const chapter = demoStore.getState().chapters.find(c => c.id === chapterId);
      if (!chapter) return null;
      return {
        greek_letters: chapter.greek_letters || null,
        primary_color: chapter.primary_color || null,
        secondary_color: chapter.secondary_color || null,
        accent_color: chapter.accent_color || null,
        logo_url: chapter.logo_url || null,
        symbol_url: chapter.symbol_url || null,
        theme_config: chapter.theme_config || null
      };
    }

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

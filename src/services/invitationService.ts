import { supabase } from './supabaseClient';

export interface UserInvitation {
  id: string;
  email: string;
  chapter_id: string;
  role: 'admin' | 'exec' | 'member';
  invited_by: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export interface InvitationWithDetails extends UserInvitation {
  chapter_name?: string;
  invited_by_name?: string;
}

export class InvitationService {
  /**
   * Get all invitations for the current user's chapter
   */
  static async getChapterInvitations(): Promise<InvitationWithDetails[]> {
    try {
      console.log('Fetching invitations...');

      const { data, error } = await supabase
        .from('user_invitations')
        .select(`
          *,
          chapters(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching invitations:', error);
        throw error;
      }

      console.log('Invitations fetched:', data);

      return (data || []).map((inv: any) => ({
        ...inv,
        chapter_name: inv.chapters?.name,
        invited_by_name: null // Will fetch separately if needed
      }));
    } catch (error) {
      console.error('Error fetching invitations:', error);
      throw error; // Re-throw to see error in UI
    }
  }

  /**
   * Create invitations for multiple emails
   */
  static async createInvitations(
    emails: string[],
    chapterId: string,
    role: 'admin' | 'exec' | 'member'
  ): Promise<{ success: boolean; results: any[] }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.rpc('create_invitations', {
        p_emails: emails,
        p_chapter_id: chapterId,
        p_role: role,
        p_invited_by: userData.user.id
      });

      if (error) throw error;

      return {
        success: true,
        results: data || []
      };
    } catch (error) {
      console.error('Error creating invitations:', error);
      throw error;
    }
  }

  /**
   * Revoke an invitation
   */
  static async revokeInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return false;
    }
  }

  /**
   * Resend invitation (create new token with new expiry)
   */
  static async resendInvitation(invitationId: string): Promise<boolean> {
    try {
      // Get the original invitation
      const { data: originalInvitation, error: fetchError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError) throw fetchError;

      // Update with new token and expiry
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error('Error resending invitation:', error);
      return false;
    }
  }

  /**
   * Get invitation link for a token
   */
  static getInvitationLink(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?token=${token}`;
  }

  /**
   * Copy invitation link to clipboard
   */
  static async copyInvitationLink(token: string): Promise<boolean> {
    try {
      const link = this.getInvitationLink(token);
      await navigator.clipboard.writeText(link);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }
}

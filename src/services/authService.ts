import { supabase } from './supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import { isDemoModeEnabled } from '../utils/env';
import { getDemoUser, getDemoProfile, demoHelpers, demoStore } from '../demo/demoStore';
import { getYearLabel } from '../utils/yearUtils';

export interface UserProfile {
  id: string;
  chapter_id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  year?: '1' | '2' | '3' | '4' | 'Graduate' | 'Alumni';
  member_year?: string; // Renamed 'year' field from database
  major?: string;
  position?: string;
  role: 'admin' | 'exec' | 'treasurer' | 'member';
  dues_balance: number;
  status?: 'active' | 'inactive' | 'alumni' | 'pledge'; // New unified status field
  is_active: boolean;
  installment_eligible?: boolean; // Global eligibility for payment plans
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  year?: string;
  major?: string;
  chapter_id: string;
  position?: string;
  role?: 'admin' | 'exec' | 'member';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface MemberDuesInfo {
  user_id: string;
  full_name: string;
  email: string;
  dues_balance: number;
  chapter_id: string;
  chapter_name: string;
}

export class AuthService {
  // Sign up new user
  static async signUp(signUpData: SignUpData): Promise<{ user: User | null; error: Error | null }> {
    if (isDemoModeEnabled()) {
      return { user: { ...getDemoUser(), email: signUpData.email }, error: null };
    }

    try {
      const metadata = {
        full_name: signUpData.full_name,
        phone_number: signUpData.phone_number,
        year: signUpData.year,
        major: signUpData.major,
        chapter_id: signUpData.chapter_id,
        position: signUpData.position || 'Member',
        role: signUpData.role || 'member'
      };

      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;

      // Profile will be automatically created by database trigger
      // (see migration: 20250120000006_create_user_profile_trigger.sql)
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  // Sign in user
  static async signIn(signInData: SignInData): Promise<{ user: User | null; error: Error | null }> {
    if (isDemoModeEnabled()) {
      return { user: getDemoUser(), error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  // Sign out user
  static async signOut(): Promise<{ error: Error | null }> {
    if (isDemoModeEnabled()) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Get current session
  static async getSession(): Promise<Session | null> {
    if (isDemoModeEnabled()) {
      return null;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      return null;
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    if (isDemoModeEnabled()) {
      return getDemoUser();
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        // AuthSessionMissingError is normal when no user is logged in
        if (error.name === 'AuthSessionMissingError' || error.message?.includes('Auth session missing')) {
          return null;
        }
        throw error;
      }
      return user;
    } catch (error) {
      // Silently handle auth session errors
      return null;
    }
  }

  // Get user profile
  static async getUserProfile(userId?: string): Promise<UserProfile | null> {
    if (isDemoModeEnabled()) {
      return getDemoProfile();
    }

    try {
      const targetUserId = userId || (await this.getCurrentUser())?.id;
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    } catch (error) {
      return null;
    }
  }

  // Update user profile
  static async updateUserProfile(updates: Partial<UserProfile>): Promise<{ profile: UserProfile | null; error: Error | null }> {
    if (isDemoModeEnabled()) {
      // In demo mode, just return the updated profile without persisting
      const profile = { ...getDemoProfile(), ...updates, updated_at: new Date().toISOString() } as UserProfile;
      return { profile, error: null };
    }

    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      // Remove fields that users shouldn't be able to update themselves
      const allowedUpdates = { ...updates };
      delete allowedUpdates.id;
      delete allowedUpdates.role; // Only admins can change roles
      delete allowedUpdates.dues_balance; // Only admins can change dues
      delete allowedUpdates.created_at;
      delete allowedUpdates.updated_at;

      const { data, error } = await supabase
        .from('user_profiles')
        .update(allowedUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      return { profile: data as UserProfile, error: null };
    } catch (error) {
      return { profile: null, error: error as Error };
    }
  }

  // Admin functions
  static async updateUserRole(userId: string, role: 'admin' | 'exec' | 'member'): Promise<{ error: Error | null }> {
    try {
      const currentUser = await this.getUserProfile();
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Only admins can update user roles');
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId)
        .eq('chapter_id', currentUser.chapter_id); // Can only update users in same chapter

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  static async updateUserDuesBalance(userId: string, duesBalance: number): Promise<{ error: Error | null }> {
    if (isDemoModeEnabled()) {
      // In demo mode, just return success without persisting
      return { error: null };
    }

    try {
      const currentUser = await this.getUserProfile();
      if (!currentUser || !['admin', 'exec'].includes(currentUser.role)) {
        throw new Error('Only admins and exec board can update dues balance');
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ dues_balance: duesBalance })
        .eq('id', userId)
        .eq('chapter_id', currentUser.chapter_id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Get all users in chapter (admin/exec only)
  static async getChapterUsers(chapterId?: string): Promise<UserProfile[]> {
    if (isDemoModeEnabled()) {
      return [getDemoProfile()];
    }

    try {
      const currentUser = await this.getUserProfile();
      if (!currentUser || !['admin', 'exec'].includes(currentUser.role)) {
        throw new Error('Only admins and exec board can view all chapter users');
      }

      const targetChapterId = chapterId || currentUser.chapter_id;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('chapter_id', targetChapterId)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data as UserProfile[];
    } catch (error) {
      return [];
    }
  }

  // Get member dues info (for member dashboard)
  static async getMemberDuesInfo(): Promise<MemberDuesInfo | null> {
    if (isDemoModeEnabled()) {
      const profile = getDemoProfile();
      return {
        user_id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        dues_balance: profile.dues_balance,
        chapter_id: profile.chapter_id,
        chapter_name: 'Alpha Beta Chapter'
      };
    }

    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      // Get user profile with chapter info
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          email,
          chapter_id,
          chapters (
            name
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Calculate total dues balance using secured RPC function
      // This ensures users can only see their own dues data
      const { data: duesData, error: duesError } = await supabase.rpc('get_my_dues_summary');

      if (duesError) {
        console.error('Error fetching dues:', duesError);
      }

      // Sum up all balances
      const totalBalance = duesData?.reduce((sum: number, dues: { balance: number }) => sum + (dues.balance || 0), 0) || 0;

      return {
        user_id: profileData.id,
        full_name: profileData.full_name,
        email: profileData.email,
        dues_balance: totalBalance,
        chapter_id: profileData.chapter_id,
        chapter_name: profileData.chapters?.name || 'Unknown Chapter'
      } as MemberDuesInfo;
    } catch (error) {
      return null;
    }
  }

  // Check if user has admin/exec permissions
  static async hasAdminAccess(): Promise<boolean> {
    if (isDemoModeEnabled()) {
      return true;
    }

    try {
      const profile = await this.getUserProfile();
      return profile ? ['admin', 'exec'].includes(profile.role) : false;
    } catch (error) {
      return false;
    }
  }

  // Check if user has admin permissions
  static async hasAdminRole(): Promise<boolean> {
    if (isDemoModeEnabled()) {
      return true;
    }

    try {
      const profile = await this.getUserProfile();
      return profile ? profile.role === 'admin' : false;
    } catch (error) {
      return false;
    }
  }

  // Password reset
  static async resetPassword(email: string): Promise<{ error: Error | null }> {
    if (isDemoModeEnabled()) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Subscribe to auth changes
  static onAuthStateChange(callback: (user: User | null) => void) {
    if (isDemoModeEnabled()) {
      callback(getDemoUser());
      return { data: { subscription: { unsubscribe: () => undefined } } } as any;
    }

    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
  }

  // ============================================================================
  // MEMBER MANAGEMENT (using unified user_profiles)
  // ============================================================================

  /**
   * Get all members (user_profiles) for a chapter
   */
  static async getChapterMembers(chapterId: string): Promise<UserProfile[]> {
    if (isDemoModeEnabled()) {
      return demoStore.getState().members
        .filter(member => member.chapter_id === chapterId)
        .map(member => ({
          id: member.id,
          chapter_id: member.chapter_id,
          email: member.email,
          full_name: member.name,
          phone_number: undefined,
          year: member.year as any,
          major: undefined,
          position: undefined,
          role: 'member' as const,
          dues_balance: member.duesPaid ? 0 : 100,
        }));
    }

    if (!chapterId) {
      console.error('Chapter ID is required for getChapterMembers');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching chapter members:', error);
      throw error;
    }
  }

  /**
   * Update a member's profile (admin can edit all fields including email)
   */
  static async updateMemberProfile(
    id: string,
    updates: Partial<Omit<UserProfile, 'id'>>
  ): Promise<UserProfile> {
    if (isDemoModeEnabled()) {
      const members = demoStore.getState().members;
      const index = members.findIndex(m => m.id === id);
      if (index === -1) throw new Error('Member not found');

      const updatedMember = {
        ...members[index],
        name: updates.full_name || members[index].name,
        year: (updates.year as any) || members[index].year,
        lastUpdated: new Date().toISOString(),
      };

      const newMembers = [...members];
      newMembers[index] = updatedMember;
      demoStore.setState({ members: newMembers });

      return {
        id: updatedMember.id,
        chapter_id: updatedMember.chapter_id,
        email: updatedMember.email,
        full_name: updatedMember.name,
        phone_number: undefined,
        year: updatedMember.year as any,
        major: undefined,
        position: undefined,
        role: 'member' as const,
        dues_balance: 0,
      };
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Member not found');

      return data;
    } catch (error) {
      console.error('Error updating member profile:', error);
      throw error;
    }
  }

  /**
   * Delete a member (hard delete - permanently removes the record)
   */
  static async deleteMember(id: string): Promise<void> {
    if (isDemoModeEnabled()) {
      const members = demoStore.getState().members.filter(m => m.id !== id);
      demoStore.setState({ members });
      return;
    }

    try {
      // Hard delete: permanently remove the member record
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  }

  /**
   * Export members to CSV format
   */
  static exportMembersToCSV(members: UserProfile[]): string {
    const headers = ['Name', 'Email', 'Year', 'Status', 'Role', 'Dues Balance'];
    const rows = members.map(m => [
      m.full_name,
      m.email,
      m.year ? getYearLabel(m.year) : '',
      m.status || 'active',
      m.role,
      m.dues_balance?.toFixed(2) || '0.00'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Export members to GCM (Greek Chapter Manager) format
   */
  static exportMembersToGCM(members: UserProfile[]): string {
    // GCM format: tab-separated values
    const headers = ['First Name', 'Last Name', 'Email', 'Year', 'Status', 'Phone'];
    const rows = members.map(m => {
      const [firstName = '', ...lastNameParts] = (m.full_name || '').split(' ');
      const lastName = lastNameParts.join(' ');
      return [
        firstName,
        lastName,
        m.email,
        m.year ? getYearLabel(m.year) : '',
        m.status || 'active',
        m.phone_number || ''
      ];
    });

    return [headers, ...rows].map(row => row.join('\t')).join('\n');
  }

  /**
   * Import members from CSV/array data
   */
  static async importMembers(
    members: Array<{
      full_name: string;
      email: string;
      chapter_id: string;
      year?: string;
      phone_number?: string;
      major?: string;
    }>
  ): Promise<UserProfile[]> {
    if (isDemoModeEnabled()) {
      const newMembers = members.map(m => ({
        id: demoHelpers.nextId(),
        chapter_id: m.chapter_id,
        name: m.full_name,
        email: m.email,
        status: 'Active' as const,
        year: m.year as any,
        duesPaid: false,
        paymentDate: null,
        semester: 'Spring 2025',
        lastUpdated: new Date().toISOString(),
      }));

      demoStore.setState({
        members: [...newMembers, ...demoStore.getState().members]
      });

      return newMembers.map(m => ({
        id: m.id,
        chapter_id: m.chapter_id,
        email: m.email,
        full_name: m.name,
        phone_number: undefined,
        year: m.year as any,
        major: undefined,
        position: undefined,
        role: 'member' as const,
        dues_balance: 0,
      }));
    }

    try {
      // Note: This requires users to have auth accounts
      // For bulk imports without auth, use assign_dues_by_email instead
      const insertData = members.map(m => ({
        email: m.email,
        full_name: m.full_name,
        chapter_id: m.chapter_id,
        member_year: m.year,
        phone_number: m.phone_number,
        major: m.major,
        role: 'member' as const,
        status: 'active' as const,
      }));

      const { data, error } = await supabase
        .from('user_profiles')
        .insert(insertData)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error importing members:', error);
      throw error;
    }
  }

  /**
   * Bulk import members with email invitations
   * Creates member_invitations records and queues invitation emails
   * Members will receive an email to create their account
   */
  static async bulkImportMembersWithInvitations(
    members: Array<{
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      year?: string;
    }>,
    chapterId: string
  ): Promise<{
    success: boolean;
    imported_count: number;
    skipped_count: number;
    errors: Array<{ email: string; error: string }>;
    message: string;
  }> {
    if (isDemoModeEnabled()) {
      // Demo mode: simulate import
      return {
        success: true,
        imported_count: members.length,
        skipped_count: 0,
        errors: [],
        message: `Imported ${members.length} members (demo mode)`,
      };
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('bulk_create_member_invitations', {
        p_chapter_id: chapterId,
        p_members: members,
        p_invited_by: user.user.id,
      });

      if (error) throw error;

      return data || {
        success: false,
        imported_count: 0,
        skipped_count: 0,
        errors: [],
        message: 'Unknown error occurred',
      };
    } catch (error) {
      console.error('Error bulk importing members:', error);
      throw error;
    }
  }

  /**
   * Get pending member invitations for a chapter
   * Returns invitations that haven't been accepted yet
   */
  static async getPendingInvitations(chapterId: string): Promise<Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone_number: string | null;
    year: string | null;
    member_status: string;
    status: string;
    invitation_email_status: string;
    created_at: string;
    invitation_expires_at: string;
  }>> {
    if (isDemoModeEnabled()) {
      return [];
    }

    try {
      // Use RPC function to bypass RLS while still enforcing authorization
      const { data, error } = await supabase.rpc('get_pending_invitations', {
        p_chapter_id: chapterId
      });

      if (error) throw error;

      // Transform to include full_name for consistency with user_profiles
      return (data || []).map(inv => ({
        ...inv,
        full_name: `${inv.first_name} ${inv.last_name}`,
      }));
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }
  }

  /**
   * Resend invitation email for a pending invitation
   */
  static async resendInvitation(invitationId: string, chapterId: string): Promise<{ success: boolean; error?: string }> {
    if (isDemoModeEnabled()) {
      return { success: true };
    }

    try {
      const { data, error } = await supabase.rpc('send_member_invitation_emails', {
        p_chapter_id: chapterId,
        p_invitation_ids: [invitationId],
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error resending invitation:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Cancel/delete a pending invitation
   */
  static async cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    if (isDemoModeEnabled()) {
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('member_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('status', 'pending');

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error canceling invitation:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Set a member's global installment eligibility
   * When enabled, the member can use payment plans for any current/future dues
   */
  static async setMemberInstallmentEligible(memberId: string, eligible: boolean): Promise<void> {
    if (isDemoModeEnabled()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ installment_eligible: eligible })
        .eq('id', memberId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating installment eligibility:', error);
      throw error;
    }
  }
}

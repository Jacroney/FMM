import { supabase } from './supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import { isDemoModeEnabled } from '../utils/env';
import { getDemoUser, getDemoProfile, demoHelpers } from '../demo/demoStore';

export interface UserProfile {
  id: string;
  chapter_id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  year?: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate' | 'Alumni';
  major?: string;
  position?: string;
  role: 'admin' | 'exec' | 'member';
  dues_balance: number;
  is_active: boolean;
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
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.full_name,
            phone_number: signUpData.phone_number,
            year: signUpData.year,
            major: signUpData.major,
            chapter_id: signUpData.chapter_id,
            position: signUpData.position || 'Member',
            role: signUpData.role || 'member'
          }
        }
      });

      if (error) throw error;

      // Profile will be automatically created by database trigger
      // (see migration: 20250120000006_create_user_profile_trigger.sql)
      if (data.user) {
        console.log('User created successfully. Profile will be created by database trigger.');
      }

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

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          email,
          dues_balance,
          chapter_id,
          chapters (
            name
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      return {
        user_id: data.id,
        full_name: data.full_name,
        email: data.email,
        dues_balance: data.dues_balance,
        chapter_id: data.chapter_id,
        chapter_name: data.chapters?.name || 'Unknown Chapter'
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
}

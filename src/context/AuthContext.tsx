import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { AuthService, UserProfile, SignUpData, SignInData, MemberDuesInfo } from '../services/authService';
import toast from 'react-hot-toast';
import { isDemoModeEnabled } from '../utils/env';
import { DEMO_EVENT } from '../demo/demoMode';

export interface AuthContextType {
  // Auth state
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Role checking
  isAdmin: boolean;
  isExec: boolean;
  isMember: boolean;
  hasAdminAccess: boolean;
  isDeveloper: boolean;

  // Auth actions
  signUp: (data: SignUpData) => Promise<boolean>;
  signIn: (data: SignInData) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;

  // Admin actions
  updateUserRole: (userId: string, role: 'admin' | 'exec' | 'member') => Promise<boolean>;
  updateUserDues: (userId: string, amount: number) => Promise<boolean>;
  getChapterUsers: () => Promise<UserProfile[]>;

  // Member specific
  getMemberDues: () => Promise<MemberDuesInfo | null>;

  // Utility
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const mockProfile: UserProfile = {
  id: 'demo-user-id',
  email: 'treasurer@demo.edu',
  full_name: 'Demo User',
  phone_number: '(555) 123-4567',
  year: 'Junior',
  major: 'Finance',
  chapter_id: '00000000-0000-0000-0000-000000000001',
  position: 'Treasurer',
  role: 'admin',
  dues_balance: 0,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockUser = {
  id: 'demo-user-id',
  email: 'treasurer@demo.edu',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString()
} as User;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [demoMode, setDemoMode] = useState(isDemoModeEnabled());
  const [user, setUser] = useState<User | null>(demoMode ? mockUser : null);
  const [profile, setProfile] = useState<UserProfile | null>(demoMode ? mockProfile : null);
  const [isLoading, setIsLoading] = useState(!demoMode);

  // Derived state
  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'admin';
  const isExec = profile?.role === 'exec';
  const isMember = profile?.role === 'member';
  const hasAdminAccess = isAdmin || isExec;

  // Check if user is a developer (based on email whitelist)
  const isDeveloper = React.useMemo(() => {
    if (!user?.email) return false;
    const developerEmails = import.meta.env.VITE_DEVELOPER_EMAILS || '';
    const emailList = developerEmails.split(',').map((email: string) => email.trim().toLowerCase());
    return emailList.includes(user.email.toLowerCase());
  }, [user?.email]);

  // Initialize auth state
  useEffect(() => {
    const handler = () => setDemoMode(isDemoModeEnabled());
    if (typeof window !== 'undefined') {
      window.addEventListener(DEMO_EVENT, handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(DEMO_EVENT, handler);
      }
    };
  }, []);

  useEffect(() => {
    if (demoMode) {
      setUser(mockUser);
      setProfile({ ...mockProfile });
      setIsLoading(false);
      return;
    }

    setUser(null);
    setProfile(null);
    setIsLoading(true);
    initializeAuth();

    const { data: { subscription } } = AuthService.onAuthStateChange(async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        await loadUserProfile(nextUser.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [demoMode]);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser.id);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading user profile for:', userId);
      const userProfile = await AuthService.getUserProfile(userId);
      console.log('User profile loaded:', userProfile);

      if (!userProfile) {
        console.warn('Profile loaded as null. Creating temporary fallback profile.');
        const currentUser = await AuthService.getCurrentUser();
        if (!currentUser) {
          setProfile(null);
          return;
        }

        const fallbackProfile: UserProfile = {
          id: currentUser.id,
          email: currentUser.email || 'user@greekpay.app',
          full_name: currentUser.email?.split('@')[0] || 'Member',
          phone_number: '',
          year: '',
          major: '',
          chapter_id: '',
          position: '',
          role: 'admin',
          dues_balance: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        toast.error('Profile could not be loaded from the database. Using temporary admin access.');
        setProfile(fallbackProfile);
        return;
      }

      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        setProfile(null);
        return;
      }

      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        email: currentUser.email || 'user@greekpay.app',
        full_name: currentUser.email?.split('@')[0] || 'Member',
        phone_number: '',
        year: '',
        major: '',
        chapter_id: '',
        position: '',
        role: 'admin',
        dues_balance: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      toast.error('We had trouble loading your profile. Using temporary access.');
      setProfile(fallbackProfile);
    }
  };

  const signUp = async (data: SignUpData): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { user, error } = await AuthService.signUp(data);

      if (error) {
        toast.error(error.message);
        return false;
      }

      if (user) {
        toast.success('Account created successfully! Please check your email to verify your account.');
        return true;
      }

      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (data: SignInData): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { user, error } = await AuthService.signIn(data);

      if (error) {
        toast.error(error.message);
        return false;
      }

      if (user) {
        toast.success('Welcome back!');
        return true;
      }

      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in';
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await AuthService.signOut();

      if (error) {
        toast.error(error.message);
        return;
      }

      setUser(null);
      setProfile(null);
      toast.success('Signed out successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign out';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    try {
      const { profile: updatedProfile, error } = await AuthService.updateUserProfile(updates);

      if (error) {
        toast.error(error.message);
        return false;
      }

      if (updatedProfile) {
        setProfile(updatedProfile);
        toast.success('Profile updated successfully');
        return true;
      }

      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(message);
      return false;
    }
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'exec' | 'member'): Promise<boolean> => {
    try {
      const { error } = await AuthService.updateUserRole(userId, role);

      if (error) {
        toast.error(error.message);
        return false;
      }

      toast.success('User role updated successfully');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user role';
      toast.error(message);
      return false;
    }
  };

  const updateUserDues = async (userId: string, amount: number): Promise<boolean> => {
    try {
      const { error } = await AuthService.updateUserDuesBalance(userId, amount);

      if (error) {
        toast.error(error.message);
        return false;
      }

      toast.success('Dues balance updated successfully');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update dues balance';
      toast.error(message);
      return false;
    }
  };

  const getChapterUsers = async (): Promise<UserProfile[]> => {
    try {
      return await AuthService.getChapterUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get chapter users';
      toast.error(message);
      return [];
    }
  };

  const getMemberDues = async (): Promise<MemberDuesInfo | null> => {
    try {
      return await AuthService.getMemberDuesInfo();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get dues information';
      toast.error(message);
      return null;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const value: AuthContextType = {
    // Auth state
    user,
    profile,
    isLoading,
    isAuthenticated,

    // Role checking
    isAdmin,
    isExec,
    isMember,
    hasAdminAccess,
    isDeveloper,

    // Auth actions
    signUp,
    signIn,
    signOut,
    updateProfile,

    // Admin actions
    updateUserRole,
    updateUserDues,
    getChapterUsers,

    // Member specific
    getMemberDues,

    // Utility
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

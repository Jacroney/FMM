import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { AuthService, UserProfile, SignUpData, SignInData, MemberDuesInfo } from '../services/authService';
import toast from 'react-hot-toast';

interface AuthContextType {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived state
  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'admin';
  const isExec = profile?.role === 'exec';
  const isMember = profile?.role === 'member';
  const hasAdminAccess = isAdmin || isExec;

  // Initialize auth state
  useEffect(() => {
    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange(async (user) => {
      setUser(user);
      if (user) {
        await loadUserProfile(user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

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
      const userProfile = await AuthService.getUserProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
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
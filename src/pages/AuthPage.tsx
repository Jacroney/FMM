import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../components/auth/LoginForm';
import { InvitationSignupForm } from '../components/auth/InvitationSignupForm';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { disableDemoMode } from '../demo/demoMode';
import { isDemoModeEnabled } from '../utils/env';
import { supabase } from '../services/supabaseClient';

interface InvitationData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  chapter_id: string;
  phone_number?: string;
  year?: string;
}

const AuthPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const invitationToken = searchParams.get('token');
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(!!invitationToken);
  const [chapterName, setChapterName] = useState<string | undefined>();

  // Ensure demo mode is disabled when accessing the login page
  useEffect(() => {
    if (isDemoModeEnabled()) {
      disableDemoMode();
    }
  }, []);

  // Fetch invitation data when token is present
  useEffect(() => {
    if (!invitationToken) {
      setInvitationLoading(false);
      return;
    }

    const fetchInvitationData = async () => {
      try {
        // Fetch invitation from member_invitations
        const { data, error } = await supabase
          .from('member_invitations')
          .select('id, email, first_name, last_name, chapter_id, phone_number, year, status, invitation_expires_at')
          .eq('invitation_token', invitationToken)
          .single();

        if (error || !data) {
          setInvitationError('Invalid invitation link');
          setInvitationLoading(false);
          return;
        }

        // Check if already used
        if (data.status !== 'pending') {
          setInvitationError('This invitation has already been used. Please sign in if you have an account.');
          setInvitationLoading(false);
          return;
        }

        // Check expiration
        if (data.invitation_expires_at && new Date(data.invitation_expires_at) < new Date()) {
          setInvitationError('This invitation has expired. Please contact your chapter administrator.');
          setInvitationLoading(false);
          return;
        }

        // Fetch chapter name
        const { data: chapter } = await supabase
          .from('chapters')
          .select('name')
          .eq('id', data.chapter_id)
          .single();

        setChapterName(chapter?.name);
        setInvitationData({
          id: data.id,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          chapter_id: data.chapter_id,
          phone_number: data.phone_number,
          year: data.year,
        });
        setInvitationLoading(false);
      } catch (err) {
        console.error('Error fetching invitation:', err);
        setInvitationError('Failed to load invitation');
        setInvitationLoading(false);
      }
    };

    fetchInvitationData();
  }, [invitationToken]);

  // Redirect authenticated users to the app
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const redirectTo = location.state?.from || '/app';
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, location.state?.from]);

  if (isLoading || invitationLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)]">
        <LoadingSpinner />
      </div>
    );
  }

  // If somehow still on this page while authenticated, show loading
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)]">
        <LoadingSpinner />
      </div>
    );
  }

  // Show invitation error
  if (invitationError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)] px-4 dark:bg-gray-900">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
          <div className="mb-4 text-center text-5xl">⚠️</div>
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Invitation Issue
          </h1>
          <p className="mb-6 text-center text-gray-600 dark:text-gray-400">{invitationError}</p>
          <button
            onClick={() => navigate('/signin', { replace: true })}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Show invitation signup form when valid invitation token
  if (invitationToken && invitationData) {
    return (
      <div className="min-h-screen bg-[var(--brand-surface)] px-4 py-12 text-slate-900 sm:px-6 lg:px-8 dark:bg-gray-900 dark:text-slate-100">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center">
            <InvitationSignupForm
              invitationData={invitationData}
              token={invitationToken}
              chapterName={chapterName}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] px-4 py-12 text-slate-900 sm:px-6 lg:px-8 dark:bg-gray-900 dark:text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1.2fr,1fr] lg:items-center">
          <div className="space-y-6">
            <span className="surface-pill">Welcome back</span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Sign in to manage your chapter finances.</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Access real-time dashboards, automate bank imports, and keep members in sync. Your credentials work across every chapter you manage.
            </p>
            <div className="space-y-4">
              <div className="space-y-3 rounded-2xl border border-[var(--brand-border)] bg-white p-6 shadow-sm dark:bg-gray-800">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Want to try before signing in?</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Explore GreekPay with sample data in our interactive demo. No account required.
                </p>
                <button
                  onClick={() => navigate('/demo')}
                  className="mt-2 w-full rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                >
                  Launch Demo
                </button>
              </div>
              <div className="space-y-3 rounded-2xl border border-[var(--brand-border)] bg-white p-6 shadow-sm dark:bg-gray-800">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Need an invite?</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  New treasurers can request access from their executive board. Existing users can switch chapters after signing in.
                </p>
              </div>
            </div>
          </div>
          <div className="w-full max-w-md justify-self-center">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

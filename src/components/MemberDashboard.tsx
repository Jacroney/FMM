import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { MemberDuesInfo } from '../services/authService';
import ProfileEditModal from './ProfileEditModal';
import PaymentHistoryModal from './PaymentHistoryModal';
import PasswordChangeModal from './PasswordChangeModal';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export const MemberDashboard: React.FC = () => {
  const { profile, getMemberDues, signOut } = useAuth();
  const [duesInfo, setDuesInfo] = useState<MemberDuesInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    void loadDuesInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDuesInfo = async () => {
    try {
      setIsLoading(true);
      const info = await getMemberDues();
      setDuesInfo(info);
    } catch (error) {
      console.error('Error loading dues info:', error);
      toast.error('Unable to load dues information right now.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)] dark:bg-gray-900">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
          Loading your dashboard...
        </div>
      </div>
    );
  }

  const duesBalance = duesInfo?.dues_balance ?? profile?.dues_balance ?? 0;
  const isOwed = duesBalance > 0;
  const chapterName = duesInfo?.chapter_name || 'Your Chapter';

  // Calculate profile completeness
  const profileFields = {
    full_name: profile?.full_name,
    email: profile?.email,
    phone_number: profile?.phone_number,
    year: profile?.year,
    major: profile?.major,
  };
  const filledFields = Object.values(profileFields).filter(v => v && v !== profile?.email).length;
  const totalFields = Object.keys(profileFields).length - 1; // Exclude email as it's always present
  const profileCompleteness = Math.round((filledFields / totalFields) * 100);
  const isProfileIncomplete = profileCompleteness < 75;

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] dark:bg-gray-900">
      {/* Header with Logo */}
      <header className="border-b border-[var(--brand-border)] bg-white/80 backdrop-blur dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/GreekPay-logo-transparent.png"
              alt="GreekPay Logo"
              className="h-10 w-auto dark:invert"
            />
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Member Dashboard</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">{chapterName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="focus-ring inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-700/40 dark:bg-gray-800 dark:text-rose-300 dark:hover:bg-gray-700"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40">
              <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                Welcome back, {profile?.full_name || 'Member'}!
              </h2>
              <p className="text-slate-600 dark:text-slate-400">Here's an overview of your account</p>
            </div>
          </div>

          {/* Profile Completeness Alert */}
          {isProfileIncomplete && (
            <div className="surface-card p-4 border-l-4 border-amber-500">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Complete Your Profile</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Your profile is {profileCompleteness}% complete. Add more information to help the chapter stay connected.
                  </p>
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Update Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dues Balance - Hero Card */}
          <div className="surface-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  isOwed ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'
                }`}>
                  <svg className={`h-6 w-6 ${isOwed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">Dues Balance</h2>
                  <p className={`text-3xl sm:text-4xl font-bold ${
                    isOwed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {formatCurrency(Math.abs(duesBalance))}
                  </p>
                </div>
              </div>
              <span className={`surface-pill ${
                isOwed
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
              }`}>
                {isOwed ? '⚠️ Payment required' : '✅ Paid in full'}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {isOwed ? 'Amount owed for the current term' : duesBalance === 0 ? 'Your balance is paid in full' : 'You have a credit balance'}
            </p>

            {isOwed && (
              <div className="space-y-3 mt-6 pt-6 border-t border-[var(--brand-border)]">
                <div className="surface-panel p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">Payment Instructions</h3>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Coordinate with the treasurer on Venmo, Zelle, or cash payments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Include your full name in every payment description</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Balances update automatically once payment is processed</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => toast('Online payments coming soon! Please reach out to the treasurer.')}
                  className="focus-ring w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                >
                  Pay dues online (coming soon)
                </button>
              </div>
            )}
          </div>

          {/* Grid Layout for Info and Actions */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Member Information */}
            <div className="surface-card p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Member Information</h2>
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</dt>
                  <dd className="mt-1 text-slate-900 dark:text-white font-medium">{profile?.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Year</dt>
                  <dd className="mt-1 text-slate-900 dark:text-white font-medium">{profile?.year || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Major</dt>
                  <dd className="mt-1 text-slate-900 dark:text-white font-medium">{profile?.major || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Position</dt>
                  <dd className="mt-1 text-slate-900 dark:text-white font-medium">{profile?.position || 'Member'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Phone</dt>
                  <dd className="mt-1 text-slate-900 dark:text-white font-medium">{profile?.phone_number || 'Not provided'}</dd>
                </div>
              </dl>
            </div>

            {/* Quick Actions */}
            <div className="surface-card p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="focus-ring group flex w-full items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <span>Update profile details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaymentHistoryModalOpen(true)}
                  className="focus-ring group flex w-full items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span>View payment history</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="focus-ring group flex w-full items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span>Change password</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const email = 'treasurer@chapter.com';
                    const subject = 'Question about dues';
                    const body = `Hi,\n\nI have a question about my dues balance.\n\nBest regards,\n${profile?.full_name || ''}`;
                    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                  }}
                  className="focus-ring group flex w-full items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span>Contact treasurer</span>
                </button>
                <button
                  type="button"
                  onClick={loadDuesInfo}
                  className="focus-ring group flex w-full items-center gap-3 rounded-xl border border-[var(--brand-border)] bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <span>Refresh balance</span>
                </button>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="surface-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Need Help?</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Stay connected with chapter leadership and get support when you need it.
            </p>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                <span>Watch for weekly email updates from the executive board</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                <span>Join the group chat for real-time announcements and reminders</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                <span>
                  Reach out any time at{' '}
                  <a
                    className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    href="mailto:treasurer@chapter.com"
                  >
                    treasurer@chapter.com
                  </a>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSuccess={loadDuesInfo}
      />

      <PaymentHistoryModal
        isOpen={isPaymentHistoryModalOpen}
        onClose={() => setIsPaymentHistoryModalOpen(false)}
      />

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};

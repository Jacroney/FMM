import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { MemberDuesInfo } from '../services/authService';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export const MemberDashboard: React.FC = () => {
  const { profile, getMemberDues } = useAuth();
  const [duesInfo, setDuesInfo] = useState<MemberDuesInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600 dark:bg-gray-900">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          Loading your dashboard...
        </div>
      </div>
    );
  }

  const duesBalance = duesInfo?.dues_balance ?? profile?.dues_balance ?? 0;
  const isOwed = duesBalance > 0;
  const chapterName = duesInfo?.chapter_name || 'Your Chapter';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 text-gray-900 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome, {profile?.full_name || 'Member'}!</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{chapterName}</p>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Member information</h2>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">{profile?.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Year</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">{profile?.year || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Major</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">{profile?.major || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Position</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">{profile?.position || 'Member'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Phone</dt>
              <dd className="mt-1 text-gray-900 dark:text-gray-100">{profile?.phone_number || 'Not provided'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              💰
            </div>
            <h2 className="text-lg font-semibold">Dues & payments</h2>
          </div>
          <div className="text-center">
            <p className={`text-4xl font-semibold sm:text-5xl ${isOwed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(Math.abs(duesBalance))}
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {isOwed ? 'Amount owed for the current term.' : duesBalance === 0 ? 'Balance: paid in full.' : 'Credit balance on your account.'}
            </p>
            <div
              className={`mt-4 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${
                isOwed ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
              }`}
            >
              {isOwed ? '⚠️ Payment required' : '✅ Account current'}
            </div>
          </div>

          {isOwed && (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-blue-50 p-4 text-left text-sm text-blue-700 dark:bg-blue-900/40 dark:text-blue-100">
                <h3 className="font-medium">Payment instructions</h3>
                <ul className="mt-2 space-y-1">
                  <li>• Coordinate with the treasurer on Venmo, Zelle, or cash payments.</li>
                  <li>• Include your full name in every payment description.</li>
                  <li>• Balances update automatically once the payment is processed.</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => toast('Online payments are coming soon. Please reach out to the treasurer in the meantime.')}
                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700/40 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-gray-700"
              >
                Pay dues online (coming soon)
              </button>
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold">Quick actions</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <button
                type="button"
                onClick={() => toast('Profile updates will be available soon. Contact your treasurer for urgent changes.')}
                className="flex items-center rounded-lg border border-gray-200 px-4 py-3 text-left font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <span className="mr-3 text-lg">✏️</span>
                Update profile details
              </button>
              <button
                type="button"
                onClick={() => {
                  const email = 'treasurer@chapter.com';
                  const subject = 'Question about dues';
                  const body = `Hi,\n\nI have a question about my dues balance.\n\nBest regards,\n${profile?.full_name || ''}`;
                  window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                }}
                className="flex items-center rounded-lg border border-gray-200 px-4 py-3 text-left font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <span className="mr-3 text-lg">📧</span>
                Contact the treasurer
              </button>
              <button
                type="button"
                onClick={() => toast('Event calendar integration is in progress. Watch your email for updates.')}
                className="flex items-center rounded-lg border border-gray-200 px-4 py-3 text-left font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <span className="mr-3 text-lg">📅</span>
                View upcoming events
              </button>
              <button
                type="button"
                onClick={loadDuesInfo}
                className="flex items-center rounded-lg border border-gray-200 px-4 py-3 text-left font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <span className="mr-3 text-lg">🔄</span>
                Refresh balance
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold">Need help?</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Here are a few ways to stay connected with chapter leadership.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>• Watch for weekly email updates from the executive board.</li>
              <li>• Join the group chat for real-time announcements and reminders.</li>
              <li>
                • Reach out any time at{' '}
                <a className="text-blue-600 underline-offset-2 hover:underline" href="mailto:treasurer@chapter.com">
                  treasurer@chapter.com
                </a>
                .
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

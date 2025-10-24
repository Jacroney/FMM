import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { enableDemoMode } from '../demo/demoMode';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    icon: ChartBarIcon,
    title: 'Real-time Dashboard',
    description: 'View your chapter\'s financial health at a glance'
  },
  {
    icon: CurrencyDollarIcon,
    title: 'Budget Management',
    description: 'Track budgets, expenses, and spending across categories'
  },
  {
    icon: UserGroupIcon,
    title: 'Member Dues',
    description: 'Manage member payments and outstanding balances'
  },
  {
    icon: ArrowTrendingUpIcon,
    title: 'Transaction History',
    description: 'Browse and filter all financial transactions'
  },
  {
    icon: BanknotesIcon,
    title: 'Bank Connections',
    description: 'See how automatic bank sync keeps your books updated'
  },
  {
    icon: ClockIcon,
    title: 'Recurring Payments',
    description: 'Set up and track recurring transactions and dues'
  }
];

/**
 * Demo page entry point with welcome screen
 * Shows intro, features, and important notices before entering demo mode
 */
const Demo: React.FC = () => {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Enable demo mode when component mounts (resets data to fresh state)
    enableDemoMode();
  }, []);

  const handleStartDemo = () => {
    setIsStarting(true);
    // Small delay for smooth transition
    setTimeout(() => {
      navigate('/app/dashboard', { replace: true });
    }, 300);
  };

  const handleBackToHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] text-slate-900 dark:bg-gray-900 dark:text-slate-100">
      {/* Header */}
      <header className="border-b border-[var(--brand-border)] bg-white/80 backdrop-blur dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <img
              src="/GreekPay-logo-transparent.png"
              alt="GreekPay Logo"
              className="h-10 w-auto"
            />
          </Link>
          <button
            onClick={handleBackToHome}
            className="rounded-full border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-gray-800"
          >
            Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              <InformationCircleIcon className="h-4 w-4" />
              Interactive Demo
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Try GreekPay with Sample Data
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Explore a fully functional demo environment with realistic fraternity financial data.
              <br />
              See how GreekPay simplifies chapter treasury management.
            </p>
          </div>

          {/* Important Notice */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-900/20">
            <div className="flex gap-3">
              <InformationCircleIcon className="h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-500" />
              <div className="space-y-2">
                <h2 className="font-semibold text-amber-900 dark:text-amber-300">
                  Important: Demo Mode Information
                </h2>
                <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-400">
                  <li>• All data is sample data from "Alpha Beta Chapter" at Demo University</li>
                  <li>• You can make any changes you want - they won't affect real data</li>
                  <li>• Your changes are temporary and will be reset when you exit or refresh</li>
                  <li>• Demo data resets to initial state each time you return to this page</li>
                  <li>• To use GreekPay with your chapter's real data, you'll need to sign up</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div>
            <h2 className="text-center text-2xl font-semibold">What You Can Explore</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-xl border border-[var(--brand-border)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-[var(--brand-primary)] dark:bg-blue-900/30">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA Section */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 p-8 text-center text-white shadow-xl">
            <h2 className="text-2xl font-semibold">Ready to Explore?</h2>
            <p className="mt-2 text-sm text-blue-100">
              You'll be redirected to the dashboard where you can navigate through all features.
              <br />
              Look for the blue demo banner at the top to exit anytime.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={handleStartDemo}
                disabled={isStarting}
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-blue-600 shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-75 disabled:hover:translate-y-0"
              >
                {isStarting ? 'Starting Demo...' : 'Start Demo'}
              </button>
              <button
                onClick={handleBackToHome}
                className="inline-flex items-center justify-center rounded-full border border-white/60 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Back to Home
              </button>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Questions about GreekPay? Visit our{' '}
            <button
              onClick={handleBackToHome}
              className="font-medium text-[var(--brand-primary)] hover:underline"
            >
              homepage
            </button>{' '}
            to learn more or sign in to your chapter account.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Demo;

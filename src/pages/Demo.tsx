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
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Enable demo mode when component mounts (resets data to fresh state)
    enableDemoMode();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setIsHeaderScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleStartDemo = () => {
    setIsStarting(true);
    // Small delay for smooth transition
    setTimeout(() => {
      navigate('/demo/dashboard', { replace: true });
    }, 300);
  };

  const handleBackToHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] text-slate-900 dark:bg-gray-900 dark:text-slate-100">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-colors duration-200 ${
          isHeaderScrolled
            ? 'border-b border-[var(--brand-border)] bg-[var(--brand-surface)]'
            : 'border-b border-transparent bg-[var(--brand-surface)]'
        }`}
      >
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link to="/" className="-ml-36 flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#E2B15A] shadow-sm overflow-hidden">
              <img
                src="/GreekPay-logo-icon-solid-bold3.png"
                alt="GreekPay Logo"
                className="h-full w-full object-contain scale-[1.55] origin-center"
                style={{ filter: 'none' }}
              />
            </span>
            <span className="text-xl font-semibold tracking-tight text-white">Greek Pay</span>
          </Link>
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-sm font-medium text-white/80 sm:flex scale-[1.3] origin-center">
            <Link to="/features" className="transition-colors hover:text-white">Features</Link>
            <Link to="/pricing" className="transition-colors hover:text-white">Pricing</Link>
            <Link to="/demo" className="text-white">Demo</Link>
            <Link to="/contact" className="transition-colors hover:text-white">Contact</Link>
          </nav>
          <div className="absolute -right-28 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="rounded-full bg-[var(--brand-primary)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
            >
              Sign in
            </button>
          </div>
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

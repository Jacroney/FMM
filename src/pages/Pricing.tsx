import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const highlights = [
  'Role-based permissions so treasurers, execs, and members see exactly what they need.',
  'Budget planning tools that show allocation, spend, and forecasted runway at a glance.',
  'Audit-ready exports, PDF reporting, and CSV imports help you modernise operations fast.'
];

const includedFeatures = [
  'Unlimited bank account connections',
  'Automatic transaction syncing via Plaid',
  'Unlimited users and member accounts',
  'Budget tracking and management',
  'Member dues and payment tracking',
  'Recurring transaction automation',
  'Real-time financial dashboard',
  'PDF reports and CSV exports',
  'Role-based access control',
  'Email support and onboarding'
];

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setIsHeaderScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] text-slate-900">
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
            <Link to="/pricing" className="text-white">Pricing</Link>
            <Link to="/demo" className="transition-colors hover:text-white">Demo</Link>
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
        <div className="space-y-16">
          {/* Hero Section */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-800">
              <CurrencyDollarIcon className="h-4 w-4" />
              Simple, Transparent Pricing
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Transparent pricing designed around chapters.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              A simple yearly platform fee keeps your executive board aligned, and a lightweight member fee scales with your chapter.
              <br />
              No hidden add-ons—just modern tooling that pays for itself in time saved.
            </p>
          </div>

          {/* Main Pricing Card */}
          <div className="rounded-3xl border-2 border-[var(--brand-primary)] bg-white p-8 shadow-xl sm:p-12">
            <div className="text-center">
              <h2 className="text-3xl font-semibold !text-slate-600">GreekPay Standard</h2>
              <div className="mt-6">
                <span className="text-5xl font-bold text-slate-900">$200</span>
                <span className="ml-2 text-xl text-slate-600">+ $10/member</span>
              </div>
              <p className="mt-3 text-slate-600">per year</p>
            </div>

            <div className="mt-8 space-y-4 border-t border-slate-200 pt-8">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span className="font-medium text-slate-900">Annual chapter platform</span>
                <span className="text-xl font-semibold text-slate-900">$200</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span className="font-medium text-slate-900">Active member access</span>
                <span className="text-xl font-semibold text-slate-900">$10 / member</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4">
                <span className="font-medium text-emerald-900">Bank syncs, automations, support</span>
                <span className="text-xl font-semibold text-emerald-600">Included</span>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-center text-sm text-slate-600">
                One flat annual platform fee keeps the entire chapter on the same page. A per-member seat ensures every brother or sister can receive statements, reminders, and pay securely.
              </p>
            </div>
          </div>

          {/* Example Calculations */}
          <div className="space-y-6">
            <h2 className="text-center text-2xl font-semibold text-slate-900">Example Pricing</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--brand-border)] bg-white p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-slate-500">Small Chapter</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">$700</p>
                <p className="mt-1 text-sm text-slate-600">50 members/year</p>
                <p className="mt-3 text-xs text-slate-500">$200 + (50 × $10)</p>
              </div>
              <div className="rounded-xl border-2 border-[var(--brand-primary)] bg-white p-6 text-center shadow-md">
                <p className="text-sm font-medium text-[var(--brand-primary)]">Medium Chapter</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">$1,200</p>
                <p className="mt-1 text-sm text-slate-600">100 members/year</p>
                <p className="mt-3 text-xs text-slate-500">$200 + (100 × $10)</p>
              </div>
              <div className="rounded-xl border border-[var(--brand-border)] bg-white p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-slate-500">Large Chapter</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">$1,700</p>
                <p className="mt-1 text-sm text-slate-600">150 members/year</p>
                <p className="mt-3 text-xs text-slate-500">$200 + (150 × $10)</p>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-slate-900">Everything you need, included.</h2>
              <p className="mt-2 text-slate-600">
                No hidden fees, no surprise charges. Every feature is available to all chapters.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {includedFeatures.map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-3 rounded-lg border border-[var(--brand-border)] bg-white p-4"
                >
                  <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-emerald-500" />
                  <span className="text-sm font-medium text-slate-900">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Why GreekPay */}
          <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-8">
            <h3 className="text-xl font-semibold text-slate-900">Why chapters choose GreekPay</h3>
            <ul className="mt-6 space-y-4 text-slate-700">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 text-[var(--brand-primary)]">●</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Section */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 p-8 text-center text-white shadow-xl sm:p-12">
            <h2 className="text-3xl font-semibold">Ready to get started?</h2>
            <p className="mt-3 text-blue-100">
              Talk to our team to learn more about GreekPay and get your chapter set up.
              <br />
              We'll walk you through the platform and answer any questions about pricing.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate('/contact')}
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-blue-600 shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl"
              >
                Contact Our Team
              </button>
              <button
                onClick={() => navigate('/demo')}
                className="inline-flex items-center justify-center rounded-full border-2 border-white px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Try the Demo
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;

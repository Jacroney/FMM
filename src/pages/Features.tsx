import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ArrowPathIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const featureSections = [
  {
    title: 'Dashboard — Executive Control Center',
    description:
      'Give treasurers and execs a live snapshot of chapter finances in one place.',
    bullets: [
      'Total cash position and budget health at a glance',
      'Recent activity, upcoming recurring items, and dues status',
      'AI insights and operational alerts to guide focus'
    ],
    icon: ChartBarIcon
  },
  {
    title: 'Transactions — Real‑Time Ledger',
    description:
      'A centralized transactions hub with search, filters, and categorization.',
    bullets: [
      'Full transaction history in one place',
      'Manual entry and CSV import',
      'Inline category editing and clean audit trail'
    ],
    icon: ClipboardDocumentCheckIcon
  },
  {
    title: 'Budgets — Planning & Control',
    description:
      'Budget creation, allocation, and monitoring by category.',
    bullets: [
      'Live spend vs. budgeted tracking',
      'Period‑based planning with real‑time variance',
      'Catch overspend early'
    ],
    icon: CurrencyDollarIcon
  },
  {
    title: 'Members & Dues — Billing + Collections',
    description:
      'Manage member roster, assign dues, and track payments.',
    bullets: [
      'Automated dues configuration and assignments',
      'Payment tracking, late fees, and reminders',
      'Member portal for fast, self‑serve payment'
    ],
    icon: UserGroupIcon
  },
  {
    title: 'Reports — Board‑Ready Outputs',
    description:
      'Clear reports for execs, alumni boards, and audits.',
    bullets: [
      'Exportable charts and summaries (PDF/CSV)',
      'Dues collection rates and budget health reports',
      'Transparency for leadership and stakeholders'
    ],
    icon: ArrowTrendingUpIcon
  },
  {
    title: 'Bank Sync (Plaid) — Automated Reconciliation',
    description:
      'Connect accounts and pull transactions automatically.',
    bullets: [
      'Always‑up‑to‑date ledger',
      'Reduces manual entry errors',
      'Continuous reconciliation with live imports'
    ],
    icon: BanknotesIcon
  },
  {
    title: 'Recurring Transactions — Predictable Cash Flow',
    description:
      'Set and manage recurring income/expenses.',
    bullets: [
      'Clear future cash flow outlook',
      'Automated posting and forecasted impact'
    ],
    icon: ArrowPathIcon
  },
  {
    title: 'AI Advisor — Smart Financial Guidance',
    description:
      'Chat‑based advisor using chapter data and knowledge context.',
    bullets: [
      'Fast answers about budgets, dues, and cash health',
      'Insights that help execs make better decisions'
    ],
    icon: SparklesIcon
  },
  {
    title: 'Settings & Organization Management',
    description:
      'Control branding, roles, permissions, and integrations.',
    bullets: [
      'Role‑based access (treasurer, exec, member)',
      'Secure multi‑tenant setup',
      'Custom chapter branding and preferences'
    ],
    icon: Cog6ToothIcon
  }
];

const sellingPoints = [
  {
    title: 'Leadership clarity',
    description: 'Execs always know the financial state and next actions.'
  },
  {
    title: 'Operational speed',
    description: 'Bank sync + automation replaces manual work.'
  },
  {
    title: 'Member‑friendly payments',
    description: 'Simpler dues collection improves compliance.'
  },
  {
    title: 'Audit‑ready reporting',
    description: 'Board‑grade exports in minutes, not days.'
  }
];

const Features: React.FC = () => {
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
            <Link to="/features" className="text-white">Features</Link>
            <Link to="/pricing" className="transition-colors hover:text-white">Pricing</Link>
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

      <main>
        <section className="border-b border-[var(--brand-border)] bg-gradient-to-b from-[#0f172a] via-[#0b1222] to-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
                Product Features
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Everything your chapter needs to run a modern treasury.
              </h1>
              <p className="mt-4 text-lg text-white/70">
                GreekPay brings dues, budgets, transactions, reporting, and member management into one
                trusted workspace—so leaders stay clear, fast, and audit‑ready.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/demo')}
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  Launch interactive demo
                </button>
                <button
                  onClick={() => navigate('/contact')}
                  className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Talk to sales
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-2">
              {featureSections.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-3xl border border-[var(--brand-border)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h2 className="text-lg font-semibold" style={{ color: '#0b1120' }}>
                        {feature.title}
                      </h2>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{feature.description}</p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {feature.bullets.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold" style={{ color: '#0b1120' }}>
                    Why it sells
                  </h2>
                  <p className="text-sm text-slate-600">
                    GreekPay makes chapter treasury professional, transparent, and effortless.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/demo')}
                  className="rounded-full bg-[var(--brand-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  See it live
                </button>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {sellingPoints.map((point) => (
                  <div key={point.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold" style={{ color: '#0b1120' }}>
                      {point.title}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{point.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Features;

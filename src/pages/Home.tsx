import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { disableDemoMode } from '../demo/demoMode';

const benefits = [
  {
    title: 'Centralised treasury view',
    description: 'Track dues, budgets, and every transaction from a single, real-time dashboard tailored for chapter execs.'
  },
  {
    title: 'Automated bank syncs',
    description: 'Connect your bank accounts in minutes and let Plaid-powered imports keep the books reconciled.'
  },
  {
    title: 'Member-friendly billing',
    description: 'Share secure statements, collect dues, and stay on top of member balances without spreadsheets.'
  }
];

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleSignInClick = () => {
    disableDemoMode();
    navigate('/signin', { state: { forceLogin: true } });
  };

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] text-slate-900">
      <header className="border-b border-[var(--brand-border)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center">
            <img
              src="/GreekPay-logo-transparent.png"
              alt="GreekPay Logo"
              className="h-10 w-auto"
            />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <a href="#features" className="hover:text-[var(--brand-primary)]">Features</a>
            <Link to="/pricing" className="hover:text-[var(--brand-primary)]">Pricing</Link>
            <Link to="/demo" className="hover:text-[var(--brand-primary)]">Demo</Link>
            <Link to="/contact" className="hover:text-[var(--brand-primary)]">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSignInClick}
              className="rounded-full border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Sign in
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <span className="surface-pill">Built for fraternity treasurers</span>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  Modern financial management for every chapter.
                </h1>
                <p className="text-lg text-slate-600">
                  GreekPay replaces scattered spreadsheets with a single workspace that connects bank data, member dues, and executive reporting. Be audit-ready and member-friendly from day one.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => navigate('/demo')}
                    className="focus-ring inline-flex items-center justify-center rounded-full bg-[var(--brand-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Launch interactive demo
                  </button>
                  <button
                    type="button"
                    onClick={handleSignInClick}
                    className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--brand-border)] bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    Explore the product
                  </button>
                </div>
                <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-600">
                    "The first treasury platform that actually understands fraternity operations. Budget approvals, reimbursements, and dues collection now live in one place."<br />
                    <span className="mt-2 block font-semibold text-slate-900">— Beta chapter treasurer</span>
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -left-10 -top-10 h-56 w-56 rounded-full bg-blue-100 blur-3xl" aria-hidden="true" />
                <div className="surface-card relative overflow-hidden rounded-3xl p-6">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Live view</p>
                  <p className="mt-4 text-lg font-semibold text-slate-900">$48,320 in chapter funds</p>
                  <p className="text-sm text-slate-500">+12.4% vs last quarter</p>
                  <div className="mt-6 grid gap-4">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Bank syncs</p>
                        <p className="text-xs text-slate-500">Chase, First Platypus Bank</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">Up to date</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Dues collected</p>
                        <p className="text-xs text-slate-500">42 of 48 members paid</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">88%</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 px-4 py-3">
                      <p className="text-sm font-medium text-slate-700">Top categories</p>
                      <ul className="mt-2 space-y-2 text-xs text-slate-500">
                        <li className="flex justify-between"><span>Events</span><span>$12,450</span></li>
                        <li className="flex justify-between"><span>Operations</span><span>$7,210</span></li>
                        <li className="flex justify-between"><span>Dues collected</span><span>$24,660</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-[var(--brand-border)] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
                    ●
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{benefit.title}</h3>
                  <p className="text-sm text-slate-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="border-t border-[var(--brand-border)] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 p-8 text-white shadow-xl">
              <h2 className="text-3xl font-semibold">See the product in action.</h2>
              <p className="mt-3 max-w-xl text-sm text-blue-100">
              Explore a guided experience of GreekPay—follow cash flow from bank sync to budget report in under three minutes.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate('/demo')}
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-blue-600 transition-transform hover:-translate-y-0.5"
                >
                  Launch demo workspace
                </button>
                <button
                  type="button"
                  onClick={handleSignInClick}
                  className="inline-flex items-center justify-center rounded-full border border-white/60 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Sign in to your chapter
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--brand-border)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} GreekPay. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#features" className="hover:text-[var(--brand-primary)]">Features</a>
            <a href="#pricing" className="hover:text-[var(--brand-primary)]">Pricing</a>
            <Link to="/demo" className="hover:text-[var(--brand-primary)]">Demo</Link>
            <button
              type="button"
              onClick={handleSignInClick}
              className="hover:text-[var(--brand-primary)]"
            >
              Sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

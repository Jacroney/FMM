import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { disableDemoMode } from '../demo/demoMode';

const benefits = [
  {
    title: 'Centralized treasury view',
    description: 'Track dues, budgets, and transactions from one real-time workspace built for chapter leaders.',
    icon: '●'
  },
  {
    title: 'Automated bank syncs',
    description: 'Connect accounts in minutes and keep books reconciled with live Plaid-powered imports.',
    icon: '●'
  },
  {
    title: 'Member-friendly billing',
    description: 'Collect dues with clear statements and a member portal designed for fast payments.',
    icon: '●'
  }
];

const outcomes = [
  {
    label: 'Bank sync health',
    value: 'Up to date',
    description: 'Daily syncs across connected institutions.'
  },
  {
    label: 'Dues collected',
    value: '88%',
    description: '42 of 48 members paid this term.'
  },
  {
    label: 'Budget health',
    value: 'On track',
    description: 'Spending aligned with planned allocations.'
  },
  {
    label: 'Reports ready',
    value: '3 clicks',
    description: 'Export board-ready reports anytime.'
  }
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const demoRoutes = [
    '/demo/dashboard',
    '/demo/transactions',
    '/demo/budgets',
    '/demo/members',
    '/demo/reports'
  ];
  const demoNav = ['Dashboard', 'Transactions', 'Budgets', 'Members', 'Reports'];
  const demoNavStyles = [
    'border-blue-200 text-blue-700',
    'border-indigo-200 text-indigo-700',
    'border-emerald-200 text-emerald-700',
    'border-amber-200 text-amber-700',
    'border-violet-200 text-violet-700'
  ];
  const [demoRouteIndex, setDemoRouteIndex] = useState(0);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const demoFrameRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const scrollDelayRef = useRef<number | null>(null);
  const demoBaseWidth = 1440;
  const demoBaseHeight = 900;
  const [demoScale, setDemoScale] = useState(1);

  const handleSignInClick = () => {
    disableDemoMode();
    navigate('/signin', { state: { forceLogin: true } });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      setIsHeaderScrolled(window.scrollY > 6);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const frame = demoFrameRef.current;
    if (!frame) return;

    const updateScale = () => {
      const { width, height } = frame.getBoundingClientRect();
      if (!width || !height) return;
      const scale = Math.min(width / demoBaseWidth, height / demoBaseHeight);
      setDemoScale(Number(scale.toFixed(4)));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  const handleIframeLoad = () => {
    if (typeof window === 'undefined') return;
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow;
    const doc = iframe?.contentDocument;

    if (!win || !doc) return;
    win.scrollTo(0, 0);

    if (scrollAnimationRef.current) {
      window.cancelAnimationFrame(scrollAnimationRef.current);
    }
    if (scrollDelayRef.current) {
      window.clearTimeout(scrollDelayRef.current);
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const docElement = doc.documentElement;
    const body = doc.body;
    const scrollHeight = Math.max(docElement.scrollHeight, body?.scrollHeight ?? 0);
    const maxScroll = Math.max(scrollHeight - win.innerHeight, 0);
    const delayMs = 7000;
    const durationMs = 20000;

    const advanceRoute = () => {
      setDemoRouteIndex((prev) => (prev + 1) % demoRoutes.length);
    };

    if (maxScroll === 0) {
      scrollDelayRef.current = window.setTimeout(advanceRoute, delayMs);
      return;
    }

    const step = (now: number, startTime: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      win.scrollTo(0, maxScroll * progress);
      if (progress < 1) {
        scrollAnimationRef.current = window.requestAnimationFrame((next) => step(next, startTime));
      } else {
        advanceRoute();
      }
    };

    scrollDelayRef.current = window.setTimeout(() => {
      const startTime = window.performance.now();
      scrollAnimationRef.current = window.requestAnimationFrame((now) => step(now, startTime));
    }, delayMs);
  };

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] text-slate-950">
      <header
        className={`sticky top-0 z-50 transition-colors duration-200 ${
          isHeaderScrolled
            ? 'border-b border-[var(--brand-border)] bg-white/90 backdrop-blur'
            : 'border-b border-transparent bg-white'
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
            <span className="text-xl font-semibold tracking-tight text-slate-950">Greek Pay</span>
          </Link>
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-sm font-medium text-slate-700 sm:flex scale-[1.3] origin-center">
            <Link to="/features" className="transition-colors hover:text-[var(--brand-primary)]">Features</Link>
            <Link to="/pricing" className="transition-colors hover:text-[var(--brand-primary)]">Pricing</Link>
            <Link to="/demo" className="transition-colors hover:text-[var(--brand-primary)]">Demo</Link>
            <Link to="/contact" className="transition-colors hover:text-[var(--brand-primary)]">Contact</Link>
          </nav>
          <div className="absolute -right-28 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSignInClick}
              className="rounded-full bg-[var(--brand-primary)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
            >
              Sign in
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <span className="surface-pill border border-[var(--brand-border)] bg-white text-[var(--brand-primary)] shadow-sm">
                Built for fraternity treasurers
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                <span className="text-slate-950">One treasury workspace.</span>
                <br />
                <span className="text-[var(--brand-primary)]">Zero spreadsheet chaos.</span>
              </h1>
              <p className="mt-4 text-lg text-slate-700">
                GreekPay unifies dues, bank sync, budgets, and reporting so your exec team can stay audit-ready and member-friendly.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  onClick={() => navigate('/demo')}
                  className="inline-flex items-center justify-center rounded-full bg-[var(--brand-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
                >
                  Launch interactive demo
                </button>
                <button
                  type="button"
                  onClick={handleSignInClick}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--brand-border)] bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--brand-primary)] hover:bg-slate-200 hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
                >
                  Sign in
                </button>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-700">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                  Dues collected: <span className="text-[var(--brand-primary)]">$24,660</span>
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                  <span className="text-[var(--brand-primary)]">48</span> active members
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                  <span className="text-[var(--brand-primary)]">5</span> bank accounts linked
                </span>
              </div>
            </div>
            <div className="mt-12">
              <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-white shadow-xl">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="ml-2 text-xs text-slate-500">greekpay.app/demo</span>
                </div>
                <div ref={demoFrameRef} className="relative aspect-[16/9] overflow-hidden bg-slate-900">
                  <iframe
                    key={demoRoutes[demoRouteIndex]}
                    src={demoRoutes[demoRouteIndex]}
                    title="GreekPay demo preview"
                    className="pointer-events-none absolute left-1/2 top-0 origin-top"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    ref={iframeRef}
                    onLoad={handleIframeLoad}
                    style={{
                      width: `${demoBaseWidth}px`,
                      height: `${demoBaseHeight}px`,
                      transform: `translateX(-50%) scale(${demoScale})`,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20" />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-500">
                Live demo preview rotates automatically.
              </p>
            </div>
            <div className="mt-10 rounded-2xl border border-[var(--brand-border)] bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">
                “The first treasury platform that actually understands fraternity operations. Budget approvals,
                reimbursements, and dues collection now live in one place.”
                <span className="mt-3 block font-semibold text-slate-950">— Kappa Sigma chapter treasurer</span>
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Built for focus</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">Everything your treasurer needs in one view</h2>
              </div>
              <p className="max-w-xl text-sm text-slate-600">
                Give execs a single system of record that replaces spreadsheets, group chats, and inbox chaos.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
                    {benefit.icon}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: '#0b1120' }}>
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Outcomes</p>
                <h2 className="text-3xl font-semibold text-slate-950">Show the story, not just the numbers</h2>
                <p className="text-sm text-slate-600">
                  Every section of the dashboard answers a specific question for your board: cash position, member
                  obligations, and budget momentum.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {outcomes.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-[var(--brand-border)] bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold" style={{ color: '#0b1120' }}>
                        {item.value}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Executive snapshot</p>
                    <p className="mt-2 text-2xl font-semibold" style={{ color: '#0b1120' }}>
                      $48,320
                    </p>
                    <p className="text-xs text-slate-500">Total available funds</p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                    +12.4% vs last quarter
                  </span>
                </div>
                <div className="mt-6 grid gap-4">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#0b1120' }}>
                        Bank syncs
                      </p>
                      <p className="text-xs text-slate-500">Chase, First Platypus Bank</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">Up to date</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#0b1120' }}>
                        Dues collected
                      </p>
                      <p className="text-xs text-slate-500">42 of 48 members paid</p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--brand-primary)]">88%</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: '#0b1120' }}>
                      Top categories
                    </p>
                    <ul className="mt-2 space-y-2 text-xs text-slate-500">
                      <li className="flex justify-between"><span>Events</span><span>$12,450</span></li>
                      <li className="flex justify-between"><span>Operations</span><span>$7,210</span></li>
                      <li className="flex justify-between"><span>Dues collected</span><span>$24,660</span></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                {demoNav.map((label, index) => (
                  <span
                    key={label}
                    className={`rounded-full border bg-white px-3 py-1 transition-colors ${
                      index === demoRouteIndex
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                        : demoNavStyles[index % demoNavStyles.length]
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="demo" className="border-t border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <h2 className="text-3xl font-semibold" style={{ color: '#0b1120' }}>
                    See the product in action.
                  </h2>
                  <p className="max-w-xl text-sm text-slate-600">
                    Explore a guided experience of GreekPay—follow cash flow from bank sync to budget report in under three minutes.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => navigate('/demo')}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--brand-primary)] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
                  >
                    Launch demo workspace
                  </button>
                  <button
                    type="button"
                    onClick={handleSignInClick}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--brand-border)] bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
                  >
                    Sign in to your chapter
                  </button>
                </div>
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

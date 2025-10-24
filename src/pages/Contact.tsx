import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const teamMembers = [
  {
    name: 'Joseph Croney',
    role: 'Co-Founder & CEO',
    bio: 'Former chapter treasurer with a passion for modernizing fraternity financial operations.',
    initials: 'JC'
  },
  {
    name: 'Peter Moschitto',
    role: 'Co-Founder & CTO',
    bio: 'Building intuitive financial tools that treasurers actually want to use.',
    initials: 'PM'
  }
];

const Contact: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] text-slate-900">
      {/* Header */}
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
            <Link to="/#features" className="hover:text-[var(--brand-primary)]">Features</Link>
            <Link to="/pricing" className="hover:text-[var(--brand-primary)]">Pricing</Link>
            <Link to="/demo" className="hover:text-[var(--brand-primary)]">Demo</Link>
            <Link to="/contact" className="text-[var(--brand-primary)]">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-16">
          {/* Hero Section */}
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Get in Touch
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              We're here to help you modernize your chapter's financial management.
              <br />
              Reach out to learn more about GreekPay or schedule a demo.
            </p>
          </div>

          {/* Contact Section */}
          <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-8 shadow-lg sm:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-[var(--brand-primary)]">
                <EnvelopeIcon className="h-8 w-8" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-slate-900">Email Us</h2>
              <p className="mt-2 text-slate-600">
                Have questions or want to see a demo? Send us an email and we'll get back to you within 24 hours.
              </p>
              <a
                href="mailto:joseph@greekpay.org"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-8 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl"
              >
                <EnvelopeIcon className="h-5 w-5" />
                joseph@greekpay.org
              </a>
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-slate-900">About GreekPay</h2>
              <p className="mt-4 text-lg text-slate-600">
                We're building the modern financial platform that fraternity treasurers deserve.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-8 shadow-sm">
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700">
                  GreekPay was born from firsthand experience managing chapter finances. We know the pain of
                  juggling spreadsheets, tracking member dues manually, and trying to keep everyone on the same
                  page during budget discussions.
                </p>
                <p className="text-slate-700">
                  Our mission is to replace scattered tools with a single, intuitive platform that connects bank
                  data, member payments, and executive reporting. We want every chapter treasurer to feel
                  confident and organized—not overwhelmed by manual bookkeeping.
                </p>
                <p className="text-slate-700">
                  Whether you're managing a small chapter or a large organization, GreekPay adapts to your needs
                  with transparent pricing, automatic bank syncing, and tools built specifically for Greek life
                  financial operations.
                </p>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-800">
                <UserGroupIcon className="h-4 w-4" />
                Meet the Team
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900">The People Behind GreekPay</h2>
              <p className="mt-2 text-slate-600">
                A small team committed to making chapter treasury management simple and stress-free.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {teamMembers.map((member) => (
                <div
                  key={member.name}
                  className="rounded-xl border border-[var(--brand-border)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-[var(--brand-primary)]">
                      {member.initials}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{member.name}</h3>
                      <p className="text-sm text-[var(--brand-primary)]">{member.role}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-600">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 p-8 text-center text-white shadow-xl">
            <h2 className="text-2xl font-semibold">Ready to Get Started?</h2>
            <p className="mt-2 text-sm text-blue-100">
              Try our interactive demo to see GreekPay in action with sample chapter data.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate('/demo')}
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-blue-600 shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl"
              >
                Try the Demo
              </button>
              <button
                onClick={() => navigate('/signin')}
                className="inline-flex items-center justify-center rounded-full border border-white/60 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;

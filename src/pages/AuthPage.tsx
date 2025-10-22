import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../components/auth/LoginForm';
import { LoadingSpinner } from '../components/LoadingSpinner';

const AuthPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)]">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    const redirectTo = location.state?.from || '/app';
    return <Navigate to={redirectTo} replace />;
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
            <div className="space-y-3 rounded-2xl border border-[var(--brand-border)] bg-white p-6 shadow-sm dark:bg-gray-800">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Need an invite?</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                New treasurers can request access from their executive board. Existing users can switch chapters after signing in.
              </p>
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

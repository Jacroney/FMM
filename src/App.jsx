import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChapterProvider } from './context/ChapterContext';
import { ChapterThemeProvider } from './context/ChapterThemeContext';
import { FinancialProvider } from './context/FinancialContext';
import AuthProtection from './components/AuthProtection';
import MainLayout from './layouts/MainLayout';
import { Dashboard } from './components/Dashboard';
import { MemberDashboard } from './components/MemberDashboard';
import { FirstTimeSetup } from './components/FirstTimeSetup';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Dues from './pages/Dues';
import RecurringTransactions from './pages/RecurringTransactions';
import { PlaidSync } from './pages/PlaidSync';
import { NotFound } from './components/NotFound';
import Home from './pages/Home';
import Demo from './pages/Demo';
import AuthPage from './pages/AuthPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChapterProvider>
          <ChapterThemeProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/demo/*" element={<Demo />} />
                <Route path="/signin" element={<AuthPage />} />
                <Route path="/signup" element={<AuthPage />} />
                <Route
                  path="/app/*"
                  element={
                    <AuthProtection>
                      <FinancialProvider>
                        <ProtectedAppRoutes />
                      </FinancialProvider>
                    </AuthProtection>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  className: '',
                  style: {
                    background: 'var(--toast-bg, #363636)',
                    color: 'var(--toast-text, #fff)'
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff'
                    }
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff'
                    }
                  }
                }}
              />
              <SpeedInsights />
              <Analytics />
            </Router>
          </ChapterThemeProvider>
        </ChapterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const ProtectedAppRoutes = () => {
  const { hasAdminAccess, isMember, isLoading, profile, isAdmin, user } = useAuth();
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const needsFirstTimeSetup = isAdmin && profile?.phone_number === undefined;

  useEffect(() => {
    if (isLoading || (!profile && user)) {
      const timer = setTimeout(() => {
        console.error('Loading timeout reached. Profile may have failed to load.');
        setLoadingTimeout(true);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, profile, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)] dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-sm text-slate-500 dark:text-slate-300">Loading application…</p>
        </div>
      </div>
    );
  }

  if (!profile && user && !loadingTimeout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)] dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-sm text-slate-500">Loading profile…</p>
          <p className="text-xs text-slate-400">This is taking longer than usual…</p>
        </div>
      </div>
    );
  }

  if (loadingTimeout && user && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)] p-4 dark:bg-gray-900">
        <div className="max-w-md text-center">
          <div className="mb-4 text-5xl">⚠️</div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Profile loading failed</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            There was an issue loading your profile. This may be due to database permissions.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (needsFirstTimeSetup && !showFirstTimeSetup) {
    return <FirstTimeSetup onComplete={() => setShowFirstTimeSetup(true)} />;
  }

  if (isMember) {
    return (
      <Routes>
        <Route path="*" element={<MemberDashboard />} />
      </Routes>
    );
  }

  if (hasAdminAccess) {
    return (
      <Routes>
        <Route path="" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="recurring" element={<RecurringTransactions />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="reports" element={<Reports />} />
          <Route path="dues" element={<Dues />} />
          <Route path="plaid-sync" element={<PlaidSync />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinancialProvider } from './context/FinancialContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChapterProvider } from './context/ChapterContext';
import AuthProtection from './components/PasswordProtection';
import { FirstTimeSetup } from './components/FirstTimeSetup';
import MainLayout from './layouts/MainLayout';
import { Dashboard } from './components/Dashboard';
import { MemberDashboard } from './components/MemberDashboard';
import { NotFound } from './components/NotFound';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Members from './pages/Members';
import { PlaidSync } from './pages/PlaidSync';
import RecurringTransactions from './pages/RecurringTransactions';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChapterProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProtection>
              <FinancialProvider>
                <AppRoutes />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    className: '',
                    style: {
                      background: 'var(--toast-bg, #363636)',
                      color: 'var(--toast-text, #fff)',
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: '#22c55e',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      duration: 5000,
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
                <SpeedInsights />
                <Analytics />
              </FinancialProvider>
            </AuthProtection>
          </Router>
        </ChapterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Role-based routing component
const AppRoutes = () => {
  const { hasAdminAccess, isMember, isLoading, profile, isAdmin, user } = useAuth();
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Check if admin needs first-time setup (you could add a setup_completed field to user_profiles)
  const needsFirstTimeSetup = isAdmin && profile?.phone_number === undefined;

  // Add timeout for loading states
  useEffect(() => {
    if (isLoading || (!profile && user)) {
      const timer = setTimeout(() => {
        console.error('Loading timeout reached. Profile may have failed to load.');
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timer);
    }
  }, [isLoading, profile, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading application...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated but no profile is loaded yet, show loading with timeout
  if (!profile && user && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
          <p className="text-sm text-gray-400">This is taking longer than usual...</p>
        </div>
      </div>
    );
  }

  // If loading timed out, show error and allow user to continue
  if (loadingTimeout && user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Profile Loading Failed</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            There was an issue loading your profile. This may be due to database permissions.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show first-time setup for new admins
  if (needsFirstTimeSetup && !showFirstTimeSetup) {
    return <FirstTimeSetup onComplete={() => setShowFirstTimeSetup(true)} />;
  }

  // Member view - only sees dues dashboard
  if (isMember) {
    return (
      <Routes>
        <Route path="*" element={<MemberDashboard />} />
      </Routes>
    );
  }

  // Admin/Exec view - full access to financial tools
  if (hasAdminAccess) {
    return (
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="recurring" element={<RecurringTransactions />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="reports" element={<Reports />} />
          <Route path="members" element={<Members />} />
          <Route path="plaid-sync" element={<PlaidSync />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    );
  }

  // Fallback
  return (
    <Routes>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;

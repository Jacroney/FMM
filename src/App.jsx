import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProtection>
            <ChapterProvider>
              <FinancialProvider>
                <AppRoutes />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
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
              </FinancialProvider>
            </ChapterProvider>
          </AuthProtection>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Role-based routing component
const AppRoutes = () => {
  const { hasAdminAccess, isMember, isLoading, profile, isAdmin } = useAuth();
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);

  // Check if admin needs first-time setup (you could add a setup_completed field to user_profiles)
  const needsFirstTimeSetup = isAdmin && profile?.phone_number === undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is authenticated but no profile is loaded yet, show loading
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          <Route path="budgets" element={<Budgets />} />
          <Route path="reports" element={<Reports />} />
          <Route path="members" element={<Members />} />
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

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FinancialProvider } from './context/FinancialContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChapterProvider } from './context/ChapterContext';
import PasswordProtection from './components/PasswordProtection';
import MainLayout from './layouts/MainLayout';
import { Dashboard } from './components/Dashboard';
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
      <PasswordProtection>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ChapterProvider>
            <FinancialProvider>
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
        </Router>
      </PasswordProtection>
    </ThemeProvider>
  );
}

export default App;

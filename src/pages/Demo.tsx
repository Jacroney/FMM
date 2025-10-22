import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { FinancialProvider } from '../context/FinancialContext';
import { enableDemoMode, disableDemoMode } from '../demo/demoMode';
import { isDemoModeEnabled } from '../utils/env';
import MainLayout from '../layouts/MainLayout';
import { Dashboard } from '../components/Dashboard';
import Transactions from './Transactions';
import Budgets from './Budgets';
import Dues from './Dues';
import Reports from './Reports';
import Settings from './Settings';
import type { MenuItem } from '../components/Sidebar';

const demoMenuItems: MenuItem[] = [
  { title: 'Dashboard', slug: '', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { title: 'Transactions', slug: '/transactions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { title: 'Budgets', slug: '/budgets', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { title: 'Dues', slug: '/dues', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { title: 'Reports', slug: '/reports', icon: 'M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v7m3-2h6' },
  { title: 'Settings', slug: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
];

const demoPageTitles: Record<string, string> = {
  '/demo': 'Greek Pay Dashboard',
  '/demo/transactions': 'Transactions',
  '/demo/budgets': 'Budgets',
  '/demo/dues': 'Dues Management',
  '/demo/reports': 'Reports',
  '/demo/settings': 'Settings'
};

const DemoHeaderActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--brand-border)] bg-white py-1 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700 w-[140px]"
      >
        <ArrowUturnLeftIcon className="h-3 w-3" aria-hidden="true" />
        <span className="whitespace-nowrap">Back to site</span>
      </button>
    </div>
  );
};

const DemoLayout: React.FC = () => (
  <MainLayout
    basePath="/demo"
    showSignOut={false}
    menuItems={demoMenuItems}
    pageTitles={demoPageTitles}
    headerActions={<DemoHeaderActions />}
    showSearchButton={false}
  />
);

const DemoRoutes: React.FC = () => (
  <Routes>
    <Route element={<DemoLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="transactions" element={<Transactions />} />
      <Route path="budgets" element={<Budgets />} />
      <Route path="dues" element={<Dues />} />
      <Route path="reports" element={<Reports />} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/demo" replace />} />
    </Route>
  </Routes>
);

const Demo: React.FC = () => {
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    if (!isDemoModeEnabled()) {
      enableDemoMode();
    }
    setReady(true);

    return () => {
      disableDemoMode();
    };
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <FinancialProvider>
      <DemoRoutes />
    </FinancialProvider>
  );
};

export default Demo;

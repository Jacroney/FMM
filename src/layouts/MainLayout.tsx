import React, { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { ChapterSelector } from '../components/ChapterSelector';
import { FloatingAIChat } from '../components/FloatingAIChat';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Chapter Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/dues': 'Dues Management',
  '/reports': 'Reports',
  '/settings': 'Settings'
};

const MainLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const pageTitle = useMemo(() => {
    const path = location.pathname.replace(/\/$/, '');
    return PAGE_TITLES[path] || 'Chapter Dashboard';
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-100">
      <Sidebar collapsed={sidebarCollapsed} />
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <span className="sr-only">{sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
                {sidebarCollapsed ? (
                  <Bars3Icon className="h-5 w-5" />
                ) : (
                  <XMarkIcon className="h-5 w-5" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 sm:text-xl">
                  {pageTitle}
                </h1>
              </div>
            </div>
            <div className="w-full max-w-xs sm:max-w-sm">
              <ChapterSelector />
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <FloatingAIChat />
    </div>
  );
};

export default MainLayout; 

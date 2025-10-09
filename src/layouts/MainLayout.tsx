import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bars3Icon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import { Sidebar } from '../components/Sidebar';
import { ChapterSelector } from '../components/ChapterSelector';
import CommandPalette from '../components/CommandPalette';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Greek Pay Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/reports': 'Reports',
  '/members': 'Members',
  '/plaid-sync': 'Bank Sync',
  '/settings': 'Settings'
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const pageTitle = useMemo(() => {
    const normalized = location.pathname.replace(/\/$/, '');
    return PAGE_TITLES[normalized] || 'Greek Pay Dashboard';
  }, [location.pathname]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handlePaletteAction = (action: string) => {
    switch (action) {
      case 'import-transactions':
        navigate('/transactions');
        setTimeout(() => window.dispatchEvent(new CustomEvent('open-transactions-import')), 120);
        break;
      case 'export-pdf':
        navigate('/reports');
        setTimeout(() => window.dispatchEvent(new CustomEvent('export-reports-pdf')), 120);
        break;
      case 'refresh-data':
        window.dispatchEvent(new CustomEvent('refresh-financial-data'));
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--brand-surface)] text-slate-900 transition-colors duration-200 dark:bg-gray-900 dark:text-slate-100">
      <Sidebar collapsed={sidebarCollapsed} />
      <div
        className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <CommandPalette
          isOpen={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onAction={handlePaletteAction}
        />

        <header className="sticky top-0 z-40 border-b border-[var(--brand-border)] bg-white/80 backdrop-blur dark:bg-gray-900/80">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="focus-ring inline-flex items-center justify-center rounded-lg border border-[var(--brand-border)] bg-white p-2.5 text-slate-600 shadow-sm transition-colors hover:bg-slate-100 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <span className="sr-only">{sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
                {sidebarCollapsed ? (
                  <ChevronDoubleRightIcon className="h-5 w-5" />
                ) : (
                  <ChevronDoubleLeftIcon className="h-5 w-5" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold sm:text-xl">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:max-w-sm sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="focus-ring inline-flex items-center justify-between rounded-xl border border-[var(--brand-border)] bg-white px-4 py-2 text-sm text-slate-500 shadow-sm transition-colors hover:bg-slate-100 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700"
              >
                <span>Search or jump…</span>
                <span className="ml-3 hidden rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-400 sm:block">⌘K</span>
              </button>
              <div className="w-full sm:w-auto">
                <ChapterSelector />
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

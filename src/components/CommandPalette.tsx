import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

const ROUTES = [
  { label: 'Dashboard', path: '/app' },
  { label: 'Transactions', path: '/app/transactions' },
  { label: 'Budgets', path: '/app/budgets' },
  { label: 'Reports', path: '/app/reports' },
  { label: 'Dues management', path: '/app/dues' },
  { label: 'Settings', path: '/app/settings' }
];

const QUICK_ACTIONS = [
  { label: 'Import transactions', action: 'import-transactions' },
  { label: 'Export financial report (PDF)', action: 'export-pdf' },
  { label: 'Refresh financial data', action: 'refresh-data' }
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onAction }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 16);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const filteredRoutes = useMemo(() => {
    if (!query.trim()) return ROUTES;
    return ROUTES.filter((route) => route.label.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return QUICK_ACTIONS;
    return QUICK_ACTIONS.filter((action) => action.label.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/50 px-4 py-12 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="surface-card w-full max-w-2xl animate-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--brand-border)] px-5 py-4">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages or actions (⌘K)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="focus-ring w-full rounded-lg border border-transparent bg-[var(--brand-panel)] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:text-slate-100"
          />
        </div>

        <div className="grid gap-6 px-5 py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Navigate</p>
            <ul className="mt-2 space-y-1 text-sm">
              {filteredRoutes.length === 0 && (
                <li className="rounded-lg px-3 py-2 text-slate-500">No matches found.</li>
              )}
              {filteredRoutes.map((route) => (
                <li key={route.path}>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(route.path);
                      onClose();
                    }}
                    className="focus-ring flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {route.label}
                    <span className="text-xs text-slate-400">↵</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Quick actions</p>
            <ul className="mt-2 space-y-1 text-sm">
              {filteredActions.map((item) => (
                <li key={item.action}>
                  <button
                    type="button"
                    onClick={() => {
                      onAction(item.action);
                      onClose();
                    }}
                    className="focus-ring flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {item.label}
                    <span className="text-xs text-slate-400">⇧↵</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

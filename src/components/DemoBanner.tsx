import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InformationCircleIcon, ArrowRightOnRectangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';
import { disableDemoMode } from '../demo/demoMode';
import { isDemoModeEnabled } from '../utils/env';
import { demoStore } from '../demo/demoStore';

/**
 * DemoBanner component
 * Displays a banner at the top of the app when in demo mode
 * Provides buttons to reset demo data or exit to real login
 */
export const DemoBanner: React.FC = () => {
  const navigate = useNavigate();
  const isDemo = isDemoModeEnabled();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  if (!isDemo) {
    return null;
  }

  const handleResetDemo = () => {
    demoStore.reset();
    // Force a page refresh to re-render with fresh data
    window.location.reload();
  };

  const handleExitDemo = () => {
    setShowExitConfirm(true);
  };

  const handleReturnToMainSite = () => {
    disableDemoMode();
    navigate('/', { replace: true });
  };

  const confirmExitDemo = () => {
    disableDemoMode();
    navigate('/signin', { state: { forceLogin: true } });
  };

  const cancelExitDemo = () => {
    setShowExitConfirm(false);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-semibold">
                Demo Mode
              </span>
              <span className="text-xs text-blue-100 sm:text-sm">
                Sample data • Changes reset on exit
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReturnToMainSite}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              title="Return to main website"
            >
              <HomeIcon className="h-4 w-4" aria-hidden="true" />
              Return to Main Site
            </button>
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              title="Reset demo data to initial state"
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              Reset Data
            </button>
            <button
              type="button"
              onClick={handleExitDemo}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
              Exit & Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Exit Demo Mode?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to exit the demo? Any changes you've made will be lost and cannot be recovered.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={cancelExitDemo}
                className="flex-1 rounded-xl border border-[var(--brand-border)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-gray-700 dark:bg-gray-700 dark:text-slate-200 dark:hover:bg-gray-600"
              >
                Continue in Demo
              </button>
              <button
                onClick={confirmExitDemo}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
              >
                Exit to Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import { demoStore } from './demoStore';

export const DEMO_FLAG_KEY = '__GREEKPAY_DEMO__';
export const DEMO_DISABLE_STORAGE_KEY = '__GREEKPAY_DEMO_DISABLED__';
export const DEMO_EVENT = 'greekpay-demo-mode-change';

/**
 * Enable demo mode for the current session
 * Uses sessionStorage so demo mode clears when browser tab is closed
 * Resets demo store to initial state for fresh demo experience
 */
export const enableDemoMode = () => {
  if (typeof window !== 'undefined') {
    // Reset demo store to initial state first
    demoStore.reset();

    // Then enable demo mode
    (window as any)[DEMO_FLAG_KEY] = true;
    try {
      window.sessionStorage.removeItem(DEMO_DISABLE_STORAGE_KEY);
    } catch (error) {
      console.warn('Unable to clear demo disable flag:', error);
    }

    // Dispatch event after everything is set up
    window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: true }));
  }
};

/**
 * Disable demo mode and mark it as disabled for the current session
 * Uses sessionStorage so the disable flag clears when browser tab is closed
 */
export const disableDemoMode = () => {
  if (typeof window !== 'undefined') {
    delete (window as any)[DEMO_FLAG_KEY];
    try {
      window.sessionStorage.setItem(DEMO_DISABLE_STORAGE_KEY, 'true');
    } catch (error) {
      console.warn('Unable to persist demo disable flag:', error);
    }
    window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: false }));
  }
};

export const isDemoWindowFlagActive = () =>
  typeof window !== 'undefined' && Boolean((window as any)[DEMO_FLAG_KEY]);

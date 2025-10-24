import { DEMO_DISABLE_STORAGE_KEY, isDemoWindowFlagActive } from '../demo/demoMode';

const toBoolean = (value: string | undefined, fallback = false): boolean => {
  if (typeof value !== 'string') return fallback;
  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
      return true;
    case '0':
    case 'false':
    case 'no':
      return false;
    default:
      return fallback;
  }
};

export const isDemoModeEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    try {
      // Check sessionStorage for demo disable flag (session-based)
      if (window.sessionStorage.getItem(DEMO_DISABLE_STORAGE_KEY) === 'true') {
        return false;
      }
    } catch (error) {
      console.warn('Unable to read demo disable flag:', error);
    }
  }
  if (isDemoWindowFlagActive()) {
    return true;
  }
  return toBoolean(import.meta.env.VITE_APP_DEMO_MODE, false);
};

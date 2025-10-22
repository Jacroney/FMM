export const DEMO_FLAG_KEY = '__GREEKPAY_DEMO__';
export const DEMO_DISABLE_STORAGE_KEY = '__GREEKPAY_DEMO_DISABLED__';
export const DEMO_EVENT = 'greekpay-demo-mode-change';

export const enableDemoMode = () => {
  if (typeof window !== 'undefined') {
    (window as any)[DEMO_FLAG_KEY] = true;
    try {
      window.localStorage.removeItem(DEMO_DISABLE_STORAGE_KEY);
    } catch (error) {
      console.warn('Unable to clear demo disable flag:', error);
    }
    window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: true }));
  }
};

export const disableDemoMode = () => {
  if (typeof window !== 'undefined') {
    delete (window as any)[DEMO_FLAG_KEY];
    try {
      window.localStorage.setItem(DEMO_DISABLE_STORAGE_KEY, 'true');
    } catch (error) {
      console.warn('Unable to persist demo disable flag:', error);
    }
    window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: false }));
  }
};

export const isDemoWindowFlagActive = () =>
  typeof window !== 'undefined' && Boolean((window as any)[DEMO_FLAG_KEY]);

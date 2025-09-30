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
  return toBoolean(import.meta.env.VITE_APP_DEMO_MODE, false);
};


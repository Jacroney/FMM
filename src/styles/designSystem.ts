export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
};

export const spacing = {
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

export const borderRadius = {
  none: '0',
  sm: '0.375rem',
  DEFAULT: '0.5rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

export const transitions = {
  all: 'all 0.2s ease',
  colors: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
  opacity: 'opacity 0.2s ease',
  transform: 'transform 0.2s ease',
  shadow: 'box-shadow 0.2s ease',
};

export const componentStyles = {
  // Card styles
  card: `
    bg-white dark:bg-gray-800
    rounded-lg
    shadow-md hover:shadow-lg
    transition-shadow duration-200
    p-6
  `,

  // Button styles
  button: {
    base: `
      px-4 py-2.5
      rounded-lg
      font-medium
      transition-all duration-200
      inline-flex items-center justify-center gap-2
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    primary: `
      bg-blue-600 hover:bg-blue-700
      text-white
      focus:ring-blue-500
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
      text-gray-900 dark:text-white
      focus:ring-gray-500
    `,
    success: `
      bg-green-600 hover:bg-green-700
      text-white
      focus:ring-green-500
      shadow-sm hover:shadow-md
    `,
    danger: `
      bg-red-600 hover:bg-red-700
      text-white
      focus:ring-red-500
      shadow-sm hover:shadow-md
    `,
    ghost: `
      bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700
      text-gray-700 dark:text-gray-300
      focus:ring-gray-500
    `,
  },

  // Input styles
  input: `
    w-full
    px-4 py-2.5
    border border-gray-300 dark:border-gray-600
    rounded-lg
    bg-white dark:bg-gray-800
    text-gray-900 dark:text-white
    placeholder-gray-400 dark:placeholder-gray-500
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    transition-all duration-200
    hover:border-gray-400 dark:hover:border-gray-500
  `,

  // Select styles
  select: `
    w-full
    px-4 py-2.5
    border border-gray-300 dark:border-gray-600
    rounded-lg
    bg-white dark:bg-gray-800
    text-gray-900 dark:text-white
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    transition-all duration-200
    hover:border-gray-400 dark:hover:border-gray-500
    cursor-pointer
  `,

  // Label styles
  label: `
    block
    text-sm font-medium
    text-gray-700 dark:text-gray-300
    mb-1.5
  `,

  // Heading styles
  heading: {
    h1: 'text-3xl font-bold text-gray-900 dark:text-white',
    h2: 'text-2xl font-bold text-gray-900 dark:text-white',
    h3: 'text-xl font-semibold text-gray-900 dark:text-white',
    h4: 'text-lg font-semibold text-gray-900 dark:text-white',
  },

  // Text styles
  text: {
    body: 'text-gray-700 dark:text-gray-300',
    muted: 'text-gray-500 dark:text-gray-400',
    small: 'text-sm text-gray-600 dark:text-gray-400',
  },

  // Table styles
  table: {
    container: 'overflow-x-auto rounded-lg shadow-sm',
    table: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700',
    thead: 'bg-gray-50 dark:bg-gray-800',
    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
    tbody: 'bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700',
    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white',
    row: 'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150',
  },

  // Modal styles
  modal: {
    overlay: 'fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-70 transition-opacity',
    container: 'fixed inset-0 z-50 overflow-y-auto',
    content: 'bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg mx-auto mt-20 p-6',
  },

  // Badge styles
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },

  // Alert styles
  alert: {
    base: 'p-4 rounded-lg flex items-start gap-3',
    info: 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200 border border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-200 border border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800',
    danger: 'bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-200 border border-red-200 dark:border-red-800',
  },
};

// Utility function to combine class names
export const cn = (...classes: (string | undefined | null | boolean)[]) => {
  return classes.filter(Boolean).join(' ');
};
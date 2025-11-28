import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { isDemoModeEnabled } from '../utils/env';

export interface MenuItem {
  title: string;
  slug: string;
  icon: string;
}

interface SidebarProps {
  collapsed?: boolean;
  basePath?: string;
  menuItems?: MenuItem[];
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { title: 'Dashboard', slug: '', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { title: 'Transactions', slug: '/transactions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { title: 'Budgets', slug: '/budgets', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { title: 'Members', slug: '/members', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { title: 'Reports', slug: '/reports', icon: 'M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v7m3-2h6' },
  { title: 'Settings', slug: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
];

// Demo mode menu items
const DEMO_MENU_ITEMS: MenuItem[] = [
  { title: 'Dashboard', slug: '', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { title: 'Transactions', slug: '/transactions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { title: 'Budgets', slug: '/budgets', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { title: 'Members', slug: '/members', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { title: 'Reports', slug: '/reports', icon: 'M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v7m3-2h6' },
  { title: 'Settings', slug: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
];

const normalizeBasePath = (basePath?: string): string => {
  if (!basePath) return '/app';
  if (basePath === '/') return '';
  return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
};

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, basePath, menuItems }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const normalizedBasePath = normalizeBasePath(basePath);
  
  // Use demo menu items if in demo mode and no custom menu items provided
  const isDemo = isDemoModeEnabled();
  const items = menuItems ?? (isDemo ? DEMO_MENU_ITEMS : DEFAULT_MENU_ITEMS);

  const buildPath = (slug: string): string => {
    if (!slug) {
      return normalizedBasePath || '/';
    }
    return `${normalizedBasePath}${slug}`;
  };
  const normalize = (value: string) => {
    if (!value) return '/';
    if (value === '/') return '/';
    return value.endsWith('/') ? value.slice(0, -1) : value;
  };

  return (
    <div
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white text-gray-900 shadow-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-full flex-col px-4 py-6">
        <div className={`flex items-center ${collapsed ? 'justify-center' : ''} mb-8`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
            <div className="mr-0 flex h-14 w-14 items-center justify-center">
              {/* Light mode: blue bg, white letters */}
              <img
                src="/GreekPay-logo-transparent.png"
                alt="Greek Pay Logo"
                className="h-full w-full object-contain block dark:hidden"
              />
              {/* Dark mode: white bg, blue letters */}
              <img
                src="/GreekPay-logo-transparent.png"
                alt="Greek Pay Logo"
                className="h-full w-full object-contain hidden dark:block invert"
              />
            </div>
            <h1 className={`ml-3 text-xl font-semibold tracking-tight ${collapsed ? 'hidden' : 'block'}`}>
              Greek Pay
            </h1>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {items.map((item) => {
            const path = buildPath(item.slug);
            const normalizedPath = normalize(path);
            const normalizedLocation = normalize(location.pathname);
            const isBasePath = normalizedPath === normalize(normalizedBasePath || '/') || normalizedPath === '/';
            let isActive = normalizedLocation === normalizedPath;
            if (!isBasePath) {
              isActive = isActive || normalizedLocation.startsWith(`${normalizedPath}/`);
            }

            return (
              <Link
                key={path}
                to={path}
                className={`group relative flex items-center rounded-xl px-3 py-3 text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
                  isActive
                    ? 'bg-blue-500/80 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.title : undefined}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center ${
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-white'
                  } transition-colors duration-200`}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                  </svg>
                </div>
                <span className={`${collapsed ? 'sr-only' : 'ml-3 font-medium whitespace-nowrap'}`}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
        
        {/* Theme Toggle */}
        <div className="mt-6 border-t border-gray-300 dark:border-gray-800 pt-4">
          <button
            onClick={toggleTheme}
            className={`flex w-full items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm transition-colors hover:bg-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800 ${collapsed ? 'px-2' : ''}`}
            title="Toggle theme"
          >
            <span className="text-lg" aria-hidden="true">
              {theme === 'dark' ? '🌙' : '☀️'}
            </span>
            <span className={`${collapsed ? 'sr-only' : 'ml-2 whitespace-nowrap'}`}>
              {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

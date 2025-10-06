import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface MenuItem {
  title: string;
  path: string;
  icon: string;
}

interface SidebarProps {}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { title: 'Transactions', path: '/transactions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { title: 'Budgets', path: '/budgets', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { title: 'Reports', path: '/reports', icon: 'M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v7m3-2h6' },
  { title: 'Members', path: '/members', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { title: 'Bank Sync', path: '/plaid-sync', icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z' },
  { title: 'Settings', path: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 dark:from-gray-900 dark:to-black border-r border-gray-700 dark:border-gray-700 text-white h-screen fixed left-0 top-0 z-50 w-64 shadow-2xl">
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="font-bold text-xl">
              KSIG Treasury
            </h1>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center p-3 rounded-xl transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'hover:bg-gray-700/50'
              }`}
              title={item.title}
            >
              <div className={`flex-shrink-0 w-6 h-6 ${
                location.pathname === item.path ? 'text-white' : 'text-gray-400 group-hover:text-white'
              } transition-colors duration-200`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
              </div>
              <span className="ml-3 font-medium whitespace-nowrap">
                {item.title}
              </span>
            </Link>
          ))}
        </nav>
        
        {/* Theme Toggle */}
        <div className="border-t border-gray-700 dark:border-gray-600 pt-4 mt-4">
          <button
            onClick={toggleTheme}
            className="flex items-center p-3 rounded-lg transition-colors hover:bg-gray-700 dark:hover:bg-gray-600 w-full"
            title={`Theme: ${theme}`}
          >
            <span className="text-xl mr-3 flex-shrink-0">
              {theme === 'dark' ? '🌙' : '☀️'}
            </span>
            <span className="whitespace-nowrap">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}; 
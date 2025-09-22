import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface MenuItem {
  title: string;
  path: string;
  icon: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', path: '/', icon: '📊' },
  { title: 'Transactions', path: '/transactions', icon: '💰' },
  { title: 'Budgets', path: '/budgets', icon: '📈' },
  { title: 'Reports', path: '/reports', icon: '📑' },
  { title: 'Members', path: '/members', icon: '👥' },
  { title: 'Settings', path: '/settings', icon: '⚙️' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { theme, effectiveTheme, toggleTheme } = useTheme();

  // Auto-collapse on desktop for better space usage
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isOpen) {
        onToggle(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, onToggle]);

  return (
    <div className={`bg-gray-800 dark:bg-gray-900 border-r border-gray-700 dark:border-gray-600 text-white h-screen fixed left-0 top-0 z-50 transition-all duration-300 ${
      // Mobile: show/hide based on isOpen prop
      // Desktop: always show but allow collapse
      isOpen 
        ? 'translate-x-0 w-64 lg:w-64' 
        : 'translate-x-full lg:translate-x-0 lg:w-20'
    }`}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`font-bold text-xl transition-opacity duration-300 ${
            (isOpen && !isCollapsed) ? 'opacity-100' : 'opacity-0 lg:opacity-0'
          }`}>
            KSIG Treasurer
          </h1>
          {/* Desktop collapse button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {isCollapsed ? '▶' : '◀'}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => onToggle(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                // Close mobile sidebar when navigating
                if (window.innerWidth < 1024) {
                  onToggle(false);
                }
              }}
              className={`flex items-center p-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'hover:bg-gray-700 dark:hover:bg-gray-600'
              }`}
              title={item.title}
            >
              <span className="text-xl mr-3 flex-shrink-0">{item.icon}</span>
              <span className={`transition-opacity duration-300 whitespace-nowrap overflow-hidden ${
                (isOpen && !isCollapsed) ? 'opacity-100' : 'opacity-0 lg:opacity-0'
              }`}>
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
            title={`Theme: ${theme} (${effectiveTheme})`}
          >
            <span className="text-xl mr-3 flex-shrink-0">
              {effectiveTheme === 'dark' ? '🌙' : '☀️'}
            </span>
            <span className={`transition-opacity duration-300 whitespace-nowrap overflow-hidden ${
              (isOpen && !isCollapsed) ? 'opacity-100' : 'opacity-0 lg:opacity-0'
            }`}>
              {theme === 'system' ? 'Auto Theme' : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}; 
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface MenuItem {
  title: string;
  path: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', path: '/', icon: '📊' },
  { title: 'Transactions', path: '/transactions', icon: '💰' },
  { title: 'Budgets', path: '/budgets', icon: '📈' },
  { title: 'Reports', path: '/reports', icon: '📑' },
  { title: 'Settings', path: '/settings', icon: '⚙️' },
];

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  return (
    <div className={`bg-gray-800 text-white h-screen fixed left-0 top-0 transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`font-bold text-xl transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            KSIG Treasurer
          </h1>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {isOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center p-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700'
              }`}
            >
              <span className="text-xl mr-3">{item.icon}</span>
              <span className={`transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                {item.title}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}; 
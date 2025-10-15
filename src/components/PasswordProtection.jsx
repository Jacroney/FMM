import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from './auth/LoginForm';
import { SignupForm } from './auth/SignupForm';
import { LoadingSpinner } from './LoadingSpinner';

const AuthProtection = ({ children }) => {
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  // Check authentication status
  if (isAuthenticated) {
    return (
      <div>
          <div className="fixed top-4 right-4 z-50 flex items-center">
          <button
            onClick={signOut}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {authMode === 'login' ? (
          <LoginForm onSwitchToSignup={() => setAuthMode('signup')} />
        ) : (
          <SignupForm onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </div>
    </div>
  );
};

export default AuthProtection;

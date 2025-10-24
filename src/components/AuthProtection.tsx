import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { isDemoModeEnabled } from '../utils/env';

interface AuthProtectionProps {
  children: React.ReactNode;
}

const AuthProtection: React.FC<AuthProtectionProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Allow access in demo mode without authentication
  const demoMode = isDemoModeEnabled();

  if (isLoading && !demoMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-surface)] dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  // In demo mode, bypass authentication check
  if (!demoMode && !isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default AuthProtection;

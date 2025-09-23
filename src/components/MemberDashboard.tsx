import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MemberDuesInfo } from '../services/authService';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const MemberDashboard: React.FC = () => {
  const { profile, getMemberDues } = useAuth();
  const [duesInfo, setDuesInfo] = useState<MemberDuesInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDuesInfo();
  }, []);

  const loadDuesInfo = async () => {
    try {
      setIsLoading(true);
      const info = await getMemberDues();
      setDuesInfo(info);
    } catch (error) {
      console.error('Error loading dues info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const duesBalance = duesInfo?.dues_balance || profile?.dues_balance || 0;
  const isOwed = duesBalance > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome, {profile?.full_name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {duesInfo?.chapter_name || 'Chapter Member Portal'}
          </p>
        </div>

        {/* Member Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="mr-2">👤</span>
            Member Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</p>
              <p className="text-gray-900 dark:text-white">{profile?.full_name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-gray-900 dark:text-white">{profile?.email}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Year</p>
              <p className="text-gray-900 dark:text-white">{profile?.year || 'Not specified'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Major</p>
              <p className="text-gray-900 dark:text-white">{profile?.major || 'Not specified'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Position</p>
              <p className="text-gray-900 dark:text-white">{profile?.position || 'Member'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
              <p className="text-gray-900 dark:text-white">{profile?.phone_number || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Dues Balance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="mr-2">💰</span>
            Dues & Payments
          </h2>

          <div className="text-center py-8">
            <div className={`text-4xl sm:text-5xl font-bold mb-2 ${
              isOwed ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(Math.abs(duesBalance))}
            </div>

            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {isOwed ? 'Amount Owed' : duesBalance === 0 ? 'Balance: Paid in Full' : 'Credit Balance'}
            </p>

            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              isOwed
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {isOwed ? '⚠️ Payment Required' : '✅ Account Current'}
            </div>
          </div>

          {isOwed && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Payment Instructions
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
                  <li>• Contact the treasurer for payment options</li>
                  <li>• Venmo, Zelle, or cash payments accepted</li>
                  <li>• Include your full name in payment description</li>
                  <li>• Payment confirmation will update your balance</li>
                </ul>
              </div>

              <button
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                onClick={() => {
                  // This will be implemented later with payment integration
                  alert('Payment portal coming soon! Please contact the treasurer for now.');
                }}
              >
                Pay Dues Online (Coming Soon)
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="mr-2">⚡</span>
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => {
                // This could open a profile edit modal
                alert('Profile editing coming soon!');
              }}
              className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-2xl mr-3">✏️</span>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">Edit Profile</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update your information</p>
              </div>
            </button>

            <button
              onClick={() => {
                const email = 'treasurer@chapter.com'; // This should come from chapter info
                const subject = 'Question about dues';
                const body = `Hi,\\n\\nI have a question about my dues balance.\\n\\nBest regards,\\n${profile?.full_name}`;
                window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
              }}
              className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-2xl mr-3">📧</span>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">Contact Treasurer</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ask about payments</p>
              </div>
            </button>

            <button
              onClick={() => {
                alert('Event calendar integration coming soon!');
              }}
              className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-2xl mr-3">📅</span>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">Upcoming Events</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">View chapter calendar</p>
              </div>
            </button>

            <button
              onClick={loadDuesInfo}
              className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-2xl mr-3">🔄</span>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">Refresh Balance</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update dues information</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { SupabaseConnectionTest } from '../components/SupabaseConnectionTest';
import { useAuth } from '../context/AuthContext';
import { UserCircleIcon, EnvelopeIcon, PhoneIcon, AcademicCapIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

const Settings = () => {
  const { profile } = useAuth();
  const [settings, setSettings] = useState({
    organization: {
      name: 'KSIG Treasurer',
      fiscalYearStart: '2025-09-01',
      currency: 'USD',
      timezone: 'America/New_York'
    },
    notifications: {
      emailNotifications: true,
      lowBalanceAlert: true,
      budgetAlert: true,
      transactionAlert: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      requireApproval: true
    }
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });


  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const handleSettingChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Here you would typically save to your backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      showNotification('Settings saved successfully');
    } catch (error) {
      showNotification('Failed to save settings', 'error');
    }
    setIsSaving(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.full_name || 'User'}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{profile?.role || 'Member'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</h3>
                </div>
                <p className="text-gray-900 dark:text-white ml-8">{profile?.email || 'N/A'}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</h3>
                </div>
                <p className="text-gray-900 dark:text-white ml-8">{profile?.phone_number || 'Not provided'}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <AcademicCapIcon className="h-5 w-5 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Year & Major</h3>
                </div>
                <p className="text-gray-900 dark:text-white ml-8">
                  {profile?.year || 'N/A'} {profile?.major ? `- ${profile.major}` : ''}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <BriefcaseIcon className="h-5 w-5 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</h3>
                </div>
                <p className="text-gray-900 dark:text-white ml-8">{profile?.position || 'Not assigned'}</p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <UserCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Account Status</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {profile?.is_active ? 'Active Member' : 'Inactive'}
                    {profile?.dues_balance && profile.dues_balance > 0 && (
                      <span className="ml-2">• Dues Balance: ${profile.dues_balance.toFixed(2)}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'organization':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Organization Name</label>
              <input
                type="text"
                value={settings.organization.name}
                onChange={(e) => handleSettingChange('organization', 'name', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fiscal Year Start</label>
              <input
                type="date"
                value={settings.organization.fiscalYearStart}
                onChange={(e) => handleSettingChange('organization', 'fiscalYearStart', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
              <select
                value={settings.organization.currency}
                onChange={(e) => handleSettingChange('organization', 'currency', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
              <select
                value={settings.organization.timezone}
                onChange={(e) => handleSettingChange('organization', 'timezone', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive email updates about your account</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.emailNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Low Balance Alerts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when your balance is low</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.lowBalanceAlert}
                  onChange={(e) => handleSettingChange('notifications', 'lowBalanceAlert', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget Alerts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about budget updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.budgetAlert}
                  onChange={(e) => handleSettingChange('notifications', 'budgetAlert', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction Alerts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about new transactions</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.transactionAlert}
                  onChange={(e) => handleSettingChange('notifications', 'transactionAlert', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        );


      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.twoFactorAuth}
                  onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Session Timeout (minutes)</label>
              <select
                value={settings.security.sessionTimeout}
                onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
              >
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Require Approval for Large Transactions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get approval for transactions above a certain amount</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.requireApproval}
                  onChange={(e) => handleSettingChange('security', 'requireApproval', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        );

      case 'database':
        return <SupabaseConnectionTest />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account and preferences</p>
        </div>
        {activeTab !== 'profile' && activeTab !== 'database' && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm sm:text-base shadow-sm ${
              isSaving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        )}
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-20 right-4 p-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        {/* Mobile: Dropdown selector */}
        <div className="sm:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
          >
            {[
              { key: 'profile', label: 'Profile' },
              { key: 'organization', label: 'Organization' },
              { key: 'notifications', label: 'Notifications' },
              { key: 'security', label: 'Security' },
              { key: 'database', label: 'Database' }
            ].map((tab) => (
              <option key={tab.key} value={tab.key}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop: Tab navigation */}
        <nav className="hidden sm:flex -mb-px space-x-4 lg:space-x-8 overflow-x-auto">
          {[
            { key: 'profile', label: 'Profile', icon: '👤' },
            { key: 'organization', label: 'Organization', icon: '🏢' },
            { key: 'notifications', label: 'Notifications', icon: '🔔' },
            { key: 'security', label: 'Security', icon: '🔐' },
            { key: 'database', label: 'Database', icon: '🗄️' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              } flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Settings; 
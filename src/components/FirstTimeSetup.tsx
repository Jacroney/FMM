import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChapter } from '../context/ChapterContext';

interface SetupData {
  chapterInfo: {
    treasurerEmail: string;
    meetingTime: string;
    meetingLocation: string;
    semesterDues: number;
    paymentMethods: string[];
  };
  adminPreferences: {
    defaultCategories: string[];
    fiscalYearStart: string;
    notifications: boolean;
  };
}

export const FirstTimeSetup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { profile, updateProfile } = useAuth();
  const { currentChapter } = useChapter();
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState<SetupData>({
    chapterInfo: {
      treasurerEmail: profile?.email || '',
      meetingTime: '',
      meetingLocation: '',
      semesterDues: 0,
      paymentMethods: ['Venmo', 'Zelle']
    },
    adminPreferences: {
      defaultCategories: ['Dues', 'Social', 'Administrative', 'Event', 'Formal'],
      fiscalYearStart: 'January',
      notifications: true
    }
  });

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    // Save setup preferences (this could be expanded to save to a chapter_settings table)
    await updateProfile({
      ...profile,
      // Mark as setup complete - you could add this field to user_profiles
      // setup_completed: true
    });

    onComplete();
  };

  const updateChapterInfo = (field: string, value: any) => {
    setSetupData(prev => ({
      ...prev,
      chapterInfo: { ...prev.chapterInfo, [field]: value }
    }));
  };

  const updateAdminPreferences = (field: string, value: any) => {
    setSetupData(prev => ({
      ...prev,
      adminPreferences: { ...prev.adminPreferences, [field]: value }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to Greek Pay! Let's get you set up.
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Step {currentStep} of 3 - This will only take a few minutes
            </p>
          </div>
        </div>

        {/* Step 1: Chapter Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Chapter Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chapter Name
              </label>
              <input
                type="text"
                value={currentChapter?.name || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Treasurer Email
              </label>
              <input
                type="email"
                value={setupData.chapterInfo.treasurerEmail}
                onChange={(e) => updateChapterInfo('treasurerEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Time
                </label>
                <input
                  type="text"
                  placeholder="e.g., Mondays 7:00 PM"
                  value={setupData.chapterInfo.meetingTime}
                  onChange={(e) => updateChapterInfo('meetingTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., Student Union Room 201"
                  value={setupData.chapterInfo.meetingLocation}
                  onChange={(e) => updateChapterInfo('meetingLocation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Semester Dues Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={setupData.chapterInfo.semesterDues}
                  onChange={(e) => updateChapterInfo('semesterDues', parseFloat(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Payment Methods */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Payment Methods
            </h2>

            <p className="text-gray-600 dark:text-gray-400">
              Select which payment methods your chapter accepts for dues:
            </p>

            <div className="grid grid-cols-2 gap-4">
              {['Venmo', 'Zelle', 'Cash', 'Check', 'Bank Transfer', 'PayPal'].map((method) => (
                <label key={method} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={setupData.chapterInfo.paymentMethods.includes(method)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateChapterInfo('paymentMethods', [...setupData.chapterInfo.paymentMethods, method]);
                      } else {
                        updateChapterInfo('paymentMethods',
                          setupData.chapterInfo.paymentMethods.filter(m => m !== method)
                        );
                      }
                    }}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-900 dark:text-white">{method}</span>
                </label>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                💡 Pro Tip
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                Digital payment methods like Venmo and Zelle make it easier to track payments automatically.
                You can always add more payment methods later in Settings.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Admin Preferences */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Admin Preferences
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fiscal Year Start
              </label>
              <select
                value={setupData.adminPreferences.fiscalYearStart}
                onChange={(e) => updateAdminPreferences('fiscalYearStart', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="January">January</option>
                <option value="July">July</option>
                <option value="September">September</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Expense Categories
              </label>
              <div className="space-y-2">
                {setupData.adminPreferences.defaultCategories.map((category, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => {
                        const newCategories = [...setupData.adminPreferences.defaultCategories];
                        newCategories[index] = e.target.value;
                        updateAdminPreferences('defaultCategories', newCategories);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        const newCategories = setupData.adminPreferences.defaultCategories.filter((_, i) => i !== index);
                        updateAdminPreferences('defaultCategories', newCategories);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    updateAdminPreferences('defaultCategories', [...setupData.adminPreferences.defaultCategories, '']);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Category
                </button>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
                🎉 You're all set!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-200">
                Your financial management system is ready to use. You can always update these settings later.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     focus:ring-2 focus:ring-blue-500"
          >
            {currentStep === 3 ? 'Complete Setup' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
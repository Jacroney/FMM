import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { DuesService } from '../services/duesService';
import { DuesConfiguration } from '../services/types';
import toast from 'react-hot-toast';

interface DuesConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  existingConfig?: DuesConfiguration;
  onSaved: () => void;
}

const DuesConfigurationModal: React.FC<DuesConfigurationModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  existingConfig,
  onSaved
}) => {
  const [formData, setFormData] = useState<Partial<DuesConfiguration>>({
    period_name: '',
    period_type: 'Semester',
    period_start_date: '',
    period_end_date: '',
    fiscal_year: new Date().getFullYear(),
    is_current: false,
    freshman_dues: 0,
    sophomore_dues: 0,
    junior_dues: 0,
    senior_dues: 0,
    graduate_dues: 0,
    alumni_dues: 0,
    pledge_dues: 0,
    default_dues: 0,
    late_fee_enabled: true,
    late_fee_amount: 50,
    late_fee_type: 'flat',
    late_fee_grace_days: 7,
    due_date: '',
    notes: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingConfig) {
      setFormData(existingConfig);
    }
  }, [existingConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (existingConfig) {
        await DuesService.updateConfiguration(existingConfig.id, formData);
        toast.success('Dues configuration updated successfully');
      } else {
        await DuesService.createConfiguration({
          ...formData,
          chapter_id: chapterId
        } as Omit<DuesConfiguration, 'id' | 'created_at' | 'updated_at'>);
        toast.success('Dues configuration created successfully');
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving dues configuration:', error);
      toast.error('Failed to save dues configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {existingConfig ? 'Edit' : 'Create'} Dues Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Period Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Period Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Period Name *
                </label>
                <input
                  type="text"
                  value={formData.period_name}
                  onChange={(e) => setFormData({ ...formData, period_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Fall 2025"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Period Type *
                </label>
                <select
                  value={formData.period_type}
                  onChange={(e) => setFormData({ ...formData, period_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="Quarter">Quarter</option>
                  <option value="Semester">Semester</option>
                  <option value="Year">Year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.period_start_date}
                  onChange={(e) => setFormData({ ...formData, period_start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.period_end_date}
                  onChange={(e) => setFormData({ ...formData, period_end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fiscal Year *
                </label>
                <input
                  type="number"
                  value={formData.fiscal_year}
                  onChange={(e) => setFormData({ ...formData, fiscal_year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  min={2020}
                  max={2050}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                checked={formData.is_current}
                onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="is_current" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Set as current period
              </label>
            </div>
          </div>

          {/* Dues Amounts by Year */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Dues Amounts by Year
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'freshman_dues', label: 'Freshman Dues' },
                { key: 'sophomore_dues', label: 'Sophomore Dues' },
                { key: 'junior_dues', label: 'Junior Dues' },
                { key: 'senior_dues', label: 'Senior Dues' },
                { key: 'graduate_dues', label: 'Graduate Dues' },
                { key: 'alumni_dues', label: 'Alumni Dues' },
                { key: 'pledge_dues', label: 'Pledge Dues' },
                { key: 'default_dues', label: 'Default Dues (No Year Set)' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {label}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData[key as keyof DuesConfiguration] || 0}
                      onChange={(e) => setFormData({ ...formData, [key]: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Late Fee Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Late Fee Configuration
            </h3>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="late_fee_enabled"
                checked={formData.late_fee_enabled}
                onChange={(e) => setFormData({ ...formData, late_fee_enabled: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="late_fee_enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable late fees
              </label>
            </div>

            {formData.late_fee_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Late Fee Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">
                      {formData.late_fee_type === 'percentage' ? '%' : '$'}
                    </span>
                    <input
                      type="number"
                      value={formData.late_fee_amount}
                      onChange={(e) => setFormData({ ...formData, late_fee_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Late Fee Type
                  </label>
                  <select
                    value={formData.late_fee_type}
                    onChange={(e) => setFormData({ ...formData, late_fee_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="flat">Flat Amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    value={formData.late_fee_grace_days}
                    onChange={(e) => setFormData({ ...formData, late_fee_grace_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    min="0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Optional notes about this dues period..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {existingConfig ? 'Update' : 'Create'} Configuration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DuesConfigurationModal;

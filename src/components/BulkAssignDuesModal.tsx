import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Users, GraduationCap, UserCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { DuesConfiguration } from '../services/types';
import { YEAR_OPTIONS, DUES_FIELD_BY_YEAR, YearValue } from '../utils/yearUtils';

// Year options for bulk assign - includes "All" option
const BULK_YEAR_OPTIONS = [
  { value: 'all', label: 'All Years' },
  ...YEAR_OPTIONS,
  { value: 'pledge', label: 'Pledge' },
];

// Status options
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active Members Only' },
  { value: 'inactive', label: 'Inactive Members Only' },
  { value: 'all', label: 'All Members' },
];

interface BulkAssignDuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  config: DuesConfiguration | null;
  onSuccess?: () => void;
}

interface PreviewResult {
  count: number;
  members: Array<{ id: string; email: string; full_name: string; year: string | null; status: string }>;
}

const BulkAssignDuesModal: React.FC<BulkAssignDuesModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  config,
  onSuccess
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [amount, setAmount] = useState(config?.default_dues?.toString() || '');
  const [dueDate, setDueDate] = useState(config?.due_date || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedYear('all');
      setSelectedStatus('active');
      setAmount(config?.default_dues?.toString() || '');
      setDueDate(config?.due_date || '');
      setPreview(null);
    }
  }, [isOpen, config]);

  // Get amount for selected year from config
  const getAmountForYear = (year: string): number => {
    if (!config) return 0;
    if (year === 'all') return config.default_dues || 0;
    const field = DUES_FIELD_BY_YEAR[year as YearValue | 'pledge' | 'default'] || 'default_dues';
    return (config as any)[field] || config.default_dues || 0;
  };

  // Update amount when year changes
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    const yearAmount = getAmountForYear(year);
    setAmount(yearAmount.toString());
    setPreview(null); // Clear preview when filters change
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setPreview(null); // Clear preview when filters change
  };

  // Preview which members will be affected
  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      let query = supabase
        .from('user_profiles')
        .select('id, email, full_name, year, status')
        .eq('chapter_id', chapterId);

      // Filter by year
      if (selectedYear !== 'all') {
        query = query.eq('year', selectedYear);
      }

      // Filter by status
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query.order('full_name');

      if (error) throw error;

      setPreview({
        count: data?.length || 0,
        members: data || []
      });
    } catch (error) {
      console.error('Error previewing members:', error);
      toast.error('Failed to preview members');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!config) {
      toast.error('Please create a dues configuration first');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);

    try {
      // Call the RPC function to bulk assign dues
      const { data, error } = await supabase.rpc('bulk_assign_dues', {
        p_chapter_id: chapterId,
        p_config_id: config.id,
        p_amount: parsedAmount,
        p_year_filter: selectedYear === 'all' ? null : selectedYear,
        p_status_filter: selectedStatus === 'all' ? null : selectedStatus,
        p_due_date: dueDate || null
      });

      if (error) {
        console.error('Error bulk assigning dues:', error);
        throw error;
      }

      const result = data || { assigned: 0, skipped: 0 };
      toast.success(`Assigned dues to ${result.assigned} members. Skipped ${result.skipped}.`);

      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error(error.message || 'Failed to assign dues');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Bulk Assign Dues
          </h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Year Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <GraduationCap className="inline w-4 h-4 mr-1" />
                Member Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {BULK_YEAR_OPTIONS.map((option) => {
                  const yearAmount = option.value === 'all' ? config?.default_dues : getAmountForYear(option.value);
                  return (
                    <option key={option.value} value={option.value}>
                      {option.label} {yearAmount ? `($${yearAmount.toFixed(2)})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <UserCheck className="inline w-4 h-4 mr-1" />
                Member Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Amount *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Preview Button */}
            <button
              type="button"
              onClick={handlePreview}
              disabled={isPreviewing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              {isPreviewing ? 'Loading...' : 'Preview Members'}
            </button>

            {/* Preview Results */}
            {preview && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {preview.count} member{preview.count !== 1 ? 's' : ''} will be assigned dues
                  </span>
                </div>
                {preview.count > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {preview.members.map((member) => (
                      <div key={member.id} className="text-sm text-gray-600 dark:text-gray-300 flex justify-between">
                        <span>{member.full_name || member.email}</span>
                        <span className="text-gray-400">{member.year ? `Year ${member.year}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
                {preview.count === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No members match the selected filters.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !amount}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Assigning...' : 'Assign Dues'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkAssignDuesModal;

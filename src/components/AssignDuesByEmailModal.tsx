import React, { useState } from 'react';
import { X, Mail, DollarSign, Calendar, FileText } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { DuesConfiguration } from '../services/types';

interface AssignDuesByEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  config: DuesConfiguration | null;
  onSuccess?: () => void;
}

const AssignDuesByEmailModal: React.FC<AssignDuesByEmailModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  config,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(config?.default_dues?.toString() || '');
  const [dueDate, setDueDate] = useState(config?.due_date || '');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!config) {
      toast.error('Please create a dues configuration first');
      return;
    }

    setIsProcessing(true);

    try {
      // Call the database function to assign dues by email
      const { data, error } = await supabase.rpc('assign_dues_by_email', {
        p_chapter_id: chapterId,
        p_email: email.trim(),
        p_config_id: config.id,
        p_base_amount: parseFloat(amount),
        p_due_date: dueDate || null,
        p_notes: notes || null
      });

      if (error) {
        console.error('Error assigning dues:', error);
        throw error;
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to assign dues');
      }

      // Show success message with email status
      if (data.email_queued) {
        toast.success(data.message || 'Dues assigned and invitation email queued for sending!');
      } else {
        toast.success(data.message || 'Dues assigned successfully!');
      }

      // Reset form and close
      setEmail('');
      setAmount(config.default_dues.toString());
      setDueDate(config.due_date || '');
      setNotes('');
      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error(error.message || 'Failed to assign dues');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setEmail('');
      setAmount(config?.default_dues?.toString() || '');
      setDueDate(config?.due_date || '');
      setNotes('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assign Dues by Email
          </h3>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Mail className="inline w-4 h-4 mr-1" />
                Member Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="member@example.com"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                If the member doesn't have an account, they'll automatically receive an invitation email
              </p>
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

            {/* Instructions/Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FileText className="inline w-4 h-4 mr-1" />
                Instructions for Member
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Example: Welcome to Spring 2024 pledge class! After signing up, check your email for GroupMe link. First payment can be made in cash at our next meeting on Friday."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                These instructions will be prominently displayed on their signup page and in the invitation email. Include payment details, next steps, or important info.
              </p>
            </div>

            {/* Auto-send Notice */}
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <Mail className="inline w-4 h-4 mr-1" />
                Invitation emails are sent automatically if the member doesn't have an account yet.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Assign Dues'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignDuesByEmailModal;

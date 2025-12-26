import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AuthService } from '../services/authService';
import toast from 'react-hot-toast';
import { YEAR_OPTIONS, YearValue } from '../utils/yearUtils';

interface Member {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  year?: string;
  major?: string;
  position?: string;
  status?: string;
  role?: string;
}

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  member: Member | null;
  currentUserRole?: string;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  member,
  currentUserRole
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    year: '' as YearValue | '',
    major: '',
    position: '',
    status: '' as 'active' | 'inactive' | 'pledge' | 'alumni' | '',
    role: '' as 'admin' | 'exec' | 'treasurer' | 'member' | ''
  });

  // Initialize form with member data
  useEffect(() => {
    if (isOpen && member) {
      setFormData({
        full_name: member.full_name || '',
        email: member.email || '',
        phone_number: member.phone_number || '',
        year: (member.year as any) || '',
        major: member.major || '',
        position: member.position || '',
        status: (member.status as any) || '',
        role: (member.role as any) || ''
      });
    }
  }, [isOpen, member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setIsSubmitting(true);

    try {
      // Validate required field
      if (!formData.full_name.trim()) {
        toast.error('Full name is required');
        setIsSubmitting(false);
        return;
      }

      // Validate email format
      if (!formData.email.trim() || !isValidEmail(formData.email)) {
        toast.error('Valid email is required');
        setIsSubmitting(false);
        return;
      }

      // Build updates object - only include changed fields
      const updates: Record<string, any> = {};

      if (formData.full_name.trim() !== member.full_name) {
        updates.full_name = formData.full_name.trim();
      }
      if (formData.email.trim() !== member.email) {
        updates.email = formData.email.trim();
      }
      if (formData.phone_number.trim() !== (member.phone_number || '')) {
        updates.phone_number = formData.phone_number.trim() || null;
      }
      if (formData.year !== (member.year || '')) {
        updates.year = formData.year || null;
      }
      if (formData.major.trim() !== (member.major || '')) {
        updates.major = formData.major.trim() || null;
      }
      if (formData.position.trim() !== (member.position || '')) {
        updates.position = formData.position.trim() || null;
      }
      if (formData.status !== (member.status || '')) {
        updates.status = formData.status || null;
      }
      // Only allow admin to change roles
      if (currentUserRole === 'admin' && formData.role !== (member.role || '')) {
        updates.role = formData.role || null;
      }

      // If no changes, just close
      if (Object.keys(updates).length === 0) {
        toast.success('No changes to save');
        onClose();
        return;
      }

      await AuthService.updateMemberProfile(member.id, updates);
      toast.success('Member updated successfully');

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Failed to update member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    } else {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone_number: formatted });
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-slideUp sm:animate-none">
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Edit Member
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95 touch-manipulation"
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="John Doe"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="john@example.com"
              required
              disabled={isSubmitting}
            />
            {formData.email !== member.email && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Note: Changing email may affect the member's login
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={handlePhoneChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="(555) 123-4567"
              maxLength={14}
              disabled={isSubmitting}
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Year
            </label>
            <select
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
              disabled={isSubmitting}
            >
              <option value="">Select year</option>
              {YEAR_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Major */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Major
            </label>
            <input
              type="text"
              value={formData.major}
              onChange={(e) => setFormData({ ...formData, major: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Computer Science"
              disabled={isSubmitting}
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Position
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="President, Treasurer, etc."
              disabled={isSubmitting}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
              disabled={isSubmitting}
            >
              <option value="">Select status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pledge">Pledge</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>

          {/* Role - Only visible to admins */}
          {currentUserRole === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
                disabled={isSubmitting}
              >
                <option value="">Select role</option>
                <option value="admin">Admin</option>
                <option value="exec">Exec</option>
                <option value="treasurer">Treasurer</option>
                <option value="member">Member</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only admins can change member roles
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberModal;

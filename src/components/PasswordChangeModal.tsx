import React, { useState } from 'react';
import { X, Eye, EyeOff, ShieldCheck, Lock, Check } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * PasswordChangeModal
 *
 * Allows members to change their password with validation:
 * - Password strength requirements
 * - Confirmation matching
 * - Secure password updates via Supabase Auth
 */
const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState({
    new: false,
    confirm: false
  });

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handlePasswordChange = (field: 'newPassword' | 'confirmPassword', value: string) => {
    setFormData({ ...formData, [field]: value });

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate new password
    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      setErrors({ ...errors, newPassword: passwordError });
      return;
    }

    // Check if passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({ ...errors, confirmPassword: 'Passwords do not match' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;

      toast.success('Password changed successfully');

      // Reset form
      setFormData({
        newPassword: '',
        confirmPassword: ''
      });

      onClose();
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { strength: 'Weak', color: 'text-red-600 dark:text-red-400' };
    if (score <= 4) return { strength: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' };
    return { strength: 'Strong', color: 'text-green-600 dark:text-green-400' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  const resetForm = () => {
    setFormData({
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({
      newPassword: '',
      confirmPassword: ''
    });
    setShowPassword({
      new: false,
      confirm: false
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Password requirement checklist
  const requirements = [
    { label: 'At least 8 characters', met: formData.newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(formData.newPassword) },
    { label: 'One lowercase letter', met: /[a-z]/.test(formData.newPassword) },
    { label: 'One number', met: /[0-9]/.test(formData.newPassword) },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-slideUp sm:animate-none">
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 dark:from-amber-600 dark:via-orange-600 dark:to-rose-600 px-6 py-5 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                Change Password
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors active:scale-95 touch-manipulation"
              disabled={isSubmitting}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Password Requirements Checklist */}
          <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4 border border-[var(--brand-border)]">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password Requirements
            </p>
            <div className="grid grid-cols-2 gap-2">
              {requirements.map((req, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-xs ${
                    formData.newPassword.length === 0
                      ? 'text-gray-500 dark:text-gray-400'
                      : req.met
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                    formData.newPassword.length === 0
                      ? 'bg-gray-200 dark:bg-gray-600'
                      : req.met
                      ? 'bg-emerald-500'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    {req.met && formData.newPassword.length > 0 && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  {req.label}
                </div>
              ))}
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type={showPassword.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                className={`w-full pl-10 pr-12 py-2.5 border ${
                  errors.newPassword
                    ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                    : 'border-[var(--brand-border)] focus:ring-blue-500'
                } rounded-xl focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow`}
                placeholder="Enter new password"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
                disabled={isSubmitting}
              >
                {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1.5">{errors.newPassword}</p>
            )}
            {formData.newPassword && !errors.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.strength === 'Weak'
                          ? 'w-1/3 bg-red-500'
                          : passwordStrength.strength === 'Medium'
                          ? 'w-2/3 bg-yellow-500'
                          : 'w-full bg-emerald-500'
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.strength}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                className={`w-full pl-10 pr-12 py-2.5 border ${
                  errors.confirmPassword
                    ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                    : 'border-[var(--brand-border)] focus:ring-blue-500'
                } rounded-xl focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow`}
                placeholder="Confirm new password"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
                disabled={isSubmitting}
              >
                {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1.5">{errors.confirmPassword}</p>
            )}
            {formData.confirmPassword && formData.newPassword === formData.confirmPassword && !errors.confirmPassword && (
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Passwords match
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none touch-manipulation font-semibold flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChapter } from '../../context/ChapterContext';
import { SignUpData } from '../../services/authService';
import { supabase } from '../../services/supabaseClient';
import { useSearchParams } from 'react-router-dom';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

interface InvitationData {
  email: string;
  chapter_id: string;
  role: 'admin' | 'exec' | 'member';
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const { signUp, isLoading } = useAuth();
  const { chapters, loading: chaptersLoading, refreshChapters } = useChapter();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [invitationError, setInvitationError] = useState('');
  const [validatingInvitation, setValidatingInvitation] = useState(false);
  const [formData, setFormData] = useState<SignUpData>({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    year: 'Freshman',
    major: '',
    chapter_id: '',
    position: 'Member',
    role: 'member'
  });

  // Validate invitation token from URL on component mount
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      validateInvitationToken(token);
    }
  }, [searchParams]);

  // Update form when invitation is validated
  useEffect(() => {
    if (invitation) {
      setFormData(prev => ({
        ...prev,
        email: invitation.email,
        chapter_id: invitation.chapter_id,
        role: invitation.role
      }));
    }
  }, [invitation]);

  // Validate invitation token against database
  const validateInvitationToken = async (token: string) => {
    if (!token) return;

    try {
      setValidatingInvitation(true);
      setInvitationError('');

      const { data, error } = await supabase.rpc('validate_invitation_token', {
        p_token: token
      });

      if (error) {
        console.error('Invitation validation error:', error);
        setInvitationError('Failed to validate invitation. Please contact your administrator.');
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (result.is_valid) {
          setInvitation({
            email: result.email,
            chapter_id: result.chapter_id,
            role: result.role as 'admin' | 'exec' | 'member'
          });
        } else {
          setInvitationError(result.error_message || 'Invalid or expired invitation');
        }
      } else {
        setInvitationError('Invalid or expired invitation');
      }
    } catch (err) {
      console.error('Failed to validate invitation:', err);
      setInvitationError('Failed to validate invitation. Please try again.');
    } finally {
      setValidatingInvitation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If no invitation, user shouldn't be able to sign up
    if (!invitation) {
      setInvitationError('You need an invitation to sign up. Please contact your chapter admin.');
      return;
    }

    console.log('Signup form submitted with:', formData);
    const success = await signUp(formData);
    if (success) {
      // Clear form data
      setFormData({
        email: '',
        password: '',
        full_name: '',
        phone_number: '',
        year: 'Freshman',
        major: '',
        chapter_id: '',
        position: 'Member',
        role: 'member'
      });
      setInvitation(null);

      // Automatically switch to login after 3 seconds so user can read the success message
      setTimeout(() => {
        onSwitchToLogin();
      }, 3000);
    } else {
      console.error('Signup failed - check console for details');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const years = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Alumni'];
  const positions = [
    'Member',
    'President',
    'Vice President',
    'Treasurer',
    'Secretary',
    'Risk Manager',
    'Social Chair',
    'Rush Chair',
    'Scholarship Chair',
    'Athletics Chair'
  ];

  // Show loading state while validating invitation
  if (validatingInvitation) {
    return (
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  // Show error if invitation validation failed
  if (invitationError) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid Invitation</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{invitationError}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please contact your chapter administrator for a new invitation link.
          </p>
        </div>
      </div>
    );
  }

  // Show message if no invitation token provided
  if (!invitation && !searchParams.get('token')) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
          <div className="text-blue-500 text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invitation Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need an invitation to create an account. Please check your email for an invitation link from your chapter administrator.
          </p>
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    );
  }

  const invitedChapter = chapters.find(c => c.id === invitation?.chapter_id);

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Join Your Chapter
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create your account
        </p>
        {invitation && invitedChapter && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300">
              ✓ You've been invited to <strong>{invitedChapter.name}</strong> as <strong>{invitation.role}</strong>
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Information */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name *
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            value={formData.full_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            readOnly={!!invitation}
            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 ${
                       invitation ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                     }`}
            placeholder="john.doe@university.edu"
          />
          {invitation && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Email is set by your invitation and cannot be changed
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password *
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              placeholder="Create a strong password"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Academic Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Year
            </label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Position
            </label>
            <select
              id="position"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
            >
              {positions.map((position) => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="major" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Major
          </label>
          <input
            id="major"
            name="major"
            type="text"
            value={formData.major}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            placeholder="Computer Science"
          />
        </div>

        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            id="phone_number"
            name="phone_number"
            type="tel"
            value={formData.phone_number}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            placeholder="(555) 123-4567"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !invitation}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white
                   bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};
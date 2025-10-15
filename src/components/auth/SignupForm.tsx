import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChapter } from '../../context/ChapterContext';
import { SignUpData } from '../../services/authService';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const { signUp, isLoading } = useAuth();
  const { chapters } = useChapter();
  const [showPassword, setShowPassword] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeError, setAccessCodeError] = useState('');
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

  // Set default chapter if only one exists
  useEffect(() => {
    if (chapters.length === 1 && !formData.chapter_id) {
      setFormData(prev => ({ ...prev, chapter_id: chapters[0].id }));
    }
  }, [chapters, formData.chapter_id]);

  // Generate chapter code from chapter info
  const generateChapterCode = (chapterId: string): string => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return '';

    // Extract fraternity abbreviation (e.g., "Alpha Beta" -> "ab")
    const fraternityWords = chapter.fraternity_name.toLowerCase().split(' ');
    const fraternityAbbrev = fraternityWords
      .map(word => word.charAt(0))
      .join('');

    // Extract school abbreviation (e.g., "California Polytechnic State University - San Luis Obispo" -> "slo")
    // Look for common patterns like city names, or use first letters
    let schoolAbbrev = '';
    const schoolLower = chapter.school.toLowerCase();

    // Check for common city/campus abbreviations
    if (schoolLower.includes('san luis obispo') || schoolLower.includes('slo')) {
      schoolAbbrev = 'slo';
    } else if (schoolLower.includes('los angeles') || schoolLower.includes('ucla')) {
      schoolAbbrev = 'la';
    } else if (schoolLower.includes('berkeley')) {
      schoolAbbrev = 'berkeley';
    } else if (schoolLower.includes('san diego')) {
      schoolAbbrev = 'sd';
    } else {
      // Fallback: use first letters of first two words
      const schoolWords = chapter.school.split(' ').filter(w => w.length > 2);
      schoolAbbrev = schoolWords.slice(0, 2).map(w => w.charAt(0)).join('').toLowerCase();
    }

    return `${fraternityAbbrev}-${schoolAbbrev}`;
  };

  // Validate access code and determine role
  const validateAccessCode = (code: string): { valid: boolean; role: 'admin' | 'exec' | 'member' } | null => {
    if (!formData.chapter_id) {
      return null;
    }

    const trimmedCode = code.trim().toLowerCase();
    const chapterCode = generateChapterCode(formData.chapter_id);

    if (!chapterCode) {
      return null;
    }

    // Check for chapter-specific codes
    // Format: {chapter-code}-{role}
    // Example: ab-slo-admin, ab-slo-exec, ab-slo-member

    if (trimmedCode === `${chapterCode}-admin`) {
      return { valid: true, role: 'admin' };
    }

    if (trimmedCode === `${chapterCode}-exec`) {
      return { valid: true, role: 'exec' };
    }

    if (trimmedCode === `${chapterCode}-member` || trimmedCode === chapterCode) {
      return { valid: true, role: 'member' };
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessCodeError('');

    // Validate access code
    const codeValidation = validateAccessCode(accessCode);
    if (!codeValidation) {
      setAccessCodeError('Invalid access code. Please contact your chapter admin for the correct code.');
      return;
    }

    // Update formData with the role based on access code
    const signupData = {
      ...formData,
      role: codeValidation.role,
      position: codeValidation.role === 'admin' ? 'Treasurer' : formData.position
    };

    console.log('Signup form submitted with:', signupData);
    const success = await signUp(signupData);
    if (success) {
      // Clear form data
      setFormData({
        email: '',
        password: '',
        full_name: '',
        phone_number: '',
        year: 'Freshman',
        major: '',
        chapter_id: formData.chapter_id, // Keep chapter selection
        position: 'Member',
        role: 'member'
      });
      setAccessCode('');
      setAccessCodeError('');
      // Switch to login form after successful signup
      onSwitchToLogin();
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

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Join Your Chapter
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create your fraternity account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chapter Selection */}
        <div>
          <label htmlFor="chapter_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chapter *
          </label>
          <select
            id="chapter_id"
            name="chapter_id"
            required
            value={formData.chapter_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
          >
            <option value="">Select your chapter</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name} - {chapter.school}
              </option>
            ))}
          </select>
        </div>

        {/* Access Code */}
        <div>
          <label htmlFor="access_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Access Code *
          </label>
          <input
            id="access_code"
            name="access_code"
            type="text"
            required
            value={accessCode}
            onChange={(e) => {
              setAccessCode(e.target.value);
              setAccessCodeError('');
            }}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 ${
                       accessCodeError
                         ? 'border-red-500 dark:border-red-500'
                         : 'border-gray-300 dark:border-gray-600'
                     }`}
            placeholder="Enter your chapter access code"
          />
          {accessCodeError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{accessCodeError}</p>
          )}
          {formData.chapter_id && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                📝 Your chapter code is: <code className="font-mono font-bold">{generateChapterCode(formData.chapter_id)}</code>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Add <code className="font-mono">-admin</code>, <code className="font-mono">-exec</code>, or <code className="font-mono">-member</code> based on your role
              </p>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            💡 Contact your chapter admin to get the access code
          </p>
        </div>

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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            placeholder="john.doe@university.edu"
          />
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
          disabled={isLoading || !formData.chapter_id}
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
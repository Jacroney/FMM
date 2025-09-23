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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        chapter_id: formData.chapter_id, // Keep chapter selection
        position: 'Member',
        role: 'member'
      });
      // Switch to login form after successful signup
      onSwitchToLogin();
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
                     dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select your chapter</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name} - {chapter.school}
              </option>
            ))}
          </select>
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
                       dark:bg-gray-700 dark:text-white"
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
                       dark:bg-gray-700 dark:text-white"
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
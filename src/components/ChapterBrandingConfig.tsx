import React, { useState, useEffect } from 'react';
import { useChapter } from '../context/ChapterContext';
import { useAuth } from '../context/AuthContext';
import { ChapterService } from '../services/chapterService';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { PhotoIcon, SwatchIcon } from '@heroicons/react/24/outline';

export const ChapterBrandingConfig: React.FC = () => {
  const { currentChapter, refreshChapters } = useChapter();
  const { hasAdminAccess } = useAuth();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [greekLetters, setGreekLetters] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#1E40AF');
  const [accentColor, setAccentColor] = useState('#60A5FA');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Load current chapter branding
  useEffect(() => {
    if (currentChapter) {
      setGreekLetters(currentChapter.greek_letters || '');
      setPrimaryColor(currentChapter.primary_color || '#3B82F6');
      setSecondaryColor(currentChapter.secondary_color || '#1E40AF');
      setAccentColor(currentChapter.accent_color || '#60A5FA');
      setLogoPreview(currentChapter.logo_url || null);
    }
  }, [currentChapter]);

  if (!hasAdminAccess) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          You don't have permission to manage chapter branding.
        </p>
      </div>
    );
  }

  if (!currentChapter) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No chapter selected.
        </p>
      </div>
    );
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !currentChapter) return null;

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${currentChapter.id}/logo-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('chapter-assets')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chapter-assets')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentChapter) return;

    setLoading(true);
    try {
      // Upload logo if changed
      let logoUrl = currentChapter.logo_url;
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Update chapter
      await ChapterService.updateChapter(currentChapter.id, {
        greek_letters: greekLetters,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        logo_url: logoUrl,
      });

      // Refresh chapters to update context
      await refreshChapters();

      toast.success('Branding updated successfully!');
    } catch (error) {
      console.error('Error updating branding:', error);
      toast.error('Failed to update branding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Chapter Branding
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Customize your chapter's colors, logo, and identity
        </p>
      </div>

      {/* Greek Letters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Greek Letters
        </label>
        <input
          type="text"
          value={greekLetters}
          onChange={(e) => setGreekLetters(e.target.value)}
          placeholder="e.g., ΑΒΓ, ΔΕΖ"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter your chapter's Greek letters (copy from character map or use keyboard shortcuts)
        </p>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chapter Logo
        </label>
        <div className="flex items-center gap-4">
          {logoPreview && (
            <div className="w-24 h-24 border-2 border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1">
            <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <PhotoIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {logoFile ? logoFile.name : 'Choose Logo'}
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              PNG, JPG, SVG up to 5MB
            </p>
          </div>
        </div>
      </div>

      {/* Color Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Primary Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Primary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div
            className="mt-2 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        {/* Secondary Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Secondary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div
            className="mt-2 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600"
            style={{ backgroundColor: secondaryColor }}
          />
        </div>

        {/* Accent Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Accent Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div
            className="mt-2 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-600"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      </div>

      {/* Preview Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Preview
        </h3>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-4">
          {/* Button Preview */}
          <div className="flex gap-3 flex-wrap">
            <button
              style={{ backgroundColor: primaryColor, color: 'white' }}
              className="px-4 py-2 rounded-lg font-medium shadow-sm"
            >
              Primary Button
            </button>
            <button
              style={{ backgroundColor: secondaryColor, color: 'white' }}
              className="px-4 py-2 rounded-lg font-medium shadow-sm"
            >
              Secondary Button
            </button>
            <button
              style={{ backgroundColor: accentColor, color: 'white' }}
              className="px-4 py-2 rounded-lg font-medium shadow-sm"
            >
              Accent Button
            </button>
          </div>

          {/* Card Preview */}
          <div
            className="rounded-lg p-4 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <h4 className="font-semibold text-lg mb-1">
              {currentChapter.name}
            </h4>
            {greekLetters && (
              <p className="text-2xl mb-2">{greekLetters}</p>
            )}
            <p className="text-sm opacity-90">{currentChapter.school}</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={loading || uploading}
          className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading || uploading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useChapter } from '../context/ChapterContext';
import { useAuth } from '../context/AuthContext';
import { isDemoModeEnabled } from '../utils/env';
import { ChapterService } from '../services/chapterService';
import { FraternityService } from '../services/fraternityService';
import { Chapter, Fraternity } from '../services/types';
import {
  CheckIcon,
  ChevronUpDownIcon,
  PlusIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

export const ChapterSelector: React.FC = () => {
  const { chapters, currentChapter, setCurrentChapter, refreshChapters } = useChapter();
  const { isSuperAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
  const [loadingFraternities, setLoadingFraternities] = useState(true);
  const [newChapter, setNewChapter] = useState({
    name: '',
    school: '',
    member_count: 0,
    fraternity_id: ''
  });

  // Fetch fraternities on component mount
  useEffect(() => {
    const fetchFraternities = async () => {
      try {
        const data = await FraternityService.getAllFraternities();
        setFraternities(data);
        // Set default fraternity to first one if available
        if (data.length > 0) {
          setNewChapter(prev => ({ ...prev, fraternity_id: data[0].id }));
        }
      } catch (error) {
        console.error('Failed to fetch fraternities:', error);
      } finally {
        setLoadingFraternities(false);
      }
    };
    fetchFraternities();
  }, []);

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await ChapterService.createChapter(newChapter);
      setCurrentChapter(created);
      await refreshChapters();
      setShowCreateForm(false);
      setNewChapter({
        name: '',
        school: '',
        member_count: 0,
        fraternity_id: fraternities.length > 0 ? fraternities[0].id : ''
      });
    } catch (error) {
      console.error('Failed to create chapter:', error);
    }
  };

  if (isDemoModeEnabled() && showCreateForm) {
    setShowCreateForm(false);
  }

  if (showCreateForm) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Chapter</h3>
        <form onSubmit={handleCreateChapter} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chapter Name
            </label>
            <input
              type="text"
              required
              value={newChapter.name}
              onChange={(e) => setNewChapter({ ...newChapter, name: e.target.value })}
              placeholder="e.g., Alpha Beta"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School/University
            </label>
            <input
              type="text"
              required
              value={newChapter.school}
              onChange={(e) => setNewChapter({ ...newChapter, school: e.target.value })}
              placeholder="e.g., University of California"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Member Count
            </label>
            <input
              type="number"
              min="0"
              value={newChapter.member_count}
              onChange={(e) => setNewChapter({ ...newChapter, member_count: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fraternity
            </label>
            <select
              value={newChapter.fraternity_id}
              onChange={(e) => setNewChapter({ ...newChapter, fraternity_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loadingFraternities}
              required
            >
              {loadingFraternities ? (
                <option value="">Loading fraternities...</option>
              ) : fraternities.length === 0 ? (
                <option value="">No fraternities available</option>
              ) : (
                fraternities.map((fraternity) => (
                  <option key={fraternity.id} value={fraternity.id}>
                    {fraternity.name} {fraternity.greek_letters ? `(${fraternity.greek_letters})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Create Chapter
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative w-full cursor-default rounded-md bg-white dark:bg-gray-700 py-2 pl-3 pr-10 text-left text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentChapter ? (
          <div className="flex items-center min-w-0">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1 truncate">
              <span className="font-medium">{currentChapter.name}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2 hidden sm:inline">- {currentChapter.school}</span>
            </div>
          </div>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Select a chapter...</span>
        )}
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className={`relative cursor-default select-none py-2 pl-10 pr-4 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                currentChapter?.id === chapter.id ? 'bg-blue-50 dark:bg-blue-900' : ''
              }`}
              onClick={() => {
                setCurrentChapter(chapter);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900 dark:text-white">{chapter.name}</span>
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-3 truncate">
                    <span className="flex items-center truncate">
                      <AcademicCapIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{chapter.school}</span>
                    </span>
                    <span className="flex items-center flex-shrink-0">
                      <UserGroupIcon className="h-4 w-4 mr-1" />
                      {chapter.member_count}
                    </span>
                  </div>
                </div>
              </div>
              {currentChapter?.id === chapter.id && (
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
            </div>
          ))}
          {!isDemoModeEnabled() && isSuperAdmin && (
            <div
              className="relative cursor-default select-none py-2 pl-10 pr-4 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600"
              onClick={() => {
                setShowCreateForm(true);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center">
                <PlusIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Create New Chapter</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

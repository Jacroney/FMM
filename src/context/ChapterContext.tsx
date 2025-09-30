import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chapter } from '../services/types';
import { ChapterService } from '../services/chapterService';
import { isDemoModeEnabled } from '../utils/env';

interface ChapterContextType {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  setCurrentChapter: (chapter: Chapter | null) => void;
  refreshChapters: () => Promise<void>;
  loading: boolean;
}

const ChapterContext = createContext<ChapterContextType | undefined>(undefined);

export const useChapter = (): ChapterContextType => {
  const context = useContext(ChapterContext);
  if (!context) {
    throw new Error('useChapter must be used within a ChapterProvider');
  }
  return context;
};

interface ChapterProviderProps {
  children: ReactNode;
}

// DEMO MODE: Mock chapter data
const DEMO_MODE = isDemoModeEnabled();

const mockChapter: Chapter = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Alpha Beta Chapter',
  school: 'Demo University',
  address: '123 Greek Row, College Town, ST 12345',
  phone: '(555) 123-4567',
  email: 'treasurer@alphabeta.edu',
  member_count: 45,
  dues_amount: 150.00,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const ChapterProvider: React.FC<ChapterProviderProps> = ({ children }) => {
  const [chapters, setChapters] = useState<Chapter[]>(DEMO_MODE ? [mockChapter] : []);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(DEMO_MODE ? mockChapter : null);
  const [loading, setLoading] = useState(!DEMO_MODE);

  const refreshChapters = async () => {
    try {
      setLoading(true);
      const fetchedChapters = await ChapterService.getAllChapters();
      setChapters(fetchedChapters);

      // If no current chapter is selected, select the first one
      if (!currentChapter && fetchedChapters.length > 0) {
        const savedChapterId = localStorage.getItem('currentChapterId');
        const savedChapter = savedChapterId
          ? fetchedChapters.find(ch => ch.id === savedChapterId)
          : fetchedChapters[0];

        setCurrentChapter(savedChapter || fetchedChapters[0]);
      }
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
      // Set empty chapters array if fetch fails completely
      setChapters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentChapter = (chapter: Chapter | null) => {
    setCurrentChapter(chapter);
    if (chapter) {
      localStorage.setItem('currentChapterId', chapter.id);
    } else {
      localStorage.removeItem('currentChapterId');
    }
  };

  useEffect(() => {
    // Only load chapters once the component mounts
    // This will work for both auth and non-auth users
    if (!DEMO_MODE) {
      refreshChapters();
    }
  }, []);

  const value: ChapterContextType = {
    chapters,
    currentChapter,
    setCurrentChapter: handleSetCurrentChapter,
    refreshChapters,
    loading
  };

  return (
    <ChapterContext.Provider value={value}>
      {children}
    </ChapterContext.Provider>
  );
};

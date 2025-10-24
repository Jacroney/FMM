import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chapter } from '../services/types';
import { ChapterService } from '../services/chapterService';
import { isDemoModeEnabled } from '../utils/env';
import { DEMO_EVENT } from '../demo/demoMode';

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

const mockChapter: Chapter = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Alpha Beta Chapter',
  school: 'Demo University',
  member_count: 48,
  fraternity_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const ChapterProvider: React.FC<ChapterProviderProps> = ({ children }) => {
  const initialDemoMode = isDemoModeEnabled();
  const [chapters, setChapters] = useState<Chapter[]>(initialDemoMode ? [mockChapter] : []);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(initialDemoMode ? mockChapter : null);
  const [loading, setLoading] = useState(!initialDemoMode);

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
    const applyMode = () => {
      if (isDemoModeEnabled()) {
        setChapters([mockChapter]);
        setCurrentChapter(mockChapter);
        setLoading(false);
      } else {
        setLoading(true);
        refreshChapters();
      }
    };

    applyMode();

    if (typeof window !== 'undefined') {
      window.addEventListener(DEMO_EVENT, applyMode);
      return () => window.removeEventListener(DEMO_EVENT, applyMode);
    }

    return undefined;
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

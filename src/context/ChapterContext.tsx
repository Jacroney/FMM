import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chapter } from '../services/types';
import { ChapterService } from '../services/chapterService';

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

export const ChapterProvider: React.FC<ChapterProviderProps> = ({ children }) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);

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
    refreshChapters();
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
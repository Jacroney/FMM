import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useChapter } from './ChapterContext';
import { Chapter } from '../services/types';

interface ChapterTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  greekLetters: string;
  logoUrl: string | null;
}

interface ChapterThemeContextType {
  theme: ChapterTheme;
  isLoading: boolean;
}

const DEFAULT_THEME: ChapterTheme = {
  primaryColor: '#3B82F6', // blue-500
  secondaryColor: '#1E40AF', // blue-800
  accentColor: '#60A5FA', // blue-400
  greekLetters: '',
  logoUrl: null,
};

const ChapterThemeContext = createContext<ChapterThemeContextType | undefined>(undefined);

export const useChapterTheme = (): ChapterThemeContextType => {
  const context = useContext(ChapterThemeContext);
  if (!context) {
    throw new Error('useChapterTheme must be used within a ChapterThemeProvider');
  }
  return context;
};

interface ChapterThemeProviderProps {
  children: ReactNode;
}

/**
 * Converts hex color to RGB values for CSS custom properties
 * Example: #3B82F6 -> 59 130 246
 */
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0 0';
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
};

/**
 * Generates color shades for a given hex color
 * Returns an object with shade variations (50, 100, 200, ..., 900)
 */
const generateColorShades = (hex: string) => {
  // For now, we'll use a simple approach
  // In production, you might want to use a color manipulation library like chroma-js
  const rgb = hexToRgb(hex);

  return {
    50: rgb,
    100: rgb,
    200: rgb,
    300: rgb,
    400: rgb,
    500: rgb, // Base color
    600: rgb,
    700: rgb,
    800: rgb,
    900: rgb,
  };
};

/**
 * Injects CSS custom properties into the document root
 * Priority: Chapter-specific colors > Fraternity colors > Default theme
 */
const injectThemeVariables = (chapter: Chapter | null) => {
  const root = document.documentElement;

  if (!chapter) {
    // Use default theme
    root.style.setProperty('--color-primary', DEFAULT_THEME.primaryColor);
    root.style.setProperty('--color-secondary', DEFAULT_THEME.secondaryColor);
    root.style.setProperty('--color-accent', DEFAULT_THEME.accentColor);
    root.style.setProperty('--color-primary-rgb', hexToRgb(DEFAULT_THEME.primaryColor));
    root.style.setProperty('--color-secondary-rgb', hexToRgb(DEFAULT_THEME.secondaryColor));
    root.style.setProperty('--color-accent-rgb', hexToRgb(DEFAULT_THEME.accentColor));
    return;
  }

  // Determine colors: Chapter-specific override OR fraternity colors OR defaults
  const primaryColor =
    chapter.primary_color ||
    chapter.fraternity?.primary_color ||
    DEFAULT_THEME.primaryColor;

  const secondaryColor =
    chapter.secondary_color ||
    chapter.fraternity?.secondary_color ||
    DEFAULT_THEME.secondaryColor;

  const accentColor =
    chapter.accent_color ||
    chapter.fraternity?.accent_color ||
    DEFAULT_THEME.accentColor;

  // Set base color variables
  root.style.setProperty('--color-primary', primaryColor);
  root.style.setProperty('--color-secondary', secondaryColor);
  root.style.setProperty('--color-accent', accentColor);

  // Set RGB values (useful for opacity)
  root.style.setProperty('--color-primary-rgb', hexToRgb(primaryColor));
  root.style.setProperty('--color-secondary-rgb', hexToRgb(secondaryColor));
  root.style.setProperty('--color-accent-rgb', hexToRgb(accentColor));

  // Apply theme config if available (check both chapter and fraternity)
  const themeConfig = chapter.theme_config || chapter.fraternity?.theme_config;
  if (themeConfig) {
    if (themeConfig.fontFamily) {
      root.style.setProperty('--font-family', themeConfig.fontFamily);
    }
    if (themeConfig.borderRadius) {
      const radiusMap = {
        none: '0',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      };
      root.style.setProperty('--border-radius', radiusMap[themeConfig.borderRadius]);
    }
  }
};

export const ChapterThemeProvider: React.FC<ChapterThemeProviderProps> = ({ children }) => {
  const { currentChapter, loading } = useChapter();

  useEffect(() => {
    // Inject theme variables whenever chapter changes
    injectThemeVariables(currentChapter);
  }, [currentChapter]);

  const theme: ChapterTheme = {
    primaryColor:
      currentChapter?.primary_color ||
      currentChapter?.fraternity?.primary_color ||
      DEFAULT_THEME.primaryColor,
    secondaryColor:
      currentChapter?.secondary_color ||
      currentChapter?.fraternity?.secondary_color ||
      DEFAULT_THEME.secondaryColor,
    accentColor:
      currentChapter?.accent_color ||
      currentChapter?.fraternity?.accent_color ||
      DEFAULT_THEME.accentColor,
    greekLetters:
      currentChapter?.fraternity?.greek_letters ||
      DEFAULT_THEME.greekLetters,
    logoUrl:
      currentChapter?.fraternity?.logo_url ||
      DEFAULT_THEME.logoUrl,
  };

  const value: ChapterThemeContextType = {
    theme,
    isLoading: loading,
  };

  return (
    <ChapterThemeContext.Provider value={value}>
      {children}
    </ChapterThemeContext.Provider>
  );
};

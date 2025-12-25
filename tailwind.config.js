/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
      colors: {
        // Chapter-specific dynamic colors using CSS custom properties
        // These will be set by ChapterThemeContext based on the current chapter
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          50: 'rgb(var(--color-primary-rgb) / 0.05)',
          100: 'rgb(var(--color-primary-rgb) / 0.1)',
          200: 'rgb(var(--color-primary-rgb) / 0.2)',
          300: 'rgb(var(--color-primary-rgb) / 0.3)',
          400: 'rgb(var(--color-primary-rgb) / 0.4)',
          500: 'rgb(var(--color-primary-rgb) / 0.5)',
          600: 'rgb(var(--color-primary-rgb) / 0.6)',
          700: 'rgb(var(--color-primary-rgb) / 0.7)',
          800: 'rgb(var(--color-primary-rgb) / 0.8)',
          900: 'rgb(var(--color-primary-rgb) / 0.9)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary-rgb) / <alpha-value>)',
          50: 'rgb(var(--color-secondary-rgb) / 0.05)',
          100: 'rgb(var(--color-secondary-rgb) / 0.1)',
          200: 'rgb(var(--color-secondary-rgb) / 0.2)',
          300: 'rgb(var(--color-secondary-rgb) / 0.3)',
          400: 'rgb(var(--color-secondary-rgb) / 0.4)',
          500: 'rgb(var(--color-secondary-rgb) / 0.5)',
          600: 'rgb(var(--color-secondary-rgb) / 0.6)',
          700: 'rgb(var(--color-secondary-rgb) / 0.7)',
          800: 'rgb(var(--color-secondary-rgb) / 0.8)',
          900: 'rgb(var(--color-secondary-rgb) / 0.9)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
          50: 'rgb(var(--color-accent-rgb) / 0.05)',
          100: 'rgb(var(--color-accent-rgb) / 0.1)',
          200: 'rgb(var(--color-accent-rgb) / 0.2)',
          300: 'rgb(var(--color-accent-rgb) / 0.3)',
          400: 'rgb(var(--color-accent-rgb) / 0.4)',
          500: 'rgb(var(--color-accent-rgb) / 0.5)',
          600: 'rgb(var(--color-accent-rgb) / 0.6)',
          700: 'rgb(var(--color-accent-rgb) / 0.7)',
          800: 'rgb(var(--color-accent-rgb) / 0.8)',
          900: 'rgb(var(--color-accent-rgb) / 0.9)',
        },
      },
    },
  },
  plugins: [],
} 
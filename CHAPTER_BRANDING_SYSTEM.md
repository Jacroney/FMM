# Chapter Branding System

## Overview

The Chapter Branding System allows each chapter to have unique visual branding including colors, logos, and Greek letters. This is a complete multi-tenant theming solution that dynamically changes the entire application's appearance based on the selected chapter.

## Features

- **Dynamic Color Theming**: Each chapter can have custom primary, secondary, and accent colors
- **Logo Management**: Upload and display chapter-specific logos
- **Greek Letters**: Display chapter Greek letters throughout the app
- **Real-time Preview**: See changes before saving
- **Admin-Only Access**: Only admins can modify chapter branding
- **No Rebuild Required**: Changes apply immediately without redeploying

## Architecture

### 1. Database Layer
- **Table**: `chapters`
- **New Columns**:
  - `greek_letters` - Chapter's Greek letters (e.g., "ΣΧ")
  - `primary_color` - Main brand color (hex)
  - `secondary_color` - Secondary brand color (hex)
  - `accent_color` - Accent/highlight color (hex)
  - `logo_url` - URL to chapter logo in Supabase storage
  - `symbol_url` - URL to chapter symbol/crest
  - `theme_config` - JSONB for additional theme settings

- **Storage**: `chapter-assets` bucket for logos and images

### 2. Context Layer
- **ChapterThemeContext** (`src/context/ChapterThemeContext.tsx`)
  - Loads current chapter's branding
  - Injects CSS custom properties into document
  - Provides theme values to components
  - Works alongside existing light/dark mode

### 3. UI Layer
- **ChapterBrandingConfig** (`src/components/ChapterBrandingConfig.tsx`)
  - Admin interface for customizing branding
  - Color pickers with live preview
  - Logo upload with validation
  - Integrated into Settings page

### 4. Styling Layer
- **Tailwind Config** (`tailwind.config.js`)
  - Added dynamic color utilities: `primary`, `secondary`, `accent`
  - Each with opacity variants (50, 100, 200, etc.)
  - Uses CSS custom properties for runtime changes

## Usage

### For Admins: Customizing Chapter Branding

1. **Navigate to Settings**
   - Click "Settings" in the sidebar
   - Select the "Branding" tab

2. **Customize Greek Letters**
   - Enter your chapter's Greek letters
   - Copy from character map or use keyboard shortcuts
   - Example: ΣΧ, ΠΚΑ, ΛΧΑ

3. **Upload Logo**
   - Click "Choose Logo"
   - Select PNG, JPG, or SVG (max 5MB)
   - Preview appears immediately

4. **Select Colors**
   - Use color pickers for Primary, Secondary, and Accent colors
   - Or enter hex codes manually
   - See live preview of buttons and cards

5. **Save Changes**
   - Click "Save Changes"
   - Changes apply immediately to all users

### For Developers: Using Dynamic Colors

#### In Tailwind Classes
```jsx
// Instead of hardcoded colors:
<button className="bg-blue-500 hover:bg-blue-600">Click Me</button>

// Use dynamic colors:
<button className="bg-primary hover:bg-primary/90">Click Me</button>
```

#### In Inline Styles
```jsx
import { useChapterTheme } from '../context/ChapterThemeContext';

const MyComponent = () => {
  const { theme } = useChapterTheme();

  return (
    <div style={{ backgroundColor: theme.primaryColor }}>
      <h1>{theme.greekLetters}</h1>
      {theme.logoUrl && <img src={theme.logoUrl} alt="Chapter logo" />}
    </div>
  );
};
```

#### Available Tailwind Classes
- **Backgrounds**: `bg-primary`, `bg-secondary`, `bg-accent`
- **Text**: `text-primary`, `text-secondary`, `text-accent`
- **Borders**: `border-primary`, `border-secondary`, `border-accent`
- **Opacity Variants**: `bg-primary/50`, `text-primary/80`, etc.

## Pre-Seeded Chapters

The system comes with 5 Cal Poly chapters pre-configured:

1. **Sigma Chi** (ΣΧ) - Navy blue theme
2. **Pi Kappa Alpha** (ΠΚΑ) - Maroon/garnet theme
3. **Lambda Chi Alpha** (ΛΧΑ) - Green theme
4. **Sigma Phi Epsilon** (ΣΦΕ) - Red and gold theme
5. **Theta Chi** (ΘΧ) - Purple theme

## Adding New Chapters

### Option 1: Through the UI (Recommended for Non-Technical Users)
1. Admin creates chapter through admin panel (when implemented)
2. Navigate to Settings > Branding
3. Customize colors, logo, and Greek letters
4. Save changes

### Option 2: Direct Database Insert (For Developers)
```sql
INSERT INTO chapters (
  name,
  school,
  member_count,
  fraternity_name,
  greek_letters,
  primary_color,
  secondary_color,
  accent_color,
  theme_config
) VALUES (
  'Chapter Name',
  'University Name',
  50,
  'Fraternity Name',
  'ΑΒΓ',
  '#3B82F6', -- Primary color (hex)
  '#1E40AF', -- Secondary color (hex)
  '#60A5FA', -- Accent color (hex)
  '{"fontFamily": "system-ui", "borderRadius": "md"}'::jsonb
);
```

### Option 3: Create a Seed Migration
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_seed_new_chapter.sql
INSERT INTO chapters (...) VALUES (...);
```

## Configuration File (Optional)

You can create a configuration file for easier chapter management:

```typescript
// src/config/chapters.ts
export const defaultChapterBranding = {
  'sigma-chi': {
    greekLetters: 'ΣΧ',
    primaryColor: '#1E40AF',
    secondaryColor: '#3B82F6',
    accentColor: '#60A5FA',
  },
  // Add more chapters...
};
```

## Technical Details

### CSS Custom Properties
The following CSS variables are set by ChapterThemeContext:

- `--color-primary` - Primary color (hex)
- `--color-secondary` - Secondary color (hex)
- `--color-accent` - Accent color (hex)
- `--color-primary-rgb` - Primary color (RGB values)
- `--color-secondary-rgb` - Secondary color (RGB values)
- `--color-accent-rgb` - Accent color (RGB values)

### Storage Bucket
- **Name**: `chapter-assets`
- **Public**: Yes
- **Size Limit**: 5MB per file
- **Allowed Types**: PNG, JPG, SVG, WebP
- **Path Structure**: `{chapter_id}/logo-{timestamp}.{ext}`

### Type Definitions
```typescript
interface Chapter {
  id: string;
  name: string;
  school: string;
  fraternity_name: string;
  greek_letters?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
  symbol_url?: string;
  theme_config?: ChapterThemeConfig;
}

interface ChapterThemeConfig {
  fontFamily?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  buttonStyle?: 'solid' | 'outline' | 'ghost';
  customCSS?: string;
}
```

## Migration Instructions

To apply the branding system to your database:

```bash
# 1. Apply the branding schema migration
npx supabase db push

# Or if using migration files directly:
psql -h your-db-host -U postgres -d your-db \
  -f supabase/migrations/20250115000001_chapter_branding.sql

# 2. (Optional) Seed Cal Poly chapters
psql -h your-db-host -U postgres -d your-db \
  -f supabase/migrations/20250115000002_seed_calpoly_chapters.sql
```

## Troubleshooting

### Colors Not Changing
- Verify ChapterThemeProvider is wrapped around your app
- Check browser console for CSS custom property values
- Ensure Tailwind is processing the dynamic color classes

### Logo Not Uploading
- Check file size (must be < 5MB)
- Verify file type (PNG, JPG, SVG only)
- Check Supabase storage bucket permissions
- Ensure storage bucket exists

### Storage Bucket Doesn't Exist
```sql
-- Run this SQL to create the bucket manually:
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chapter-assets', 'chapter-assets', true, 5242880);
```

## Future Enhancements

- [ ] Font family customization
- [ ] Custom CSS injection
- [ ] Export/import branding templates
- [ ] Dark mode color variants
- [ ] Animation preferences
- [ ] Multiple logos (light/dark variants)
- [ ] Symbol/crest management

## Support

For questions or issues with the branding system:
1. Check this documentation
2. Review the code comments in:
   - `src/context/ChapterThemeContext.tsx`
   - `src/components/ChapterBrandingConfig.tsx`
   - `src/services/chapterService.ts`
3. Check Supabase logs for storage/database errors

## Examples

### Example 1: Custom Button with Primary Color
```jsx
<button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
  Click Me
</button>
```

### Example 2: Chapter Header with Greek Letters
```jsx
import { useChapterTheme } from '../context/ChapterThemeContext';
import { useChapter } from '../context/ChapterContext';

const ChapterHeader = () => {
  const { theme } = useChapterTheme();
  const { currentChapter } = useChapter();

  return (
    <div className="bg-primary text-white p-6 rounded-lg">
      {theme.logoUrl && (
        <img src={theme.logoUrl} alt="Logo" className="h-16 mb-4" />
      )}
      <h1 className="text-3xl font-bold">{currentChapter?.name}</h1>
      {theme.greekLetters && (
        <p className="text-4xl mt-2">{theme.greekLetters}</p>
      )}
    </div>
  );
};
```

### Example 3: Gradient with Secondary Color
```jsx
<div className="bg-gradient-to-r from-primary to-secondary p-8 text-white">
  <h2 className="text-2xl font-bold">Beautiful Gradient</h2>
</div>
```

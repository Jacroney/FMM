# Chapter Branding - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Apply Database Migrations

Run these commands to set up the branding system in your database:

```bash
# If using Supabase CLI (recommended)
npx supabase db push

# Or connect directly and run migrations
# Migration files:
# - supabase/migrations/20250115000001_chapter_branding.sql
# - supabase/migrations/20250115000002_seed_calpoly_chapters.sql
```

### Step 2: Test the System

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Log in as an admin user

3. Navigate to **Settings** → **Branding** tab

4. You should see:
   - Greek letters input
   - Logo upload
   - Three color pickers (Primary, Secondary, Accent)
   - Live preview

### Step 3: Customize Your First Chapter

1. **Add Greek Letters**: Enter your chapter's Greek letters (e.g., ΣΧ, ΠΚΑ)
2. **Pick Colors**: Use the color pickers or enter hex codes
3. **Upload Logo**: Click "Choose Logo" and select your chapter logo
4. **Preview**: Check the preview section to see how it looks
5. **Save**: Click "Save Changes"

### Step 4: See the Changes

- Refresh the page or navigate to the dashboard
- Your new colors should be applied throughout the app
- Greek letters appear in the sidebar header (when implemented)

## 🎨 Using Dynamic Colors in Your Code

### Basic Usage (Recommended)

Replace hardcoded blue colors with dynamic colors:

```jsx
// ❌ Old way (hardcoded)
<button className="bg-blue-500 hover:bg-blue-600">Button</button>

// ✅ New way (dynamic)
<button className="bg-primary hover:bg-primary/90">Button</button>
```

### Available Color Classes

| Purpose | Old (Blue) | New (Dynamic) |
|---------|-----------|---------------|
| Primary button | `bg-blue-500` | `bg-primary` |
| Secondary button | `bg-blue-800` | `bg-secondary` |
| Accent/highlight | `bg-blue-400` | `bg-accent` |
| Primary text | `text-blue-600` | `text-primary` |
| Primary border | `border-blue-500` | `border-primary` |

### Opacity Variants

```jsx
// Light backgrounds
<div className="bg-primary/10">...</div>  // 10% opacity
<div className="bg-primary/20">...</div>  // 20% opacity

// Semi-transparent
<div className="bg-primary/50">...</div>  // 50% opacity

// Nearly opaque
<div className="bg-primary/90">...</div>  // 90% opacity
```

## 📋 Common Use Cases

### Use Case 1: Brand the Sidebar

```jsx
// In Sidebar.tsx
<div className="bg-secondary text-white">
  {theme.logoUrl && <img src={theme.logoUrl} alt="Logo" />}
  <h1>{theme.greekLetters}</h1>
</div>
```

### Use Case 2: Colorful Dashboard Cards

```jsx
// In Dashboard.tsx
<div className="bg-primary text-white p-6 rounded-lg shadow-lg">
  <h2 className="text-2xl font-bold">Welcome</h2>
  <p>Chapter: {currentChapter?.name}</p>
</div>
```

### Use Case 3: Accent Highlights

```jsx
// Highlight important items
<div className="border-l-4 border-accent bg-accent/10 p-4">
  <p>This is an important notice!</p>
</div>
```

## 🔧 Adding New Chapters

### Method 1: Through SQL (Quick)

```sql
INSERT INTO chapters (
  name,
  school,
  fraternity_name,
  greek_letters,
  primary_color,
  secondary_color,
  accent_color
) VALUES (
  'Your Chapter Name',
  'Your University',
  'Your Fraternity/Sorority',
  'ΑΒΓ',  -- Your Greek letters
  '#3B82F6',  -- Primary color
  '#1E40AF',  -- Secondary color
  '#60A5FA'   -- Accent color
);
```

### Method 2: Create a Migration File

Create `supabase/migrations/YYYYMMDDHHMMSS_add_your_chapter.sql`:

```sql
INSERT INTO chapters (name, school, fraternity_name, greek_letters, primary_color, secondary_color, accent_color)
VALUES ('Chapter Name', 'University', 'Fraternity', 'ΑΒΓ', '#color1', '#color2', '#color3');
```

Then run:
```bash
npx supabase db push
```

## 🎯 5 Pre-Configured Cal Poly Chapters

After running the migrations, you'll have these chapters ready:

1. **Sigma Chi** (ΣΧ) - Navy blue
2. **Pi Kappa Alpha** (ΠΚΑ) - Maroon/red
3. **Lambda Chi Alpha** (ΛΧΑ) - Green
4. **Sigma Phi Epsilon** (ΣΦΕ) - Red/gold
5. **Theta Chi** (ΘΧ) - Purple

## 🐛 Troubleshooting

### Colors aren't changing?
```bash
# 1. Check if migrations ran
npm run db:status

# 2. Verify CSS variables in browser console
console.log(getComputedStyle(document.documentElement).getPropertyValue('--color-primary'))

# 3. Clear browser cache and reload
```

### Can't upload logo?
- File must be < 5MB
- Supported formats: PNG, JPG, SVG, WebP
- Check browser console for errors
- Verify Supabase storage bucket exists

### Greek letters not displaying?
- Make sure your font supports Greek characters
- Copy Greek letters from: [Copy Paste Greek](https://www.copypastecharacter.com/greek)
- Common Greek letters: Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω

## 📖 Next Steps

1. **Customize existing components** to use dynamic colors
2. **Update the Sidebar** to show chapter logo and Greek letters
3. **Add chapter branding to emails/PDFs** (future enhancement)
4. **Create brand guidelines** for your chapter

## 💡 Pro Tips

- **Color Picker Tools**: Use [coolors.co](https://coolors.co) to generate color palettes
- **Greek Letters**: Keep a text file with your chapter's Greek letters for easy copy/paste
- **Logo Files**: Use transparent PNG for best results
- **Testing**: Test your colors in both light and dark modes

## 📚 Full Documentation

For complete documentation, see:
- `CHAPTER_BRANDING_SYSTEM.md` - Full technical documentation
- `src/context/ChapterThemeContext.tsx` - Theme context implementation
- `src/components/ChapterBrandingConfig.tsx` - Branding UI component

## ✅ Checklist

Before going to production:

- [ ] Apply database migrations
- [ ] Customize chapter branding in Settings
- [ ] Upload chapter logo
- [ ] Test colors in light and dark mode
- [ ] Update hardcoded blue colors to use dynamic colors
- [ ] Test on mobile devices
- [ ] Verify logo displays correctly
- [ ] Check Greek letters render properly

---

**Need Help?** Check the main documentation file or review the code comments in the branding components.

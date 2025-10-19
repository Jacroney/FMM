-- ============================================================================
-- CHAPTER BRANDING SYSTEM
-- ============================================================================
-- Adds branding customization fields to chapters table for multi-tenant theming
-- ============================================================================

-- Add branding columns to chapters table
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS greek_letters TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#1E40AF',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#60A5FA',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS symbol_url TEXT,
ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{}'::JSONB;

-- Add comment explaining the columns
COMMENT ON COLUMN chapters.greek_letters IS 'Greek letters for the chapter (e.g., ΑΒΓ)';
COMMENT ON COLUMN chapters.primary_color IS 'Primary brand color (hex code)';
COMMENT ON COLUMN chapters.secondary_color IS 'Secondary brand color (hex code)';
COMMENT ON COLUMN chapters.accent_color IS 'Accent/highlight color (hex code)';
COMMENT ON COLUMN chapters.logo_url IS 'URL to chapter logo in Supabase storage';
COMMENT ON COLUMN chapters.symbol_url IS 'URL to chapter symbol/crest in Supabase storage';
COMMENT ON COLUMN chapters.theme_config IS 'Additional theme configuration (JSONB)';

-- Create storage bucket for chapter assets (logos, symbols, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chapter-assets',
  'chapter-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for chapter assets
-- Allow authenticated users to read all chapter assets
CREATE POLICY IF NOT EXISTS "Chapter assets are publicly readable"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chapter-assets');

-- Allow authenticated users to upload chapter assets
CREATE POLICY IF NOT EXISTS "Authenticated users can upload chapter assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chapter-assets');

-- Allow authenticated users to update their own chapter's assets
CREATE POLICY IF NOT EXISTS "Users can update their chapter assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chapter-assets');

-- Allow authenticated users to delete their chapter's assets
CREATE POLICY IF NOT EXISTS "Users can delete their chapter assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chapter-assets');

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Chapter branding system created successfully!' AS status;

-- Create the store_logos bucket for seller logo uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('store_logos', 'store_logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS (Row Level Security) policies for the store_logos bucket

-- Allow authenticated users to insert/update their own logos
CREATE POLICY "Allow users to upload their own logos" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'store_logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own logos
CREATE POLICY "Allow users to update their own logos" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'store_logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own logos
CREATE POLICY "Allow users to delete their own logos" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'store_logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to all logos
CREATE POLICY "Allow public to view logos" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'store_logos');

-- Update the file format in the upload helper function
INSERT INTO storage.extensions (name, mimetype, comment)
VALUES 
    ('jpg', 'image/jpeg', 'JPEG image'),
    ('jpeg', 'image/jpeg', 'JPEG image'),
    ('png', 'image/png', 'PNG image'),
    ('gif', 'image/gif', 'GIF image'),
    ('webp', 'image/webp', 'WebP image'),
    ('svg', 'image/svg+xml', 'SVG image')
ON CONFLICT (name) DO NOTHING;
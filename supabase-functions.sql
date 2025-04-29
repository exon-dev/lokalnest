-- Function to query table information
CREATE OR REPLACE FUNCTION public.run_sql_query(query text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
  RETURN result;
END;
$$;

-- Function to directly insert a seller profile (with appropriate permissions)
CREATE OR REPLACE FUNCTION public.insert_seller_profile(
  user_id uuid, 
  profile_data jsonb
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.seller_profiles (
    id, 
    business_name,
    description,
    contact_email,
    phone,
    website,
    address,
    founding_year,
    facebook,
    instagram,
    location,
    logo_url,
    created_at,
    updated_at
  )
  VALUES (
    user_id,
    profile_data->>'business_name',
    profile_data->>'description',
    profile_data->>'contact_email',
    profile_data->>'phone',
    profile_data->>'website',
    profile_data->>'address',
    (profile_data->>'founding_year')::integer,
    profile_data->>'facebook',
    profile_data->>'instagram',
    profile_data->>'location',
    profile_data->>'logo_url',
    COALESCE(profile_data->>'created_at', NOW()),
    COALESCE(profile_data->>'updated_at', NOW())
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    business_name = EXCLUDED.business_name,
    description = EXCLUDED.description,
    contact_email = EXCLUDED.contact_email,
    phone = EXCLUDED.phone,
    website = EXCLUDED.website,
    address = EXCLUDED.address,
    founding_year = EXCLUDED.founding_year,
    facebook = EXCLUDED.facebook,
    instagram = EXCLUDED.instagram,
    location = EXCLUDED.location,
    logo_url = EXCLUDED.logo_url,
    updated_at = EXCLUDED.updated_at;
    
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in insert_seller_profile: %', SQLERRM;
    RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.run_sql_query TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_seller_profile TO authenticated;

-- Create an anonymous function to check table structure
CREATE OR REPLACE FUNCTION public.get_seller_profiles_columns()
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    column_name::text, 
    data_type::text, 
    is_nullable::text
  FROM 
    information_schema.columns
  WHERE 
    table_name = 'seller_profiles'
  ORDER BY 
    ordinal_position;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_seller_profiles_columns TO authenticated;

-- Row Level Security (RLS) policies
-- Ensure seller_profiles has appropriate RLS policies

-- Allow users to select their own seller profile
CREATE POLICY select_own_seller_profile
ON public.seller_profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own seller profile
CREATE POLICY update_own_seller_profile
ON public.seller_profiles
FOR UPDATE
USING (auth.uid() = id);

-- Allow users to insert their own seller profile
CREATE POLICY insert_own_seller_profile
ON public.seller_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Make sure table permissions are enabled
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY; 
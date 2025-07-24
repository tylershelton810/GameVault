-- Update the handle_new_user function to assign Founder badge to first 100 users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count integer;
BEGIN
  -- Get current user count before inserting the new user
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  -- Insert the new user record
  INSERT INTO public.users (
    id,
    user_id,
    email,
    name,
    full_name,
    avatar_url,
    token_identifier,
    created_at,
    updated_at,
    special_badges
  ) VALUES (
    NEW.id,
    NEW.id::text,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NEW.created_at,
    NEW.updated_at,
    CASE 
      WHEN user_count < 100 THEN '["founder"]'::jsonb
      ELSE '[]'::jsonb
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: users table is already enabled for realtime in initial-setup.sql

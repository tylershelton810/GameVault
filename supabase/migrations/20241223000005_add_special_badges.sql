-- Add special_badges column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS special_badges jsonb DEFAULT '[]'::jsonb;

-- Enable realtime for users table if not already enabled
alter publication supabase_realtime add table users;

-- Create index for special badges for better performance
CREATE INDEX IF NOT EXISTS idx_users_special_badges ON public.users USING GIN (special_badges);

-- Add notification_preferences column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"friend_requests": true}'::jsonb;

-- Update existing users to have default notification preferences
UPDATE public.users 
SET notification_preferences = '{"friend_requests": true}'::jsonb 
WHERE notification_preferences IS NULL;

-- Add onboarding_status column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_status jsonb DEFAULT '{"games": false, "friends": false, "clubs": false, "completed": false}'::jsonb;

-- Update existing users to have the default onboarding status
UPDATE public.users 
SET onboarding_status = '{"games": false, "friends": false, "clubs": false, "completed": false}'::jsonb 
WHERE onboarding_status IS NULL;

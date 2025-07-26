ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_donor boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS donation_started_at timestamp with time zone;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS donation_expires_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_users_is_donor ON public.users(is_donor);
CREATE INDEX IF NOT EXISTS idx_users_donation_expires_at ON public.users(donation_expires_at);
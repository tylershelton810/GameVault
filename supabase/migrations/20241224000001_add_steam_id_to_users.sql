ALTER TABLE public.users ADD COLUMN IF NOT EXISTS steam_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_steam_id ON public.users(steam_id);

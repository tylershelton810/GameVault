-- Combined migration file that includes all necessary database setup

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY NOT NULL,
    avatar_url text,
    user_id text UNIQUE,
    token_identifier text NOT NULL,
    image text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone,
    email text,
    name text,
    full_name text,
    onboarding_status jsonb DEFAULT '{"games": false, "friends": false, "clubs": false, "completed": false}'::jsonb
);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    -- Check if the policy for users exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Users can view own data'
    ) THEN
        -- Create policy to allow users to see only their own data
        EXECUTE 'CREATE POLICY "Users can view own data" ON public.users
                FOR SELECT USING (auth.uid()::text = user_id)';
    END IF;

END
$$;

-- Create a function that will be triggered when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    user_id,
    email,
    name,
    full_name,
    avatar_url,
    token_identifier,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id::text,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NEW.created_at,
    NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a new user is added to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update the function to handle user updates as well
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    name = NEW.raw_user_meta_data->>'name',
    full_name = NEW.raw_user_meta_data->>'full_name',
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = NEW.updated_at
  WHERE user_id = NEW.id::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a user is updated in auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Game Collections table
CREATE TABLE IF NOT EXISTS public.game_collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    igdb_game_id integer NOT NULL,
    game_title text NOT NULL,
    game_cover_url text,
    status text NOT NULL CHECK (status IN ('playing', 'played', 'want-to-play')),
    personal_rating numeric(3,1) CHECK (personal_rating >= 0.5 AND personal_rating <= 10.0),
    personal_notes text,
    is_favorite boolean DEFAULT false,
    backlog_priority integer,
    date_added timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    date_started timestamp with time zone,
    date_completed timestamp with time zone,
    hours_played integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, igdb_game_id)
);

-- Game Reviews table (for detailed reviews separate from collections)
CREATE TABLE IF NOT EXISTS public.game_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    game_collection_id uuid NOT NULL REFERENCES public.game_collections(id) ON DELETE CASCADE,
    review_text text NOT NULL,
    rating numeric(3,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 10.0),
    is_public boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, game_collection_id)
);

-- Friends table for social features
CREATE TABLE IF NOT EXISTS public.friendships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    addressee_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

-- Activity Feed table for social timeline
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_type text NOT NULL CHECK (activity_type IN ('game_added', 'game_completed', 'game_rated', 'review_posted')),
    game_collection_id uuid REFERENCES public.game_collections(id) ON DELETE CASCADE,
    game_review_id uuid REFERENCES public.game_reviews(id) ON DELETE CASCADE,
    activity_data jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Activity Interactions table (likes, comments)
CREATE TABLE IF NOT EXISTS public.activity_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES public.activity_feed(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    interaction_type text NOT NULL CHECK (interaction_type IN ('like', 'comment')),
    comment_text text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Notifications table for user notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    from_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_id uuid REFERENCES public.activity_feed(id) ON DELETE CASCADE,
    interaction_id uuid REFERENCES public.activity_interactions(id) ON DELETE CASCADE,
    notification_type text NOT NULL CHECK (notification_type IN ('like', 'comment')),
    is_read boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable realtime for all tables
alter publication supabase_realtime add table game_reviews;
alter publication supabase_realtime add table friendships;
alter publication supabase_realtime add table activity_feed;
alter publication supabase_realtime add table activity_interactions;
alter publication supabase_realtime add table notifications;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_collections_user_id ON public.game_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_game_collections_status ON public.game_collections(status);
CREATE INDEX IF NOT EXISTS idx_game_collections_igdb_id ON public.game_collections(igdb_game_id);
CREATE INDEX IF NOT EXISTS idx_game_reviews_user_id ON public.game_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON public.activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON public.activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_interactions_activity_id ON public.activity_interactions(activity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC); 
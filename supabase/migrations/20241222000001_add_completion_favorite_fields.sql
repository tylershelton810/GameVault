-- Add completion and favorite fields to game_collections table
ALTER TABLE public.game_collections 
ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- Update realtime publication (only if not already added)
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'game_collections'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE game_collections;
    END IF;
END $;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_collections_is_favorite ON public.game_collections(is_favorite);
CREATE INDEX IF NOT EXISTS idx_game_collections_is_completed ON public.game_collections(is_completed);

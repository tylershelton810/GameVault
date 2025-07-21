CREATE TABLE IF NOT EXISTS game_clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  igdb_game_id INTEGER NOT NULL,
  game_title VARCHAR(255) NOT NULL,
  game_cover_url TEXT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  max_members INTEGER DEFAULT 10,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_club_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES game_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('creator', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed')),
  UNIQUE(club_id, user_id)
);

CREATE TABLE IF NOT EXISTS game_club_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES game_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'message' CHECK (message_type IN ('message', 'pinned', 'poll', 'system')),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_club_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES game_club_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS game_club_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES game_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating DECIMAL(3,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 10),
  review_text TEXT,
  is_completed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_clubs_creator_id ON game_clubs(creator_id);
CREATE INDEX IF NOT EXISTS idx_game_clubs_status ON game_clubs(status);
CREATE INDEX IF NOT EXISTS idx_game_clubs_start_date ON game_clubs(start_date);
CREATE INDEX IF NOT EXISTS idx_game_clubs_end_date ON game_clubs(end_date);
CREATE INDEX IF NOT EXISTS idx_game_club_members_club_id ON game_club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_game_club_members_user_id ON game_club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_game_club_messages_club_id ON game_club_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_game_club_messages_created_at ON game_club_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_game_club_reactions_message_id ON game_club_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_game_club_reviews_club_id ON game_club_reviews(club_id);

alter publication supabase_realtime add table game_clubs;
alter publication supabase_realtime add table game_club_members;
alter publication supabase_realtime add table game_club_messages;
alter publication supabase_realtime add table game_club_reactions;
alter publication supabase_realtime add table game_club_reviews;

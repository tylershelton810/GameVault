CREATE TABLE IF NOT EXISTS activity_interactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_type text NOT NULL CHECK (interaction_type IN ('like', 'comment')),
  comment_text text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(activity_id, user_id, interaction_type)
);

DROP POLICY IF EXISTS "Users can manage their own interactions" ON activity_interactions;
CREATE POLICY "Users can manage their own interactions"
ON activity_interactions FOR ALL
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view all interactions" ON activity_interactions;
CREATE POLICY "Users can view all interactions"
ON activity_interactions FOR SELECT
USING (true);
-- Ensure notifications table exists with proper structure
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    from_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_id uuid REFERENCES public.activity_feed(id) ON DELETE CASCADE,
    interaction_id uuid REFERENCES public.activity_interactions(id) ON DELETE CASCADE,
    notification_type text NOT NULL CHECK (notification_type IN ('like', 'comment', 'friend_request')),
    is_read boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add notification preferences to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"friend_requests": true}'::jsonb;

-- Update notifications table to support friend_request type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check 
  CHECK (notification_type IN ('like', 'comment', 'friend_request'));

-- Create function to handle friend request notifications
CREATE OR REPLACE FUNCTION public.handle_friend_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if the addressee has friend request notifications enabled
  IF (SELECT (notification_preferences->>'friend_requests')::boolean FROM public.users WHERE id = NEW.addressee_id) = true THEN
    INSERT INTO public.notifications (
      user_id,
      from_user_id,
      notification_type,
      created_at
    ) VALUES (
      NEW.addressee_id,
      NEW.requester_id,
      'friend_request',
      NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for friend request notifications
DROP TRIGGER IF EXISTS on_friend_request_created ON public.friendships;
CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON public.friendships
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.handle_friend_request_notification();

-- Create function to clean up notifications when friend request is resolved
CREATE OR REPLACE FUNCTION public.cleanup_friend_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete friend request notifications when friendship status changes from pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    DELETE FROM public.notifications 
    WHERE notification_type = 'friend_request' 
    AND user_id = NEW.addressee_id 
    AND from_user_id = NEW.requester_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for cleaning up notifications
DROP TRIGGER IF EXISTS on_friend_request_resolved ON public.friendships;
CREATE TRIGGER on_friend_request_resolved
  AFTER UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_friend_request_notification();

-- Also clean up when friendship is deleted
CREATE OR REPLACE FUNCTION public.cleanup_friend_request_notification_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE notification_type = 'friend_request' 
  AND user_id = OLD.addressee_id 
  AND from_user_id = OLD.requester_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friend_request_deleted ON public.friendships;
CREATE TRIGGER on_friend_request_deleted
  AFTER DELETE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_friend_request_notification_on_delete();

-- Enable realtime for notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;
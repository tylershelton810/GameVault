import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Heart, MessageCircle, X } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";

interface Activity {
  id: string;
  type: "game_added" | "game_completed" | "game_rated" | "review_posted";
  title: string;
  description: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  timestamp: string;
  game?: string;
  rating?: number;
  activity_data?: any;
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
  comments?: Comment[];
}

interface Comment {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  text: string;
  timestamp: string;
}

interface SocialTimelineProps {
  activities?: Activity[];
  onActivityClick?: (activity: Activity) => void;
  isLoading?: boolean;
}

const SocialTimeline = ({
  activities: propActivities,
  onActivityClick = () => {},
  isLoading: propIsLoading = false,
}: SocialTimelineProps) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<string[]>([]);
  const [likingActivity, setLikingActivity] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Fetch user's friends
  const fetchFriends = useCallback(async () => {
    if (!user) return [];

    try {
      const { data: friendships, error } = await supabase
        .from("friendships")
        .select(
          `
          requester_id,
          addressee_id
        `,
        )
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (error) {
        console.error("Error fetching friends:", error);
        return [];
      }

      const friendIds =
        friendships?.map((friendship) =>
          friendship.requester_id === user.id
            ? friendship.addressee_id
            : friendship.requester_id,
        ) || [];

      // Include the current user's activities as well
      return [...friendIds, user.id];
    } catch (error) {
      console.error("Error fetching friends:", error);
      return [user.id];
    }
  }, [user]);

  // Fetch activities from friends and self
  const fetchActivities = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userIds = await fetchFriends();
      setFriends(userIds);

      if (userIds.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const { data: activitiesData, error } = await supabase
        .from("activity_feed")
        .select(
          `
          *,
          user:users!activity_feed_user_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          game_collection:game_collections(
            game_title,
            personal_rating
          ),
          game_review:game_reviews(
            review_text,
            rating
          )
        `,
        )
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch likes and comments for each activity
      const activityIds = activitiesData?.map((activity) => activity.id) || [];

      const [likesData, commentsData] = await Promise.all([
        // Fetch likes count and user's like status
        supabase
          .from("activity_interactions")
          .select("activity_id, user_id")
          .in("activity_id", activityIds)
          .eq("interaction_type", "like"),
        // Fetch comments
        supabase
          .from("activity_interactions")
          .select(
            `
            *,
            user:users!activity_interactions_user_id_fkey(
              id,
              full_name,
              avatar_url
            )
          `,
          )
          .in("activity_id", activityIds)
          .eq("interaction_type", "comment")
          .order("created_at", { ascending: true }),
      ]);

      const likesMap = new Map<string, { count: number; userLiked: boolean }>();
      const commentsMap = new Map<string, Comment[]>();

      // Process likes
      if (likesData.data) {
        likesData.data.forEach((like) => {
          const current = likesMap.get(like.activity_id) || {
            count: 0,
            userLiked: false,
          };
          current.count++;
          if (like.user_id === user.id) {
            current.userLiked = true;
          }
          likesMap.set(like.activity_id, current);
        });
      }

      // Process comments
      if (commentsData.data) {
        commentsData.data.forEach((comment) => {
          const activityComments = commentsMap.get(comment.activity_id) || [];
          activityComments.push({
            id: comment.id,
            user: {
              id: comment.user?.id || "",
              name: comment.user?.full_name || "Unknown User",
              avatar:
                comment.user?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user?.full_name || "user"}`,
            },
            text: comment.comment_text || "",
            timestamp: formatTimestamp(comment.created_at),
          });
          commentsMap.set(comment.activity_id, activityComments);
        });
      }

      if (error) {
        console.error("Error fetching activities:", error);
        setActivities([]);
        return;
      }

      // Transform the data to match our Activity interface
      const transformedActivities: Activity[] =
        activitiesData?.map((activity) => {
          const activityData = activity.activity_data || {};
          let title = "";
          let description = "";
          let game = "";
          let rating: number | undefined;

          switch (activity.activity_type) {
            case "game_added":
              title = `Added ${activityData.game_title || "a game"} to their library`;
              description = `Status: ${activityData.status || "Unknown"}`;
              game = activityData.game_title || "";
              break;
            case "game_completed":
              title = `Completed ${activityData.game_title || "a game"}`;
              description = "Finished playing this game";
              game = activityData.game_title || "";
              break;
            case "game_rated":
              title = `Rated ${activityData.game_title || "a game"}`;
              description = `Gave it a ${activityData.rating || "N/A"}/10 rating`;
              game = activityData.game_title || "";
              rating = activityData.rating;
              break;
            case "review_posted":
              title = `Wrote a review for ${activityData.game_title || "a game"}`;
              description =
                activity.game_review?.review_text || "Posted a review";
              game = activityData.game_title || "";
              rating = activity.game_review?.rating;
              break;
            default:
              title = "Unknown activity";
              description = "";
          }

          const likeInfo = likesMap.get(activity.id) || {
            count: 0,
            userLiked: false,
          };
          const comments = commentsMap.get(activity.id) || [];

          return {
            id: activity.id,
            type: activity.activity_type as Activity["type"],
            title,
            description,
            user: {
              id: activity.user?.id || "",
              name: activity.user?.full_name || "Unknown User",
              avatar:
                activity.user?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.user?.full_name || "user"}`,
            },
            timestamp: formatTimestamp(activity.created_at),
            game,
            rating,
            activity_data: activityData,
            likes_count: likeInfo.count,
            comments_count: comments.length,
            user_has_liked: likeInfo.userLiked,
            comments,
          };
        }) || [];

      setActivities(transformedActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [user, fetchFriends]);

  // Format timestamp to relative time
  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - activityTime.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60)
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7)
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;

    return activityTime.toLocaleDateString();
  };

  // Handle like/unlike activity
  const handleLikeActivity = async (activityId: string) => {
    if (!user || likingActivity === activityId) return;

    setLikingActivity(activityId);

    try {
      // Check if user already liked this activity
      const { data: existingLikes, error: fetchError } = await supabase
        .from("activity_interactions")
        .select("id")
        .eq("activity_id", activityId)
        .eq("user_id", user.id)
        .eq("interaction_type", "like");

      if (fetchError) {
        console.error("Error fetching existing likes:", fetchError);
        setLikingActivity(null);
        return;
      }

      const existingLike =
        existingLikes && existingLikes.length > 0 ? existingLikes[0] : null;

      if (existingLike) {
        // Unlike - remove the like
        const { error: deleteError } = await supabase
          .from("activity_interactions")
          .delete()
          .eq("id", existingLike.id);

        if (deleteError) {
          console.error("Error removing like:", deleteError);
          setLikingActivity(null);
          return;
        }

        // Update local state immediately for better UX
        setActivities((prev) =>
          prev.map((activity) =>
            activity.id === activityId
              ? {
                  ...activity,
                  likes_count: Math.max(0, (activity.likes_count || 0) - 1),
                  user_has_liked: false,
                }
              : activity,
          ),
        );
      } else {
        // Like - add the like
        const { error: insertError } = await supabase
          .from("activity_interactions")
          .insert({
            activity_id: activityId,
            user_id: user.id,
            interaction_type: "like",
          });

        if (insertError) {
          console.error("Error adding like:", insertError);
          setLikingActivity(null);
          return;
        }

        // Update local state immediately for better UX
        setActivities((prev) =>
          prev.map((activity) =>
            activity.id === activityId
              ? {
                  ...activity,
                  likes_count: (activity.likes_count || 0) + 1,
                  user_has_liked: true,
                }
              : activity,
          ),
        );
      }
    } catch (error) {
      console.error("Error handling like:", error);
    } finally {
      setLikingActivity(null);
    }
  };

  // Handle comment on activity
  const handleCommentActivity = async (
    activityId: string,
    commentText: string,
  ) => {
    if (!user || !commentText.trim() || submittingComment) return;

    setSubmittingComment(true);

    try {
      const { error } = await supabase.from("activity_interactions").insert({
        activity_id: activityId,
        user_id: user.id,
        interaction_type: "comment",
        comment_text: commentText.trim(),
      });

      if (error) {
        console.error("Error adding comment:", error);
        setSubmittingComment(false);
        return;
      }

      // Add comment to local state immediately
      const newComment: Comment = {
        id: `temp-${Date.now()}`,
        user: {
          id: user.id,
          name: user.user_metadata?.full_name || user.email || "You",
          avatar:
            user.user_metadata?.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
        },
        text: commentText.trim(),
        timestamp: "Just now",
      };

      setActivities((prev) =>
        prev.map((activity) =>
          activity.id === activityId
            ? {
                ...activity,
                comments_count: (activity.comments_count || 0) + 1,
                comments: [...(activity.comments || []), newComment],
              }
            : activity,
        ),
      );

      setCommentText("");
    } catch (error) {
      console.error("Error handling comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Comments Dialog Component
  const CommentsDialog = ({ activity }: { activity: Activity }) => {
    const [localCommentText, setLocalCommentText] = useState("");

    const handleSubmitComment = async () => {
      if (!localCommentText.trim()) return;
      await handleCommentActivity(activity.id, localCommentText);
      setLocalCommentText("");
    };

    return (
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Comments List */}
          <ScrollArea className="max-h-60">
            <div className="space-y-3 pr-4">
              {activity.comments && activity.comments.length > 0 ? (
                activity.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <img
                      src={comment.user.avatar}
                      alt={comment.user.name}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {comment.user.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {comment.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Add Comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="Write a comment..."
              value={localCommentText}
              onChange={(e) => setLocalCommentText(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!localCommentText.trim() || submittingComment}
                size="sm"
              >
                {submittingComment ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    );
  };

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user, fetchActivities]);

  // Use prop activities if provided, otherwise use fetched activities
  const displayActivities = propActivities || activities;
  const isLoading = propIsLoading || loading;
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "game_rated":
        return "⭐";
      case "review_posted":
        return "📝";
      case "game_completed":
        return "🏆";
      case "game_added":
        return "🎮";
      default:
        return "🎮";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "game_rated":
        return "bg-yellow-50 border-yellow-200";
      case "review_posted":
        return "bg-blue-50 border-blue-200";
      case "game_completed":
        return "bg-green-50 border-green-200";
      case "game_added":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Social Timeline
          </h2>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 h-9 shadow-sm transition-colors opacity-50 cursor-not-allowed">
            <PlusCircle className="mr-2 h-4 w-4" />
            Share Activity
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-gray-100 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-blue-500/20 animate-pulse" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 mt-4">
            Loading social timeline...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Social Timeline
        </h2>
        <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 h-9 shadow-sm transition-colors">
          <PlusCircle className="mr-2 h-4 w-4" />
          Share Activity
        </Button>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {displayActivities.length > 0 ? (
          displayActivities.map((activity) => (
            <motion.div
              key={activity.id}
              layoutId={activity.id}
              onClick={() => onActivityClick(activity)}
            >
              <Card
                className={`p-4 cursor-pointer hover:shadow-md transition-all duration-200 rounded-xl border ${getActivityColor(activity.type)} bg-white shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <img
                      src={activity.user.avatar}
                      alt={activity.user.name}
                      className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {getActivityIcon(activity.type)}
                      </span>
                      <h4 className="font-medium text-gray-900 text-sm">
                        {activity.user.name}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {activity.timestamp}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      {activity.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {activity.description}
                    </p>
                    {activity.game && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <span>🎮</span>
                        <span>{activity.game}</span>
                        {activity.rating && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span>⭐</span>
                              <span>{activity.rating}/10</span>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 transition-colors ${
                          activity.user_has_liked
                            ? "text-red-500 hover:text-red-600"
                            : "text-gray-500 hover:text-red-500"
                        } ${likingActivity === activity.id ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikeActivity(activity.id);
                        }}
                        disabled={likingActivity === activity.id}
                      >
                        <Heart
                          className={`w-4 h-4 mr-1 transition-all ${
                            activity.user_has_liked
                              ? "fill-red-500 text-red-500 scale-110"
                              : ""
                          } ${likingActivity === activity.id ? "animate-pulse" : ""}`}
                        />
                        <span className="text-xs">
                          {activity.likes_count || 0}
                        </span>
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-gray-500 hover:text-blue-500"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            <span className="text-xs">
                              {activity.comments_count || 0}
                            </span>
                          </Button>
                        </DialogTrigger>
                        <CommentsDialog activity={activity} />
                      </Dialog>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No activities yet
            </h3>
            <p className="text-gray-600">
              {friends.length === 0
                ? "Add some friends to see their gaming activities!"
                : "Your friends haven't shared any gaming activities yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialTimeline;

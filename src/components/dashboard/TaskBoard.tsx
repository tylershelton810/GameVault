import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Heart, MessageCircle, Send } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { useTheme } from "@/lib/theme";
import { useNavigate } from "react-router-dom";

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
  game_cover_url?: string;
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

// Comments Section Component - moved outside to prevent recreation
const CommentsSection = ({
  activity,
  user,
  commentTexts,
  showComments,
  showCommentInput,
  submittingComment,
  updateCommentText,
  handleCommentActivity,
}: {
  activity: Activity;
  user: any;
  commentTexts: Record<string, string>;
  showComments: Record<string, boolean>;
  showCommentInput: Record<string, boolean>;
  submittingComment: string | null;
  updateCommentText: (activityId: string, text: string) => void;
  handleCommentActivity: (
    activityId: string,
    commentText: string,
  ) => Promise<void>;
}) => {
  const currentCommentText = commentTexts[activity.id] || "";
  const isCommentsVisible = showComments[activity.id] || false;
  const isCommentInputVisible = showCommentInput[activity.id] || false;
  const isSubmitting = submittingComment === activity.id;

  const handleSubmitComment = async () => {
    if (!currentCommentText.trim()) return;
    await handleCommentActivity(activity.id, currentCommentText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleCommentTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    updateCommentText(activity.id, e.target.value);
  };

  if (!isCommentsVisible && !isCommentInputVisible) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Comments List */}
      {isCommentsVisible && (
        <div className="mb-3">
          {activity.comments && activity.comments.length > 0 ? (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {activity.comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <img
                    src={comment.user.avatar}
                    alt={comment.user.name}
                    className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs text-card-foreground">
                        {comment.user.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {comment.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      )}

      {/* Add Comment Input - Only show when comment input is visible */}
      {isCommentInputVisible && (
        <div className="flex gap-2 items-start">
          <img
            src={
              user?.user_metadata?.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`
            }
            alt="Your avatar"
            className="w-6 h-6 rounded-full flex-shrink-0 mt-1"
          />
          <div className="flex-1 flex gap-2">
            <Textarea
              placeholder="Write a comment..."
              value={currentCommentText}
              onChange={handleCommentTextChange}
              onKeyDown={handleKeyPress}
              className="min-h-[36px] max-h-24 resize-none text-sm py-2 px-3"
              rows={1}
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!currentCommentText.trim() || isSubmitting}
              size="sm"
              className="h-9 px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [friends, setFriends] = useState<string[]>([]);
  const [likingActivity, setLikingActivity] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(
    null,
  );
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [showCommentInput, setShowCommentInput] = useState<
    Record<string, boolean>
  >({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 10;

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

  // Fetch activities from friends and self with pagination
  const fetchActivities = useCallback(
    async (offset = 0, isLoadMore = false) => {
      if (!user) return;

      if (!isLoadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const userIds = await fetchFriends();
        if (!isLoadMore) {
          setFriends(userIds);
        }

        if (userIds.length === 0) {
          if (!isLoadMore) {
            setActivities([]);
          }
          setHasMore(false);
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
            personal_rating,
            game_cover_url
          ),
          game_review:game_reviews(
            review_text,
            rating
          )
        `,
          )
          .in("user_id", userIds)
          .order("created_at", { ascending: false })
          .range(offset, offset + ITEMS_PER_PAGE - 1);

        // Fetch likes and comments for each activity
        const activityIds =
          activitiesData?.map((activity) => activity.id) || [];

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

        const likesMap = new Map<
          string,
          { count: number; userLiked: boolean }
        >();
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
          if (!isLoadMore) {
            setActivities([]);
          }
          setHasMore(false);
          return;
        }

        // Check if we have more data
        const hasMoreData =
          activitiesData && activitiesData.length === ITEMS_PER_PAGE;
        setHasMore(hasMoreData || false);

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
              game_cover_url:
                activity.game_collection?.game_cover_url ||
                activityData.game_cover_url,
            };
          }) || [];

        if (isLoadMore) {
          setActivities((prev) => [...prev, ...transformedActivities]);
        } else {
          setActivities(transformedActivities);
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
        if (!isLoadMore) {
          setActivities([]);
        }
        setHasMore(false);
      } finally {
        if (isLoadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [user, fetchFriends],
  );

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
    if (!user || !commentText.trim() || submittingComment === activityId)
      return;

    setSubmittingComment(activityId);

    try {
      const { error } = await supabase.from("activity_interactions").insert({
        activity_id: activityId,
        user_id: user.id,
        interaction_type: "comment",
        comment_text: commentText.trim(),
      });

      if (error) {
        console.error("Error adding comment:", error);
        setSubmittingComment(null);
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

      // Clear the comment text for this activity
      setCommentTexts((prev) => ({ ...prev, [activityId]: "" }));
    } catch (error) {
      console.error("Error handling comment:", error);
    } finally {
      setSubmittingComment(null);
    }
  };

  // Toggle comments visibility
  const toggleComments = (activityId: string) => {
    setShowComments((prev) => ({
      ...prev,
      [activityId]: !prev[activityId],
    }));
    // Also show the comment input when comments are toggled
    setShowCommentInput((prev) => ({
      ...prev,
      [activityId]: !prev[activityId],
    }));
  };

  // Update comment text for specific activity
  const updateCommentText = (activityId: string, text: string) => {
    setCommentTexts((prev) => ({ ...prev, [activityId]: text }));
  };

  // Load more activities when scrolling to bottom
  const loadMoreActivities = useCallback(() => {
    if (!loadingMore && hasMore && activities.length > 0) {
      fetchActivities(activities.length, true);
    }
  }, [fetchActivities, loadingMore, hasMore, activities.length]);

  // Handle scroll to detect when user reaches bottom
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;

      if (isNearBottom && hasMore && !loadingMore) {
        loadMoreActivities();
      }
    },
    [hasMore, loadingMore, loadMoreActivities],
  );

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
      <div className="w-full h-full bg-card/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-card-foreground">
            Social Timeline
          </h2>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 h-9 shadow-sm transition-colors opacity-50 cursor-not-allowed">
            <PlusCircle className="mr-2 h-4 w-4" />
            Share Activity
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-primary/20 animate-pulse" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground mt-4">
            Loading social timeline...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-card/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-card-foreground">
          Social Timeline
        </h2>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 h-9 shadow-sm transition-colors">
          <PlusCircle className="mr-2 h-4 w-4" />
          Share Activity
        </Button>
      </div>

      <div
        className="space-y-4 max-h-[400px] md:max-h-[500px] overflow-y-auto"
        onScroll={handleScroll}
        ref={scrollAreaRef}
      >
        {displayActivities.length > 0 ? (
          displayActivities.map((activity) => (
            <motion.div
              key={activity.id}
              layoutId={activity.id}
              onClick={() => onActivityClick(activity)}
            >
              <Card
                className={`p-4 cursor-pointer hover:shadow-md transition-all duration-200 rounded-xl border border-border bg-card shadow-sm`}
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
                      <h4 className="font-medium text-card-foreground text-sm">
                        {activity.user.name}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {activity.timestamp}
                      </span>
                    </div>
                    <h3 className="font-medium text-card-foreground mb-1">
                      {activity.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 transition-colors ${
                          activity.user_has_liked
                            ? "text-destructive hover:text-destructive/80"
                            : "text-muted-foreground hover:text-destructive"
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
                              ? "fill-destructive text-destructive scale-110"
                              : ""
                          } ${likingActivity === activity.id ? "animate-pulse" : ""}`}
                        />
                        <span className="text-xs">
                          {activity.likes_count || 0}
                        </span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 transition-colors ${
                          showComments[activity.id]
                            ? "text-primary hover:text-primary/80"
                            : "text-muted-foreground hover:text-primary"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComments(activity.id);
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        <span className="text-xs">
                          {activity.comments_count || 0}
                        </span>
                      </Button>
                    </div>
                  </div>

                  {activity.game_cover_url && (
                    <div className="flex-shrink-0">
                      <img
                        src={activity.game_cover_url}
                        alt={activity.game || "Game cover"}
                        className="w-16 h-20 rounded-lg object-cover border border-border shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to game detail page
                          // Check if we have an IGDB game ID in the activity data
                          const igdbGameId =
                            activity.activity_data?.igdb_game_id;
                          if (igdbGameId) {
                            navigate(`/game/igdb-${igdbGameId}`);
                          } else if (activity.activity_data?.game_id) {
                            navigate(`/game/${activity.activity_data.game_id}`);
                          }
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <CommentsSection
                  activity={activity}
                  user={user}
                  commentTexts={commentTexts}
                  showComments={showComments}
                  showCommentInput={showCommentInput}
                  submittingComment={submittingComment}
                  updateCommentText={updateCommentText}
                  handleCommentActivity={handleCommentActivity}
                />
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              No activities yet
            </h3>
            <p className="text-muted-foreground">
              {friends.length === 0
                ? "Add some friends to see their gaming activities!"
                : "Your friends haven't shared any gaming activities yet."}
            </p>
          </div>
        )}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-muted border-t-primary animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading more activities...
              </span>
            </div>
          </div>
        )}

        {/* End of timeline indicator */}
        {!hasMore && activities.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              You've reached the end of the timeline
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialTimeline;

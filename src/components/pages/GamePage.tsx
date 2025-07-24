import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Star,
  Heart,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Calendar,
  Users,
  Globe,
  Gamepad2,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import Sidebar from "@/components/dashboard/layout/Sidebar";
import TopNavigation from "@/components/dashboard/layout/TopNavigation";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { Tables } from "@/types/supabase";
import { useToast } from "@/components/ui/use-toast";
import confetti from "canvas-confetti";

type GameCollection = Tables<"game_collections">;
type GameReview = Tables<"game_reviews">;

interface IGDBGameDetails {
  id: number;
  name: string;
  summary?: string;
  storyline?: string;
  cover?: {
    url: string;
  };
  screenshots?: Array<{
    url: string;
  }>;
  genres?: Array<{
    name: string;
  }>;
  platforms?: Array<{
    name: string;
  }>;
  release_dates?: Array<{
    date: number;
    platform: {
      name: string;
    };
  }>;
  rating?: number;
  rating_count?: number;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  involved_companies?: Array<{
    company: {
      name: string;
    };
    developer: boolean;
    publisher: boolean;
  }>;
  first_release_date?: number;
  age_ratings?: Array<{
    category: number;
    rating: number;
  }>;
}

interface FriendGameData {
  id: string;
  full_name: string;
  avatar_url?: string;
  personal_rating?: number;
  status: string;
  is_favorite?: boolean;
  is_completed?: boolean;
  personal_notes?: string;
  date_added: string;
  review?: {
    review_text: string;
    rating: number;
    created_at: string;
  };
}

const GamePage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeItem, setActiveItem] = useState("");
  const [gameCollection, setGameCollection] = useState<GameCollection | null>(
    null,
  );
  const [gameDetails, setGameDetails] = useState<IGDBGameDetails | null>(null);
  const [similarGames, setSimilarGames] = useState<IGDBGameDetails[]>([]);
  const [friendsData, setFriendsData] = useState<FriendGameData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddGameDialogOpen, setIsAddGameDialogOpen] = useState(false);
  const [hasUserGame, setHasUserGame] = useState(false);
  const [igdbGameId, setIgdbGameId] = useState<number | null>(null);
  const [gameTitle, setGameTitle] = useState<string>("");
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Unified form states for both add and edit
  const [selectedStatus, setSelectedStatus] = useState("");
  const [personalRating, setPersonalRating] = useState<number[]>([5]);
  const [gameNotes, setGameNotes] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [isLoadingReview, setIsLoadingReview] = useState(false);

  const [existingReview, setExistingReview] = useState<GameReview | null>(null);

  // Memoize stable values to prevent unnecessary re-renders
  const stableGameId = useMemo(() => gameId, [gameId]);
  const stableUserId = useMemo(() => user?.id, [user?.id]);

  // Memoized image URL generator for better performance
  const getOptimizedImageUrl = useMemo(() => {
    return (url: string, size: "small" | "big" = "big") => {
      if (!url) return null;
      const sizeMap = {
        small: "t_cover_small_2x",
        big: "t_cover_big_2x",
      };
      return `https:${url.replace("t_thumb", sizeMap[size])}`;
    };
  }, []);

  // Fetch game collection data or check if it's a direct IGDB game ID
  const fetchGameCollection = useCallback(async () => {
    if (!stableGameId || !stableUserId) return;

    // Reset states when fetching new game data
    setGameCollection(null);
    setGameDetails(null);
    setGameTitle("");
    setHasUserGame(false);
    setIgdbGameId(null);
    setExistingReview(null);
    setReviewText("");
    setSimilarGames([]);
    setFriendsData([]);

    try {
      // Check if this is an IGDB ID from search (format: igdb-{id})
      if (stableGameId.startsWith("igdb-")) {
        const igdbId = parseInt(stableGameId.replace("igdb-", ""));
        setHasUserGame(false);
        setIgdbGameId(igdbId);

        // Check if user already has this game in their collection
        const { data: existingGame, error: existingGameError } = await supabase
          .from("game_collections")
          .select("*")
          .eq("igdb_game_id", igdbId)
          .eq("user_id", stableUserId)
          .maybeSingle();

        if (existingGameError && existingGameError.code !== "PGRST116") {
          console.error("Error checking existing game:", existingGameError);
        }

        if (existingGame) {
          setGameCollection(existingGame);
          setHasUserGame(true);
          setGameTitle(existingGame.game_title);

          // Initialize form with current data
          setSelectedStatus(existingGame.status);
          setPersonalRating([existingGame.personal_rating || 5]);
          setGameNotes(existingGame.personal_notes || "");
          setIsFavorite(existingGame.is_favorite || false);
          setIsCompleted(existingGame.is_completed || false);

          // Fetch existing review
          const { data: reviewData } = await supabase
            .from("game_reviews")
            .select("*")
            .eq("game_collection_id", existingGame.id)
            .eq("user_id", stableUserId)
            .maybeSingle();

          if (reviewData) {
            setExistingReview(reviewData);
            setReviewText(reviewData.review_text);
            setPersonalRating([reviewData.rating]);
          }
        }

        setIsLoading(false);
        return;
      }

      // First, try to find the game in user's collection
      const { data, error } = await supabase
        .from("game_collections")
        .select("*")
        .eq("id", stableGameId)
        .eq("user_id", stableUserId)
        .single();

      if (data) {
        // User has this game in their collection
        console.log("setGame 1: ", data);
        setGameCollection(data);
        setHasUserGame(true);
        setIgdbGameId(data.igdb_game_id);
        setGameTitle(data.game_title);

        // Initialize form with current data
        setSelectedStatus(data.status);
        setPersonalRating([data.personal_rating || 5]);
        setGameNotes(data.personal_notes || "");
        setIsFavorite(data.is_favorite || false);
        setIsCompleted(data.is_completed || false);

        // Fetch existing review
        const { data: reviewData } = await supabase
          .from("game_reviews")
          .select("*")
          .eq("game_collection_id", stableGameId)
          .eq("user_id", stableUserId)
          .maybeSingle();

        if (reviewData) {
          setExistingReview(reviewData);
          setReviewText(reviewData.review_text);
          setPersonalRating([reviewData.rating]);
        }
      } else {
        // Game not in user's collection, check if it's an IGDB ID or find by IGDB ID
        // Try to find the game by collection ID in other users' collections to get IGDB ID
        const { data: otherUserGame } = await supabase
          .from("game_collections")
          .select("igdb_game_id, game_title")
          .eq("id", stableGameId)
          .single();

        if (otherUserGame) {
          setHasUserGame(false);
          setIgdbGameId(otherUserGame.igdb_game_id);
          setGameTitle(otherUserGame.game_title);
        } else {
          setError("Game not found");
          return;
        }
      }
    } catch (error) {
      console.error("Error fetching game collection:", error);
      setError("Failed to load game data");
    } finally {
      setIsLoading(false);
    }
  }, [stableGameId, stableUserId]);

  // Fetch game details from IGDB
  const fetchGameDetails = useCallback(async () => {
    if (!igdbGameId) return;

    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-getGameDetails",
        {
          body: { igdbGameId: igdbGameId },
        },
      );

      if (error) {
        console.error("Error fetching game details:", error);
        return;
      }

      if (data && data.gameData && data.gameData.length > 0) {
        setGameDetails(data.gameData[0]);
        setSimilarGames(data.similarGames || []);
        // If we don't have a game title yet, use the one from IGDB
        if (!gameTitle && data.gameData[0].name) {
          setGameTitle(data.gameData[0].name);
        }
      }
    } catch (error) {
      console.error("Error fetching game details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [igdbGameId, gameTitle]);

  // Fetch friends' data for this game
  const fetchFriendsData = useCallback(async () => {
    if (!igdbGameId || !stableUserId) return;

    try {
      // Get user's friends
      const { data: friendships, error: friendsError } = await supabase
        .from("friendships")
        .select(
          `
          *,
          requester:users!friendships_requester_id_fkey(*),
          addressee:users!friendships_addressee_id_fkey(*)
        `,
        )
        .or(`requester_id.eq.${stableUserId},addressee_id.eq.${stableUserId}`)
        .eq("status", "accepted");

      if (friendsError) {
        console.error("Error fetching friends:", friendsError);
        return;
      }

      const friendIds = [];
      for (const friendship of friendships || []) {
        const friendUser =
          friendship.requester_id === stableUserId
            ? friendship.addressee
            : friendship.requester;
        if (friendUser) {
          friendIds.push(friendUser.id);
        }
      }

      if (friendIds.length === 0) return;

      // Get friends' game collections for this specific game
      const { data: friendsGameData, error: gameDataError } = await supabase
        .from("game_collections")
        .select(
          `
          *,
          user:users(*)
        `,
        )
        .eq("igdb_game_id", igdbGameId)
        .in("user_id", friendIds);

      if (gameDataError) {
        console.error("Error fetching friends game data:", gameDataError);
        return;
      }

      // Get reviews for these game collections
      const gameCollectionIds = friendsGameData?.map((gc) => gc.id) || [];
      const { data: reviews } = await supabase
        .from("game_reviews")
        .select("*")
        .in("game_collection_id", gameCollectionIds);

      // Combine the data
      const friendsWithGameData: FriendGameData[] = [];
      for (const gameData of friendsGameData || []) {
        const review = reviews?.find(
          (r) => r.game_collection_id === gameData.id,
        );

        friendsWithGameData.push({
          id: gameData.user.id,
          full_name: gameData.user.full_name || "Unknown User",
          avatar_url: gameData.user.avatar_url || undefined,
          personal_rating: gameData.personal_rating || undefined,
          status: gameData.status,
          is_favorite: gameData.is_favorite || false,
          is_completed: gameData.is_completed || false,
          personal_notes: gameData.personal_notes || undefined,
          date_added: gameData.date_added,
          review: review
            ? {
                review_text: review.review_text,
                rating: review.rating,
                created_at: review.created_at,
              }
            : undefined,
        });
      }

      setFriendsData(friendsWithGameData);
    } catch (error) {
      console.error("Error fetching friends data:", error);
    }
  }, [igdbGameId, stableUserId]);

  useEffect(() => {
    fetchGameCollection();
  }, [fetchGameCollection]);

  useEffect(() => {
    if (igdbGameId) {
      fetchGameDetails();
      fetchFriendsData();
    }
  }, [igdbGameId, fetchGameDetails, fetchFriendsData]);

  const getStatusBadge = useCallback((status: string) => {
    const statusConfig = {
      playing: {
        label: "Playing",
        className:
          "bg-green-100 text-green-800 hover:bg-green-200 hover:scale-110 transition-all duration-200",
      },
      played: {
        label: "Played",
        className:
          "bg-blue-100 text-blue-800 hover:bg-blue-200 hover:scale-110 transition-all duration-200",
      },
      "want-to-play": {
        label: "Want to Play",
        className:
          "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:scale-110 transition-all duration-200",
      },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.className}>{config.label}</Badge>;
  }, []);

  const renderStars = useCallback((rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />,
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star
            key={i}
            className="w-4 h-4 fill-yellow-400/50 text-yellow-400"
          />,
        );
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    return stars;
  }, []);

  // Save game collection changes
  const handleSaveGameData = useCallback(async () => {
    if (!gameCollection || !stableUserId) return;

    setIsSaving(true);
    try {
      const previousRating = gameCollection.personal_rating;
      const previousCompleted = gameCollection.is_completed;

      const updateData = {
        status: selectedStatus,
        personal_rating: selectedStatus === "played" ? personalRating[0] : null,
        personal_notes: gameNotes || null,
        is_favorite: isFavorite,
        is_completed: isCompleted,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("game_collections")
        .update(updateData)
        .eq("id", gameCollection.id);

      if (error) {
        console.error("Error updating game collection:", error);
        return;
      }

      // Log completion activity if game was just marked as completed
      if (isCompleted && !previousCompleted) {
        await supabase.from("activity_feed").insert({
          user_id: stableUserId,
          activity_type: "game_completed",
          game_collection_id: gameCollection.id,
          activity_data: {
            game_title: gameCollection.game_title,
            igdb_game_id: gameCollection.igdb_game_id,
          },
        });
      }

      // Log rating activity if rating was added or changed
      if (
        selectedStatus === "played" &&
        personalRating[0] &&
        personalRating[0] !== previousRating
      ) {
        await supabase.from("activity_feed").insert({
          user_id: stableUserId,
          activity_type: "game_rated",
          game_collection_id: gameCollection.id,
          activity_data: {
            game_title: gameCollection.game_title,
            rating: personalRating[0],
            igdb_game_id: gameCollection.igdb_game_id,
          },
        });
      }

      // Handle review update/creation
      if (selectedStatus === "played" && reviewText.trim()) {
        // Get current review count for badge checking
        const { data: currentReviews } = await supabase
          .from("game_reviews")
          .select("id")
          .eq("user_id", stableUserId);

        const previousReviewCount = currentReviews?.length || 0;

        if (existingReview) {
          // Update existing review
          const { error: reviewUpdateError } = await supabase
            .from("game_reviews")
            .update({
              review_text: reviewText,
              rating: personalRating[0],
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingReview.id);

          if (!reviewUpdateError) {
            // Log review update activity
            await supabase.from("activity_feed").insert({
              user_id: stableUserId,
              activity_type: "review_posted",
              game_collection_id: gameCollection.id,
              game_review_id: existingReview.id,
              activity_data: {
                game_title: gameCollection.game_title,
                rating: personalRating[0],
                igdb_game_id: gameCollection.igdb_game_id,
              },
            });

            setExistingReview({
              ...existingReview,
              review_text: reviewText,
              rating: personalRating[0],
            });
          }
        } else {
          // Create new review
          const { data: newReview, error: reviewInsertError } = await supabase
            .from("game_reviews")
            .insert({
              user_id: stableUserId,
              game_collection_id: gameCollection.id,
              review_text: reviewText,
              rating: personalRating[0],
            })
            .select()
            .single();

          if (!reviewInsertError && newReview) {
            // Log new review activity
            await supabase.from("activity_feed").insert({
              user_id: stableUserId,
              activity_type: "review_posted",
              game_collection_id: gameCollection.id,
              game_review_id: newReview.id,
              activity_data: {
                game_title: gameCollection.game_title,
                rating: personalRating[0],
                igdb_game_id: gameCollection.igdb_game_id,
              },
            });

            setExistingReview(newReview);

            // Check for review badge achievement (only for new reviews)
            checkForReviewBadgeEarned(
              previousReviewCount,
              previousReviewCount + 1,
            );
          }
        }
      }

      // Update local state
      setGameCollection({
        ...gameCollection,
        status: selectedStatus,
        personal_rating: selectedStatus === "played" ? personalRating[0] : null,
        personal_notes: gameNotes || null,
        is_favorite: isFavorite,
        is_completed: isCompleted,
      });

      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving game data:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    gameCollection,
    stableUserId,
    selectedStatus,
    personalRating,
    gameNotes,
    isFavorite,
    isCompleted,
    reviewText,
    existingReview,
  ]);

  // Badge thresholds
  const badgeThresholds = [
    {
      count: 1,
      name: "First Game",
      description: "Added your very first game!",
    },
    {
      count: 5,
      name: "Game Starter",
      description: "Added your first 5 games!",
    },
    {
      count: 10,
      name: "Game Collector",
      description: "Built a library of 10 games!",
    },
    {
      count: 20,
      name: "Gaming Enthusiast",
      description: "Reached 20 games in your collection!",
    },
    {
      count: 50,
      name: "Game Curator",
      description: "Curated a collection of 50 games!",
    },
    {
      count: 100,
      name: "Game Master",
      description: "Achieved the ultimate collection of 100 games!",
    },
    {
      count: 250,
      name: "Game Legend",
      description: "Legendary collection of 250 games!",
    },
    {
      count: 500,
      name: "Game Deity",
      description: "Godlike collection of 500 games!",
    },
  ];

  // Review badge thresholds
  const reviewBadgeThresholds = [
    {
      count: 1,
      name: "First Reviewer",
      description: "Write your first game review!",
    },
    {
      count: 5,
      name: "Review Starter",
      description: "Share your thoughts on 5 games!",
    },
    {
      count: 10,
      name: "Review Contributor",
      description: "Write 10 thoughtful reviews!",
    },
    {
      count: 25,
      name: "Review Enthusiast",
      description: "Share insights on 25 games!",
    },
    {
      count: 50,
      name: "Review Expert",
      description: "Become a trusted voice with 50 reviews!",
    },
    {
      count: 100,
      name: "Review Master",
      description: "Achieve mastery with 100 reviews!",
    },
    {
      count: 250,
      name: "Review Legend",
      description: "Legendary status with 250 reviews!",
    },
    {
      count: 500,
      name: "Review Deity",
      description: "Godlike achievement with 500 reviews!",
    },
  ];

  const checkForBadgeEarned = (previousCount: number, newCount: number) => {
    const earnedBadge = badgeThresholds.find(
      (badge) => newCount >= badge.count && previousCount < badge.count,
    );

    if (earnedBadge) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FFA500", "#FF6347", "#32CD32", "#1E90FF"],
      });

      // Show toast notification
      toast({
        title: `🏆 Badge Earned: ${earnedBadge.name}!`,
        description: earnedBadge.description,
        duration: 5000,
      });
    }
  };

  const checkForReviewBadgeEarned = async (
    previousCount: number,
    newCount: number,
  ) => {
    const earnedBadge = reviewBadgeThresholds.find(
      (badge) => newCount >= badge.count && previousCount < badge.count,
    );

    if (earnedBadge) {
      // Trigger confetti with purple theme for reviews
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8B5CF6", "#A855F7", "#C084FC", "#DDD6FE", "#EDE9FE"],
      });

      // Show toast notification
      toast({
        title: `📝 Review Badge Earned: ${earnedBadge.name}!`,
        description: earnedBadge.description,
        duration: 5000,
      });
    }
  };

  // Add game to user's collection
  const handleAddGame = useCallback(async () => {
    if (!stableUserId || !gameDetails || !igdbGameId || !selectedStatus) {
      console.error("Missing required data for adding game:", {
        user: !!stableUserId,
        gameDetails: !!gameDetails,
        igdbGameId,
        selectedStatus,
      });
      return;
    }

    setIsSaving(true);

    // Get current game count for badge checking
    const { data: currentGames } = await supabase
      .from("game_collections")
      .select("id")
      .eq("user_id", stableUserId);

    const previousGameCount = currentGames?.length || 0;

    try {
      const gameData = {
        user_id: stableUserId,
        igdb_game_id: igdbGameId,
        game_title: gameDetails.name,
        game_cover_url: gameDetails.cover?.url
          ? `https:${gameDetails.cover.url.replace("t_thumb", "t_cover_big")}`
          : null,
        status: selectedStatus,
        personal_notes: gameNotes || null,
        personal_rating: selectedStatus === "played" ? personalRating[0] : null,
        is_completed: isCompleted,
        is_favorite: isFavorite,
        date_added: new Date().toISOString(),
      };

      const { data: insertedGameData, error } = await supabase
        .from("game_collections")
        .insert([gameData])
        .select()
        .single();

      if (error) {
        console.error("Error adding game to collection:", error);
        return;
      }

      // Log activity to activity_feed
      await supabase.from("activity_feed").insert({
        user_id: user.id,
        activity_type: "game_added",
        game_collection_id: insertedGameData.id,
        activity_data: {
          game_title: gameDetails.name,
          status: selectedStatus,
          igdb_game_id: igdbGameId,
        },
      });

      // If the game is marked as completed, log completion activity
      if (isCompleted) {
        await supabase.from("activity_feed").insert({
          user_id: stableUserId,
          activity_type: "game_completed",
          game_collection_id: insertedGameData.id,
          activity_data: {
            game_title: gameDetails.name,
            igdb_game_id: igdbGameId,
          },
        });
      }

      // If there's a rating, log rating activity
      if (selectedStatus === "played" && personalRating[0]) {
        await supabase.from("activity_feed").insert({
          user_id: stableUserId,
          activity_type: "game_rated",
          game_collection_id: insertedGameData.id,
          activity_data: {
            game_title: gameDetails.name,
            rating: personalRating[0],
            igdb_game_id: igdbGameId,
          },
        });
      }

      // If there's a review and rating, create a review entry
      if (selectedStatus === "played" && reviewText.trim()) {
        // Get current review count for badge checking
        const { data: currentReviews } = await supabase
          .from("game_reviews")
          .select("id")
          .eq("user_id", stableUserId);

        const previousReviewCount = currentReviews?.length || 0;

        const { data: reviewData, error: reviewError } = await supabase
          .from("game_reviews")
          .insert({
            user_id: stableUserId,
            game_collection_id: insertedGameData.id,
            review_text: reviewText,
            rating: personalRating[0],
          })
          .select()
          .single();

        if (!reviewError && reviewData) {
          // Log review activity
          await supabase.from("activity_feed").insert({
            user_id: stableUserId,
            activity_type: "review_posted",
            game_collection_id: insertedGameData.id,
            game_review_id: reviewData.id,
            activity_data: {
              game_title: gameDetails.name,
              rating: personalRating[0],
              igdb_game_id: igdbGameId,
            },
          });

          setExistingReview(reviewData);

          // Check for review badge achievement
          checkForReviewBadgeEarned(
            previousReviewCount,
            previousReviewCount + 1,
          );
        }
      }

      // Update local state
      setGameCollection(insertedGameData);
      setHasUserGame(true);
      setGameTitle(insertedGameData.game_title);

      // Check for badge achievement
      checkForBadgeEarned(previousGameCount, previousGameCount + 1);

      // Reset form
      resetAddGameForm();
    } catch (error) {
      console.error("Error adding game to collection:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    stableUserId,
    gameDetails,
    igdbGameId,
    selectedStatus,
    personalRating,
    gameNotes,
    isCompleted,
    isFavorite,
    reviewText,
  ]);

  // Remove game from user's collection
  const handleRemoveGame = useCallback(async () => {
    if (!gameCollection || !stableUserId) return;

    setIsRemoving(true);
    try {
      // Delete the game collection entry
      const { error } = await supabase
        .from("game_collections")
        .delete()
        .eq("id", gameCollection.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing game from collection:", error);
        return;
      }

      // Delete any associated reviews
      if (existingReview) {
        await supabase
          .from("game_reviews")
          .delete()
          .eq("game_collection_id", gameCollection.id)
          .eq("user_id", user.id);
      }

      // Delete any associated activity feed entries
      await supabase
        .from("activity_feed")
        .delete()
        .eq("game_collection_id", gameCollection.id)
        .eq("user_id", user.id);

      // Update local state
      setGameCollection(null);
      setHasUserGame(false);
      setExistingReview(null);
      setIsRemoveDialogOpen(false);

      // Navigate back to library or stay on page showing "Add to Collection" state
      // For now, we'll stay on the page and show the add game interface
    } catch (error) {
      console.error("Error removing game from collection:", error);
    } finally {
      setIsRemoving(false);
    }
  }, [gameCollection, stableUserId, existingReview]);

  const resetAddGameForm = useCallback(() => {
    setSelectedStatus("");
    setGameNotes("");
    setPersonalRating([5]);
    setReviewText("");
    setIsCompleted(false);
    setIsFavorite(false);
    setIsAddGameDialogOpen(false);
  }, []);

  // Load existing review when editing
  const loadExistingReview = useCallback(async () => {
    if (!gameCollection || selectedStatus !== "played") {
      setReviewText("");
      return;
    }

    setIsLoadingReview(true);
    try {
      const { data: existingReviewData } = await supabase
        .from("game_reviews")
        .select("*")
        .eq("game_collection_id", gameCollection.id)
        .maybeSingle();

      if (existingReviewData) {
        setExistingReview(existingReviewData);
        setReviewText(existingReviewData.review_text);
        setPersonalRating([existingReviewData.rating]);
      } else {
        setReviewText("");
        setExistingReview(null);
      }
    } catch (error) {
      console.error("Error loading review:", error);
      setReviewText("");
      setExistingReview(null);
    } finally {
      setIsLoadingReview(false);
    }
  }, [gameCollection, selectedStatus]);

  if (isLoading) {
    return (
      <div className="bg-background">
        <TopNavigation />
        <div className="flex pt-16">
          <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
          <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]">
            <div className="flex items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-lg text-muted-foreground">
                Loading game...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background">
        <TopNavigation />
        <div className="flex pt-16">
          <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
          <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {error}
              </h2>
              <Button onClick={() => navigate(-1)} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <TopNavigation />
      <div className="flex pt-16">
        <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 animate-in slide-in-from-top-4 duration-500">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 hover:scale-105 transition-all duration-200 hover:bg-accent/80"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {gameTitle || gameDetails?.name || "Loading..."}
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Game Cover and Basic Info */}
              <div className="lg:col-span-1 animate-in slide-in-from-left-4 duration-700">
                <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group">
                  <div className="aspect-[3/4] relative bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden group-hover:from-gray-100 group-hover:to-gray-200 transition-all duration-300">
                    {(() => {
                      // Prioritize gameDetails cover for IGDB games, fallback to gameCollection cover
                      const coverUrl = gameDetails?.cover?.url
                        ? `https:${gameDetails.cover.url.replace("t_thumb", "t_cover_big")}`
                        : gameCollection?.game_cover_url;

                      return coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={gameTitle || gameDetails?.name || "Game cover"}
                          className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to smaller image if high-res fails
                            const target = e.target as HTMLImageElement;
                            if (target.src.includes("t_cover_big")) {
                              target.src = target.src.replace(
                                "t_cover_big",
                                "t_cover_big_2x",
                              );
                            }
                          }}
                        />
                      ) : (
                        <div className="text-center flex flex-col items-center justify-center h-full">
                          <Gamepad2 className="w-16 h-16 text-gray-400 mx-auto mb-2 animate-pulse-slow" />
                          <p className="text-sm text-gray-500 animate-pulse">
                            Loading cover...
                          </p>
                        </div>
                      );
                    })()}
                    {hasUserGame && gameCollection && (
                      <>
                        <div className="absolute top-2 right-2 animate-in slide-in-from-top-2 duration-500 delay-300">
                          <div className="transform hover:scale-110 transition-transform duration-200">
                            {getStatusBadge(gameCollection.status)}
                          </div>
                        </div>
                        <div className="absolute top-2 left-2 flex gap-1 animate-in slide-in-from-left-2 duration-500 delay-200">
                          {gameCollection.is_favorite && (
                            <div className="bg-red-500 rounded-full p-1 hover:animate-wiggle hover:scale-110 transition-transform duration-200">
                              <Heart className="w-3 h-3 text-white fill-white" />
                            </div>
                          )}
                          {gameCollection.is_completed && (
                            <div className="bg-green-500 rounded-full p-1 hover:animate-wiggle hover:scale-110 transition-transform duration-200">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <CardContent className="p-4">
                    {hasUserGame && gameCollection ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-card-foreground">
                            Your Game Data
                          </h3>
                          <div className="flex gap-2">
                            <Dialog
                              open={isEditDialogOpen}
                              onOpenChange={(open) => {
                                setIsEditDialogOpen(open);
                                if (open) {
                                  // Initialize form with current data when opening
                                  setSelectedStatus(gameCollection.status);
                                  setPersonalRating([
                                    gameCollection.personal_rating || 5,
                                  ]);
                                  setGameNotes(
                                    gameCollection.personal_notes || "",
                                  );
                                  setIsFavorite(
                                    gameCollection.is_favorite || false,
                                  );
                                  setIsCompleted(
                                    gameCollection.is_completed || false,
                                  );
                                  loadExistingReview();
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:scale-105 hover:shadow-md transition-all duration-200 hover:bg-blue-50 hover:border-blue-300 group"
                                >
                                  <Edit3 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    Edit Game: {gameCollection.game_title}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="border rounded-md p-4 bg-muted">
                                    <div className="flex items-start gap-3">
                                      <img
                                        src={
                                          gameCollection.game_cover_url ||
                                          `https:${gameDetails?.cover?.url?.replace("t_thumb", "t_cover_small_2x")}`
                                        }
                                        alt={gameCollection.game_title}
                                        className="w-16 h-20 object-cover rounded"
                                        loading="lazy"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          if (
                                            target.src.includes(
                                              "t_cover_small_2x",
                                            )
                                          ) {
                                            target.src = target.src.replace(
                                              "t_cover_small_2x",
                                              "t_cover_small",
                                            );
                                          }
                                        }}
                                      />
                                      <div className="flex-1">
                                        <h4 className="font-medium">
                                          {gameCollection.game_title}
                                        </h4>
                                      </div>
                                    </div>
                                  </div>

                                  <Select
                                    value={selectedStatus}
                                    onValueChange={setSelectedStatus}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="playing">
                                        Playing
                                      </SelectItem>
                                      <SelectItem value="played">
                                        Played
                                      </SelectItem>
                                      <SelectItem value="want-to-play">
                                        Want to Play
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id="edit-completed"
                                        checked={isCompleted}
                                        onCheckedChange={setIsCompleted}
                                      />
                                      <Label htmlFor="edit-completed">
                                        Completed
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id="edit-favorite"
                                        checked={isFavorite}
                                        onCheckedChange={setIsFavorite}
                                      />
                                      <Label htmlFor="edit-favorite">
                                        Favorite
                                      </Label>
                                    </div>
                                  </div>

                                  {selectedStatus === "played" && (
                                    <>
                                      <div className="space-y-2">
                                        <Label>
                                          Rating: {personalRating[0]}/10
                                        </Label>
                                        <Slider
                                          value={personalRating}
                                          onValueChange={setPersonalRating}
                                          max={10}
                                          min={0.5}
                                          step={0.5}
                                          className="w-full"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Review</Label>
                                        {isLoadingReview ? (
                                          <div className="flex items-center justify-center p-4 border rounded">
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            <span className="text-sm text-gray-600">
                                              Loading review...
                                            </span>
                                          </div>
                                        ) : (
                                          <Textarea
                                            placeholder="Write a review (optional)"
                                            value={reviewText}
                                            onChange={(e) =>
                                              setReviewText(e.target.value)
                                            }
                                            rows={3}
                                          />
                                        )}
                                      </div>
                                    </>
                                  )}

                                  <Textarea
                                    placeholder="Personal notes (optional)"
                                    value={gameNotes}
                                    onChange={(e) =>
                                      setGameNotes(e.target.value)
                                    }
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => {
                                        setIsEditDialogOpen(false);
                                        resetAddGameForm();
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      className="flex-1 hover:scale-105 transition-all duration-200 hover:shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                      onClick={handleSaveGameData}
                                      disabled={!selectedStatus || isSaving}
                                    >
                                      {isSaving ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          <span className="animate-pulse">
                                            Updating...
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <Save className="w-4 h-4 mr-2" />
                                          Update Game
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <AlertDialog
                              open={isRemoveDialogOpen}
                              onOpenChange={setIsRemoveDialogOpen}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:scale-105 hover:shadow-md transition-all duration-200 hover:border-red-300 group"
                                >
                                  <Trash2 className="w-4 h-4 mr-2 transition-transform duration-200" />
                                  Remove
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remove Game from Library
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove "
                                    {gameCollection.game_title}" from your
                                    library? This will permanently delete your
                                    rating, review, notes, and all associated
                                    data for this game.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleRemoveGame}
                                    disabled={isRemoving}
                                    className="bg-red-600 hover:bg-red-700 text-white hover:scale-105 transition-all duration-200 hover:shadow-lg"
                                  >
                                    {isRemoving ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        <span className="animate-pulse">
                                          Removing...
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove Game
                                      </>
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        {gameCollection.personal_rating &&
                          gameCollection.personal_rating > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-card-foreground mb-2">
                                Your Rating
                              </h4>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {renderStars(gameCollection.personal_rating)}
                                </div>
                                <span className="text-sm font-medium text-card-foreground">
                                  {gameCollection.personal_rating}/10
                                </span>
                              </div>
                            </div>
                          )}

                        {gameCollection.personal_notes && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-card-foreground mb-2">
                              Your Notes
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {gameCollection.personal_notes}
                            </p>
                          </div>
                        )}

                        {existingReview && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-card-foreground mb-2">
                              Your Review
                            </h4>
                            <div className="bg-muted rounded-lg p-3">
                              <p className="text-sm text-muted-foreground">
                                {existingReview.review_text}
                              </p>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Added{" "}
                          {new Date(
                            gameCollection.date_added,
                          ).toLocaleDateString()}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-card-foreground">
                            Add to Your Collection
                          </h3>
                        </div>
                        <div className="text-center py-4">
                          <Gamepad2 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                          <h4 className="text-base font-medium text-card-foreground mb-2">
                            Game not in your collection
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Add this game to your collection to track your
                            progress and rate it.
                          </p>
                          <Dialog
                            open={isAddGameDialogOpen}
                            onOpenChange={(open) => {
                              setIsAddGameDialogOpen(open);
                              if (open) {
                                // Reset form when opening
                                setSelectedStatus("");
                                setPersonalRating([5]);
                                setGameNotes("");
                                setIsCompleted(false);
                                setIsFavorite(false);
                                setReviewText("");
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                className="w-full hover:scale-105 transition-all duration-200 hover:shadow-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 animate-glow group"
                                style={{ animationDuration: "2s" }}
                              >
                                <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                                Add Game
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Add Game to Library</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {gameDetails && (
                                  <div className="border rounded-md p-4 bg-muted">
                                    <div className="flex items-start gap-3">
                                      {gameDetails.cover && (
                                        <img
                                          src={`https:${gameDetails.cover.url.replace("t_thumb", "t_cover_small_2x")}`}
                                          alt={gameDetails.name}
                                          className="w-16 h-20 object-cover rounded"
                                          loading="lazy"
                                          onError={(e) => {
                                            const target =
                                              e.target as HTMLImageElement;
                                            if (
                                              target.src.includes(
                                                "t_cover_small_2x",
                                              )
                                            ) {
                                              target.src = target.src.replace(
                                                "t_cover_small_2x",
                                                "t_cover_small",
                                              );
                                            }
                                          }}
                                        />
                                      )}
                                      <div className="flex-1">
                                        <h4 className="font-medium">
                                          {gameDetails.name}
                                        </h4>
                                        {gameDetails.rating && (
                                          <p className="text-sm text-gray-600">
                                            Rating:{" "}
                                            {Math.round(gameDetails.rating)}/100
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <Select
                                  value={selectedStatus}
                                  onValueChange={setSelectedStatus}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="playing">
                                      Playing
                                    </SelectItem>
                                    <SelectItem value="played">
                                      Played
                                    </SelectItem>
                                    <SelectItem value="want-to-play">
                                      Want to Play
                                    </SelectItem>
                                  </SelectContent>
                                </Select>

                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="completed"
                                      checked={isCompleted}
                                      onCheckedChange={setIsCompleted}
                                    />
                                    <Label htmlFor="completed">Completed</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="favorite"
                                      checked={isFavorite}
                                      onCheckedChange={setIsFavorite}
                                    />
                                    <Label htmlFor="favorite">Favorite</Label>
                                  </div>
                                </div>

                                {selectedStatus === "played" && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>
                                        Rating: {personalRating[0]}/10
                                      </Label>
                                      <Slider
                                        value={personalRating}
                                        onValueChange={setPersonalRating}
                                        max={10}
                                        min={0.5}
                                        step={0.5}
                                        className="w-full"
                                      />
                                    </div>
                                    <Textarea
                                      placeholder="Write a review (optional)"
                                      value={reviewText}
                                      onChange={(e) =>
                                        setReviewText(e.target.value)
                                      }
                                      rows={3}
                                    />
                                  </>
                                )}

                                <Textarea
                                  placeholder="Personal notes (optional)"
                                  value={gameNotes}
                                  onChange={(e) => setGameNotes(e.target.value)}
                                />
                                <Button
                                  className="w-full hover:scale-105 transition-all duration-200 hover:shadow-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                                  onClick={handleAddGame}
                                  disabled={!selectedStatus || isSaving}
                                >
                                  {isSaving ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      <span className="animate-pulse">
                                        Adding to Library...
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-4 h-4 mr-2" />
                                      Add to Library
                                    </>
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Game Details and Friends */}
              <div className="lg:col-span-2 space-y-4 animate-in slide-in-from-right-4 duration-700 delay-200">
                {/* Game Details */}
                {isLoadingDetails ? (
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" />
                        <span className="text-muted-foreground animate-pulse">
                          Loading game details...
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ) : gameDetails ? (
                  <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.01]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg group">
                        <Globe className="w-5 h-5 group-hover:animate-wiggle text-blue-600" />
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          Game Details
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {gameDetails.summary && (
                        <div>
                          <h4 className="font-medium text-card-foreground mb-2">
                            Summary
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {gameDetails.summary}
                          </p>
                        </div>
                      )}

                      {/* Release Date and Age Rating */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {gameDetails.first_release_date && (
                          <div>
                            <h4 className="font-medium text-card-foreground mb-2">
                              Release Date
                            </h4>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {new Date(
                                  gameDetails.first_release_date * 1000,
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        )}

                        {gameDetails.age_ratings &&
                          gameDetails.age_ratings.length > 0 && (
                            <div>
                              <h4 className="font-medium text-card-foreground mb-2">
                                Age Rating
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {gameDetails.age_ratings.map(
                                  (rating, index) => {
                                    // ESRB ratings mapping
                                    const esrbRatings: {
                                      [key: number]: string;
                                    } = {
                                      6: "RP",
                                      7: "EC",
                                      8: "E",
                                      9: "E10+",
                                      10: "T",
                                      11: "M",
                                      12: "AO",
                                    };
                                    // PEGI ratings mapping
                                    const pegiRatings: {
                                      [key: number]: string;
                                    } = {
                                      1: "PEGI 3",
                                      2: "PEGI 7",
                                      3: "PEGI 12",
                                      4: "PEGI 16",
                                      5: "PEGI 18",
                                    };

                                    let ratingText = "";
                                    if (rating.category === 1) {
                                      // ESRB
                                      ratingText =
                                        esrbRatings[rating.rating] ||
                                        `ESRB ${rating.rating}`;
                                    } else if (rating.category === 2) {
                                      // PEGI
                                      ratingText =
                                        pegiRatings[rating.rating] ||
                                        `PEGI ${rating.rating}`;
                                    } else {
                                      ratingText = `Rating ${rating.rating}`;
                                    }

                                    return (
                                      <Badge
                                        key={index}
                                        variant="outline"
                                        className="text-xs hover:scale-110 transition-transform duration-200 hover:shadow-md"
                                      >
                                        {ratingText}
                                      </Badge>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Developer and Publisher */}
                      {gameDetails.involved_companies &&
                        gameDetails.involved_companies.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(() => {
                              const developers =
                                gameDetails.involved_companies.filter(
                                  (company) => company.developer,
                                );
                              const publishers =
                                gameDetails.involved_companies.filter(
                                  (company) => company.publisher,
                                );

                              return (
                                <>
                                  {developers.length > 0 && (
                                    <div>
                                      <h4 className="font-medium text-card-foreground mb-2">
                                        Developer
                                        {developers.length > 1 ? "s" : ""}
                                      </h4>
                                      <div className="flex flex-wrap gap-1">
                                        {developers.map((company, index) => (
                                          <Badge
                                            key={index}
                                            variant="secondary"
                                            className="text-xs hover:scale-110 transition-transform duration-200 hover:shadow-md hover:bg-blue-100"
                                          >
                                            {company.company.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {publishers.length > 0 && (
                                    <div>
                                      <h4 className="font-medium text-card-foreground mb-2">
                                        Publisher
                                        {publishers.length > 1 ? "s" : ""}
                                      </h4>
                                      <div className="flex flex-wrap gap-1">
                                        {publishers.map((company, index) => (
                                          <Badge
                                            key={index}
                                            variant="secondary"
                                            className="text-xs hover:scale-110 transition-transform duration-200 hover:shadow-md hover:bg-blue-100"
                                          >
                                            {company.company.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {gameDetails.genres &&
                          gameDetails.genres.length > 0 && (
                            <div>
                              <h4 className="font-medium text-card-foreground mb-2">
                                Genres
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {gameDetails.genres.map((genre, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-xs hover:scale-110 transition-transform duration-200 hover:shadow-md hover:bg-purple-100"
                                  >
                                    {genre.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                        {gameDetails.platforms &&
                          gameDetails.platforms.length > 0 && (
                            <div>
                              <h4 className="font-medium text-card-foreground mb-2">
                                Platforms
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {gameDetails.platforms
                                  .slice(0, 5)
                                  .map((platform, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs hover:scale-110 transition-transform duration-200 hover:shadow-md hover:bg-green-50"
                                    >
                                      {platform.name}
                                    </Badge>
                                  ))}
                                {gameDetails.platforms.length > 5 && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs hover:scale-110 transition-transform duration-200 hover:shadow-md hover:bg-green-50"
                                  >
                                    +{gameDetails.platforms.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Recommended Games Section */}
                {similarGames.length > 0 && (
                  <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.01] mb-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-lg group">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="w-5 h-5 group-hover:animate-wiggle text-purple-600" />
                          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Recommended Games
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/recommended/${gameId}`)}
                          className="hover:scale-105 transition-all duration-200 hover:shadow-md hover:bg-purple-50 hover:border-purple-300 group"
                        >
                          See All
                          <ArrowLeft className="w-4 h-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform duration-200" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-3 gap-3">
                        {similarGames.slice(0, 3).map((game, index) => (
                          <Card
                            key={game.id}
                            className="overflow-hidden hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer group animate-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${index * 100}ms` }}
                            onClick={() => navigate(`/game/igdb-${game.id}`)}
                          >
                            <div className="aspect-[3/4] relative bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                              {game.cover?.url ? (
                                <img
                                  src={`https:${game.cover.url.replace("t_thumb", "t_cover_big")}`}
                                  alt={game.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.src.includes("t_cover_big")) {
                                      target.src = target.src.replace(
                                        "t_cover_big",
                                        "t_cover_big_2x",
                                      );
                                    }
                                  }}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Gamepad2 className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>

                            <CardContent className="p-2">
                              <h4 className="font-medium text-xs line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200">
                                {game.name}
                              </h4>

                              {game.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                  <div className="flex">
                                    {renderStars(game.rating / 10)}
                                  </div>
                                  <span className="text-xs text-muted-foreground ml-1">
                                    {Math.round(game.rating)}/100
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {similarGames.length > 3 && (
                        <div className="text-center mt-4">
                          <p className="text-sm text-muted-foreground">
                            +{similarGames.length - 3} more recommended games
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Friends Section */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.01]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg group">
                      <Users className="w-5 h-5 group-hover:animate-bounce-gentle text-green-600" />
                      <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        Friends with this Game ({friendsData.length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {friendsData.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {friendsData.map((friend, index) => (
                          <div
                            key={friend.id}
                            className="border rounded-lg p-3 hover:shadow-md transition-all duration-300 hover:bg-accent/20 animate-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={
                                    friend.avatar_url ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.full_name}`
                                  }
                                  alt={friend.full_name}
                                />
                                <AvatarFallback>
                                  {friend.full_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-card-foreground">
                                    {friend.full_name}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    {friend.is_favorite && (
                                      <Heart className="w-4 h-4 text-red-500 fill-red-500 hover:animate-wiggle" />
                                    )}
                                    {friend.is_completed && (
                                      <CheckCircle className="w-4 h-4 text-green-500 hover:animate-wiggle" />
                                    )}
                                    {getStatusBadge(friend.status)}
                                  </div>
                                </div>

                                {friend.personal_rating && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex">
                                      {renderStars(friend.personal_rating)}
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {friend.personal_rating}/10
                                    </span>
                                  </div>
                                )}

                                {friend.review && (
                                  <div className="bg-muted rounded-lg p-3 mb-2">
                                    <div className="flex items-center gap-2 mb-2"></div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                      {friend.review.review_text}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Reviewed{" "}
                                      {new Date(
                                        friend.review.created_at,
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                )}

                                {friend.personal_notes && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    <span className="font-medium">Notes:</span>{" "}
                                    {friend.personal_notes}
                                  </p>
                                )}

                                <p className="text-xs text-muted-foreground">
                                  Added{" "}
                                  {new Date(
                                    friend.date_added,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Users className="w-10 h-10 text-gray-400 mx-auto mb-3 animate-float" />
                        <h3 className="text-base font-medium text-card-foreground mb-2">
                          No friends have this game yet
                        </h3>
                        <p className="text-sm text-muted-foreground animate-pulse">
                          Be the first among your friends to discover this game!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;

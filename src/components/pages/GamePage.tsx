import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import Sidebar from "@/components/dashboard/layout/Sidebar";
import TopNavigation from "@/components/dashboard/layout/TopNavigation";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { Tables } from "@/types/supabase";

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
  const [activeItem, setActiveItem] = useState("");
  const [gameCollection, setGameCollection] = useState<GameCollection | null>(
    null,
  );
  const [gameDetails, setGameDetails] = useState<IGDBGameDetails | null>(null);
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

  // Unified form states for both add and edit
  const [selectedStatus, setSelectedStatus] = useState("");
  const [personalRating, setPersonalRating] = useState<number[]>([5]);
  const [gameNotes, setGameNotes] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [isLoadingReview, setIsLoadingReview] = useState(false);

  const [existingReview, setExistingReview] = useState<GameReview | null>(null);

  // Fetch game collection data or check if it's a direct IGDB game ID
  const fetchGameCollection = useCallback(async () => {
    if (!gameId || !user) return;

    try {
      // First, try to find the game in user's collection
      const { data, error } = await supabase
        .from("game_collections")
        .select("*")
        .eq("id", gameId)
        .eq("user_id", user.id)
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
          .eq("game_collection_id", gameId)
          .eq("user_id", user.id)
          .single();

        if (reviewData) {
          setExistingReview(reviewData);
          setReviewText(reviewData.review_text);
          setPersonalRating([reviewData.rating]);
        }
      } else {
        // Game not in user's collection, check if it's an IGDB ID or find by IGDB ID
        const igdbId = parseInt(gameId);
        if (!isNaN(igdbId)) {
          // It's a direct IGDB game ID
          setHasUserGame(false);
          setIgdbGameId(igdbId);
        } else {
          // Try to find the game by collection ID in other users' collections to get IGDB ID
          const { data: otherUserGame } = await supabase
            .from("game_collections")
            .select("igdb_game_id, game_title")
            .eq("id", gameId)
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
      }
    } catch (error) {
      console.error("Error fetching game collection:", error);
      setError("Failed to load game data");
    } finally {
      setIsLoading(false);
    }
  }, [gameId, user]);

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

      if (data && data.length > 0) {
        setGameDetails(data[0]);
        // If we don't have a game title yet, use the one from IGDB
        if (!gameTitle && data[0].name) {
          setGameTitle(data[0].name);
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
    if (!igdbGameId || !user) return;

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
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (friendsError) {
        console.error("Error fetching friends:", friendsError);
        return;
      }

      const friendIds = [];
      for (const friendship of friendships || []) {
        const friendUser =
          friendship.requester_id === user.id
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
  }, [igdbGameId, user]);

  useEffect(() => {
    fetchGameCollection();
  }, [fetchGameCollection]);

  useEffect(() => {
    if (igdbGameId) {
      fetchGameDetails();
      fetchFriendsData();
    }
  }, [igdbGameId, fetchGameDetails, fetchFriendsData]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      playing: { label: "Playing", className: "bg-green-100 text-green-800" },
      played: { label: "Played", className: "bg-blue-100 text-blue-800" },
      "want-to-play": {
        label: "Want to Play",
        className: "bg-yellow-100 text-yellow-800",
      },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const renderStars = (rating: number) => {
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
  };

  // Save game collection changes
  const handleSaveGameData = async () => {
    if (!gameCollection || !user) return;

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
          user_id: user.id,
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
          user_id: user.id,
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
              user_id: user.id,
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
              user_id: user.id,
              game_collection_id: gameCollection.id,
              review_text: reviewText,
              rating: personalRating[0],
            })
            .select()
            .single();

          if (!reviewInsertError && newReview) {
            // Log new review activity
            await supabase.from("activity_feed").insert({
              user_id: user.id,
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
  };

  // Add game to user's collection
  const handleAddGame = async () => {
    if (!user || !gameDetails || !igdbGameId || !selectedStatus) return;

    setIsSaving(true);
    try {
      const gameData = {
        user_id: user.id,
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
          user_id: user.id,
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
          user_id: user.id,
          activity_type: "game_rated",
          game_collection_id: insertedGameData.id,
          activity_data: {
            game_title: gameDetails.name,
            rating: personalRating[0],
            igdb_game_id: gameCollection.igdb_game_id,
          },
        });
      }

      // If there's a review and rating, create a review entry
      if (selectedStatus === "played" && reviewText.trim()) {
        const { data: reviewData, error: reviewError } = await supabase
          .from("game_reviews")
          .insert({
            user_id: user.id,
            game_collection_id: insertedGameData.id,
            review_text: reviewText,
            rating: personalRating[0],
          })
          .select()
          .single();

        if (!reviewError && reviewData) {
          // Log review activity
          await supabase.from("activity_feed").insert({
            user_id: user.id,
            activity_type: "review_posted",
            game_collection_id: insertedGameData.id,
            game_review_id: reviewData.id,
            activity_data: {
              game_title: gameDetails.name,
              rating: personalRating[0],
              igdb_game_id: gameCollection.igdb_game_id,
            },
          });

          setExistingReview(reviewData);
        }
      }

      // Update local state
      setGameCollection(insertedGameData);
      setHasUserGame(true);
      setGameTitle(insertedGameData.game_title);

      // Reset form
      resetAddGameForm();
    } catch (error) {
      console.error("Error adding game to collection:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetAddGameForm = () => {
    setSelectedStatus("");
    setGameNotes("");
    setPersonalRating([5]);
    setReviewText("");
    setIsCompleted(false);
    setIsFavorite(false);
    setIsAddGameDialogOpen(false);
  };

  // Load existing review when editing
  const loadExistingReview = async () => {
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
        .single();

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
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex h-[calc(100vh-64px)] mt-16">
          <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
          <div className="flex-1 flex items-center justify-center">
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
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex h-[calc(100vh-64px)] mt-16">
          <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
          <div className="flex-1 flex items-center justify-center">
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
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="flex h-[calc(100vh-64px)] mt-16">
        <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-foreground">
                  {gameTitle || gameDetails?.name || "Loading..."}
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Game Cover and Basic Info */}
              <div className="lg:col-span-1">
                <Card className="overflow-hidden">
                  <div className="aspect-[3/4] relative bg-gray-200 flex items-center justify-center">
                    {gameCollection?.game_cover_url ||
                    (gameDetails?.cover?.url &&
                      `https:${gameDetails.cover.url.replace("t_thumb", "t_cover_big")}`) ? (
                      <img
                        src={
                          gameCollection?.game_cover_url ||
                          `https:${gameDetails.cover.url.replace("t_thumb", "t_cover_big")}`
                        }
                        alt={gameTitle || gameDetails?.name || "Game cover"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <Gamepad2 className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Loading cover...
                        </p>
                      </div>
                    )}
                    {hasUserGame && gameCollection && (
                      <>
                        <div className="absolute top-2 right-2">
                          {getStatusBadge(gameCollection.status)}
                        </div>
                        <div className="absolute top-2 left-2 flex gap-1">
                          {gameCollection.is_favorite && (
                            <div className="bg-red-500 rounded-full p-1">
                              <Heart className="w-3 h-3 text-white fill-white" />
                            </div>
                          )}
                          {gameCollection.is_completed && (
                            <div className="bg-green-500 rounded-full p-1">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <CardContent className="p-6">
                    {hasUserGame && gameCollection ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-card-foreground">
                            Your Game Data
                          </h3>
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
                              <Button variant="outline" size="sm">
                                <Edit3 className="w-4 h-4 mr-2" />
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
                                <div className="border rounded-md p-4 bg-blue-50">
                                  <div className="flex items-start gap-3">
                                    <img
                                      src={
                                        gameCollection.game_cover_url ||
                                        `https:${gameDetails?.cover?.url?.replace("t_thumb", "t_cover_small")}`
                                      }
                                      alt={gameCollection.game_title}
                                      className="w-16 h-20 object-cover rounded"
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
                                  onChange={(e) => setGameNotes(e.target.value)}
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
                                    className="flex-1"
                                    onClick={handleSaveGameData}
                                    disabled={!selectedStatus || isSaving}
                                  >
                                    {isSaving ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Updating...
                                      </>
                                    ) : (
                                      "Update Game"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
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
                            <div className="bg-gray-50 rounded-lg p-3">
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
                        <div className="text-center py-8">
                          <Gamepad2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-card-foreground mb-2">
                            Game not in your collection
                          </h4>
                          <p className="text-muted-foreground mb-6">
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
                              <Button className="w-full">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Game
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Add Game to Library</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {gameDetails && (
                                  <div className="border rounded-md p-4 bg-blue-50">
                                    <div className="flex items-start gap-3">
                                      {gameDetails.cover && (
                                        <img
                                          src={`https:${gameDetails.cover.url.replace("t_thumb", "t_cover_small")}`}
                                          alt={gameDetails.name}
                                          className="w-16 h-20 object-cover rounded"
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
                                  className="w-full"
                                  onClick={handleAddGame}
                                  disabled={!selectedStatus || isSaving}
                                >
                                  {isSaving ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Adding to Library...
                                    </>
                                  ) : (
                                    "Add to Library"
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
              <div className="lg:col-span-2 space-y-6">
                {/* Game Details */}
                {isLoadingDetails ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        <span className="text-muted-foreground">
                          Loading game details...
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ) : gameDetails ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Game Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-card-foreground mb-2">
                          Summary
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {gameDetails.summary}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    className="text-xs"
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
                                      className="text-xs"
                                    >
                                      {platform.name}
                                    </Badge>
                                  ))}
                                {gameDetails.platforms.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
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

                {/* Friends Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Friends with this Game ({friendsData.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {friendsData.length > 0 ? (
                      <div className="space-y-4">
                        {friendsData.map((friend) => (
                          <div
                            key={friend.id}
                            className="border rounded-lg p-4"
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
                                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                    )}
                                    {friend.is_completed && (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
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
                                  <div className="bg-gray-50 rounded-lg p-3 mb-2">
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
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-card-foreground mb-2">
                          No friends have this game yet
                        </h3>
                        <p className="text-muted-foreground">
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

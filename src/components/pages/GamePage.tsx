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

  // Edit form states
  const [editForm, setEditForm] = useState({
    status: "",
    personal_rating: 0,
    personal_notes: "",
    is_favorite: false,
    is_completed: false,
  });

  // Review form states
  const [reviewForm, setReviewForm] = useState({
    review_text: "",
    rating: 0,
    is_public: true,
  });

  const [existingReview, setExistingReview] = useState<GameReview | null>(null);

  // Fetch game collection data
  const fetchGameCollection = useCallback(async () => {
    if (!gameId || !user) return;

    try {
      const { data, error } = await supabase
        .from("game_collections")
        .select("*")
        .eq("id", gameId)
        .single();

      if (error) {
        console.error("Error fetching game collection:", error);
        setError("Game not found");
        return;
      }

      setGameCollection(data);

      // Initialize edit form with current data
      setEditForm({
        status: data.status,
        personal_rating: data.personal_rating || 0,
        personal_notes: data.personal_notes || "",
        is_favorite: data.is_favorite || false,
        is_completed: data.is_completed || false,
      });

      // Fetch existing review
      const { data: reviewData } = await supabase
        .from("game_reviews")
        .select("*")
        .eq("game_collection_id", gameId)
        .eq("user_id", user.id)
        .single();

      if (reviewData) {
        setExistingReview(reviewData);
        setReviewForm({
          review_text: reviewData.review_text,
          rating: reviewData.rating,
          is_public: reviewData.is_public || true,
        });
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
    if (!gameCollection) return;

    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-getGameDetails",
        {
          body: { igdbGameId: gameCollection.igdb_game_id },
        },
      );

      if (error) {
        console.error("Error fetching game details:", error);
        return;
      }

      if (data && data.length > 0) {
        setGameDetails(data[0]);
      }
    } catch (error) {
      console.error("Error fetching game details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [gameCollection]);

  // Fetch friends' data for this game
  const fetchFriendsData = useCallback(async () => {
    if (!gameCollection || !user) return;

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
        .eq("igdb_game_id", gameCollection.igdb_game_id)
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
  }, [gameCollection, user]);

  useEffect(() => {
    fetchGameCollection();
  }, [fetchGameCollection]);

  useEffect(() => {
    if (gameCollection) {
      fetchGameDetails();
      fetchFriendsData();
    }
  }, [gameCollection, fetchGameDetails, fetchFriendsData]);

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
      const { error } = await supabase
        .from("game_collections")
        .update({
          status: editForm.status,
          personal_rating: editForm.personal_rating || null,
          personal_notes: editForm.personal_notes || null,
          is_favorite: editForm.is_favorite,
          is_completed: editForm.is_completed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", gameCollection.id);

      if (error) {
        console.error("Error updating game collection:", error);
        return;
      }

      // Update local state
      setGameCollection({
        ...gameCollection,
        status: editForm.status,
        personal_rating: editForm.personal_rating || null,
        personal_notes: editForm.personal_notes || null,
        is_favorite: editForm.is_favorite,
        is_completed: editForm.is_completed,
      });

      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving game data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Save review
  const handleSaveReview = async () => {
    if (!gameCollection || !user || !reviewForm.review_text.trim()) return;

    setIsSaving(true);
    try {
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from("game_reviews")
          .update({
            review_text: reviewForm.review_text,
            rating: reviewForm.rating,
            is_public: reviewForm.is_public,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingReview.id);

        if (error) {
          console.error("Error updating review:", error);
          return;
        }

        setExistingReview({
          ...existingReview,
          review_text: reviewForm.review_text,
          rating: reviewForm.rating,
          is_public: reviewForm.is_public,
        });
      } else {
        // Create new review
        const { data, error } = await supabase
          .from("game_reviews")
          .insert({
            game_collection_id: gameCollection.id,
            user_id: user.id,
            review_text: reviewForm.review_text,
            rating: reviewForm.rating,
            is_public: reviewForm.is_public,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating review:", error);
          return;
        }

        setExistingReview(data);
      }

      setIsReviewDialogOpen(false);
    } catch (error) {
      console.error("Error saving review:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavigation />
        <div className="flex h-[calc(100vh-64px)] mt-16">
          <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-lg text-gray-600">Loading game...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !gameCollection) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavigation />
        <div className="flex h-[calc(100vh-64px)] mt-16">
          <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {error || "Game not found"}
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
    <div className="min-h-screen bg-gray-50">
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
                <h1 className="text-3xl font-bold text-gray-900">
                  {gameCollection.game_title}
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Game Cover and Basic Info */}
              <div className="lg:col-span-1">
                <Card className="overflow-hidden">
                  <div className="aspect-[3/4] relative">
                    <img
                      src={
                        gameCollection.game_cover_url ||
                        "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80"
                      }
                      alt={gameCollection.game_title}
                      className="w-full h-full object-cover"
                    />
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
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Your Game Data
                      </h3>
                      <Dialog
                        open={isEditDialogOpen}
                        onOpenChange={setIsEditDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Game Data</DialogTitle>
                            <DialogDescription>
                              Update your rating, status, and notes for this
                              game.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="status">Status</Label>
                              <Select
                                value={editForm.status}
                                onValueChange={(value) =>
                                  setEditForm({ ...editForm, status: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="playing">
                                    Playing
                                  </SelectItem>
                                  <SelectItem value="played">Played</SelectItem>
                                  <SelectItem value="want-to-play">
                                    Want to Play
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="rating">
                                Rating: {editForm.personal_rating}/10
                              </Label>
                              <Slider
                                value={[editForm.personal_rating]}
                                onValueChange={(value) =>
                                  setEditForm({
                                    ...editForm,
                                    personal_rating: value[0],
                                  })
                                }
                                max={10}
                                min={0}
                                step={0.5}
                                className="mt-2"
                              />
                            </div>
                            <div>
                              <Label htmlFor="notes">Personal Notes</Label>
                              <Textarea
                                value={editForm.personal_notes}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    personal_notes: e.target.value,
                                  })
                                }
                                placeholder="Add your personal notes..."
                                className="mt-1"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="favorite"
                                checked={editForm.is_favorite}
                                onCheckedChange={(checked) =>
                                  setEditForm({
                                    ...editForm,
                                    is_favorite: !!checked,
                                  })
                                }
                              />
                              <Label htmlFor="favorite">Mark as favorite</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="completed"
                                checked={editForm.is_completed}
                                onCheckedChange={(checked) =>
                                  setEditForm({
                                    ...editForm,
                                    is_completed: !!checked,
                                  })
                                }
                              />
                              <Label htmlFor="completed">
                                Mark as completed
                              </Label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsEditDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSaveGameData}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              Save
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {gameCollection.personal_rating &&
                      gameCollection.personal_rating > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Your Rating
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {renderStars(gameCollection.personal_rating)}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {gameCollection.personal_rating}/10
                            </span>
                          </div>
                        </div>
                      )}

                    {gameCollection.personal_notes && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Your Notes
                        </h4>
                        <p className="text-sm text-gray-600">
                          {gameCollection.personal_notes}
                        </p>
                      </div>
                    )}

                    {existingReview && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Your Review
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {renderStars(existingReview.rating)}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {existingReview.rating}/10
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {existingReview.review_text}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mb-4">
                      <Dialog
                        open={isReviewDialogOpen}
                        onOpenChange={setIsReviewDialogOpen}
                      >
                        <DialogTrigger asChild></DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              {existingReview ? "Edit Review" : "Write Review"}
                            </DialogTitle>
                            <DialogDescription>
                              Share your thoughts about this game.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="review-rating">
                                Rating: {reviewForm.rating}/10
                              </Label>
                              <Slider
                                value={[reviewForm.rating]}
                                onValueChange={(value) =>
                                  setReviewForm({
                                    ...reviewForm,
                                    rating: value[0],
                                  })
                                }
                                max={10}
                                min={0}
                                step={0.5}
                                className="mt-2"
                              />
                            </div>
                            <div>
                              <Label htmlFor="review-text">Review</Label>
                              <Textarea
                                value={reviewForm.review_text}
                                onChange={(e) =>
                                  setReviewForm({
                                    ...reviewForm,
                                    review_text: e.target.value,
                                  })
                                }
                                placeholder="Write your review..."
                                className="mt-1 min-h-[100px]"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="public"
                                checked={reviewForm.is_public}
                                onCheckedChange={(checked) =>
                                  setReviewForm({
                                    ...reviewForm,
                                    is_public: !!checked,
                                  })
                                }
                              />
                              <Label htmlFor="public">Make review public</Label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsReviewDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSaveReview}
                              disabled={
                                isSaving || !reviewForm.review_text.trim()
                              }
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              {existingReview ? "Update" : "Save"} Review
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="text-xs text-gray-500">
                      Added{" "}
                      {new Date(gameCollection.date_added).toLocaleDateString()}
                    </div>
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
                        <span className="text-gray-600">
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
                      {gameDetails.summary && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Summary
                          </h4>
                          <p className="text-sm text-gray-600">
                            {gameDetails.summary}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {gameDetails.genres &&
                          gameDetails.genres.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">
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
                              <h4 className="font-medium text-gray-900 mb-2">
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
                                  <h4 className="font-medium text-gray-900">
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
                                    <span className="text-sm text-gray-600">
                                      {friend.personal_rating}/10
                                    </span>
                                  </div>
                                )}

                                {friend.review && (
                                  <div className="bg-gray-50 rounded-lg p-3 mb-2">
                                    <div className="flex items-center gap-2 mb-2"></div>
                                    <p className="text-sm text-gray-700 mb-1">
                                      {friend.review.review_text}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Reviewed{" "}
                                      {new Date(
                                        friend.review.created_at,
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                )}

                                {friend.personal_notes && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    <span className="font-medium">Notes:</span>{" "}
                                    {friend.personal_notes}
                                  </p>
                                )}

                                <p className="text-xs text-gray-500">
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
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No friends have this game yet
                        </h3>
                        <p className="text-gray-600">
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

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  Plus,
  Search,
  Filter,
  Loader2,
  Heart,
  CheckCircle,
  Edit,
  Users,
  FileText,
  MessageSquare,
} from "lucide-react";
import Sidebar from "@/components/dashboard/layout/Sidebar";
import TopNavigation from "@/components/dashboard/layout/TopNavigation";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { Tables } from "@/types/supabase";
import { useNavigate } from "react-router-dom";

type GameCollection = Tables<"game_collections">;

interface Game {
  id: string;
  title: string;
  cover: string;
  rating?: number;
  status: "playing" | "played" | "want-to-play";
  personalRating?: number;
  notes?: string;
  dateAdded: string;
  igdbId?: number;
  isCompleted?: boolean;
  isFavorite?: boolean;
  reviewText?: string;
  hasReview?: boolean;
  friendsWithGame?: {
    id: string;
    name: string;
    avatar_url?: string;
    status: string;
    rating?: number;
    hasReview?: boolean;
    hasNotes?: boolean;
  }[];
}

interface IGDBGame {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  rating?: number;
  summary?: string;
}

const GameLibrary = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddGameOpen, setIsAddGameOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("Game Library");
  const [gameSearchTerm, setGameSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IGDBGame[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedGame, setSelectedGame] = useState<IGDBGame | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [gameNotes, setGameNotes] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [personalRating, setPersonalRating] = useState<number[]>([5]);
  const [reviewText, setReviewText] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [sortBy, setSortBy] = useState<string>("dateAdded");
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsGames, setFriendsGames] = useState<Map<number, any[]>>(
    new Map(),
  );
  const [gameReviews, setGameReviews] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [friendsReviews, setFriendsReviews] = useState<
    Map<string, Map<string, boolean>>
  >(new Map());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // IGDB API search function
  const searchIGDBGames = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        "https://hktnhglrdhigtevqvzvf.supabase.co/functions/v1/SearchGames",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Games:", data);

      // Set the search results with the returned data
      if (data && Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching games:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Fetch user's friends
  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      const { data: friendships, error } = await supabase
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

      if (error) {
        console.error("Error fetching friends:", error);
        return;
      }

      const friendsData = [];
      for (const friendship of friendships || []) {
        const friendUser =
          friendship.requester_id === user.id
            ? friendship.addressee
            : friendship.requester;

        if (friendUser) {
          friendsData.push({
            id: friendUser.id,
            full_name: friendUser.full_name || "Unknown User",
            email: friendUser.email || "",
            avatar_url: friendUser.avatar_url || undefined,
          });
        }
      }

      setFriends(friendsData);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  }, [user]);

  // Fetch friends' games
  const fetchFriendsGames = useCallback(async () => {
    if (!user || friends.length === 0) return;

    try {
      const friendsGamesMap = new Map<number, any[]>();
      const friendsReviewsMap = new Map<string, Map<string, boolean>>();

      for (const friend of friends) {
        const { data: friendGames } = await supabase
          .from("game_collections")
          .select("id, igdb_game_id, status, personal_rating, personal_notes")
          .eq("user_id", friend.id);

        if (friendGames) {
          // Fetch reviews for friend's games
          const gameCollectionIds = friendGames.map((g) => g.id);
          const { data: friendReviews } = await supabase
            .from("game_reviews")
            .select("game_collection_id")
            .in("game_collection_id", gameCollectionIds);

          const reviewsSet = new Set(
            friendReviews?.map((r) => r.game_collection_id) || [],
          );

          for (const game of friendGames) {
            if (!friendsGamesMap.has(game.igdb_game_id)) {
              friendsGamesMap.set(game.igdb_game_id, []);
            }

            const hasReview = reviewsSet.has(game.id);
            const hasNotes = !!(
              game.personal_notes && game.personal_notes.trim()
            );

            friendsGamesMap.get(game.igdb_game_id)!.push({
              id: friend.id,
              name: friend.full_name,
              avatar_url: friend.avatar_url,
              status: game.status,
              rating: game.personal_rating,
              hasReview,
              hasNotes,
            });

            // Store friend's review status
            if (!friendsReviewsMap.has(game.igdb_game_id.toString())) {
              friendsReviewsMap.set(game.igdb_game_id.toString(), new Map());
            }
            friendsReviewsMap
              .get(game.igdb_game_id.toString())!
              .set(friend.id, hasReview);
          }
        }
      }

      setFriendsGames(friendsGamesMap);
      setFriendsReviews(friendsReviewsMap);
    } catch (error) {
      console.error("Error fetching friends games:", error);
    }
  }, [user, friends]);

  // Fetch user's game library
  const fetchUserGames = useCallback(
    async (skipLoadingState = false) => {
      if (!user) return;

      if (!skipLoadingState) {
        setIsLoadingGames(true);
      }

      try {
        const { data, error } = await supabase
          .from("game_collections")
          .select("*")
          .eq("user_id", user.id)
          .order("date_added", { ascending: false });

        if (error) {
          console.error("Error fetching games:", error);
          return;
        }

        // Fetch user's reviews
        const gameIds = data.map((g) => g.id);
        const { data: userReviews } = await supabase
          .from("game_reviews")
          .select("game_collection_id")
          .in("game_collection_id", gameIds);

        const userReviewsSet = new Set(
          userReviews?.map((r) => r.game_collection_id) || [],
        );

        // Transform database data to match our Game interface
        const transformedGames: Game[] = data.map((game) => {
          const friendsWithThisGame = friendsGames.get(game.igdb_game_id) || [];
          const hasReview = userReviewsSet.has(game.id);

          return {
            id: game.id,
            title: game.game_title,
            cover:
              game.game_cover_url ||
              "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80",
            status: game.status as "playing" | "played" | "want-to-play",
            personalRating: game.personal_rating || undefined,
            notes: game.personal_notes || undefined,
            dateAdded: game.date_added,
            igdbId: game.igdb_game_id,
            isCompleted: game.is_completed || false,
            isFavorite: game.is_favorite || false,
            hasReview,
            friendsWithGame: friendsWithThisGame,
          };
        });

        setGames(transformedGames);
      } catch (error) {
        console.error("Error fetching games:", error);
      } finally {
        if (!skipLoadingState) {
          setIsLoadingGames(false);
        }
        setIsInitialLoad(false);
      }
    },
    [user, friendsGames],
  );

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize data loading
  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;

      setIsLoadingGames(true);

      try {
        // Fetch friends first
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

        let friendsData = [];
        if (!friendsError && friendships) {
          for (const friendship of friendships) {
            const friendUser =
              friendship.requester_id === user.id
                ? friendship.addressee
                : friendship.requester;

            if (friendUser) {
              friendsData.push({
                id: friendUser.id,
                full_name: friendUser.full_name || "Unknown User",
                email: friendUser.email || "",
                avatar_url: friendUser.avatar_url || undefined,
              });
            }
          }
        }

        setFriends(friendsData);

        // Fetch friends' games
        const friendsGamesMap = new Map<number, any[]>();
        const friendsReviewsMap = new Map<string, Map<string, boolean>>();
        if (friendsData.length > 0) {
          for (const friend of friendsData) {
            const { data: friendGames } = await supabase
              .from("game_collections")
              .select(
                "id, igdb_game_id, status, personal_rating, personal_notes",
              )
              .eq("user_id", friend.id);

            if (friendGames) {
              // Fetch reviews for friend's games
              const gameCollectionIds = friendGames.map((g) => g.id);
              const { data: friendReviews } = await supabase
                .from("game_reviews")
                .select("game_collection_id")
                .in("game_collection_id", gameCollectionIds);

              const reviewsSet = new Set(
                friendReviews?.map((r) => r.game_collection_id) || [],
              );

              for (const game of friendGames) {
                if (!friendsGamesMap.has(game.igdb_game_id)) {
                  friendsGamesMap.set(game.igdb_game_id, []);
                }

                const hasReview = reviewsSet.has(game.id);
                const hasNotes = !!(
                  game.personal_notes && game.personal_notes.trim()
                );

                friendsGamesMap.get(game.igdb_game_id)!.push({
                  id: friend.id,
                  name: friend.full_name,
                  avatar_url: friend.avatar_url,
                  status: game.status,
                  rating: game.personal_rating,
                  hasReview,
                  hasNotes,
                });

                // Store friend's review status
                if (!friendsReviewsMap.has(game.igdb_game_id.toString())) {
                  friendsReviewsMap.set(
                    game.igdb_game_id.toString(),
                    new Map(),
                  );
                }
                friendsReviewsMap
                  .get(game.igdb_game_id.toString())!
                  .set(friend.id, hasReview);
              }
            }
          }
        }

        setFriendsGames(friendsGamesMap);
        setFriendsReviews(friendsReviewsMap);

        // Fetch user's games
        const { data: gamesData, error: gamesError } = await supabase
          .from("game_collections")
          .select("*")
          .eq("user_id", user.id)
          .order("date_added", { ascending: false });

        if (!gamesError && gamesData) {
          // Fetch user's reviews
          const gameIds = gamesData.map((g) => g.id);
          const { data: userReviews } = await supabase
            .from("game_reviews")
            .select("game_collection_id")
            .in("game_collection_id", gameIds);

          const userReviewsSet = new Set(
            userReviews?.map((r) => r.game_collection_id) || [],
          );

          const transformedGames: Game[] = gamesData.map((game) => {
            const friendsWithThisGame =
              friendsGamesMap.get(game.igdb_game_id) || [];
            const hasReview = userReviewsSet.has(game.id);

            return {
              id: game.id,
              title: game.game_title,
              cover:
                game.game_cover_url ||
                "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80",
              status: game.status as "playing" | "played" | "want-to-play",
              personalRating: game.personal_rating || undefined,
              notes: game.personal_notes || undefined,
              dateAdded: game.date_added,
              igdbId: game.igdb_game_id,
              isCompleted: game.is_completed || false,
              isFavorite: game.is_favorite || false,
              hasReview,
              friendsWithGame: friendsWithThisGame,
            };
          });

          setGames(transformedGames);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setIsLoadingGames(false);
        setIsInitialLoad(false);
      }
    };

    if (user && isInitialLoad) {
      initializeData();
    }
  }, [user, isInitialLoad]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchIGDBGames(gameSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [gameSearchTerm, searchIGDBGames]);

  const handleAddGame = async () => {
    if (!selectedGame || !selectedStatus || !user) return;

    setIsAddingGame(true);
    try {
      const gameData = {
        user_id: user.id,
        igdb_game_id: selectedGame.id,
        game_title: selectedGame.name,
        game_cover_url: selectedGame.cover
          ? `https:${selectedGame.cover.url.replace("t_thumb", "t_cover_big")}`
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
        console.error("Error adding game:", error);
        return;
      }

      // Log activity to activity_feed
      await supabase.from("activity_feed").insert({
        user_id: user.id,
        activity_type: "game_added",
        game_collection_id: insertedGameData.id,
        activity_data: {
          game_title: selectedGame.name,
          status: selectedStatus,
          igdb_game_id: selectedGame.id,
        },
      });

      // If the game is marked as completed, log completion activity
      if (isCompleted) {
        await supabase.from("activity_feed").insert({
          user_id: user.id,
          activity_type: "game_completed",
          game_collection_id: insertedGameData.id,
          activity_data: {
            game_title: selectedGame.name,
            igdb_game_id: selectedGame.id,
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
            game_title: selectedGame.name,
            rating: personalRating[0],
            igdb_game_id: selectedGame.id,
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
              game_title: selectedGame.name,
              rating: personalRating[0],
              igdb_game_id: selectedGame.id,
            },
          });
        }
      }

      // Refresh the games list
      await fetchUserGames();

      // Reset form
      resetAddGameForm();
    } catch (error) {
      console.error("Error adding game:", error);
    } finally {
      setIsAddingGame(false);
    }
  };

  const resetAddGameForm = () => {
    setSelectedGame(null);
    setSelectedStatus("");
    setGameNotes("");
    setGameSearchTerm("");
    setSearchResults([]);
    setPersonalRating([5]);
    setReviewText("");
    setIsCompleted(false);
    setIsFavorite(false);
    setIsAddGameOpen(false);
  };

  const handleEditGame = async (game: Game) => {
    setEditingGame(game);
    setSelectedStatus(game.status);
    setGameNotes(game.notes || "");
    setPersonalRating([game.personalRating || 5]);
    setIsCompleted(game.isCompleted || false);
    setIsFavorite(game.isFavorite || false);

    // Load existing review if the game is marked as played
    if (game.status === "played") {
      setIsLoadingReview(true);
      try {
        const { data: existingReview } = await supabase
          .from("game_reviews")
          .select("review_text")
          .eq("game_collection_id", game.id)
          .single();

        setReviewText(existingReview?.review_text || "");
      } catch (error) {
        console.error("Error loading review:", error);
        setReviewText("");
      } finally {
        setIsLoadingReview(false);
      }
    } else {
      setReviewText("");
    }

    setIsEditDialogOpen(true);
  };

  const handleUpdateGame = async () => {
    if (!editingGame || !user) return;

    setIsAddingGame(true);
    try {
      const previousStatus = editingGame.status;
      const previousRating = editingGame.personalRating;
      const previousCompleted = editingGame.isCompleted;

      const updateData = {
        status: selectedStatus,
        personal_notes: gameNotes || null,
        personal_rating: selectedStatus === "played" ? personalRating[0] : null,
        is_completed: isCompleted,
        is_favorite: isFavorite,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("game_collections")
        .update(updateData)
        .eq("id", editingGame.id);

      if (error) {
        console.error("Error updating game:", error);
        return;
      }

      // Log completion activity if game was just marked as completed
      if (isCompleted && !previousCompleted) {
        await supabase.from("activity_feed").insert({
          user_id: user.id,
          activity_type: "game_completed",
          game_collection_id: editingGame.id,
          activity_data: {
            game_title: editingGame.title,
            igdb_game_id: editingGame.igdbId,
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
          game_collection_id: editingGame.id,
          activity_data: {
            game_title: editingGame.title,
            rating: personalRating[0],
            igdb_game_id: editingGame.igdbId,
          },
        });
      }

      // Handle review update/creation
      if (selectedStatus === "played" && reviewText.trim()) {
        const { data: existingReview } = await supabase
          .from("game_reviews")
          .select("id")
          .eq("game_collection_id", editingGame.id)
          .single();

        if (existingReview) {
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
            const { error: activityError } = await supabase
              .from("activity_feed")
              .insert({
                user_id: user.id,
                activity_type: "review_posted",
                game_collection_id: editingGame.id,
                game_review_id: existingReview.id,
                activity_data: {
                  game_title: editingGame.title,
                  rating: personalRating[0],
                  igdb_game_id: editingGame.igdbId,
                },
              });

            if (activityError) {
              console.error(
                "Error logging review update activity:",
                activityError,
              );
            }
          } else {
            console.error("Error updating review:", reviewUpdateError);
          }
        } else {
          const { data: newReview, error: reviewInsertError } = await supabase
            .from("game_reviews")
            .insert({
              user_id: user.id,
              game_collection_id: editingGame.id,
              review_text: reviewText,
              rating: personalRating[0],
            })
            .select()
            .single();

          if (!reviewInsertError && newReview) {
            // Log new review activity
            const { error: activityError } = await supabase
              .from("activity_feed")
              .insert({
                user_id: user.id,
                activity_type: "review_posted",
                game_collection_id: editingGame.id,
                game_review_id: newReview.id,
                activity_data: {
                  game_title: editingGame.title,
                  rating: personalRating[0],
                  igdb_game_id: editingGame.igdbId,
                },
              });

            if (activityError) {
              console.error(
                "Error logging new review activity:",
                activityError,
              );
            }
          } else {
            console.error("Error creating review:", reviewInsertError);
          }
        }
      }

      // Refresh the games list
      await fetchUserGames();

      // Reset form
      setEditingGame(null);
      setIsEditDialogOpen(false);
      resetAddGameForm();
    } catch (error) {
      console.error("Error updating game:", error);
    } finally {
      setIsAddingGame(false);
    }
  };

  const filteredGames = games.filter((game) => {
    const matchesSearch = game.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && game.status === activeTab;
  });

  const sortedGames = [...filteredGames].sort((a, b) => {
    switch (sortBy) {
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "rating":
        const ratingA = a.personalRating || 0;
        const ratingB = b.personalRating || 0;
        return ratingB - ratingA; // Highest rating first
      case "favoritesRating":
        // First sort by favorites (favorites first), then by rating
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        if (a.isFavorite && b.isFavorite) {
          const ratingA = a.personalRating || 0;
          const ratingB = b.personalRating || 0;
          return ratingB - ratingA;
        }
        return 0;
      case "completed":
        // Completed games first
        if (a.isCompleted && !b.isCompleted) return -1;
        if (!a.isCompleted && b.isCompleted) return 1;
        return 0;
      case "dateAdded":
      default:
        return (
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        ); // Most recent first
    }
  });

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

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation
        onMobileMenuClick={() => setIsSidebarOpen(true)}
        showMobileMenu={isMobile}
      />
      <div className="flex h-[calc(100vh-64px)] mt-16">
        <Sidebar
          activeItem={activeItem}
          onItemClick={setActiveItem}
          isMobile={isMobile}
          isOpen={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
        />

        <div className="flex-1 overflow-auto w-full md:w-auto">
          <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Game Library
                </h1>
                <p className="text-muted-foreground">
                  Manage your game collection and track your progress
                </p>
              </div>

              <Dialog open={isAddGameOpen} onOpenChange={setIsAddGameOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Game
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Game to Library</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        placeholder="Search for a game..."
                        value={gameSearchTerm}
                        onChange={(e) => setGameSearchTerm(e.target.value)}
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin" />
                      )}
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && !selectedGame && (
                      <div className="max-h-60 overflow-y-auto border rounded-md">
                        {searchResults.map((game) => (
                          <div
                            key={game.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-start gap-3"
                            onClick={() => setSelectedGame(game)}
                          >
                            {game.cover && (
                              <img
                                src={`https:${game.cover.url.replace("t_thumb", "t_cover_small")}`}
                                alt={game.name}
                                className="w-12 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">
                                {game.name}
                              </h4>
                              {game.rating && (
                                <p className="text-xs text-gray-600">
                                  Rating: {Math.round(game.rating)}/100
                                </p>
                              )}
                              {game.summary && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {game.summary}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selected Game */}
                    {selectedGame && (
                      <div className="border rounded-md p-4 bg-blue-50">
                        <div className="flex items-start gap-3">
                          {selectedGame.cover && (
                            <img
                              src={`https:${selectedGame.cover.url.replace("t_thumb", "t_cover_small")}`}
                              alt={selectedGame.name}
                              className="w-16 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{selectedGame.name}</h4>
                            {selectedGame.rating && (
                              <p className="text-sm text-gray-600">
                                Rating: {Math.round(selectedGame.rating)}/100
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedGame(null);
                              setGameSearchTerm("");
                            }}
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedGame && (
                      <>
                        <Select
                          value={selectedStatus}
                          onValueChange={setSelectedStatus}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="playing">Playing</SelectItem>
                            <SelectItem value="played">Played</SelectItem>
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
                              <Label>Rating: {personalRating[0]}/10</Label>
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
                              onChange={(e) => setReviewText(e.target.value)}
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
                          disabled={!selectedStatus || isAddingGame}
                        >
                          {isAddingGame ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Adding to Library...
                            </>
                          ) : (
                            "Add to Library"
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Edit Game Dialog */}
              <Dialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
              >
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Game: {editingGame?.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {editingGame && (
                      <div className="border rounded-md p-4 bg-blue-50">
                        <div className="flex items-start gap-3">
                          <img
                            src={editingGame.cover}
                            alt={editingGame.title}
                            className="w-16 h-20 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium">{editingGame.title}</h4>
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
                        <SelectItem value="playing">Playing</SelectItem>
                        <SelectItem value="played">Played</SelectItem>
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
                        <Label htmlFor="edit-completed">Completed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="edit-favorite"
                          checked={isFavorite}
                          onCheckedChange={setIsFavorite}
                        />
                        <Label htmlFor="edit-favorite">Favorite</Label>
                      </div>
                    </div>

                    {selectedStatus === "played" && (
                      <>
                        <div className="space-y-2">
                          <Label>Rating: {personalRating[0]}/10</Label>
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
                              onChange={(e) => setReviewText(e.target.value)}
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
                          setEditingGame(null);
                          resetAddGameForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleUpdateGame}
                        disabled={!selectedStatus || isAddingGame}
                      >
                        {isAddingGame ? (
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

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search games..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dateAdded">Date Added</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="favoritesRating">
                      Favorites then Rating
                    </SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="shrink-0">
                  <Filter className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All Games ({games.length})
                </TabsTrigger>
                <TabsTrigger value="playing">
                  Playing ({games.filter((g) => g.status === "playing").length})
                </TabsTrigger>
                <TabsTrigger value="played">
                  Played ({games.filter((g) => g.status === "played").length})
                </TabsTrigger>
                <TabsTrigger value="want-to-play">
                  Want to Play (
                  {games.filter((g) => g.status === "want-to-play").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {isLoadingGames && isInitialLoad ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-2 text-muted-foreground">
                      Loading your games...
                    </span>
                  </div>
                ) : sortedGames.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                    {sortedGames.map((game) => (
                      <Card
                        key={game.id}
                        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => navigate(`/game/${game.id}`)}
                      >
                        <div className="aspect-[3/4] relative">
                          <img
                            src={game.cover}
                            alt={game.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 flex gap-1">
                            {game.isFavorite && (
                              <div className="bg-red-500 rounded-full p-1">
                                <Heart className="w-3 h-3 text-white fill-white" />
                              </div>
                            )}
                            {game.isCompleted && (
                              <div className="bg-green-500 rounded-full p-1">
                                <CheckCircle className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {game.hasReview && (
                              <div className="bg-purple-500 rounded-full p-1">
                                <MessageSquare className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {game.notes && game.notes.trim() && (
                              <div className="bg-orange-500 rounded-full p-1">
                                <FileText className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-2 right-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditGame(game);
                              }}
                            >
                              <Edit className="w-3 h-3 text-white" />
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-sm mb-3 line-clamp-2">
                            {game.title}
                          </h3>
                          <div className="space-y-2">
                            {/* Your rating */}
                            <div className="bg-muted p-2 rounded-lg border border-border">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage
                                      src={
                                        user?.user_metadata?.avatar_url ||
                                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`
                                      }
                                      alt="You"
                                    />
                                    <AvatarFallback className="text-[8px]">
                                      {(user?.user_metadata?.full_name ||
                                        user?.email ||
                                        "Y")[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-primary font-medium">
                                    You
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {game.personalRating && (
                                    <span className="text-primary font-medium">
                                      {game.personalRating}/10
                                    </span>
                                  )}
                                  {getStatusBadge(game.status)}
                                </div>
                              </div>
                            </div>

                            {/* Friends with this game */}
                            {game.friendsWithGame &&
                              game.friendsWithGame.length > 0 && (
                                <>
                                  <p className="text-xs text-muted-foreground font-medium">
                                    Shared with {game.friendsWithGame.length}{" "}
                                    friend
                                    {game.friendsWithGame.length > 1 ? "s" : ""}
                                    :
                                  </p>
                                  {game.friendsWithGame.map((friend, index) => (
                                    <div
                                      key={friend.id}
                                      className="flex items-center justify-between text-xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5">
                                          <AvatarImage
                                            src={
                                              friend.avatar_url ||
                                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`
                                            }
                                            alt={friend.name}
                                          />
                                          <AvatarFallback className="text-[8px]">
                                            {friend.name[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-foreground">
                                          {friend.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {friend.hasReview && (
                                          <div className="bg-purple-100 rounded-full p-0.5">
                                            <MessageSquare className="w-2.5 h-2.5 text-purple-600" />
                                          </div>
                                        )}
                                        {friend.hasNotes && (
                                          <div className="bg-orange-100 rounded-full p-0.5">
                                            <FileText className="w-2.5 h-2.5 text-orange-600" />
                                          </div>
                                        )}
                                        {friend.rating && (
                                          <span className="text-muted-foreground">
                                            {friend.rating}/10
                                          </span>
                                        )}
                                        {getStatusBadge(friend.status)}
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="mb-6">
                      <div className="text-6xl mb-4">🎮</div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Your game library is looking a bit empty!
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        {activeTab === "all"
                          ? "Time to start building your epic game collection. What are you waiting for?"
                          : `No games in the &quot;${activeTab === "want-to-play" ? "Want to Play" : activeTab === "playing" ? "Playing" : "Played"}&quot; category yet.`}
                      </p>
                    </div>
                    <Button onClick={() => setIsAddGameOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add your first game
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLibrary;

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Search,
  Users,
  Star,
  Heart,
  CheckCircle,
  UserMinus,
  Gamepad2,
  Eye,
  Loader2,
  Filter,
  MessageSquare,
  FileText,
  UserCheck,
  Clock,
} from "lucide-react";
import SearchSortFilter from "@/components/ui/search-sort-filter";
import Sidebar from "@/components/dashboard/layout/Sidebar";
import TopNavigation from "@/components/dashboard/layout/TopNavigation";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { Tables } from "@/types/supabase";
import { useNavigate, useLocation } from "react-router-dom";

type User = Tables<"users">;
type GameCollection = Tables<"game_collections">;
type Friendship = Tables<"friendships">;

interface Friend {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  gameCount: number;
  averageRating: number;
  status: "accepted" | "pending" | "requested";
}

interface FriendGame {
  id: string;
  title: string;
  cover: string;
  rating?: number;
  status: "playing" | "played" | "want-to-play";
  personalRating?: number;
  notes?: string;
  dateAdded: string;
  isFavorite?: boolean;
  isCompleted?: boolean;
  hasReview?: boolean;
}

interface SharedGame {
  game_title: string;
  game_cover_url: string;
  igdb_game_id: number;
  userRating?: number;
  userStatus: string;
  userIsFavorite?: boolean;
  userIsCompleted?: boolean;
  friends: {
    name: string;
    rating?: number;
    status: string;
    avatar_url?: string;
    isFavorite?: boolean;
    isCompleted?: boolean;
  }[];
}

const Friends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("friends");
  const [searchTerm, setSearchTerm] = useState("");
  const [friendSearchTerm, setFriendSearchTerm] = useState("");
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("Friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendGames, setFriendGames] = useState<FriendGame[]>([]);
  const [isLoadingFriendGames, setIsLoadingFriendGames] = useState(false);
  const [sharedGames, setSharedGames] = useState<SharedGame[]>([]);
  const [isLoadingSharedGames, setIsLoadingSharedGames] = useState(false);
  const [isViewingFriend, setIsViewingFriend] = useState(false);
  const [sharedGamesSortBy, setSharedGamesSortBy] =
    useState<string>("alphabetical");
  const [sharedGamesSearchTerm, setSharedGamesSearchTerm] = useState("");
  const [friendGamesSearchTerm, setFriendGamesSearchTerm] = useState("");
  const [friendGamesSortBy, setFriendGamesSortBy] =
    useState<string>("dateAdded");
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null);

  // Search for users to add as friends
  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2 || !user) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const orClause = `full_name.ilike.%${query}%,email.ilike.%${query}%`;

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .neq("id", user.id)
          .or(orClause)
          .limit(10);

        if (error) {
          console.error("❌ Supabase error:", error);
          return;
        }

        setSearchResults(data || []);
      } catch (error) {
        console.error("❌ Exception during search:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [user],
  );

  // Fetch user's friends
  const fetchFriends = useCallback(async () => {
    if (!user) return;

    setIsLoadingFriends(true);
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
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) {
        console.error("Error fetching friends:", error);
        return;
      }

      const friendsData: Friend[] = [];

      for (const friendship of friendships || []) {
        const friendUser =
          friendship.requester_id === user.id
            ? friendship.addressee
            : friendship.requester;

        if (!friendUser) continue;

        // Get friend's game count and average rating
        const { data: gameStats } = await supabase
          .from("game_collections")
          .select("personal_rating")
          .eq("user_id", friendUser.id);

        const gameCount = gameStats?.length || 0;
        const ratings =
          gameStats
            ?.filter((g) => g.personal_rating)
            .map((g) => g.personal_rating!) || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;

        let status: "accepted" | "pending" | "requested" = "accepted";
        if (friendship.status === "pending") {
          status =
            friendship.requester_id === user.id ? "pending" : "requested";
        }

        friendsData.push({
          id: friendUser.id,
          full_name: friendUser.full_name || "Unknown User",
          email: friendUser.email || "",
          avatar_url: friendUser.avatar_url || undefined,
          gameCount,
          averageRating,
          status,
        });
      }

      setFriends(friendsData);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setIsLoadingFriends(false);
    }
  }, [user]);

  // Send friend request
  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: friendId,
        status: "pending",
      });

      if (error) {
        console.error("Error sending friend request:", error);
        return;
      }

      await fetchFriends();
      setFriendSearchTerm("");
      setSearchResults([]);
      setIsAddFriendOpen(false);
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("requester_id", friendId)
        .eq("addressee_id", user.id);

      if (error) {
        console.error("Error accepting friend request:", error);
        return;
      }

      await fetchFriends();
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  // Remove friend
  const removeFriend = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`,
        );

      if (error) {
        console.error("Error removing friend:", error);
        return;
      }

      await fetchFriends();
      if (selectedFriend?.id === friendId) {
        setSelectedFriend(null);
        setIsViewingFriend(false);
      }
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  // Fetch friend's games
  const fetchFriendGames = async (friendId: string) => {
    setIsLoadingFriendGames(true);
    try {
      const { data, error } = await supabase
        .from("game_collections")
        .select("*")
        .eq("user_id", friendId)
        .order("date_added", { ascending: false });

      if (error) {
        console.error("Error fetching friend games:", error);
        return;
      }

      // Fetch friend's reviews
      const gameIds = data.map((g) => g.id);
      const { data: friendReviews } = await supabase
        .from("game_reviews")
        .select("game_collection_id")
        .in("game_collection_id", gameIds);

      const friendReviewsSet = new Set(
        friendReviews?.map((r) => r.game_collection_id) || [],
      );

      const transformedGames: FriendGame[] = data.map((game) => ({
        id: game.id,
        title: game.game_title,
        cover:
          game.game_cover_url ||
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80",
        status: game.status as "playing" | "played" | "want-to-play",
        personalRating: game.personal_rating || undefined,
        notes: game.personal_notes || undefined,
        dateAdded: game.date_added,
        isFavorite: game.is_favorite || false,
        isCompleted: game.is_completed || false,
        hasReview: friendReviewsSet.has(game.id),
      }));

      setFriendGames(transformedGames);
    } catch (error) {
      console.error("Error fetching friend games:", error);
    } finally {
      setIsLoadingFriendGames(false);
    }
  };

  // Fetch shared games
  const fetchSharedGames = useCallback(async () => {
    if (!user) return;

    setIsLoadingSharedGames(true);
    try {
      // Get accepted friends
      const acceptedFriends = friends.filter((f) => f.status === "accepted");
      if (acceptedFriends.length === 0) {
        setSharedGames([]);
        setIsLoadingSharedGames(false);
        return;
      }

      // Get user's games with additional fields
      const { data: userGames } = await supabase
        .from("game_collections")
        .select(
          "igdb_game_id, game_title, game_cover_url, personal_rating, status, is_favorite, is_completed",
        )
        .eq("user_id", user.id);

      if (!userGames) {
        setSharedGames([]);
        setIsLoadingSharedGames(false);
        return;
      }

      const sharedGamesMap = new Map<number, SharedGame>();

      // For each friend, find shared games
      for (const friend of acceptedFriends) {
        const { data: friendGames } = await supabase
          .from("game_collections")
          .select(
            "igdb_game_id, personal_rating, status, is_favorite, is_completed",
          )
          .eq("user_id", friend.id);

        if (!friendGames) continue;

        // Find games that both user and friend have
        for (const userGame of userGames) {
          const friendGame = friendGames.find(
            (fg) => fg.igdb_game_id === userGame.igdb_game_id,
          );
          if (friendGame) {
            const gameId = userGame.igdb_game_id;

            if (!sharedGamesMap.has(gameId)) {
              sharedGamesMap.set(gameId, {
                game_title: userGame.game_title,
                game_cover_url:
                  userGame.game_cover_url ||
                  "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80",
                igdb_game_id: gameId,
                userRating: userGame.personal_rating || undefined,
                userStatus: userGame.status,
                userIsFavorite: userGame.is_favorite || false,
                userIsCompleted: userGame.is_completed || false,
                friends: [],
              });
            }

            const sharedGame = sharedGamesMap.get(gameId)!;
            sharedGame.friends.push({
              name: friend.full_name,
              rating: friendGame.personal_rating || undefined,
              status: friendGame.status,
              avatar_url: friend.avatar_url,
              isFavorite: friendGame.is_favorite || false,
              isCompleted: friendGame.is_completed || false,
            });
          }
        }
      }

      setSharedGames(Array.from(sharedGamesMap.values()));
    } catch (error) {
      console.error("Error fetching shared games:", error);
    } finally {
      setIsLoadingSharedGames(false);
    }
  }, [user, friends]);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load friends on component mount and handle navigation state
  useEffect(() => {
    fetchFriends();

    // Check if we should navigate to a specific tab (from notification click)
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, document.title);
    }
  }, [fetchFriends, location.state]);

  // Load shared games when friends change
  useEffect(() => {
    if (friends.length > 0) {
      fetchSharedGames();
    }
  }, [friends, fetchSharedGames]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(friendSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [friendSearchTerm, searchUsers]);

  const filteredFriends = friends.filter(
    (friend) =>
      friend.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      playing: {
        label: "Playing",
        className:
          "bg-green-100 text-green-800 hover:bg-green-200 transition-colors duration-200",
      },
      played: {
        label: "Played",
        className:
          "bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors duration-200",
      },
      "want-to-play": {
        label: "Want to Play",
        className:
          "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors duration-200",
      },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge
        className={`${config.className} hover:scale-105 transform transition-all duration-200`}
      >
        {config.label}
      </Badge>
    );
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

  const viewFriendGames = (friend: Friend) => {
    setSelectedFriend(friend);
    setIsViewingFriend(true);
    fetchFriendGames(friend.id);
  };

  if (isViewingFriend && selectedFriend) {
    return (
      <div className="bg-background">
        <TopNavigation
          onMobileMenuClick={() => setIsSidebarOpen(true)}
          showMobileMenu={isMobile}
        />
        <div className="flex pt-16">
          <Sidebar
            activeItem={activeItem}
            onItemClick={setActiveItem}
            isMobile={isMobile}
            isOpen={isSidebarOpen}
            onOpenChange={setIsSidebarOpen}
          />
          <div className="flex-1 w-full md:w-auto max-w-7xl mx-auto">
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-4 mb-8 animate-slide-up">
                <Button
                  variant="outline"
                  className="hover:scale-105 transition-all duration-200 hover:shadow-md hover:bg-primary/10 hover:border-primary/30"
                  onClick={() => {
                    setIsViewingFriend(false);
                    setSelectedFriend(null);
                    setFriendGamesSearchTerm("");
                    setFriendGamesSortBy("dateAdded");
                  }}
                >
                  ← Back to Friends
                </Button>
                <div className="flex items-center gap-3 animate-fade-in">
                  <Avatar className="h-12 w-12 ring-2 ring-border hover:ring-primary/40 transition-all duration-300">
                    <AvatarImage
                      src={
                        selectedFriend.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedFriend.email}`
                      }
                      alt={selectedFriend.full_name}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">
                      {selectedFriend.full_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                      {selectedFriend.full_name}'s Games
                    </h1>
                    <p className="text-muted-foreground">
                      {selectedFriend.gameCount} games • Average rating:{" "}
                      {selectedFriend.averageRating.toFixed(1)}/10
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6 animate-fade-in">
                <SearchSortFilter
                  searchValue={friendGamesSearchTerm}
                  onSearchChange={setFriendGamesSearchTerm}
                  searchPlaceholder="Search games..."
                  sortValue={friendGamesSortBy}
                  onSortChange={setFriendGamesSortBy}
                  sortOptions={[
                    { value: "dateAdded", label: "Date Added" },
                    { value: "alphabetical", label: "Alphabetical" },
                    { value: "rating", label: "Rating" },
                    {
                      value: "favoritesRating",
                      label: "Favorites then Rating",
                    },
                    { value: "completed", label: "Completed" },
                  ]}
                  showFilter={true}
                  onFilterClick={() => {}}
                  className="transition-all duration-200 hover:shadow-md"
                />
              </div>

              {isLoadingFriendGames ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2 text-muted-foreground">
                    Loading games...
                  </span>
                </div>
              ) : (
                (() => {
                  // Filter and sort friend games
                  const filteredFriendGames = friendGames.filter((game) =>
                    game.title
                      .toLowerCase()
                      .includes(friendGamesSearchTerm.toLowerCase()),
                  );

                  const sortedFriendGames = [...filteredFriendGames].sort(
                    (a, b) => {
                      switch (friendGamesSortBy) {
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
                            new Date(b.dateAdded).getTime() -
                            new Date(a.dateAdded).getTime()
                          ); // Most recent first
                      }
                    },
                  );

                  return sortedFriendGames.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {sortedFriendGames.map((game, index) => (
                        <Card
                          key={game.id}
                          className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 hover:-translate-y-2 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-2 hover:border-primary/30"
                          style={{
                            animationDelay: `${index * 0.1}s`,
                            animation: "slide-up 0.6s ease-out forwards",
                          }}
                          onClick={async () => {
                            // Check if current user has this game in their library
                            const { data: userGameCollection } = await supabase
                              .from("game_collections")
                              .select("id")
                              .eq("user_id", user?.id)
                              .eq("game_title", game.title)
                              .single();

                            if (userGameCollection) {
                              navigate(`/game/${userGameCollection.id}`);
                            } else {
                              // Navigate to the friend's game page
                              navigate(`/game/${game.id}`);
                            }
                          }}
                        >
                          <div className="aspect-[3/4] relative overflow-hidden">
                            <img
                              src={game.cover}
                              alt={game.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute top-2 left-2 flex gap-1">
                              {getStatusBadge(game.status)}
                              {game.isFavorite && (
                                <div className="bg-red-500/90 backdrop-blur-sm rounded-full p-1 animate-bounce-in shadow-lg">
                                  <Heart className="w-3 h-3 text-white fill-white" />
                                </div>
                              )}
                              {game.isCompleted && (
                                <div
                                  className="bg-green-500/90 backdrop-blur-sm rounded-full p-1 animate-bounce-in shadow-lg"
                                  style={{ animationDelay: "0.1s" }}
                                >
                                  <CheckCircle className="w-3 h-3 text-white" />
                                </div>
                              )}
                              {game.hasReview && (
                                <div
                                  className="bg-purple-500/90 backdrop-blur-sm rounded-full p-1 animate-bounce-in shadow-lg"
                                  style={{ animationDelay: "0.2s" }}
                                >
                                  <MessageSquare className="w-3 h-3 text-white" />
                                </div>
                              )}
                              {game.notes && game.notes.trim() && (
                                <div
                                  className="bg-orange-500/90 backdrop-blur-sm rounded-full p-1 animate-bounce-in shadow-lg"
                                  style={{ animationDelay: "0.3s" }}
                                >
                                  <FileText className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                          <CardContent className="p-3 transition-all duration-300 flex flex-col">
                            <h3 className="font-semibold text-sm mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300">
                              {game.title}
                            </h3>
                            <div className="space-y-2 flex-1">
                              {/* Friend's rating */}
                              <div className="bg-muted/50 backdrop-blur-sm p-2 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                                <div className="text-xs text-left">
                                  {game.personalRating ? (
                                    <span className="text-primary font-medium group-hover:text-purple-600 transition-colors duration-300">
                                      Rating: {game.personalRating}/10
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Rating: Not rated
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Added{" "}
                                {new Date(game.dateAdded).toLocaleDateString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 animate-fade-in">
                      <div className="mb-6">
                        <div className="text-6xl mb-4 animate-bounce-gentle">
                          🎮
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                          {friendGamesSearchTerm
                            ? "No games found"
                            : "No games yet"}
                        </h3>
                        <p
                          className="text-muted-foreground animate-fade-in"
                          style={{ animationDelay: "0.2s" }}
                        >
                          {friendGamesSearchTerm
                            ? `No games match "${friendGamesSearchTerm}"`
                            : `${selectedFriend.full_name} hasn't added any games to their library yet.`}
                        </p>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <TopNavigation
        onMobileMenuClick={() => setIsSidebarOpen(true)}
        showMobileMenu={isMobile}
      />
      <div className="flex pt-16">
        <Sidebar
          activeItem={activeItem}
          onItemClick={setActiveItem}
          isMobile={isMobile}
          isOpen={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
        />
        <div className="flex-1 w-full md:w-auto">
          <div className="max-w-6xl mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-8 animate-slide-up">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  👥 Friends
                </h1>
                <p className="text-muted-foreground animate-fade-in">
                  Connect with friends and discover new games together
                </p>
              </div>

              <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
                <DialogTrigger asChild>
                  <Button className="hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary">
                    <UserPlus className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-12" />
                    Add Friend
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Friend</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        placeholder="Search by name or email..."
                        value={friendSearchTerm}
                        onChange={(e) => setFriendSearchTerm(e.target.value)}
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin" />
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <ScrollArea className="max-h-60">
                        <div className="space-y-2">
                          {searchResults.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={
                                      user.avatar_url ||
                                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
                                    }
                                    alt={user.full_name || ""}
                                  />
                                  <AvatarFallback>
                                    {(user.full_name ||
                                      user.email ||
                                      "U")[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm text-foreground truncate">
                                    {user.full_name || "Unknown User"}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate min-w-0">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => sendFriendRequest(user.id)}
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-fade-in">
              {activeTab === "shared" ? (
                <SearchSortFilter
                  searchValue={sharedGamesSearchTerm}
                  onSearchChange={setSharedGamesSearchTerm}
                  searchPlaceholder="Search games..."
                  sortValue={sharedGamesSortBy}
                  onSortChange={setSharedGamesSortBy}
                  sortOptions={[
                    { value: "alphabetical", label: "Alphabetical" },
                    { value: "rating", label: "Rating" },
                    {
                      value: "favoritesRating",
                      label: "Favorites then Rating",
                    },
                    { value: "completed", label: "Completed" },
                  ]}
                  showFilter={true}
                  onFilterClick={() => {}}
                  className="transition-all duration-200 hover:shadow-md flex-1"
                />
              ) : (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors duration-200" />
                  <Input
                    placeholder="Search friends..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20 hover:shadow-md"
                  />
                </div>
              )}
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full animate-scale-in"
            >
              <TabsList className="grid w-full grid-cols-3 bg-muted/50 backdrop-blur-sm">
                <TabsTrigger
                  value="friends"
                  className="transition-all duration-200 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-600 px-2 md:px-3"
                >
                  <Users className="w-4 h-4 md:hidden" />
                  <span className="hidden md:inline">
                    My Friends (
                    {friends.filter((f) => f.status === "accepted").length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="requests"
                  className="transition-all duration-200 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 px-2 md:px-3"
                >
                  <UserCheck className="w-4 h-4 md:hidden" />
                  <span className="hidden md:inline">
                    Requests (
                    {friends.filter((f) => f.status === "requested").length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="shared"
                  className="transition-all duration-200 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 px-2 md:px-3"
                >
                  <Gamepad2 className="w-4 h-4 md:hidden" />
                  <span className="hidden md:inline">
                    Shared Games ({sharedGames.length})
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="mt-6">
                {isLoadingFriends ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-2 text-muted-foreground">
                      Loading friends...
                    </span>
                  </div>
                ) : filteredFriends.filter(
                    (f) => f.status === "accepted" || f.status === "pending",
                  ).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredFriends
                      .filter(
                        (f) =>
                          f.status === "accepted" || f.status === "pending",
                      )
                      .map((friend, index) => (
                        <Card
                          key={friend.id}
                          className="hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 hover:-translate-y-2 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-2 hover:border-primary/30"
                          style={{
                            animationDelay: `${index * 0.1}s`,
                            animation: "slide-up 0.6s ease-out forwards",
                          }}
                        >
                          <CardHeader className="pb-3 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="flex items-center gap-3 relative z-10">
                              <Avatar className="h-12 w-12 ring-2 ring-border group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-110">
                                <AvatarImage
                                  src={
                                    friend.avatar_url ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.email}`
                                  }
                                  alt={friend.full_name}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">
                                  {friend.full_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg text-foreground truncate group-hover:text-primary transition-colors duration-300">
                                  {friend.full_name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground truncate min-w-0">
                                  {friend.email}
                                </p>
                                {friend.status === "pending" && (
                                  <Badge
                                    variant="outline"
                                    className="mt-1 animate-bounce-in bg-yellow-100 text-yellow-800 border-yellow-300"
                                  >
                                    Request Sent
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="relative p-3">
                            <div className="space-y-3">
                              <div className="bg-muted/30 backdrop-blur-sm p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="text-muted-foreground">
                                    Games:
                                  </span>
                                  <span className="font-medium text-foreground group-hover:text-primary transition-colors duration-300">
                                    {friend.gameCount}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    Avg Rating:
                                  </span>
                                  <span className="font-medium text-foreground group-hover:text-primary transition-colors duration-300">
                                    {friend.averageRating > 0
                                      ? `${friend.averageRating.toFixed(1)}/10`
                                      : "N/A"}
                                  </span>
                                </div>
                              </div>
                              {friend.status === "accepted" && (
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 hover:scale-105 transition-all duration-200 hover:shadow-md hover:bg-primary/10 hover:border-primary/30"
                                    onClick={() => viewFriendGames(friend)}
                                  >
                                    <Eye className="w-4 h-4 mr-1 transition-transform duration-200 group-hover:scale-110" />
                                    View Games
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="hover:scale-105 transition-all duration-200 hover:shadow-md hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                                      >
                                        <UserMinus className="w-4 h-4 transition-transform duration-200 hover:scale-110" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Remove Friend
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to remove{" "}
                                          {friend.full_name} from your friends
                                          list? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            removeFriend(friend.id)
                                          }
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Remove Friend
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-16 animate-fade-in">
                    <div className="mb-6">
                      <div className="text-6xl mb-4 animate-bounce-gentle">
                        👥
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Your friend list is looking a bit lonely!
                      </h3>
                      <p
                        className="text-muted-foreground mb-6 animate-fade-in"
                        style={{ animationDelay: "0.2s" }}
                      >
                        Start building your gaming network by adding friends!
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsAddFriendOpen(true)}
                      className="animate-bounce-in hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary"
                      style={{ animationDelay: "0.4s" }}
                    >
                      <UserPlus className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-12" />
                      Add your first friend
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="requests" className="mt-6">
                {friends.filter((f) => f.status === "requested").length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {friends
                      .filter((f) => f.status === "requested")
                      .map((friend, index) => (
                        <Card
                          key={friend.id}
                          className="hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 hover:-translate-y-2 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-2 hover:border-blue-500/30"
                          style={{
                            animationDelay: `${index * 0.1}s`,
                            animation: "slide-up 0.6s ease-out forwards",
                          }}
                        >
                          <CardHeader className="pb-3 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="flex items-center gap-3 relative z-10">
                              <Avatar className="h-12 w-12 ring-2 ring-border group-hover:ring-blue-500/40 transition-all duration-300 group-hover:scale-110">
                                <AvatarImage
                                  src={
                                    friend.avatar_url ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.email}`
                                  }
                                  alt={friend.full_name}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                                  {friend.full_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg text-foreground truncate group-hover:text-blue-600 transition-colors duration-300">
                                  {friend.full_name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground truncate min-w-0">
                                  {friend.email}
                                </p>
                                <Badge className="mt-1 bg-blue-100 text-blue-800 animate-bounce-in border-blue-300">
                                  Friend Request
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="relative p-3">
                            <div className="space-y-3">
                              <div className="bg-muted/30 backdrop-blur-sm p-3 rounded-lg border border-border/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-md">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    Games:
                                  </span>
                                  <span className="font-medium text-foreground group-hover:text-blue-600 transition-colors duration-300">
                                    {friend.gameCount}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  className="flex-1 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500"
                                  onClick={() => acceptFriendRequest(friend.id)}
                                >
                                  Accept
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="hover:scale-105 transition-all duration-200 hover:shadow-md hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                                    >
                                      Decline
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Decline Friend Request
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to decline the
                                        friend request from {friend.full_name}?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => removeFriend(friend.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Decline Request
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-16 animate-fade-in">
                    <div className="mb-6">
                      <div className="text-6xl mb-4 animate-bounce-gentle">
                        📬
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2 bg-gradient-to-r from-blue-500 to-cyan-600 bg-clip-text text-transparent">
                        No friend requests
                      </h3>
                      <p
                        className="text-muted-foreground animate-fade-in"
                        style={{ animationDelay: "0.2s" }}
                      >
                        You don't have any pending friend requests.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="shared" className="mt-6">
                {isLoadingSharedGames ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-2 text-muted-foreground">
                      Loading shared games...
                    </span>
                  </div>
                ) : (
                  (() => {
                    // Filter and sort shared games
                    const filteredSharedGames = sharedGames.filter((game) =>
                      game.game_title
                        .toLowerCase()
                        .includes(sharedGamesSearchTerm.toLowerCase()),
                    );

                    const sortedSharedGames = [...filteredSharedGames].sort(
                      (a, b) => {
                        switch (sharedGamesSortBy) {
                          case "alphabetical":
                            return a.game_title.localeCompare(b.game_title);
                          case "rating":
                            const ratingA = a.userRating || 0;
                            const ratingB = b.userRating || 0;
                            return ratingB - ratingA; // Highest rating first
                          case "favoritesRating":
                            // First sort by favorites (favorites first), then by rating
                            if (a.userIsFavorite && !b.userIsFavorite)
                              return -1;
                            if (!a.userIsFavorite && b.userIsFavorite) return 1;
                            if (a.userIsFavorite && b.userIsFavorite) {
                              const ratingA = a.userRating || 0;
                              const ratingB = b.userRating || 0;
                              return ratingB - ratingA;
                            }
                            return 0;
                          case "completed":
                            // Completed games first
                            if (a.userIsCompleted && !b.userIsCompleted)
                              return -1;
                            if (!a.userIsCompleted && b.userIsCompleted)
                              return 1;
                            return 0;
                          default:
                            return a.game_title.localeCompare(b.game_title);
                        }
                      },
                    );

                    return sortedSharedGames.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
                        {sortedSharedGames.map((game, index) => (
                          <Card
                            key={game.igdb_game_id}
                            className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 hover:-translate-y-2 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-2 hover:border-green-500/30"
                            style={{
                              animationDelay: `${index * 0.1}s`,
                              animation: "slide-up 0.6s ease-out forwards",
                            }}
                            onClick={async () => {
                              // Check if user has this game in their library
                              const { data: userGameCollection } =
                                await supabase
                                  .from("game_collections")
                                  .select("id")
                                  .eq("user_id", user?.id)
                                  .eq("igdb_game_id", game.igdb_game_id)
                                  .single();

                              if (userGameCollection) {
                                navigate(`/game/${userGameCollection.id}`);
                              } else {
                                // User doesn't have this game, find a friend's game collection ID
                                const acceptedFriends = friends.filter(
                                  (f) => f.status === "accepted",
                                );

                                for (const friend of acceptedFriends) {
                                  const { data: friendGameCollection } =
                                    await supabase
                                      .from("game_collections")
                                      .select("id")
                                      .eq("user_id", friend.id)
                                      .eq("igdb_game_id", game.igdb_game_id)
                                      .single();

                                  if (friendGameCollection) {
                                    navigate(
                                      `/game/${friendGameCollection.id}`,
                                    );
                                    break;
                                  }
                                }
                              }
                            }}
                          >
                            <div className="aspect-[3/4] relative overflow-hidden">
                              <img
                                src={game.game_cover_url}
                                alt={game.game_title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="absolute top-2 left-2 flex gap-1">
                                {getStatusBadge(game.userStatus)}
                                {game.userIsFavorite && (
                                  <div className="bg-red-500/90 backdrop-blur-sm rounded-full p-1 animate-bounce-in shadow-lg">
                                    <Heart className="w-3 h-3 text-white fill-white" />
                                  </div>
                                )}
                                {game.userIsCompleted && (
                                  <div
                                    className="bg-green-500/90 backdrop-blur-sm rounded-full p-1 animate-bounce-in shadow-lg"
                                    style={{ animationDelay: "0.1s" }}
                                  >
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <CardContent className="p-3 transition-all duration-300 flex flex-col">
                              <h3 className="font-semibold text-sm mb-3 line-clamp-2 group-hover:text-green-600 transition-colors duration-300">
                                {game.game_title}
                              </h3>
                              <div className="space-y-2 flex-1">
                                {/* Your rating */}
                                <div className="bg-muted/50 backdrop-blur-sm p-2 rounded-lg border border-border/50 hover:border-green-500/30 transition-all duration-300 hover:shadow-md">
                                  <div className="text-xs text-left">
                                    {game.userRating ? (
                                      <span className="text-primary font-medium group-hover:text-green-600 transition-colors duration-300">
                                        Your Rating: {game.userRating}/10
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        Your Rating: Not rated
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-muted-foreground font-medium mb-2">
                                  Shared with {game.friends.length} friend
                                  {game.friends.length > 1 ? "s" : ""}:
                                </p>
                                <div className="space-y-1">
                                  {game.friends.map((friend, friendIndex) => (
                                    <div
                                      key={friendIndex}
                                      className="flex items-center gap-2 text-xs hover:bg-accent/30 p-1 rounded transition-all duration-200"
                                      style={{
                                        animationDelay: `${friendIndex * 0.1}s`,
                                        animation:
                                          "fade-in 0.4s ease-out forwards",
                                      }}
                                    >
                                      <Avatar className="h-5 w-5 ring-1 ring-border hover:ring-2 hover:ring-green-500/40 transition-all duration-300">
                                        <AvatarImage
                                          src={
                                            friend.avatar_url ||
                                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`
                                          }
                                          alt={friend.name}
                                        />
                                        <AvatarFallback className="text-[8px] bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                                          {friend.name[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-foreground hover:text-green-600 transition-colors duration-300 truncate flex-1">
                                        {friend.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 animate-fade-in">
                        <div className="mb-6">
                          <div className="text-6xl mb-4 animate-bounce-gentle">
                            🎮
                          </div>
                          <h3 className="text-xl font-semibold text-foreground mb-2 bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                            No shared games yet!
                          </h3>
                          <p
                            className="text-muted-foreground animate-fade-in"
                            style={{ animationDelay: "0.2s" }}
                          >
                            You don't have any games in common with your friends
                            yet.
                          </p>
                        </div>
                      </div>
                    );
                  })()
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Friends;

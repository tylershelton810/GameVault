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

  const viewFriendGames = (friend: Friend) => {
    setSelectedFriend(friend);
    setIsViewingFriend(true);
    fetchFriendGames(friend.id);
  };

  if (isViewingFriend && selectedFriend) {
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
              <div className="flex items-center gap-4 mb-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewingFriend(false);
                    setSelectedFriend(null);
                    setFriendGamesSearchTerm("");
                    setFriendGamesSortBy("dateAdded");
                  }}
                >
                  ← Back to Friends
                </Button>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={
                        selectedFriend.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedFriend.email}`
                      }
                      alt={selectedFriend.full_name}
                    />
                    <AvatarFallback>
                      {selectedFriend.full_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {selectedFriend.full_name}'s Games
                    </h1>
                    <p className="text-gray-600">
                      {selectedFriend.gameCount} games • Average rating:{" "}
                      {selectedFriend.averageRating.toFixed(1)}/10
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                      {sortedFriendGames.map((game) => (
                        <Card
                          key={game.id}
                          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
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
                              {game.personalRating && (
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
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-sm mb-3 line-clamp-2">
                              {game.title}
                            </h3>
                            <div className="space-y-2">
                              {/* Friend's rating */}
                              <div className="bg-muted p-2 rounded-lg border border-border">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage
                                        src={
                                          selectedFriend.avatar_url ||
                                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedFriend.email}`
                                        }
                                        alt={selectedFriend.full_name}
                                      />
                                      <AvatarFallback>
                                        {selectedFriend.full_name[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-primary font-medium">
                                      {selectedFriend.full_name}
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
                    <div className="text-center py-16">
                      <Gamepad2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {friendGamesSearchTerm
                          ? "No games found"
                          : "No games yet"}
                      </h3>
                      <p className="text-muted-foreground">
                        {friendGamesSearchTerm
                          ? `No games match "${friendGamesSearchTerm}"`
                          : `${selectedFriend.full_name} hasn't added any games to their library yet.`}
                      </p>
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
                  Friends
                </h1>
                <p className="text-muted-foreground">
                  Connect with friends and discover new games together
                </p>
              </div>

              <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
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

            {activeTab === "shared" && (
              <div className="mb-6">
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
                />
              </div>
            )}

            {activeTab !== "shared" && (
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search friends..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="friends">
                  My Friends (
                  {friends.filter((f) => f.status === "accepted").length})
                </TabsTrigger>
                <TabsTrigger value="requests">
                  Requests (
                  {friends.filter((f) => f.status === "requested").length})
                </TabsTrigger>
                <TabsTrigger value="shared">
                  Shared Games ({sharedGames.length})
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredFriends
                      .filter(
                        (f) =>
                          f.status === "accepted" || f.status === "pending",
                      )
                      .map((friend) => (
                        <Card
                          key={friend.id}
                          className="hover:shadow-lg transition-shadow"
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={
                                    friend.avatar_url ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.email}`
                                  }
                                  alt={friend.full_name}
                                />
                                <AvatarFallback>
                                  {friend.full_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg text-foreground truncate">
                                  {friend.full_name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground truncate min-w-0">
                                  {friend.email}
                                </p>
                                {friend.status === "pending" && (
                                  <Badge variant="outline" className="mt-1">
                                    Request Sent
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Games:
                                </span>
                                <span className="font-medium text-foreground">
                                  {friend.gameCount}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Avg Rating:
                                </span>
                                <span className="font-medium text-foreground">
                                  {friend.averageRating > 0
                                    ? `${friend.averageRating.toFixed(1)}/10`
                                    : "N/A"}
                                </span>
                              </div>
                              {friend.status === "accepted" && (
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => viewFriendGames(friend)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View Games
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeFriend(friend.id)}
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No friends yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Start building your gaming network by adding friends!
                    </p>
                    <Button onClick={() => setIsAddFriendOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add your first friend
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="requests" className="mt-6">
                {friends.filter((f) => f.status === "requested").length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {friends
                      .filter((f) => f.status === "requested")
                      .map((friend) => (
                        <Card
                          key={friend.id}
                          className="hover:shadow-lg transition-shadow"
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={
                                    friend.avatar_url ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.email}`
                                  }
                                  alt={friend.full_name}
                                />
                                <AvatarFallback>
                                  {friend.full_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg text-foreground truncate">
                                  {friend.full_name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground truncate min-w-0">
                                  {friend.email}
                                </p>
                                <Badge className="mt-1 bg-blue-100 text-blue-800">
                                  Friend Request
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Games:
                                </span>
                                <span className="font-medium text-foreground">
                                  {friend.gameCount}
                                </span>
                              </div>
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => acceptFriendRequest(friend.id)}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeFriend(friend.id)}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No friend requests
                    </h3>
                    <p className="text-muted-foreground">
                      You don't have any pending friend requests.
                    </p>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                        {sortedSharedGames.map((game) => (
                          <Card
                            key={game.igdb_game_id}
                            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
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
                            <div className="aspect-[3/4] relative">
                              <img
                                src={game.game_cover_url}
                                alt={game.game_title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 left-2 flex gap-1">
                                {game.userIsFavorite && (
                                  <div className="bg-red-500 rounded-full p-1">
                                    <Heart className="w-3 h-3 text-white fill-white" />
                                  </div>
                                )}
                                {game.userIsCompleted && (
                                  <div className="bg-green-500 rounded-full p-1">
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-sm mb-3 line-clamp-2">
                                {game.game_title}
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
                                      {game.userRating && (
                                        <span className="text-primary font-medium">
                                          {game.userRating}/10
                                        </span>
                                      )}
                                      {getStatusBadge(game.userStatus)}
                                    </div>
                                  </div>
                                </div>

                                <p className="text-xs text-muted-foreground font-medium">
                                  Shared with {game.friends.length} friend
                                  {game.friends.length > 1 ? "s" : ""}:
                                </p>
                                {game.friends.map((friend, index) => (
                                  <div
                                    key={index}
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
                                      <div className="flex gap-1">
                                        {friend.isFavorite && (
                                          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                                        )}
                                        {friend.isCompleted && (
                                          <CheckCircle className="w-3 h-3 text-green-500" />
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {friend.rating && (
                                        <span className="text-muted-foreground">
                                          {friend.rating}/10
                                        </span>
                                      )}
                                      {getStatusBadge(friend.status)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <Gamepad2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          No shared games
                        </h3>
                        <p className="text-muted-foreground">
                          You don't have any games in common with your friends
                          yet.
                        </p>
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

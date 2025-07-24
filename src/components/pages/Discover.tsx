import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Star,
  Heart,
  CheckCircle,
  Loader2,
  Compass,
  TrendingUp,
} from "lucide-react";
import Sidebar from "@/components/dashboard/layout/Sidebar";
import TopNavigation from "@/components/dashboard/layout/TopNavigation";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { useNavigate } from "react-router-dom";

interface TrendingGame {
  game_title: string;
  game_cover_url: string;
  igdb_game_id: number;
  userRating?: number;
  userStatus: string;
  userIsFavorite?: boolean;
  userIsCompleted?: boolean;
  friends: {
    id: string;
    name: string;
    rating?: number;
    status: string;
    avatar_url?: string;
    isFavorite?: boolean;
    isCompleted?: boolean;
    activity_date: string;
  }[];
}

interface RecommendationGame {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  rating?: number;
  summary?: string;
  genres?: {
    name: string;
  }[];
}

interface GameRecommendation {
  basedOn: {
    id: string;
    title: string;
    cover: string;
    personalRating?: number;
    isFavorite: boolean;
  };
  similarGames: RecommendationGame[];
}

const Discover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("Discover");
  const [trendingGames, setTrendingGames] = useState<TrendingGame[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [friends, setFriends] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<GameRecommendation[]>(
    [],
  );
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
  }, [user?.id]);

  // Fetch trending games from friends
  const fetchTrendingGames = useCallback(async () => {
    if (!user || friends.length === 0) {
      setTrendingGames([]);
      setIsLoadingTrending(false);
      return;
    }

    setIsLoadingTrending(true);
    try {
      // Get date 2 weeks ago
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoISO = twoWeeksAgo.toISOString();

      // Get user's games to check for shared games
      const { data: userGames } = await supabase
        .from("game_collections")
        .select(
          "igdb_game_id, game_title, game_cover_url, personal_rating, status, is_favorite, is_completed",
        )
        .eq("user_id", user.id);

      const trendingGamesMap = new Map<number, TrendingGame>();

      // For each friend, get their games that were added or updated recently
      for (const friend of friends) {
        // Get friend's games that were added or updated in the last 2 weeks
        const { data: friendGames } = await supabase
          .from("game_collections")
          .select("*")
          .eq("user_id", friend.id)
          .or(
            `date_added.gte.${twoWeeksAgoISO},updated_at.gte.${twoWeeksAgoISO}`,
          )
          .order("updated_at", { ascending: false });

        if (!friendGames) continue;

        // Filter for games that were started playing or rated 8+
        for (const gameCollection of friendGames) {
          const shouldInclude =
            gameCollection.status === "playing" ||
            (gameCollection.personal_rating &&
              gameCollection.personal_rating >= 8);

          if (!shouldInclude) continue;

          const gameId = gameCollection.igdb_game_id;
          const userGame = userGames?.find((ug) => ug.igdb_game_id === gameId);

          if (!trendingGamesMap.has(gameId)) {
            trendingGamesMap.set(gameId, {
              game_title: gameCollection.game_title,
              game_cover_url:
                gameCollection.game_cover_url ||
                "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80",
              igdb_game_id: gameId,
              userRating: userGame?.personal_rating || undefined,
              userStatus: userGame?.status || "not-in-library",
              userIsFavorite: userGame?.is_favorite || false,
              userIsCompleted: userGame?.is_completed || false,
              friends: [],
            });
          }

          const trendingGame = trendingGamesMap.get(gameId)!;

          // Check if this friend is already in the list for this game
          const existingFriend = trendingGame.friends.find(
            (f) => f.id === friend.id,
          );
          if (!existingFriend) {
            trendingGame.friends.push({
              id: friend.id,
              name: friend.full_name,
              rating: gameCollection.personal_rating || undefined,
              status: gameCollection.status,
              avatar_url: friend.avatar_url,
              isFavorite: gameCollection.is_favorite || false,
              isCompleted: gameCollection.is_completed || false,
              activity_date:
                gameCollection.updated_at || gameCollection.date_added,
            });
          }
        }
      }

      // Sort by number of friends and recency
      const sortedTrendingGames = Array.from(trendingGamesMap.values())
        .sort((a, b) => {
          // First by number of friends with this game
          if (a.friends.length !== b.friends.length) {
            return b.friends.length - a.friends.length;
          }
          // Then by most recent activity
          const aLatest = Math.max(
            ...a.friends.map((f) => new Date(f.activity_date).getTime()),
          );
          const bLatest = Math.max(
            ...b.friends.map((f) => new Date(f.activity_date).getTime()),
          );
          return bLatest - aLatest;
        })
        .slice(0, 10); // Limit to top 10

      setTrendingGames(sortedTrendingGames);
    } catch (error) {
      console.error("Error fetching trending games:", error);
    } finally {
      setIsLoadingTrending(false);
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

  // Load friends on component mount
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Fetch personalized recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!user?.id) {
      setRecommendations([]);
      setIsLoadingRecommendations(false);
      setIsInitialLoad(false);
      return;
    }

    setIsLoadingRecommendations(true);
    try {
      // Get user's favorite and highly-rated games (9+ rating)
      const { data: allUserGames } = await supabase
        .from("game_collections")
        .select(
          "id, igdb_game_id, game_title, game_cover_url, personal_rating, is_favorite",
        )
        .eq("user_id", user?.id)
        .or("is_favorite.eq.true,personal_rating.gte.9");

      console.log("allUserGames", allUserGames);
      if (!allUserGames || allUserGames.length === 0) {
        // Add delay before showing empty state
        await new Promise((resolve) => setTimeout(resolve, 500));
        setRecommendations([]);
        setIsLoadingRecommendations(false);
        setIsInitialLoad(false);
        return;
      }

      // Use Math.random() for true randomization on each refresh
      const shuffledGames = [...allUserGames].sort(() => Math.random() - 0.5);
      const selectedGames = shuffledGames.slice(0, 3); // Select only 3 games to make API calls for

      if (!selectedGames || selectedGames.length === 0) {
        // Add delay before showing empty state
        await new Promise((resolve) => setTimeout(resolve, 500));
        setRecommendations([]);
        setIsLoadingRecommendations(false);
        setIsInitialLoad(false);
        return;
      }

      const recommendationsData: GameRecommendation[] = [];

      // For each selected game, find similar games
      for (const game of selectedGames) {
        try {
          const response = await supabase.functions.invoke(
            "supabase-functions-getGameDetails",
            {
              body: {
                igdbGameId: game.igdb_game_id,
                useSimilarGamesAPI: true,
                useGenreMatching: false,
              },
            },
          );

          if (
            response.data &&
            response.data.similarGames &&
            response.data.similarGames.length > 0
          ) {
            // Filter out games the user already has
            const { data: existingGames } = await supabase
              .from("game_collections")
              .select("igdb_game_id")
              .eq("user_id", user?.id)
              .in(
                "igdb_game_id",
                response.data.similarGames.map((g: any) => g.id),
              );

            const existingGameIds = new Set(
              existingGames?.map((g) => g.igdb_game_id) || [],
            );
            const filteredSimilarGames = response.data.similarGames.filter(
              (similarGame: any) => !existingGameIds.has(similarGame.id),
            );

            if (filteredSimilarGames.length > 0) {
              recommendationsData.push({
                basedOn: {
                  id: game.id,
                  title: game.game_title,
                  cover:
                    game.game_cover_url ||
                    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80",
                  personalRating: game.personal_rating,
                  isFavorite: game.is_favorite || false,
                },
                similarGames: filteredSimilarGames.slice(0, 8), // Limit to 8 recommendations per game
              });
            }
          }
        } catch (error) {
          console.error(
            `Error fetching recommendations for game ${game.game_title}:`,
            error,
          );
        }
      }

      // Add delay to ensure loading indicator shows long enough for final list to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      setRecommendations(recommendationsData);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setIsLoadingRecommendations(false);
      setIsInitialLoad(false);
    }
  }, [user?.id]);

  // Load trending games when friends change
  useEffect(() => {
    if (friends.length > 0) {
      fetchTrendingGames();
    } else {
      setIsLoadingTrending(false);
    }
  }, [friends, fetchTrendingGames]);

  // Load recommendations when user changes
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      playing: { label: "Playing", className: "bg-green-100 text-green-800" },
      played: { label: "Played", className: "bg-blue-100 text-blue-800" },
      "want-to-play": {
        label: "Want to Play",
        className: "bg-yellow-100 text-yellow-800",
      },
      "not-in-library": {
        label: "Not Added",
        className: "bg-gray-100 text-gray-800",
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
          <div className="p-4 md:p-6 lg:p-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Compass className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">Discover</h1>
              </div>
              <p className="text-muted-foreground">
                Find your next favorite game based on your preferences and
                friends' activity
              </p>
            </div>

            {/* Because you loved... Section */}
            <div className="mb-12">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-foreground">
                  Because you loved...
                </h2>
              </div>
              {isLoadingRecommendations || isInitialLoad ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2 text-muted-foreground">
                    Finding games you'll love...
                  </span>
                </div>
              ) : !isLoadingRecommendations &&
                !isInitialLoad &&
                recommendations.length > 0 ? (
                <div className="space-y-6">
                  {recommendations.map((recommendation) => (
                    <div key={recommendation.basedOn.id} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={recommendation.basedOn.cover}
                          alt={recommendation.basedOn.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                        <div>
                          <h3 className="text-lg font-medium text-foreground">
                            {recommendation.basedOn.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {recommendation.basedOn.isFavorite && (
                              <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                <span>Favorite</span>
                              </div>
                            )}
                            {recommendation.basedOn.personalRating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span>
                                  {recommendation.basedOn.personalRating}/10
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                        {recommendation.similarGames.map((game) => (
                          <Card
                            key={game.id}
                            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={async () => {
                              console.log(
                                "Recommendation onClick - game:",
                                game,
                              );
                              console.log(
                                "Recommendation onClick - user:",
                                user,
                              );

                              // Check if user has this game in their library
                              const {
                                data: userGameCollection,
                                error: userError,
                              } = await supabase
                                .from("game_collections")
                                .select("id")
                                .eq("user_id", user?.id)
                                .eq("igdb_game_id", game.id)
                                .single();

                              if (userGameCollection) {
                                console.log(
                                  "Navigating to user game:",
                                  userGameCollection.id,
                                );
                                navigate(`/game/${userGameCollection.id}`);
                              } else {
                                console.log(
                                  "Navigating with IGDB ID:",
                                  game.id,
                                );
                                navigate(`/game/igdb-${game.id}`);
                              }
                            }}
                          >
                            <div className="aspect-[3/4] relative">
                              <img
                                src={
                                  game.cover?.url
                                    ? `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
                                    : "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80"
                                }
                                alt={game.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <CardContent className="p-3">
                              <h4 className="font-semibold text-xs mb-2 line-clamp-2 text-foreground">
                                {game.name}
                              </h4>
                              {game.genres && game.genres.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {game.genres.slice(0, 2).map((genre) => (
                                    <Badge
                                      key={genre.name}
                                      className="text-[8px] px-1 py-0 bg-muted text-muted-foreground"
                                    >
                                      {genre.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {game.summary && (
                                <p className="text-[10px] text-muted-foreground line-clamp-3">
                                  {game.summary.length > 80
                                    ? `${game.summary.substring(0, 80)}...`
                                    : game.summary}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-lg border p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <Compass className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No recommendations yet!
                  </h3>
                  <p className="text-muted-foreground">
                    Rate some games highly (9+) or mark them as favorites to get
                    personalized recommendations based on your preferences.
                  </p>
                </div>
              )}
            </div>

            {/* Trending with Friends Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-accent" />
                <h2 className="text-2xl font-semibold text-foreground">
                  Trending with Friends
                </h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Games your friends have recently started playing or rated highly
                (8+) in the past 2 weeks
              </p>

              {isLoadingTrending ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2 text-muted-foreground">
                    Loading trending games...
                  </span>
                </div>
              ) : trendingGames.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                  {trendingGames.map((game) => (
                    <Card
                      key={game.igdb_game_id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={async () => {
                        console.log("Discover onClick - game:", game);
                        console.log("Discover onClick - user:", user);

                        // Check if user has this game in their library
                        if (game.userStatus !== "not-in-library") {
                          // Find the user's game collection ID for this IGDB game
                          const { data: userGameCollection, error: userError } =
                            await supabase
                              .from("game_collections")
                              .select("id")
                              .eq("user_id", user?.id)
                              .eq("igdb_game_id", game.igdb_game_id)
                              .single();

                          console.log(
                            "User game collection:",
                            userGameCollection,
                            "Error:",
                            userError,
                          );

                          if (userGameCollection) {
                            console.log(
                              "Navigating to user game:",
                              userGameCollection.id,
                            );
                            navigate(`/game/${userGameCollection.id}`);
                            return;
                          }
                        }

                        // User doesn't have this game, find any friend's game collection ID for this specific game
                        let foundGameCollection = null;

                        for (const friend of game.friends) {
                          const {
                            data: friendGameCollection,
                            error: friendError,
                          } = await supabase
                            .from("game_collections")
                            .select("id")
                            .eq("user_id", friend.id)
                            .eq("igdb_game_id", game.igdb_game_id)
                            .single();

                          console.log(
                            `Friend ${friend.name} game collection:`,
                            friendGameCollection,
                            "Error:",
                            friendError,
                          );

                          if (friendGameCollection) {
                            foundGameCollection = friendGameCollection;
                            break;
                          }
                        }

                        if (foundGameCollection) {
                          console.log(
                            "Navigating to friend game:",
                            foundGameCollection.id,
                          );
                          navigate(`/game/${foundGameCollection.id}`);
                        } else {
                          console.log(
                            "No game collection found, navigating with IGDB ID:",
                            game.igdb_game_id,
                          );
                          navigate(`/game/${game.igdb_game_id}`);
                        }
                      }}
                    >
                      <div className="aspect-[3/4] relative">
                        <img
                          src={game.game_cover_url}
                          alt={game.game_title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 flex gap-1">
                          {game.userIsFavorite && (
                            <div className="bg-red-500 rounded-full p-0.5">
                              <Heart className="w-2.5 h-2.5 text-white fill-white" />
                            </div>
                          )}
                          {game.userIsCompleted && (
                            <div className="bg-green-500 rounded-full p-0.5">
                              <CheckCircle className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-semibold text-xs mb-2 line-clamp-2 text-foreground">
                          {game.game_title}
                        </h3>
                        <div className="space-y-1.5">
                          {/* Your status */}
                          {game.userStatus !== "not-in-library" && (
                            <div className="bg-blue-50 p-1.5 rounded border border-blue-200">
                              <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-3 w-3">
                                    <AvatarImage
                                      src={
                                        user?.user_metadata?.avatar_url ||
                                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`
                                      }
                                      alt="You"
                                    />
                                    <AvatarFallback className="text-[6px]">
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
                                  <Badge className="text-[8px] px-1 py-0 bg-primary/10 text-primary">
                                    {game.userStatus === "playing"
                                      ? "Playing"
                                      : game.userStatus === "played"
                                        ? "Played"
                                        : "Want to Play"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}

                          <p className="text-[10px] text-muted-foreground font-medium">
                            {game.friends.length} friend
                            {game.friends.length > 1 ? "s" : ""} active:
                          </p>
                          <div className="space-y-1 max-h-16 overflow-y-auto">
                            {game.friends.slice(0, 3).map((friend) => (
                              <div
                                key={friend.id}
                                className="flex items-center justify-between text-[10px]"
                              >
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-3 w-3">
                                    <AvatarImage
                                      src={
                                        friend.avatar_url ||
                                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`
                                      }
                                      alt={friend.name}
                                    />
                                    <AvatarFallback className="text-[6px]">
                                      {friend.name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-foreground truncate max-w-16">
                                    {friend.name}
                                  </span>
                                  <div className="flex gap-0.5">
                                    {friend.isFavorite && (
                                      <Heart className="w-2 h-2 text-red-500 fill-red-500" />
                                    )}
                                    {friend.isCompleted && (
                                      <CheckCircle className="w-2 h-2 text-green-500" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {friend.rating && (
                                    <span className="text-muted-foreground">
                                      {friend.rating}/10
                                    </span>
                                  )}
                                  <Badge className="text-[8px] px-1 py-0 bg-muted text-muted-foreground">
                                    {friend.status === "playing"
                                      ? "Playing"
                                      : friend.status === "played"
                                        ? "Played"
                                        : "Want"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {game.friends.length > 3 && (
                              <p className="text-[9px] text-muted-foreground text-center">
                                +{game.friends.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-lg border p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <TrendingUp className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No trending games yet
                  </h3>
                  <p className="text-muted-foreground">
                    {friends.length === 0
                      ? "Add some friends to see what games they're playing and rating highly!"
                      : "Your friends haven't been very active lately. Check back soon to see what they're playing!"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Discover;

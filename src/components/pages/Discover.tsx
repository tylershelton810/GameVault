import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

const Discover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("Discover");
  const [trendingGames, setTrendingGames] = useState<TrendingGame[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [friends, setFriends] = useState<any[]>([]);

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

  // Load friends on component mount
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Load trending games when friends change
  useEffect(() => {
    if (friends.length > 0) {
      fetchTrendingGames();
    } else {
      setIsLoadingTrending(false);
    }
  }, [friends, fetchTrendingGames]);

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
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="flex h-[calc(100vh-64px)] mt-16">
        <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Compass className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Discover</h1>
              </div>
              <p className="text-gray-600">
                Find your next favorite game based on your preferences and
                friends' activity
              </p>
            </div>

            {/* Because you loved... Section */}
            <div className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Because you loved...
              </h2>
              <div className="bg-white rounded-lg border p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Compass className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Personalized recommendations coming soon!
                </h3>
                <p className="text-gray-600">
                  We're working on analyzing your gaming preferences to suggest
                  games you'll love. Check back soon for personalized
                  recommendations based on your favorite games and ratings.
                </p>
              </div>
            </div>

            {/* Trending with Friends Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-semibold text-gray-900">
                  Trending with Friends
                </h2>
              </div>
              <p className="text-gray-600 mb-6">
                Games your friends have recently started playing or rated highly
                (8+) in the past 2 weeks
              </p>

              {isLoadingTrending ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2 text-gray-600">
                    Loading trending games...
                  </span>
                </div>
              ) : trendingGames.length > 0 ? (
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4">
                    {trendingGames.map((game) => (
                      <Card
                        key={game.igdb_game_id}
                        className="flex-shrink-0 w-48 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={async () => {
                          // Check if user has this game in their library
                          if (game.userStatus !== "not-in-library") {
                            // Find the user's game collection ID for this IGDB game
                            const { data: userGameCollection } = await supabase
                              .from("game_collections")
                              .select("id")
                              .eq("user_id", user?.id)
                              .eq("igdb_game_id", game.igdb_game_id)
                              .single();

                            if (userGameCollection) {
                              navigate(`/game/${userGameCollection.id}`);
                            }
                          } else {
                            // User doesn't have this game, find a friend's game collection ID
                            const friendWithGame = game.friends[0];
                            if (friendWithGame) {
                              const { data: friendGameCollection } =
                                await supabase
                                  .from("game_collections")
                                  .select("id")
                                  .eq("user_id", friendWithGame.id)
                                  .eq("igdb_game_id", game.igdb_game_id)
                                  .single();

                              if (friendGameCollection) {
                                navigate(`/game/${friendGameCollection.id}`);
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
                          <h3 className="font-semibold text-xs mb-2 line-clamp-2">
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
                                    <span className="text-blue-700 font-medium">
                                      You
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {game.userRating && (
                                      <span className="text-blue-700 font-medium">
                                        {game.userRating}/10
                                      </span>
                                    )}
                                    <Badge className="text-[8px] px-1 py-0 bg-blue-100 text-blue-800">
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

                            <p className="text-[10px] text-gray-600 font-medium">
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
                                    <span className="text-gray-700 truncate max-w-16">
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
                                      <span className="text-gray-600">
                                        {friend.rating}/10
                                      </span>
                                    )}
                                    <Badge className="text-[8px] px-1 py-0 bg-gray-100 text-gray-800">
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
                                <p className="text-[9px] text-gray-500 text-center">
                                  +{game.friends.length - 3} more
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              ) : (
                <div className="bg-white rounded-lg border p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <TrendingUp className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No trending games yet
                  </h3>
                  <p className="text-gray-600">
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

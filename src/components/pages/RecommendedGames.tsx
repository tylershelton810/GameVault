import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Gamepad2, Star, Calendar } from "lucide-react";
import Sidebar from "@/components/dashboard/layout/Sidebar";
import TopNavigation from "@/components/dashboard/layout/TopNavigation";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";

interface SimilarGame {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  rating?: number;
  summary?: string;
  first_release_date?: number;
}

const RecommendedGames = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeItem, setActiveItem] = useState("");
  const [similarGames, setSimilarGames] = useState<SimilarGame[]>([]);
  const [gameTitle, setGameTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch similar games
  const fetchSimilarGames = useCallback(async () => {
    if (!gameId) return;

    setIsLoading(true);
    try {
      let igdbGameId: number;
      let title = "";

      // Check if this is an IGDB ID from search (format: igdb-{id})
      if (gameId.startsWith("igdb-")) {
        igdbGameId = parseInt(gameId.replace("igdb-", ""));
      } else {
        // Try to find the game in user's collection or any collection to get IGDB ID
        const { data: gameCollection } = await supabase
          .from("game_collections")
          .select("igdb_game_id, game_title")
          .eq("id", gameId)
          .single();

        if (!gameCollection) {
          setError("Game not found");
          return;
        }

        igdbGameId = gameCollection.igdb_game_id;
        title = gameCollection.game_title;
      }

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-getGameDetails",
        {
          body: { igdbGameId: igdbGameId },
        },
      );

      if (error) {
        console.error("Error fetching game details:", error);
        setError("Failed to load recommended games");
        return;
      }

      if (data && data.gameData && data.gameData.length > 0) {
        setGameTitle(title || data.gameData[0].name);
        setSimilarGames(data.similarGames || []);
      } else {
        setError("No game data found");
      }
    } catch (error) {
      console.error("Error fetching similar games:", error);
      setError("Failed to load recommended games");
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchSimilarGames();
  }, [fetchSimilarGames]);

  const handleGameClick = (game: SimilarGame) => {
    navigate(`/game/igdb-${game.id}`);
  };

  const renderStars = (rating: number) => {
    const normalizedRating = rating / 10; // Convert from 0-100 to 0-10
    const stars = [];
    const fullStars = Math.floor(normalizedRating / 2);
    const hasHalfStar = normalizedRating % 2 >= 1;

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
                Loading recommended games...
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
                <Gamepad2 className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Recommended Games
                  </h1>
                  <p className="text-muted-foreground">
                    Games similar to {gameTitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Games Grid */}
            {similarGames.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in slide-in-from-bottom-4 duration-700">
                {similarGames.map((game, index) => (
                  <Card
                    key={game.id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group animate-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleGameClick(game)}
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
                          <Gamepad2 className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200">
                        {game.name}
                      </h3>

                      {game.rating && (
                        <div className="flex items-center gap-1 mb-2">
                          <div className="flex">{renderStars(game.rating)}</div>
                          <span className="text-xs text-muted-foreground ml-1">
                            {Math.round(game.rating)}/100
                          </span>
                        </div>
                      )}

                      {game.first_release_date && (
                        <div className="flex items-center gap-1 mb-2">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              game.first_release_date * 1000,
                            ).getFullYear()}
                          </span>
                        </div>
                      )}

                      {game.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {game.summary.length > 100
                            ? `${game.summary.substring(0, 100)}...`
                            : game.summary}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 animate-in fade-in duration-500">
                <Gamepad2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No recommended games found
                </h3>
                <p className="text-muted-foreground">
                  We couldn't find any similar games at the moment. Try
                  exploring other games in your library!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendedGames;

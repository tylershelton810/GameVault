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
import {
  Star,
  Plus,
  Search,
  Filter,
  Loader2,
  Heart,
  CheckCircle,
  Edit,
} from "lucide-react";
import Sidebar from "@/components/dashboard/layout/Sidebar";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { Tables } from "@/types/supabase";

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
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [isLoadingReview, setIsLoadingReview] = useState(false);

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

  // Fetch user's game library
  const fetchUserGames = useCallback(async () => {
    if (!user) return;

    setIsLoadingGames(true);
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

      // Transform database data to match our Game interface
      const transformedGames: Game[] = data.map((game) => ({
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
      }));

      setGames(transformedGames);
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      setIsLoadingGames(false);
    }
  }, [user]);

  // Load games on component mount
  useEffect(() => {
    fetchUserGames();
  }, [fetchUserGames]);

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

      const { error } = await supabase
        .from("game_collections")
        .insert([gameData]);

      if (error) {
        console.error("Error adding game:", error);
        return;
      }

      // If there's a review and rating, create a review entry
      if (selectedStatus === "played" && reviewText.trim()) {
        const { data: insertedGame } = await supabase
          .from("game_collections")
          .select("id")
          .eq("user_id", user.id)
          .eq("igdb_game_id", selectedGame.id)
          .single();

        if (insertedGame) {
          await supabase.from("game_reviews").insert({
            user_id: user.id,
            game_collection_id: insertedGame.id,
            review_text: reviewText,
            rating: personalRating[0],
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

      // Handle review update/creation
      if (selectedStatus === "played" && reviewText.trim()) {
        const { data: existingReview } = await supabase
          .from("game_reviews")
          .select("id")
          .eq("game_collection_id", editingGame.id)
          .single();

        if (existingReview) {
          await supabase
            .from("game_reviews")
            .update({
              review_text: reviewText,
              rating: personalRating[0],
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingReview.id);
        } else {
          await supabase.from("game_reviews").insert({
            user_id: user.id,
            game_collection_id: editingGame.id,
            review_text: reviewText,
            rating: personalRating[0],
          });
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Game Library
              </h1>
              <p className="text-gray-600">
                Manage your game collection and track your progress
              </p>
            </div>

            <Dialog open={isAddGameOpen} onOpenChange={setIsAddGameOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
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
                            <h4 className="font-medium text-sm">{game.name}</h4>
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
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                      <SelectItem value="want-to-play">Want to Play</SelectItem>
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

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Games ({games.length})</TabsTrigger>
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
              {isLoadingGames ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2 text-gray-600">
                    Loading your games...
                  </span>
                </div>
              ) : filteredGames.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredGames.map((game) => {
                    const isFlipped = flippedCards.has(game.id);
                    return (
                      <div
                        key={game.id}
                        className="perspective-1000 cursor-pointer h-[850px]"
                        onClick={() => {
                          const newFlippedCards = new Set(flippedCards);
                          if (isFlipped) {
                            newFlippedCards.delete(game.id);
                          } else {
                            newFlippedCards.add(game.id);
                          }
                          setFlippedCards(newFlippedCards);
                        }}
                      >
                        <div
                          className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-500 ${
                            isFlipped ? "rotate-y-180" : ""
                          }`}
                        >
                          {/* Front of card */}
                          <Card className="absolute inset-0 backface-hidden overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="aspect-[3/4] relative">
                              <img
                                src={game.cover}
                                alt={game.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 right-2">
                                {getStatusBadge(game.status)}
                              </div>
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
                              </div>
                              <div className="absolute bottom-2 right-2">
                                <div className="bg-black/50 rounded-full p-1">
                                  <Edit className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            </div>
                            <CardContent className="p-4 flex-1 flex flex-col">
                              <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                                {game.title}
                              </h3>

                              {game.personalRating && (
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex">
                                    {renderStars(game.personalRating)}
                                  </div>
                                  <span className="text-sm text-gray-600">
                                    {game.personalRating}/10
                                  </span>
                                </div>
                              )}

                              {game.notes && (
                                <p className="text-xs text-gray-600 line-clamp-2 mb-2 flex-1">
                                  {game.notes}
                                </p>
                              )}

                              <p className="text-xs text-gray-500 mt-auto">
                                Added{" "}
                                {new Date(game.dateAdded).toLocaleDateString()}
                              </p>
                            </CardContent>
                          </Card>

                          {/* Back of card - Edit form */}
                          <Card className="absolute inset-0 backface-hidden rotate-y-180 overflow-hidden bg-white">
                            <CardContent className="p-4 h-full flex flex-col">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-sm truncate">
                                  Edit: {game.title}
                                </h3>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditGame(game);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </div>

                              <div className="space-y-3 flex-1 overflow-y-auto">
                                <div>
                                  <Label className="text-xs">Status</Label>
                                  <div className="mt-1">
                                    {getStatusBadge(game.status)}
                                  </div>
                                </div>

                                {game.personalRating && (
                                  <div>
                                    <Label className="text-xs">Rating</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex">
                                        {renderStars(game.personalRating)}
                                      </div>
                                      <span className="text-xs text-gray-600">
                                        {game.personalRating}/10
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  {game.isFavorite && (
                                    <div className="flex items-center gap-1">
                                      <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                                      <span className="text-xs text-gray-600">
                                        Favorite
                                      </span>
                                    </div>
                                  )}
                                  {game.isCompleted && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                      <span className="text-xs text-gray-600">
                                        Completed
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {game.notes && (
                                  <div>
                                    <Label className="text-xs">Notes</Label>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-3">
                                      {game.notes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 pt-2 border-t">
                                <Button
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditGame(game);
                                  }}
                                >
                                  Edit Details
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="mb-6">
                    <div className="text-6xl mb-4">🎮</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Your game library is looking a bit empty!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {activeTab === "all"
                        ? "Time to start building your epic game collection. What are you waiting for?"
                        : `No games in the &quot;${activeTab === "want-to-play" ? "Want to Play" : activeTab === "playing" ? "Playing" : "Played"}&quot; category yet.`}
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsAddGameOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
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
  );
};

export default GameLibrary;

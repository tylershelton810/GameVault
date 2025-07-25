import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Users,
  Search,
  Loader2,
  Plus,
  X,
  GamepadIcon,
} from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { cn } from "@/lib/utils";

interface IGDBGame {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  rating?: number;
  summary?: string;
  genres?: { name: string }[];
}

interface Friend {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface GameClubCreateProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClubCreated?: () => void;
  preselectedGame?: IGDBGame;
}

const GameClubCreate = ({
  isOpen,
  onOpenChange,
  onClubCreated,
  preselectedGame,
}: GameClubCreateProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [clubName, setClubName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGame, setSelectedGame] = useState<IGDBGame | null>(
    preselectedGame || null,
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxMembers, setMaxMembers] = useState("10");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  // Search state
  const [gameSearchTerm, setGameSearchTerm] = useState("");
  const [gameSearchResults, setGameSearchResults] = useState<IGDBGame[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearchTerm, setFriendSearchTerm] = useState("");

  // Search for games using IGDB
  const searchGames = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setGameSearchResults([]);
      return;
    }

    setIsSearchingGames(true);
    try {
      const response = await fetch(
        "https://hktnhglrdhigtevqvzvf.supabase.co/functions/v1/SearchGames",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setGameSearchResults(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error searching games:", error);
      setGameSearchResults([]);
    } finally {
      setIsSearchingGames(false);
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

      const friendsData: Friend[] = [];
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

  // Debounced game search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchGames(gameSearchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [gameSearchTerm, searchGames]);

  // Load friends when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      // Set default dates
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      setStartDate(nextWeek.toISOString().split("T")[0]);
      setEndDate(nextMonth.toISOString().split("T")[0]);
    }
  }, [isOpen, fetchFriends]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setClubName("");
      setDescription("");
      if (!preselectedGame) {
        setSelectedGame(null);
      }
      setStartDate("");
      setEndDate("");
      setMaxMembers("10");
      setIsPrivate(false);
      setSelectedFriends([]);
      setGameSearchTerm("");
      setGameSearchResults([]);
      setFriendSearchTerm("");
    }
  }, [isOpen, preselectedGame]);

  const handleCreateClub = async () => {
    if (!user || !selectedGame) return;

    setIsCreating(true);
    try {
      // Create the game club
      const { data: clubData, error: clubError } = await supabase
        .from("game_clubs")
        .insert({
          name: clubName,
          description: description || null,
          igdb_game_id: selectedGame.id,
          game_title: selectedGame.name,
          game_cover_url: selectedGame.cover
            ? `https:${selectedGame.cover.url.replace("t_thumb", "t_cover_big")}`
            : null,
          creator_id: user.id,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          max_members: parseInt(maxMembers),
          is_private: isPrivate,
        })
        .select()
        .single();

      if (clubError) {
        console.error("Error creating club:", clubError);
        return;
      }

      // Add creator as a member
      await supabase.from("game_club_members").insert({
        club_id: clubData.id,
        user_id: user.id,
        role: "creator",
      });

      // Add selected friends as members
      if (selectedFriends.length > 0) {
        const memberInserts = selectedFriends.map((friendId) => ({
          club_id: clubData.id,
          user_id: friendId,
          role: "member",
        }));

        await supabase.from("game_club_members").insert(memberInserts);
      }

      // Add the game to all members' libraries with "playing" status
      const allMemberIds = [user.id, ...selectedFriends];
      const gameLibraryInserts = allMemberIds.map((memberId) => ({
        user_id: memberId,
        igdb_game_id: selectedGame.id,
        game_title: selectedGame.name,
        game_cover_url: selectedGame.cover
          ? `https:${selectedGame.cover.url.replace("t_thumb", "t_cover_big")}`
          : null,
        status: "playing",
        date_added: new Date().toISOString(),
        date_started: new Date().toISOString(),
      }));

      // Insert games into libraries (use upsert to avoid duplicates)
      for (const gameInsert of gameLibraryInserts) {
        await supabase.from("game_collections").upsert(gameInsert, {
          onConflict: "user_id,igdb_game_id",
          ignoreDuplicates: false,
        });
      }

      // Add welcome message
      await supabase.from("game_club_messages").insert({
        club_id: clubData.id,
        user_id: user.id,
        message_text: `Welcome to ${clubName}! Let's enjoy playing ${selectedGame.name} together! 🎮 The game has been automatically added to everyone's library with "Playing" status.`,
        message_type: "system",
      });

      // Log activity
      await supabase.from("activity_feed").insert({
        user_id: user.id,
        activity_type: "game_club_created",
        activity_data: {
          club_name: clubName,
          game_title: selectedGame.name,
          club_id: clubData.id,
          member_count: selectedFriends.length + 1,
        },
      });

      onClubCreated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating game club:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredFriends = friends.filter(
    (friend) =>
      friend.full_name.toLowerCase().includes(friendSearchTerm.toLowerCase()) ||
      friend.email.toLowerCase().includes(friendSearchTerm.toLowerCase()),
  );

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  const canProceedToStep2 = selectedGame && clubName.trim();
  const canProceedToStep3 =
    startDate && endDate && new Date(startDate) < new Date(endDate);
  const canCreateClub = canProceedToStep3;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GamepadIcon className="w-5 h-5 text-blue-600" />
            Create Game Club
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    step >= stepNumber
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600",
                  )}
                >
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div
                    className={cn(
                      "w-12 h-0.5 mx-2",
                      step > stepNumber ? "bg-blue-600" : "bg-gray-200",
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Game Selection & Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Choose Your Game & Club Details
                </h3>
                <p className="text-sm text-gray-600">
                  Select the game you want to play together and give your club a
                  name
                </p>
              </div>

              {/* Game Selection */}
              {!selectedGame && (
                <div className="space-y-3">
                  <Label>Search for a game</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search for a game..."
                      value={gameSearchTerm}
                      onChange={(e) => setGameSearchTerm(e.target.value)}
                    />
                    {isSearchingGames && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin" />
                    )}
                  </div>

                  {gameSearchResults.length > 0 && (
                    <ScrollArea className="max-h-60 border rounded-md">
                      {gameSearchResults.map((game) => (
                        <div
                          key={game.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-start gap-3"
                          onClick={() => {
                            setSelectedGame(game);
                            setGameSearchTerm("");
                            setGameSearchResults([]);
                          }}
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
                            {game.genres && (
                              <div className="flex gap-1 mt-1">
                                {game.genres.slice(0, 2).map((genre, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {genre.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {game.summary && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {game.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
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
                      {selectedGame.summary && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                          {selectedGame.summary}
                        </p>
                      )}
                    </div>
                    {!preselectedGame && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedGame(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Club Name */}
              <div className="space-y-2">
                <Label htmlFor="clubName">Club Name *</Label>
                <Input
                  id="clubName"
                  placeholder="e.g., Zelda Adventure Squad"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell your friends what this club is about..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                >
                  Next: Set Schedule
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Schedule & Settings */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Set Your Schedule
                </h3>
                <p className="text-sm text-gray-600">
                  Choose when your club will start and end
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMembers">Maximum Members</Label>
                <Select value={maxMembers} onValueChange={setMaxMembers}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} members
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPrivate"
                  checked={isPrivate}
                  onCheckedChange={(checked) => setIsPrivate(checked === true)}
                />
                <Label htmlFor="isPrivate" className="text-sm">
                  Make this club private (invite only)
                </Label>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedToStep3}
                >
                  Next: Invite Friends
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Invite Friends */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Invite Your Friends
                </h3>
                <p className="text-sm text-gray-600">
                  Choose friends to join your Game Club (optional)
                </p>
              </div>

              {friends.length > 0 ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search friends..."
                      value={friendSearchTerm}
                      onChange={(e) => setFriendSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <ScrollArea className="max-h-60">
                    <div className="space-y-2">
                      {filteredFriends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
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
                            <div>
                              <p className="font-medium text-sm">
                                {friend.full_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {friend.email}
                              </p>
                            </div>
                          </div>
                          <Checkbox
                            checked={selectedFriends.includes(friend.id)}
                            onCheckedChange={() =>
                              toggleFriendSelection(friend.id)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {selectedFriends.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-2">
                        Selected friends ({selectedFriends.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFriends.map((friendId) => {
                          const friend = friends.find((f) => f.id === friendId);
                          return friend ? (
                            <Badge key={friendId} variant="secondary">
                              {friend.full_name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    You don't have any friends yet. You can still create the
                    club and invite friends later!
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleCreateClub}
                  disabled={!canCreateClub || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Club...
                    </>
                  ) : (
                    "Create Game Club"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameClubCreate;

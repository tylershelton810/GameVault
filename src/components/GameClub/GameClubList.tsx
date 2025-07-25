import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  Users,
  Crown,
  MessageCircle,
  Star,
  Plus,
  GamepadIcon,
} from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import { useNavigate } from "react-router-dom";
import GameClubCreate from "./GameClubCreate";

interface GameClub {
  id: string;
  name: string;
  description?: string;
  igdb_game_id: number;
  game_title: string;
  game_cover_url?: string;
  creator_id: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  max_members: number;
  is_private: boolean;
  created_at: string;
  member_count: number;
  unread_messages: number;
  user_role: "creator" | "moderator" | "member";
  creator_name: string;
  recent_members: {
    id: string;
    full_name: string;
    avatar_url?: string;
  }[];
}

interface GameClubListProps {
  showCreateButton?: boolean;
  limit?: number;
  onClubClick?: (clubId: string) => void;
}

const GameClubList = ({
  showCreateButton = true,
  limit,
  onClubClick,
}: GameClubListProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<GameClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchClubs = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get clubs where user is a member
      const { data: membershipData, error: membershipError } = await supabase
        .from("game_club_members")
        .select(
          `
          club_id,
          role,
          game_clubs!inner (
            id,
            name,
            description,
            igdb_game_id,
            game_title,
            game_cover_url,
            creator_id,
            start_date,
            end_date,
            status,
            max_members,
            is_private,
            created_at,
            creator:users!game_clubs_creator_id_fkey (
              full_name
            )
          )
        `,
        )
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("joined_at", { ascending: false });

      if (membershipError) {
        console.error("Error fetching club memberships:", membershipError);
        return;
      }

      if (!membershipData || membershipData.length === 0) {
        setClubs([]);
        setIsLoading(false);
        return;
      }

      const clubIds = membershipData.map((m) => m.club_id);

      // Get member counts for each club
      const { data: memberCounts } = await supabase
        .from("game_club_members")
        .select("club_id")
        .in("club_id", clubIds)
        .eq("status", "active");

      // Get recent members for each club (for avatars)
      const { data: recentMembers } = await supabase
        .from("game_club_members")
        .select(
          `
          club_id,
          users!game_club_members_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `,
        )
        .in("club_id", clubIds)
        .eq("status", "active")
        .order("joined_at", { ascending: false });

      // Get unread message counts (simplified - just count recent messages)
      const { data: messageCounts } = await supabase
        .from("game_club_messages")
        .select("club_id")
        .in("club_id", clubIds)
        .gte(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      // Transform data
      const transformedClubs: GameClub[] = membershipData.map((membership) => {
        const club = Array.isArray(membership.game_clubs)
          ? membership.game_clubs[0]
          : membership.game_clubs;
        const memberCount =
          memberCounts?.filter((m) => m.club_id === club.id).length || 0;
        const clubRecentMembers =
          recentMembers
            ?.filter((m) => m.club_id === club.id)
            .slice(0, 4)
            .map((m) => m.users)
            .filter(
              (user): user is NonNullable<typeof user> =>
                user !== null && user !== undefined,
            )
            .map((user) => ({
              id: user.id,
              full_name: user.full_name,
              avatar_url: user.avatar_url,
            })) || [];
        const unreadCount =
          messageCounts?.filter((m) => m.club_id === club.id).length || 0;

        return {
          id: club.id,
          name: club.name,
          description: club.description,
          igdb_game_id: club.igdb_game_id,
          game_title: club.game_title,
          game_cover_url: club.game_cover_url,
          creator_id: club.creator_id,
          start_date: club.start_date,
          end_date: club.end_date,
          status: club.status,
          max_members: club.max_members,
          is_private: club.is_private,
          created_at: club.created_at,
          member_count: memberCount,
          unread_messages: unreadCount,
          user_role: membership.role,
          creator_name: Array.isArray(club.creator)
            ? club.creator[0]?.full_name || "Unknown"
            : club.creator?.full_name || "Unknown",
          recent_members: clubRecentMembers,
        };
      });

      // Apply limit if specified
      const finalClubs = limit
        ? transformedClubs.slice(0, limit)
        : transformedClubs;
      setClubs(finalClubs);
    } catch (error) {
      console.error("Error fetching game clubs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const getStatusBadge = (
    status: string,
    startDate: string,
    endDate: string,
  ) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (status === "completed") {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (status === "cancelled") {
      return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
    }
    if (now < start) {
      return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
    }
    if (now >= start && now <= end) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Ended</Badge>;
  };

  const getProgressPercentage = (startDate: string, endDate: string) => {
    const now = new Date().getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (now < start) return 0;
    if (now > end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleClubClick = (clubId: string) => {
    if (onClubClick) {
      onClubClick(clubId);
    } else {
      navigate(`/game-club/${clubId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-20 bg-gray-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showCreateButton && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              My Game Clubs
            </h2>
            <p className="text-sm text-muted-foreground">
              Join friends in playing games together
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Club
          </Button>
        </div>
      )}

      {clubs.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <GamepadIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Game Clubs Yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Create or join a Game Club to play games with friends!
            </p>
            {showCreateButton && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Club
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {clubs.map((club) => {
            const progress = getProgressPercentage(
              club.start_date,
              club.end_date,
            );

            return (
              <Card
                key={club.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleClubClick(club.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Game Cover */}
                    <div className="flex-shrink-0">
                      <img
                        src={
                          club.game_cover_url ||
                          "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80"
                        }
                        alt={club.game_title}
                        className="w-16 h-20 object-cover rounded-lg border border-gray-200"
                      />
                    </div>

                    {/* Club Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">
                            {club.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Playing: {club.game_title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {club.user_role === "creator" && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                          {getStatusBadge(
                            club.status,
                            club.start_date,
                            club.end_date,
                          )}
                        </div>
                      </div>

                      {club.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {club.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{formatDate(club.start_date)}</span>
                          <span>{progress}% complete</span>
                          <span>{formatDate(club.end_date)}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Bottom Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Members */}
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {club.recent_members
                                .slice(0, 3)
                                .map((member, index) => (
                                  <Avatar
                                    key={member.id}
                                    className="w-6 h-6 border-2 border-white"
                                  >
                                    <AvatarImage
                                      src={
                                        member.avatar_url ||
                                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.full_name}`
                                      }
                                      alt={member.full_name}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {member.full_name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              {club.member_count > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                  <span className="text-xs text-gray-600">
                                    +{club.member_count - 3}
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {club.member_count}/{club.max_members}
                            </span>
                          </div>

                          {/* Creator */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Crown className="w-3 h-3" />
                            <span>{club.creator_name}</span>
                          </div>
                        </div>

                        {/* Unread Messages */}
                        {club.unread_messages > 0 && (
                          <div className="flex items-center gap-1 text-xs text-primary">
                            <MessageCircle className="w-3 h-3" />
                            <span>{club.unread_messages} new</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GameClubCreate
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onClubCreated={fetchClubs}
      />
    </div>
  );
};

export default GameClubList;

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  Users,
  Crown,
  MessageCircle,
  Send,
  Pin,
  Heart,
  Smile,
  Settings,
  UserMinus,
  Star,
  ArrowLeft,
  GamepadIcon,
} from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../../../supabase/auth";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import GameClubDiscussion from "./GameClubDiscussion";
import GameClubReview from "./GameClubReview";

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
  creator: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Member {
  id: string;
  user_id: string;
  role: "creator" | "moderator" | "member";
  joined_at: string;
  user: {
    full_name: string;
    avatar_url?: string;
    email: string;
  };
}

const GameClubPage = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState<GameClub | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userMembership, setUserMembership] = useState<Member | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const fetchClubData = useCallback(async () => {
    if (!clubId || !user) return;

    setIsLoading(true);
    try {
      // Fetch club details
      const { data: clubData, error: clubError } = await supabase
        .from("game_clubs")
        .select(
          `
          *,
          creator:users!game_clubs_creator_id_fkey (
            full_name,
            avatar_url
          )
        `,
        )
        .eq("id", clubId)
        .single();

      if (clubError) {
        console.error("Error fetching club:", clubError);
        navigate("/game-clubs");
        return;
      }

      setClub(clubData);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("game_club_members")
        .select(
          `
          *,
          user:users!game_club_members_user_id_fkey (
            full_name,
            avatar_url,
            email
          )
        `,
        )
        .eq("club_id", clubId)
        .eq("status", "active")
        .order("joined_at", { ascending: true });

      if (membersError) {
        console.error("Error fetching members:", membersError);
        return;
      }

      setMembers(membersData || []);

      // Find user's membership
      const userMember = membersData?.find((m) => m.user_id === user.id);
      setUserMembership(userMember || null);

      // If user is not a member, redirect
      if (!userMember) {
        navigate("/game-clubs");
        return;
      }
    } catch (error) {
      console.error("Error fetching club data:", error);
      navigate("/game-clubs");
    } finally {
      setIsLoading(false);
    }
  }, [clubId, user, navigate]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);

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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleLeaveClub = async () => {
    if (!user || !clubId || !userMembership) return;

    try {
      await supabase
        .from("game_club_members")
        .update({ status: "left" })
        .eq("id", userMembership.id);

      navigate("/game-clubs");
    } catch (error) {
      console.error("Error leaving club:", error);
    }
  };

  const isClubEnded = club && new Date() > new Date(club.end_date);
  const canShowReview = isClubEnded && club?.status !== "cancelled";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <TopNavigation />
        <div className="flex h-[calc(100vh-64px)] mt-16">
          <Sidebar activeItem="Game Clubs" />
          <main className="flex-1 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading Game Club...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!club || !userMembership) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <TopNavigation />
        <div className="flex h-[calc(100vh-64px)] mt-16">
          <Sidebar activeItem="Game Clubs" />
          <main className="flex-1 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <GamepadIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Club Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                This Game Club doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => navigate("/game-clubs")}>
                Back to Game Clubs
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const progress = getProgressPercentage(club.start_date, club.end_date);
  const daysRemaining = getDaysRemaining(club.end_date);

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <TopNavigation />
      <div className="flex h-[calc(100vh-64px)] mt-16">
        <Sidebar activeItem="Game Clubs" />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 max-w-6xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/game-clubs")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {club.name}
                </h1>
                <p className="text-gray-600">Playing: {club.game_title}</p>
              </div>
              {userMembership.role !== "creator" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveClub}
                  className="text-red-600 hover:text-red-700"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Leave Club
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Game Info Card */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={
                          club.game_cover_url ||
                          "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80"
                        }
                        alt={club.game_title}
                        className="w-24 h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                              {club.game_title}
                            </h2>
                            {club.description && (
                              <p className="text-gray-600 mb-3">
                                {club.description}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(
                            club.status,
                            club.start_date,
                            club.end_date,
                          )}
                        </div>

                        {/* Progress */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                            <span>Progress</span>
                            <span>
                              {daysRemaining > 0
                                ? `${daysRemaining} days remaining`
                                : "Ended"}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-2 text-gray-600 mb-1">
                              <Calendar className="w-4 h-4" />
                              <span>Start Date</span>
                            </div>
                            <p className="font-medium">
                              {formatDate(club.start_date)}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-gray-600 mb-1">
                              <Clock className="w-4 h-4" />
                              <span>End Date</span>
                            </div>
                            <p className="font-medium">
                              {formatDate(club.end_date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Discussion */}
                <GameClubDiscussion clubId={club.id} />

                {/* Review Section */}
                {canShowReview && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        Rate & Review
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        The club has ended! Share your thoughts about{" "}
                        {club.game_title}.
                      </p>
                      <Button onClick={() => setShowReviewDialog(true)}>
                        Write Review
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Members Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Members ({members.length}/{club.max_members})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-64">
                      <div className="space-y-3">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={
                                  member.user.avatar_url ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user.email}`
                                }
                                alt={member.user.full_name}
                              />
                              <AvatarFallback>
                                {member.user.full_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {member.user.full_name}
                              </p>
                              <div className="flex items-center gap-2">
                                {member.role === "creator" && (
                                  <Crown className="w-3 h-3 text-yellow-500" />
                                )}
                                <span className="text-xs text-gray-500 capitalize">
                                  {member.role}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Club Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Club Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Created by</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={
                              club.creator.avatar_url ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${club.creator.full_name}`
                            }
                            alt={club.creator.full_name}
                          />
                          <AvatarFallback className="text-xs">
                            {club.creator.full_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {club.creator.full_name}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Privacy</p>
                      <p className="text-sm font-medium">
                        {club.is_private ? "Private" : "Public"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="text-sm font-medium">
                        {new Date(club.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Review Dialog */}
      {canShowReview && (
        <GameClubReview
          isOpen={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          club={club}
          onReviewSubmitted={() => {
            setShowReviewDialog(false);
            // Optionally refresh data or show success message
          }}
        />
      )}
    </div>
  );
};

export default GameClubPage;

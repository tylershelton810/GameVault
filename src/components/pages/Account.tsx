import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Star,
  Award,
  Target,
  Crown,
  Medal,
  Gamepad2,
  Calendar,
  Clock,
  Users,
  MessageSquare,
  FileText,
  Info,
} from "lucide-react";
import Sidebar from "@/components/dashboard/layout/Sidebar";
import TopNavigation from "@/components/dashboard/layout/TopNavigation";
import { useAuth } from "../../../supabase/auth";
import { supabase } from "../../../supabase/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTheme } from "@/lib/theme";
import { useNavigate } from "react-router-dom";

interface GameBadge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requirement: number;
  earned: boolean;
  earnedDate?: string;
  color: string;
  bgColor: string;
}

interface UserStats {
  totalGames: number;
  gamesPlayed: number;
  gamesPlaying: number;
  gamesWantToPlay: number;
  averageRating: number;
  totalReviews: number;
  totalFriends: number;
  joinDate: string;
  specialBadges: string[];
}

const Account = () => {
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("Account");
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch user stats
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        // Fetch game collection stats
        const { data: games, error: gamesError } = await supabase
          .from("game_collections")
          .select("status, personal_rating, created_at")
          .eq("user_id", user.id);

        if (gamesError) {
          console.error("Error fetching games:", gamesError);
          return;
        }

        // Fetch reviews count
        const { data: reviews, error: reviewsError } = await supabase
          .from("game_reviews")
          .select("id")
          .eq("user_id", user.id);

        if (reviewsError) {
          console.error("Error fetching reviews:", reviewsError);
        }

        // Fetch friends count (accepted friendships)
        const { data: friendships, error: friendsError } = await supabase
          .from("friendships")
          .select("id")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq("status", "accepted");

        if (friendsError) {
          console.error("Error fetching friends:", friendsError);
        }

        // Calculate stats
        const totalGames = games?.length || 0;
        const gamesPlayed =
          games?.filter((g) => g.status === "played").length || 0;
        const gamesPlaying =
          games?.filter((g) => g.status === "playing").length || 0;
        const gamesWantToPlay =
          games?.filter((g) => g.status === "want-to-play").length || 0;

        const ratingsArray =
          games
            ?.filter((g) => g.personal_rating)
            .map((g) => g.personal_rating) || [];
        const averageRating =
          ratingsArray.length > 0
            ? ratingsArray.reduce((sum, rating) => sum + rating, 0) /
              ratingsArray.length
            : 0;

        const totalReviews = reviews?.length || 0;
        const totalFriends = friendships?.length || 0;

        // Special badges functionality temporarily disabled
        // const { data: userData, error: userError } = await supabase
        //   .from("users")
        //   .select("special_badges")
        //   .eq("id", user.id)
        //   .single();

        // if (userError) {
        //   console.error("Error fetching user data:", userError);
        // }

        setUserStats({
          totalGames,
          gamesPlayed,
          gamesPlaying,
          gamesWantToPlay,
          averageRating,
          totalReviews,
          totalFriends,
          joinDate: user.created_at,
          specialBadges: [],
        });
      } catch (error) {
        console.error("Error fetching user stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();
  }, [user]);

  // Define badges based on game count
  const getGameBadges = (totalGames: number): GameBadge[] => {
    const badges: GameBadge[] = [
      {
        id: "first-game",
        name: "First Game",
        description: "Add your very first game to your library",
        icon: <Gamepad2 className="w-6 h-6" />,
        requirement: 1,
        earned: totalGames >= 1,
        earnedDate: totalGames >= 1 ? new Date().toISOString() : undefined,
        color: "text-green-600",
        bgColor: "bg-green-100",
      },
      {
        id: "starter",
        name: "Game Starter",
        description: "Add your first 5 games to your library",
        icon: <Target className="w-6 h-6" />,
        requirement: 5,
        earned: totalGames >= 5,
        earnedDate: totalGames >= 5 ? new Date().toISOString() : undefined,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      {
        id: "collector",
        name: "Game Collector",
        description: "Build a library of 10 games",
        icon: <Star className="w-6 h-6" />,
        requirement: 10,
        earned: totalGames >= 10,
        earnedDate: totalGames >= 10 ? new Date().toISOString() : undefined,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
      },
      {
        id: "enthusiast",
        name: "Gaming Enthusiast",
        description: "Reach 20 games in your collection",
        icon: <Award className="w-6 h-6" />,
        requirement: 20,
        earned: totalGames >= 20,
        earnedDate: totalGames >= 20 ? new Date().toISOString() : undefined,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
      },
      {
        id: "curator",
        name: "Game Curator",
        description: "Curate a collection of 50 games",
        icon: <Crown className="w-6 h-6" />,
        requirement: 50,
        earned: totalGames >= 50,
        earnedDate: totalGames >= 50 ? new Date().toISOString() : undefined,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
      },
      {
        id: "master",
        name: "Game Master",
        description: "Achieve the ultimate collection of 100 games",
        icon: <Trophy className="w-6 h-6" />,
        requirement: 100,
        earned: totalGames >= 100,
        earnedDate: totalGames >= 100 ? new Date().toISOString() : undefined,
        color: "text-red-600",
        bgColor: "bg-red-100",
      },
      {
        id: "legend",
        name: "Game Legend",
        description: "Legendary collection of 250 games",
        icon: <Medal className="w-6 h-6" />,
        requirement: 250,
        earned: totalGames >= 250,
        earnedDate: totalGames >= 250 ? new Date().toISOString() : undefined,
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
      },
      {
        id: "deity",
        name: "Game Deity",
        description: "Godlike collection of 500 games",
        icon: <Crown className="w-6 h-6" />,
        requirement: 500,
        earned: totalGames >= 500,
        earnedDate: totalGames >= 500 ? new Date().toISOString() : undefined,
        color: "text-pink-600",
        bgColor: "bg-pink-100",
      },
    ];

    return badges;
  };

  // Define badges based on friend count
  const getFriendBadges = (totalFriends: number): GameBadge[] => {
    const badges: GameBadge[] = [
      {
        id: "social-starter",
        name: "Social Starter",
        description: "Add your first 5 friends",
        icon: <Users className="w-6 h-6" />,
        requirement: 5,
        earned: totalFriends >= 5,
        earnedDate: totalFriends >= 5 ? new Date().toISOString() : undefined,
        color: "text-green-600",
        bgColor: "bg-green-100",
      },
      {
        id: "social-connector",
        name: "Social Connector",
        description: "Build a network of 10 friends",
        icon: <Target className="w-6 h-6" />,
        requirement: 10,
        earned: totalFriends >= 10,
        earnedDate: totalFriends >= 10 ? new Date().toISOString() : undefined,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      {
        id: "social-enthusiast",
        name: "Social Enthusiast",
        description: "Connect with 20 gaming friends",
        icon: <Star className="w-6 h-6" />,
        requirement: 20,
        earned: totalFriends >= 20,
        earnedDate: totalFriends >= 20 ? new Date().toISOString() : undefined,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
      },
      {
        id: "social-networker",
        name: "Social Networker",
        description: "Build a community of 50 friends",
        icon: <Award className="w-6 h-6" />,
        requirement: 50,
        earned: totalFriends >= 50,
        earnedDate: totalFriends >= 50 ? new Date().toISOString() : undefined,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
      },
      {
        id: "social-legend",
        name: "Social Legend",
        description: "Achieve an epic network of 100 friends",
        icon: <Crown className="w-6 h-6" />,
        requirement: 100,
        earned: totalFriends >= 100,
        earnedDate: totalFriends >= 100 ? new Date().toISOString() : undefined,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
      },
    ];

    return badges;
  };

  // Define badges based on review count
  const getReviewBadges = (totalReviews: number): GameBadge[] => {
    const badges: GameBadge[] = [
      {
        id: "first-reviewer",
        name: "First Reviewer",
        description: "Write your first game review",
        icon: <MessageSquare className="w-6 h-6" />,
        requirement: 1,
        earned: totalReviews >= 1,
        earnedDate: totalReviews >= 1 ? new Date().toISOString() : undefined,
        color: "text-green-600",
        bgColor: "bg-green-100",
      },
      {
        id: "review-starter",
        name: "Review Starter",
        description: "Share your thoughts on 5 games",
        icon: <FileText className="w-6 h-6" />,
        requirement: 5,
        earned: totalReviews >= 5,
        earnedDate: totalReviews >= 5 ? new Date().toISOString() : undefined,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      {
        id: "review-contributor",
        name: "Review Contributor",
        description: "Write 10 thoughtful reviews",
        icon: <Target className="w-6 h-6" />,
        requirement: 10,
        earned: totalReviews >= 10,
        earnedDate: totalReviews >= 10 ? new Date().toISOString() : undefined,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
      },
      {
        id: "review-enthusiast",
        name: "Review Enthusiast",
        description: "Share insights on 25 games",
        icon: <Star className="w-6 h-6" />,
        requirement: 25,
        earned: totalReviews >= 25,
        earnedDate: totalReviews >= 25 ? new Date().toISOString() : undefined,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
      },
      {
        id: "review-expert",
        name: "Review Expert",
        description: "Become a trusted voice with 50 reviews",
        icon: <Award className="w-6 h-6" />,
        requirement: 50,
        earned: totalReviews >= 50,
        earnedDate: totalReviews >= 50 ? new Date().toISOString() : undefined,
        color: "text-red-600",
        bgColor: "bg-red-100",
      },
      {
        id: "review-master",
        name: "Review Master",
        description: "Achieve mastery with 100 reviews",
        icon: <Crown className="w-6 h-6" />,
        requirement: 100,
        earned: totalReviews >= 100,
        earnedDate: totalReviews >= 100 ? new Date().toISOString() : undefined,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
      },
      {
        id: "review-legend",
        name: "Review Legend",
        description: "Legendary status with 250 reviews",
        icon: <Trophy className="w-6 h-6" />,
        requirement: 250,
        earned: totalReviews >= 250,
        earnedDate: totalReviews >= 250 ? new Date().toISOString() : undefined,
        color: "text-indigo-600",
        bgColor: "bg-indigo-100",
      },
      {
        id: "review-deity",
        name: "Review Deity",
        description: "Godlike achievement with 500 reviews",
        icon: <Medal className="w-6 h-6" />,
        requirement: 500,
        earned: totalReviews >= 500,
        earnedDate: totalReviews >= 500 ? new Date().toISOString() : undefined,
        color: "text-pink-600",
        bgColor: "bg-pink-100",
      },
    ];

    return badges;
  };

  // Get special badges (like Founder badge)
  const getSpecialBadges = (specialBadges: string[]): GameBadge[] => {
    const badges: GameBadge[] = [];
    // Special badges functionality temporarily disabled
    return badges;
  };

  // Combine all badge types
  const allBadgeTypes = userStats
    ? [
        ...getGameBadges(userStats.totalGames),
        ...getFriendBadges(userStats.totalFriends),
        ...getReviewBadges(userStats.totalReviews),
      ]
    : [];

  const specialBadges = userStats
    ? getSpecialBadges(userStats.specialBadges)
    : [];
  const earnedBadges = [
    ...allBadgeTypes.filter((badge) => badge.earned),
    ...specialBadges,
  ];
  const nextBadge = allBadgeTypes.find((badge) => !badge.earned);
  const allBadges = allBadgeTypes; // Special badges are not shown in "All Achievements"

  if (isLoading) {
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
            <div className="p-4 md:p-8">
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
                <span className="ml-2 text-muted-foreground">
                  Loading your account...
                </span>
              </div>
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
          <div
            className={`p-4 md:p-8 max-w-6xl mx-auto ${isMobile ? "pb-20" : ""}`}
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Account
              </h1>
              <p className="text-muted-foreground">
                View your profile, stats, and achievements
              </p>
            </div>

            {/* Profile Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={
                        user?.user_metadata?.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`
                      }
                      alt={user?.user_metadata?.full_name || user?.email || ""}
                    />
                    <AvatarFallback className="text-lg">
                      {(user?.user_metadata?.full_name ||
                        user?.email ||
                        "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {user?.user_metadata?.full_name || "Gaming Enthusiast"}
                    </h2>
                    <p className="text-muted-foreground">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Joined{" "}
                        {userStats
                          ? new Date(userStats.joinDate).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 flex items-center gap-2"
                      onClick={() => navigate("/about")}
                    >
                      <Info className="w-4 h-4" />
                      About Game Shlf
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Games
                      </p>
                      <p className="text-2xl font-bold">
                        {userStats?.totalGames || 0}
                      </p>
                    </div>
                    <Gamepad2 className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Games Played
                      </p>
                      <p className="text-2xl font-bold">
                        {userStats?.gamesPlayed || 0}
                      </p>
                    </div>
                    <Trophy className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Average Rating
                      </p>
                      <p className="text-2xl font-bold">
                        {userStats?.averageRating
                          ? userStats.averageRating.toFixed(1)
                          : "0.0"}
                        /10
                      </p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Reviews Written
                      </p>
                      <p className="text-2xl font-bold">
                        {userStats?.totalReviews || 0}
                      </p>
                    </div>
                    <Medal className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Friends
                      </p>
                      <p className="text-2xl font-bold">
                        {userStats?.totalFriends || 0}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Badges Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Earned Badges */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-600" />
                    Earned Badges ({earnedBadges.length})
                  </h3>
                  {earnedBadges.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {earnedBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className={`p-4 rounded-lg border-2 border-green-200 ${badge.bgColor} transition-all hover:shadow-md`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`${badge.color} flex-shrink-0`}>
                              {badge.icon}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-800">
                                {badge.name}
                              </h4>
                              <p className="text-sm text-gray-700 dark:text-gray-600 mb-2">
                                {badge.description}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                ✓ Earned
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No badges earned yet. Start adding games to your
                        library!
                      </p>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Next Badge Progress */}
                {nextBadge && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      Next Achievements
                    </h3>
                    <div className="space-y-4">
                      {/* Game Collection Next Badge */}
                      {(() => {
                        const gameNextBadge = allBadgeTypes
                          .filter(
                            (badge) =>
                              !badge.id.includes("social") &&
                              !badge.id.includes("friend") &&
                              !badge.id.includes("review"),
                          )
                          .find((badge) => !badge.earned);

                        if (gameNextBadge) {
                          const currentCount = userStats?.totalGames || 0;
                          return (
                            <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
                              <div className="flex items-start gap-3 mb-3">
                                <div
                                  className={`${gameNextBadge.color} flex-shrink-0`}
                                >
                                  {gameNextBadge.icon}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-800">
                                    {gameNextBadge.name}
                                  </h4>
                                  <p className="text-sm text-gray-700 dark:text-gray-600">
                                    {gameNextBadge.description}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-800 dark:text-gray-700">
                                  <span>Game Collection Progress</span>
                                  <span>
                                    {currentCount} / {gameNextBadge.requirement}{" "}
                                    games
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    (currentCount / gameNextBadge.requirement) *
                                    100
                                  }
                                  className="h-2"
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-500">
                                  {gameNextBadge.requirement - currentCount}{" "}
                                  more games needed
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Friends Next Badge */}
                      {(() => {
                        const friendNextBadge = allBadgeTypes
                          .filter(
                            (badge) =>
                              badge.id.includes("social") ||
                              badge.id.includes("friend"),
                          )
                          .find((badge) => !badge.earned);

                        if (friendNextBadge) {
                          const currentCount = userStats?.totalFriends || 0;
                          return (
                            <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
                              <div className="flex items-start gap-3 mb-3">
                                <div
                                  className={`${friendNextBadge.color} flex-shrink-0`}
                                >
                                  {friendNextBadge.icon}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-800">
                                    {friendNextBadge.name}
                                  </h4>
                                  <p className="text-sm text-gray-700 dark:text-gray-600">
                                    {friendNextBadge.description}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-800 dark:text-gray-700">
                                  <span>Friends Progress</span>
                                  <span>
                                    {currentCount} /{" "}
                                    {friendNextBadge.requirement} friends
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    (currentCount /
                                      friendNextBadge.requirement) *
                                    100
                                  }
                                  className="h-2"
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-500">
                                  {friendNextBadge.requirement - currentCount}{" "}
                                  more friends needed
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Reviews Next Badge */}
                      {(() => {
                        const reviewNextBadge = allBadgeTypes
                          .filter((badge) => badge.id.includes("review"))
                          .find((badge) => !badge.earned);

                        if (reviewNextBadge) {
                          const currentCount = userStats?.totalReviews || 0;
                          return (
                            <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50">
                              <div className="flex items-start gap-3 mb-3">
                                <div
                                  className={`${reviewNextBadge.color} flex-shrink-0`}
                                >
                                  {reviewNextBadge.icon}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-800">
                                    {reviewNextBadge.name}
                                  </h4>
                                  <p className="text-sm text-gray-700 dark:text-gray-600">
                                    {reviewNextBadge.description}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-800 dark:text-gray-700">
                                  <span>Reviews Progress</span>
                                  <span>
                                    {currentCount} /{" "}
                                    {reviewNextBadge.requirement} reviews
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    (currentCount /
                                      reviewNextBadge.requirement) *
                                    100
                                  }
                                  className="h-2"
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-500">
                                  {reviewNextBadge.requirement - currentCount}{" "}
                                  more reviews needed
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

                {/* All Badges Overview */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Medal className="w-5 h-5 text-purple-600" />
                    All Achievements
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                          badge.earned
                            ? `border-green-200 ${badge.bgColor}`
                            : "border-gray-200 bg-gray-50 opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`${badge.earned ? badge.color : "text-gray-400"} flex-shrink-0`}
                          >
                            {badge.icon}
                          </div>
                          <div className="flex-1">
                            <h4
                              className={`font-semibold ${badge.earned ? "text-gray-900 dark:text-gray-800" : "text-gray-500"}`}
                            >
                              {badge.name}
                            </h4>
                            <p
                              className={`text-sm ${badge.earned ? "text-gray-700 dark:text-gray-600" : "text-gray-400"} mb-2`}
                            >
                              {badge.description}
                            </p>
                            <Badge
                              variant={badge.earned ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {badge.earned
                                ? "✓ Earned"
                                : (() => {
                                    const itemType =
                                      badge.id.includes("social") ||
                                      badge.id.includes("friend")
                                        ? "friends"
                                        : badge.id.includes("review")
                                          ? "reviews"
                                          : "games";
                                    return `${badge.requirement} ${itemType} needed`;
                                  })()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;

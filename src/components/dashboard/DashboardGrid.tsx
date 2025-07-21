import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays, BarChart2, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface GameCardProps {
  title: string;
  rating: number;
  status: "playing" | "played" | "want-to-play";
  genre: string;
  platform: string;
  image: string;
  hoursPlayed?: number;
}

interface DashboardGridProps {
  games?: GameCardProps[];
  isLoading?: boolean;
}

const defaultGames: GameCardProps[] = [
  {
    title: "The Legend of Zelda: Breath of the Wild",
    rating: 9.5,
    status: "played",
    genre: "Action-Adventure",
    platform: "Nintendo Switch",
    image:
      "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    hoursPlayed: 120,
  },
  {
    title: "Cyberpunk 2077",
    rating: 7.5,
    status: "playing",
    genre: "RPG",
    platform: "PC",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80",
    hoursPlayed: 45,
  },
  {
    title: "Elden Ring",
    rating: 0,
    status: "want-to-play",
    genre: "Action RPG",
    platform: "PlayStation 5",
    image:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80",
  },
];

const GameCard = ({
  title,
  rating,
  status,
  genre,
  platform,
  image,
  hoursPlayed,
}: GameCardProps) => {
  const navigate = useNavigate();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "playing":
        return "bg-green-100 text-green-800";
      case "played":
        return "bg-blue-100 text-blue-800";
      case "want-to-play":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "playing":
        return "Playing";
      case "played":
        return "Played";
      case "want-to-play":
        return "Want to Play";
      default:
        return status;
    }
  };
  return (
    <Card
      className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => {
        // For demo purposes, we'll use a placeholder ID since these are default games
        // In a real implementation, you'd pass the actual game collection ID
        console.log("Navigate to game page for:", title);
      }}
    >
      <div className="aspect-video relative overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}
          >
            {getStatusText(status)}
          </span>
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-gray-900 line-clamp-2">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{genre}</span>
          <span>•</span>
          <span>{platform}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rating > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="relative">
                    <div className="h-4 w-4 text-gray-200">★</div>
                    <div
                      className="absolute inset-0 h-4 w-4 text-yellow-400 overflow-hidden"
                      style={{
                        width: `${Math.max(0, Math.min(1, (rating - i * 2) / 2)) * 100}%`,
                      }}
                    >
                      ★
                    </div>
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {rating}/10
              </span>
            </div>
          )}
          {hoursPlayed && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{hoursPlayed} hours played</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const DashboardGrid = ({
  games = defaultGames,
  isLoading = false,
}: DashboardGridProps) => {
  const [loading, setLoading] = useState(isLoading);

  // Simulate loading for demo purposes
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 h-full">
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card
              key={index}
              className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm h-[220px] flex items-center justify-center"
            >
              <div className="flex flex-col items-center justify-center p-6">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-gray-100 border-t-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full bg-blue-500/20 animate-pulse" />
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-gray-500">
                  Loading game library...
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full">
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Summary Cards */}
        <Card className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-gray-900">
              Total Games
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">
              {games.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Games in your library</p>
          </CardContent>
        </Card>
        <Card className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-gray-900">
              Gaming Friends
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">8</div>
            <p className="text-sm text-gray-500 mt-1">Connected friends</p>
          </CardContent>
        </Card>
        <Card className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-gray-900">
              Average Rating
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">8.5</div>
            <p className="text-sm text-gray-500 mt-1">Your game ratings</p>
          </CardContent>
        </Card>

        {/* Game Cards */}
        {games.map((game, index) => (
          <GameCard key={index} {...game} />
        ))}
      </div>
    </div>
  );
};

export default DashboardGrid;

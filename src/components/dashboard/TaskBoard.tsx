import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";

interface Activity {
  id: string;
  type: "rating" | "review" | "achievement" | "friend";
  title: string;
  description: string;
  user: {
    name: string;
    avatar: string;
  };
  timestamp: string;
  game?: string;
  rating?: number;
}

interface SocialTimelineProps {
  activities?: Activity[];
  onActivityClick?: (activity: Activity) => void;
  isLoading?: boolean;
}

const defaultActivities: Activity[] = [
  {
    id: "1",
    type: "rating",
    title: "Rated The Legend of Zelda: Breath of the Wild",
    description:
      "Gave it a perfect 10/10 - absolutely incredible open world experience!",
    user: {
      name: "Alice Smith",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
    },
    timestamp: "2 hours ago",
    game: "The Legend of Zelda: Breath of the Wild",
    rating: 10,
  },
  {
    id: "2",
    type: "achievement",
    title: "Unlocked Achievement: Master Explorer",
    description: "Discovered all shrines in Breath of the Wild",
    user: {
      name: "Bob Johnson",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    },
    timestamp: "5 hours ago",
    game: "The Legend of Zelda: Breath of the Wild",
  },
  {
    id: "3",
    type: "review",
    title: "Wrote a review for Cyberpunk 2077",
    description:
      "Great story and visuals, but still has some technical issues. Worth playing now though!",
    user: {
      name: "Carol Williams",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol",
    },
    timestamp: "1 day ago",
    game: "Cyberpunk 2077",
    rating: 7.5,
  },
  {
    id: "4",
    type: "friend",
    title: "Started following David Miller",
    description: "Connected with a new gaming friend",
    user: {
      name: "Eve Davis",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eve",
    },
    timestamp: "2 days ago",
  },
];

const SocialTimeline = ({
  activities = defaultActivities,
  onActivityClick = () => {},
  isLoading = false,
}: SocialTimelineProps) => {
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
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "rating":
        return "⭐";
      case "review":
        return "📝";
      case "achievement":
        return "🏆";
      case "friend":
        return "👥";
      default:
        return "🎮";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "rating":
        return "bg-yellow-50 border-yellow-200";
      case "review":
        return "bg-blue-50 border-blue-200";
      case "achievement":
        return "bg-green-50 border-green-200";
      case "friend":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Social Timeline
          </h2>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 h-9 shadow-sm transition-colors opacity-50 cursor-not-allowed">
            <PlusCircle className="mr-2 h-4 w-4" />
            Share Activity
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-gray-100 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-blue-500/20 animate-pulse" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 mt-4">
            Loading social timeline...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Social Timeline
        </h2>
        <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 h-9 shadow-sm transition-colors">
          <PlusCircle className="mr-2 h-4 w-4" />
          Share Activity
        </Button>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {activities.map((activity) => (
          <motion.div
            key={activity.id}
            layoutId={activity.id}
            onClick={() => onActivityClick(activity)}
          >
            <Card
              className={`p-4 cursor-pointer hover:shadow-md transition-all duration-200 rounded-xl border ${getActivityColor(activity.type)} bg-white shadow-sm`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <img
                    src={activity.user.avatar}
                    alt={activity.user.name}
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {getActivityIcon(activity.type)}
                    </span>
                    <h4 className="font-medium text-gray-900 text-sm">
                      {activity.user.name}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {activity.timestamp}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {activity.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {activity.description}
                  </p>
                  {activity.game && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>🎮</span>
                      <span>{activity.game}</span>
                      {activity.rating && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span>⭐</span>
                            <span>{activity.rating}/10</span>
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SocialTimeline;

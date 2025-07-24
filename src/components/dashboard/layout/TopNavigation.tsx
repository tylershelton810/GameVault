import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bell,
  Search,
  Settings,
  User,
  Camera,
  Menu,
  UserPlus,
  Loader2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../../supabase/auth";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "../../../../supabase/supabase";
import { Tables } from "@/types/supabase";

type Notification = Tables<"notifications"> & {
  from_user: Tables<"users">;
};

interface IGDBGame {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  rating?: number;
  summary?: string;
}

interface TopNavigationProps {
  onSearch?: (query: string) => void;
  onMobileMenuClick?: () => void;
  showMobileMenu?: boolean;
}

const TopNavigation = ({
  onSearch = () => {},
  onMobileMenuClick = () => {},
  showMobileMenu = true,
}: TopNavigationProps) => {
  const { user, signOut, updateProfilePicture } = useAuth();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdatingPicture, setIsUpdatingPicture] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IGDBGame[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleProfilePictureUpdate = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    try {
      setIsUpdatingPicture(true);
      await updateProfilePicture(file);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error updating profile picture:", error);
      alert("Failed to update profile picture. Please try again.");
    } finally {
      setIsUpdatingPicture(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // IGDB API search function
  const searchIGDBGames = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
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
        setSearchResults(data.slice(0, 5)); // Limit to 5 results for dropdown
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error("Error searching games:", error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchIGDBGames(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchIGDBGames]);

  // Handle game selection
  const handleGameSelect = (game: IGDBGame) => {
    // Navigate to game detail page using IGDB ID
    // We'll create a temporary game collection entry or use a special route
    navigate(`/game/igdb-${game.id}`);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Handle search input focus/blur
  const handleSearchFocus = () => {
    if (searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding results to allow for clicks
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          from_user:users!notifications_from_user_id_fkey(*)
        `,
        )
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      // Navigate based on notification type
      if (notification.notification_type === "friend_request") {
        navigate("/friends", { state: { activeTab: "requests" } });
      }

      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  // Load notifications on mount and set up realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Set up realtime subscription for notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const getNotificationTitle = (notification: Notification) => {
    switch (notification.notification_type) {
      case "friend_request":
        return `${notification.from_user?.full_name || "Someone"} sent you a friend request`;
      case "like":
        return `${notification.from_user?.full_name || "Someone"} liked your activity`;
      case "comment":
        return `${notification.from_user?.full_name || "Someone"} commented on your activity`;
      default:
        return "New notification";
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.notification_type) {
      case "friend_request":
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (!user) return null;

  return (
    <div
      className="w-full h-16 border-b bg-background/95 backdrop-blur-md flex items-center justify-between px-4 md:px-6 fixed top-0 z-40 shadow-sm"
      style={{ borderColor: currentTheme.colors.border }}
    >
      <div className="flex items-center gap-3 md:gap-4 flex-1">
        {/* Mobile: Add left padding to account for hamburger menu */}
        <div className="relative w-full max-w-[200px] sm:max-w-sm md:max-w-none md:w-64 ml-12 md:ml-0 mr-3 md:mr-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          {isSearching && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {searchQuery && !isSearching && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Input
            placeholder="Search games..."
            className="pl-9 pr-9 h-10 rounded-full border-0 text-sm focus:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 w-full md:w-auto"
            style={{
              backgroundColor: `hsl(${currentTheme.colors.muted})`,
              color: `hsl(${currentTheme.colors.foreground})`,
            }}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch(e.target.value);
            }}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {searchResults.map((game) => (
                <div
                  key={game.id}
                  className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 flex items-start gap-3"
                  onClick={() => handleGameSelect(game)}
                >
                  {game.cover && (
                    <img
                      src={`https:${game.cover.url.replace("t_thumb", "t_cover_small")}`}
                      alt={game.name}
                      className="w-10 h-12 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {game.name}
                    </h4>
                    {game.rating && (
                      <p className="text-xs text-muted-foreground">
                        Rating: {Math.round(game.rating)}/100
                      </p>
                    )}
                    {game.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {game.summary.length > 100
                          ? `${game.summary.substring(0, 100)}...`
                          : game.summary}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full h-9 w-9 transition-colors"
                    style={{
                      backgroundColor: `hsl(${currentTheme.colors.muted})`,
                      color: `hsl(${currentTheme.colors.mutedForeground})`,
                    }}
                  >
                    <Bell className="h-4 w-4" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium border border-background">
                        {notifications.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-xl overflow-hidden p-2 shadow-lg"
                >
                  <DropdownMenuLabel className="text-sm font-medium px-2">
                    Notifications
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  {isLoadingNotifications ? (
                    <DropdownMenuItem className="rounded-lg text-sm py-2 text-muted-foreground">
                      Loading...
                    </DropdownMenuItem>
                  ) : notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="rounded-lg text-sm py-2 cursor-pointer hover:bg-accent"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex-shrink-0">
                            {getNotificationIcon(notification)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {getNotificationTitle(notification)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                notification.created_at,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem className="rounded-lg text-sm py-2 text-muted-foreground">
                      No new notifications
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent className="rounded-lg text-xs px-3 py-1.5">
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 hover:cursor-pointer">
              <AvatarImage
                src={
                  user.user_metadata?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
                }
                alt={user.email || ""}
              />
              <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="rounded-xl border-none shadow-lg"
          >
            <DropdownMenuLabel
              className="text-xs"
              style={{ color: `hsl(${currentTheme.colors.mutedForeground})` }}
            >
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => navigate("/account")}
            >
              <User className="mr-2 h-4 w-4" />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={triggerFileInput}
              disabled={isUpdatingPicture}
            >
              <Camera className="mr-2 h-4 w-4" />
              {isUpdatingPicture ? "Updating..." : "Update Picture"}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => signOut()}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleProfilePictureUpdate}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default TopNavigation;

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
import { Bell, Home, Search, Settings, User, Camera, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../../supabase/auth";
import { useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

interface TopNavigationProps {
  onSearch?: (query: string) => void;
  notifications?: Array<{ id: string; title: string }>;
  onMobileMenuClick?: () => void;
  showMobileMenu?: boolean;
}

const TopNavigation = ({
  onSearch = () => {},
  notifications = [
    { id: "1", title: "New project assigned" },
    { id: "2", title: "Meeting reminder" },
  ],
  onMobileMenuClick = () => {},
  showMobileMenu = true,
}: TopNavigationProps) => {
  const { user, signOut, updateProfilePicture } = useAuth();
  const { currentTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdatingPicture, setIsUpdatingPicture] = useState(false);

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

  if (!user) return null;

  return (
    <div
      className="w-full h-16 border-b bg-background/95 backdrop-blur-md flex items-center justify-between px-4 md:px-6 fixed top-0 z-40 shadow-sm"
      style={{ borderColor: currentTheme.colors.border }}
    >
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        {showMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={onMobileMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Link
          to="/"
          className="text-foreground hover:text-muted-foreground transition-colors"
        >
          <Home className="h-5 w-5" />
        </Link>
        <div className="relative w-full max-w-sm md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search games..."
            className="pl-9 h-10 rounded-full border-0 text-sm focus:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
            style={{
              backgroundColor: `hsl(${currentTheme.colors.muted})`,
              color: `hsl(${currentTheme.colors.foreground})`,
            }}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
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
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="rounded-lg text-sm py-2"
                    >
                      {notification.title}
                    </DropdownMenuItem>
                  ))}
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
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
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

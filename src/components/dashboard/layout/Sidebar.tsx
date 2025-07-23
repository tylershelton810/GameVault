import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Home,
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  HelpCircle,
  FolderKanban,
  GamepadIcon,
  Menu,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
}

interface SidebarProps {
  items?: NavItem[];
  activeItem?: string;
  onItemClick?: (label: string) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

import { useNavigate } from "react-router-dom";

const defaultNavItems: NavItem[] = [
  {
    icon: <FolderKanban size={20} />,
    label: "Social Timeline",
    isActive: true,
  },
  { icon: <LayoutDashboard size={20} />, label: "Game Library" },
  { icon: <GamepadIcon size={20} />, label: "Game Clubs" },
  { icon: <Calendar size={20} />, label: "Discover" },
  { icon: <Users size={20} />, label: "Friends" },
];

const defaultBottomItems: NavItem[] = [
  { icon: <Settings size={20} />, label: "Settings" },
  { icon: <HelpCircle size={20} />, label: "About" },
];

const Sidebar = ({
  items = defaultNavItems,
  activeItem = "Social Timeline",
  onItemClick = () => {},
  isMobile = false,
  isOpen = false,
  onOpenChange = () => {},
}: SidebarProps) => {
  const navigate = useNavigate();
  const { theme, currentTheme } = useTheme();

  // Use theme colors consistently
  const isElectricPlayground = theme === "electric-playground";
  const sidebarBg = isElectricPlayground
    ? "linear-gradient(135deg, #222831 0%, #393E46 100%)"
    : `hsl(${currentTheme.colors.card})`;
  const sidebarTextColor = `hsl(${currentTheme.colors.cardForeground})`;
  const sidebarBorder = `hsl(${currentTheme.colors.border})`;
  const accentColor = `hsl(${currentTheme.colors.accent})`;
  const primaryColor = `hsl(${currentTheme.colors.primary})`;

  const handleItemClick = (label: string) => {
    onItemClick(label);

    // Close mobile sidebar after navigation
    if (isMobile) {
      onOpenChange(false);
    }

    // Handle navigation based on the item clicked
    switch (label) {
      case "Social Timeline":
        navigate("/social-timeline");
        break;
      case "Game Library":
        navigate("/game-library");
        break;
      case "Game Clubs":
        navigate("/game-clubs");
        break;
      case "Discover":
        navigate("/discover");
        break;
      case "Friends":
        navigate("/friends");
        break;
      case "Settings":
        navigate("/settings");
        break;
      case "About":
        navigate("/about");
        break;
      default:
        // For other items, just update the active state for now
        break;
    }
  };
  const SidebarContent = () => (
    <div
      className="h-full backdrop-blur-md border-r flex flex-col"
      style={{
        background: sidebarBg,
        borderColor: sidebarBorder,
        color: sidebarTextColor,
      }}
    >
      <div className="p-6">
        <h2
          className="text-xl font-bold mb-2 flex items-center gap-2"
          style={{
            color: accentColor,
          }}
        >
          <span className="text-2xl">🎮</span>
          Game Shlf
        </h2>
        <p className="text-sm opacity-80" style={{ color: sidebarTextColor }}>
          Track your gaming journey
        </p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1.5">
          {items.map((item) => (
            <Button
              key={item.label}
              variant={"ghost"}
              className={`w-full justify-start gap-3 h-11 rounded-xl text-sm font-medium transition-all duration-200 ${item.label === activeItem ? "shadow-lg" : "hover:opacity-80"}`}
              onClick={() => handleItemClick(item.label)}
              style={{
                background:
                  item.label === activeItem ? accentColor : "transparent",
                color:
                  item.label === activeItem
                    ? `hsl(${currentTheme.colors.accentForeground})`
                    : sidebarTextColor,
                opacity: item.label === activeItem ? 1 : 0.85,
                border: "1px solid transparent",
              }}
            >
              <span
                style={{
                  color:
                    item.label === activeItem
                      ? `hsl(${currentTheme.colors.accentForeground})`
                      : sidebarTextColor,
                  opacity: 1,
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </Button>
          ))}
        </div>

        <Separator
          className="my-6"
          style={{
            backgroundColor: `hsl(${currentTheme.colors.border})`,
          }}
        />

        <div className="space-y-3">
          <h3
            className="text-xs font-semibold px-4 py-1 uppercase tracking-wider opacity-70"
            style={{
              color: accentColor,
            }}
          >
            Game Status
          </h3>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-9 rounded-xl text-sm font-medium ${isElectricPlayground ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
            style={{ color: sidebarTextColor, opacity: 0.85 }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm"></span>
            Playing
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-9 rounded-xl text-sm font-medium ${isElectricPlayground ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
            style={{ color: sidebarTextColor, opacity: 0.85 }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: primaryColor }}
            ></span>
            Played
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-9 rounded-xl text-sm font-medium ${isElectricPlayground ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
            style={{ color: sidebarTextColor, opacity: 0.85 }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: accentColor }}
            ></span>
            Want to Play
          </Button>
        </div>
      </ScrollArea>

      <div
        className="p-4 mt-auto border-t"
        style={{
          borderColor: `hsl(${currentTheme.colors.border})`,
        }}
      >
        {defaultBottomItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl text-sm font-medium mb-1.5 transition-all duration-200 hover:opacity-80"
            onClick={() => handleItemClick(item.label)}
            style={{ color: sidebarTextColor, opacity: 0.85 }}
          >
            <span style={{ color: sidebarTextColor, opacity: 0.8 }}>
              {item.icon}
            </span>
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full h-10 w-10 shadow-sm"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="w-[280px] h-full hidden md:flex">
      <SidebarContent />
    </div>
  );
};

export default Sidebar;

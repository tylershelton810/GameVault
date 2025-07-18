import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  HelpCircle,
  FolderKanban,
} from "lucide-react";

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
}

import { useNavigate } from "react-router-dom";

const defaultNavItems: NavItem[] = [
  {
    icon: <FolderKanban size={20} />,
    label: "Social Timeline",
    isActive: true,
  },
  { icon: <LayoutDashboard size={20} />, label: "Game Library" },
  { icon: <Calendar size={20} />, label: "Discover" },
  { icon: <Users size={20} />, label: "Friends" },
];

const defaultBottomItems: NavItem[] = [
  { icon: <Settings size={20} />, label: "Settings" },
  { icon: <HelpCircle size={20} />, label: "Help" },
];

const Sidebar = ({
  items = defaultNavItems,
  activeItem = "Social Timeline",
  onItemClick = () => {},
}: SidebarProps) => {
  const navigate = useNavigate();

  const handleItemClick = (label: string) => {
    onItemClick(label);

    // Handle navigation based on the item clicked
    switch (label) {
      case "Social Timeline":
        navigate("/social-timeline");
        break;
      case "Game Library":
        navigate("/game-library");
        break;
      case "Friends":
        navigate("/friends");
        break;
      default:
        // For other items, just update the active state for now
        break;
    }
  };
  return (
    <div className="w-[280px] h-full bg-white/80 backdrop-blur-md border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-2 text-gray-900">GameVault</h2>
        <p className="text-sm text-gray-500">Track your gaming journey</p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1.5">
          {items.map((item) => (
            <Button
              key={item.label}
              variant={"ghost"}
              className={`w-full justify-start gap-3 h-10 rounded-xl text-sm font-medium ${item.label === activeItem ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "text-gray-700 hover:bg-gray-100"}`}
              onClick={() => handleItemClick(item.label)}
            >
              <span
                className={`${item.label === activeItem ? "text-blue-600" : "text-gray-500"}`}
              >
                {item.icon}
              </span>
              {item.label}
            </Button>
          ))}
        </div>

        <Separator className="my-4 bg-gray-100" />

        <div className="space-y-3">
          <h3 className="text-xs font-medium px-4 py-1 text-gray-500 uppercase tracking-wider">
            Game Status
          </h3>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-9 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Playing
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-9 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            Played
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-9 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
            Want to Play
          </Button>
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-gray-200">
        {defaultBottomItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className="w-full justify-start gap-3 h-10 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 mb-1.5"
            onClick={() => handleItemClick(item.label)}
          >
            <span className="text-gray-500">{item.icon}</span>
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;

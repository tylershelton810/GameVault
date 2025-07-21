import React, { useState, useEffect } from "react";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import DashboardGrid from "../dashboard/DashboardGrid";
import SocialTimeline from "../dashboard/TaskBoard";
import GameClubList from "../GameClub/GameClubList";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Function to trigger loading state for demonstration
  const handleRefresh = () => {
    setLoading(true);
    // Reset loading after 2 seconds
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation
        onMobileMenuClick={() => setIsSidebarOpen(true)}
        showMobileMenu={isMobile}
      />
      <div className="flex h-[calc(100vh-64px)] mt-16">
        <Sidebar
          isMobile={isMobile}
          isOpen={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
        />
        <main className="flex-1 overflow-auto w-full md:w-auto">
          <div className="container mx-auto px-4 md:px-6 pt-4 pb-2 flex justify-end">
            <Button
              onClick={handleRefresh}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 h-9 shadow-sm transition-colors flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {loading ? "Loading..." : "Refresh Library"}
              </span>
              <span className="sm:hidden">{loading ? "..." : "Refresh"}</span>
            </Button>
          </div>
          <div
            className={cn(
              "container mx-auto p-4 md:p-6 space-y-6 md:space-y-8",
              "transition-all duration-300 ease-in-out",
            )}
          >
            <DashboardGrid isLoading={loading} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div>
                <GameClubList showCreateButton={false} limit={3} />
              </div>
              <div>
                <SocialTimeline isLoading={loading} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;

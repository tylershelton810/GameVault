import React, { useState, useEffect } from "react";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import DashboardGrid from "../dashboard/DashboardGrid";
import SocialTimeline from "../dashboard/TaskBoard";
import GameClubList from "../GameClub/GameClubList";
import OnboardingOverlay from "../onboarding/OnboardingOverlay";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../../../supabase/auth";

const Home = () => {
  const { user, getOnboardingStatus, updateOnboardingStatus } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState<
    "games" | "friends" | "clubs"
  >("games");
  const [onboardingStatus, setOnboardingStatus] = useState({
    games: false,
    friends: false,
    clubs: false,
    completed: false,
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        const status = await getOnboardingStatus();
        setOnboardingStatus(status);

        // If onboarding is not completed, show the next step
        if (!status.completed) {
          if (!status.games) {
            setCurrentOnboardingStep("games");
            setShowOnboarding(true);
          } else if (!status.friends) {
            setCurrentOnboardingStep("friends");
            setShowOnboarding(true);
          } else if (!status.clubs) {
            setCurrentOnboardingStep("clubs");
            setShowOnboarding(true);
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }
    };

    checkOnboardingStatus();
  }, [user, getOnboardingStatus]);

  const handleOnboardingStepComplete = async (
    step: "games" | "friends" | "clubs",
  ) => {
    const newStatus = { ...onboardingStatus, [step]: true };
    setOnboardingStatus(newStatus);

    // Determine next step
    if (step === "games" && !newStatus.friends) {
      setTimeout(() => {
        setCurrentOnboardingStep("friends");
        setShowOnboarding(true);
      }, 2000); // Show next step after 2 seconds
    } else if (step === "friends" && !newStatus.clubs) {
      setTimeout(() => {
        setCurrentOnboardingStep("clubs");
        setShowOnboarding(true);
      }, 2000);
    } else {
      // All steps completed
      try {
        await updateOnboardingStatus({ completed: true });
        setOnboardingStatus((prev) => ({ ...prev, completed: true }));
      } catch (error) {
        console.error("Error completing onboarding:", error);
      }
    }
  };

  // Function to trigger loading state for demonstration
  const handleRefresh = () => {
    setLoading(true);
    // Reset loading after 2 seconds
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };
  return (
    <div className="bg-background">
      <TopNavigation
        onMobileMenuClick={() => setIsSidebarOpen(true)}
        showMobileMenu={isMobile}
      />
      <div className="flex pt-16">
        <Sidebar
          isMobile={isMobile}
          isOpen={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
        />
        <main className="flex-1 w-full md:w-auto">
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

      {/* Onboarding Overlay */}
      <OnboardingOverlay
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        currentStep={currentOnboardingStep}
        onStepComplete={handleOnboardingStepComplete}
      />
    </div>
  );
};

export default Home;

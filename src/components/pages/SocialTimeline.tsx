import React, { useState, useEffect } from "react";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import SocialTimelineComponent from "../dashboard/TaskBoard";
import OnboardingOverlay from "../onboarding/OnboardingOverlay";
import { useAuth } from "../../../supabase/auth";

const SocialTimeline = () => {
  const { user, getOnboardingStatus, updateOnboardingStatus } = useAuth();
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

  // Check onboarding status when user loads
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        const status = await getOnboardingStatus();
        setOnboardingStatus(status);

        // Show onboarding if not completed
        if (!status.completed) {
          // Determine which step to show first
          if (!status.games) {
            setCurrentOnboardingStep("games");
          } else if (!status.friends) {
            setCurrentOnboardingStep("friends");
          } else if (!status.clubs) {
            setCurrentOnboardingStep("clubs");
          }
          setShowOnboarding(true);
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
    try {
      const updatedStatus = { ...onboardingStatus, [step]: true };
      setOnboardingStatus(updatedStatus);

      // Check if all steps are completed
      if (updatedStatus.games && updatedStatus.friends && updatedStatus.clubs) {
        updatedStatus.completed = true;
        setOnboardingStatus(updatedStatus);
        setShowOnboarding(false);
        return;
      }

      // Show next step
      if (step === "games" && !updatedStatus.friends) {
        setCurrentOnboardingStep("friends");
      } else if (step === "friends" && !updatedStatus.clubs) {
        setCurrentOnboardingStep("clubs");
      } else {
        setShowOnboarding(false);
      }
    } catch (error) {
      console.error("Error completing onboarding step:", error);
    }
  };

  return (
    <div className="bg-background h-screen overflow-hidden">
      <TopNavigation
        onMobileMenuClick={() => setIsSidebarOpen(true)}
        showMobileMenu={isMobile}
      />
      <div className="flex pt-16 h-full">
        <Sidebar
          activeItem="Social Timeline"
          isMobile={isMobile}
          isOpen={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
        />
        <main className="flex-1 bg-background overflow-hidden">
          <div className="w-full h-full">
            <SocialTimelineComponent />
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

export default SocialTimeline;

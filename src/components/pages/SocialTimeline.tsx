import React, { useState, useEffect } from "react";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import SocialTimelineComponent from "../dashboard/TaskBoard";

const SocialTimeline = () => {
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

  return (
    <div className="bg-background">
      <TopNavigation
        onMobileMenuClick={() => setIsSidebarOpen(true)}
        showMobileMenu={isMobile}
      />
      <div className="flex pt-16">
        <Sidebar
          activeItem="Social Timeline"
          isMobile={isMobile}
          isOpen={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
        />
        <main className="flex-1 w-full md:w-auto bg-background">
          <div className="container mx-auto p-4 md:p-6">
            <SocialTimelineComponent />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SocialTimeline;

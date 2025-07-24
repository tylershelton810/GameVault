import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Gamepad2,
  Users,
  Crown,
  ArrowRight,
  CheckCircle,
  X,
  Star,
  MessageSquare,
  Heart,
} from "lucide-react";
import { useAuth } from "../../../supabase/auth";
import { useNavigate } from "react-router-dom";

type OnboardingStep = "games" | "friends" | "clubs";

interface OnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: OnboardingStep;
  onStepComplete: (step: OnboardingStep) => void;
}

const OnboardingOverlay = ({
  isOpen,
  onClose,
  currentStep,
  onStepComplete,
}: OnboardingOverlayProps) => {
  const { updateOnboardingStatus } = useAuth();
  const navigate = useNavigate();
  const [isCompleting, setIsCompleting] = useState(false);

  const steps = {
    games: {
      title: "Build Your Game Library",
      icon: <Gamepad2 className="w-8 h-8 text-blue-500" />,
      description: "Add games to your collection, rate them, and write reviews",
      benefits: [
        "Track games you're playing, played, or want to play",
        "Rate games on a 10-point scale with half-point precision",
        "Write detailed reviews to share your thoughts",
        "Mark favorites and organize your backlog",
        "Help curate the discover page for better recommendations",
      ],
      actionText: "Go to Game Library",
      route: "/game-library",
    },
    friends: {
      title: "Connect with Friends",
      icon: <Users className="w-8 h-8 text-green-500" />,
      description:
        "See what your friends are playing and discover new games together",
      benefits: [
        "View friends' game libraries and ratings",
        "See what games friends are currently playing",
        "Read friends' reviews and recommendations",
        "Discover shared games in your collections",
        "Get notified when friends add new games or reviews",
      ],
      actionText: "Add Friends",
      route: "/friends",
    },
    clubs: {
      title: "Join Game Clubs",
      icon: <Crown className="w-8 h-8 text-purple-500" />,
      description:
        "Create book clubs for your games and share experiences with friends",
      benefits: [
        "Create clubs around specific games with friends",
        "Set start and end dates for shared gaming experiences",
        "Discuss games in real-time with club members",
        "Share reviews and ratings within your club",
        "Build a community around your favorite games",
      ],
      actionText: "Explore Game Clubs",
      route: "/game-clubs",
    },
  };

  const currentStepData = steps[currentStep];

  const handleGetStarted = async () => {
    setIsCompleting(true);
    try {
      // Mark this step as completed
      await updateOnboardingStatus({ [currentStep]: true });
      onStepComplete(currentStep);

      // Navigate to the relevant page
      navigate(currentStepData.route);
      onClose();
    } catch (error) {
      console.error("Error completing onboarding step:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    setIsCompleting(true);
    try {
      // Mark this step as completed even if skipped
      await updateOnboardingStatus({ [currentStep]: true });
      onStepComplete(currentStep);

      // Don't close immediately - let the parent component handle next step logic
      // onClose() will be called by the parent if there are no more steps
    } catch (error) {
      console.error("Error skipping onboarding step:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {currentStepData.icon}
            <DialogTitle className="text-2xl font-bold">
              {currentStepData.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-4">
              {currentStepData.description}
            </p>
            <div className="flex justify-center gap-2 mb-6">
              {Object.keys(steps).map((step, index) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    step === currentStep
                      ? "bg-primary"
                      : index < Object.keys(steps).indexOf(currentStep)
                        ? "bg-green-500"
                        : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          <Card className="border-2 border-dashed border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {currentStepData.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Visual Examples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentStep === "games" && (
              <>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-16 bg-gradient-to-b from-blue-500 to-blue-600 rounded mx-auto mb-2" />
                  <p className="text-xs font-medium">Add Games</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="flex justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < 4
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium">Rate & Review</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <p className="text-xs font-medium">Mark Favorites</p>
                </div>
              </>
            )}
            {currentStep === "friends" && (
              <>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-2" />
                  <p className="text-xs font-medium">Add Friends</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="flex -space-x-2 justify-center mb-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white" />
                    <div className="w-6 h-6 bg-purple-500 rounded-full border-2 border-white" />
                  </div>
                  <p className="text-xs font-medium">Shared Games</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <MessageSquare className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-xs font-medium">See Reviews</p>
                </div>
              </>
            )}
            {currentStep === "clubs" && (
              <>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Crown className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-xs font-medium">Create Clubs</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="w-8 h-2 bg-green-500 rounded mx-auto mb-2" />
                  <p className="text-xs font-medium">Track Progress</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <MessageSquare className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-xs font-medium">Discuss Games</p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isCompleting}
              className="flex-1"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleGetStarted}
              disabled={isCompleting}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isCompleting ? (
                "Loading..."
              ) : (
                <>
                  {currentStepData.actionText}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingOverlay;

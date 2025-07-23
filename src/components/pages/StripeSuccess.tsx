import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Heart, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const StripeSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const sessionId = searchParams.get("session_id");
  const type = searchParams.get("type") || "donation";

  useEffect(() => {
    // Show success toast
    toast({
      title: "Thank you for your support! 🎉",
      description:
        type === "subscription"
          ? "Your monthly support means the world to us!"
          : "Your donation helps keep Game Shlf running!",
      duration: 5000,
    });
  }, [toast, type]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <Heart className="h-6 w-6 text-red-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl text-foreground">
            {type === "subscription"
              ? "Subscription Active!"
              : "Payment Successful!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              {type === "subscription"
                ? "Thank you for becoming a monthly supporter! Your recurring support helps ensure Game Shlf continues to grow and improve."
                : "Thank you for your generous donation! Your support helps cover development costs and keeps Game Shlf free for everyone."}
            </p>
            {sessionId && (
              <p className="text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded">
                Session ID: {sessionId}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate("/settings")}
              className="w-full"
              variant="default"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            {type === "subscription" && (
              <Button
                onClick={() => {
                  // In a real app, you'd pass the actual customer ID
                  // For now, direct them to settings where they can access the portal
                  navigate("/settings");
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Manage Subscription
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Questions about your{" "}
              {type === "subscription" ? "subscription" : "donation"}? Contact
              support or manage your billing through the settings page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StripeSuccess;

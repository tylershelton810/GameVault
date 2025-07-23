import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";

const StripeCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Payment Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-muted-foreground">
              No worries! Your payment was cancelled and no charges were made.
              Game Shlf will always remain free to use.
            </p>
            <p className="text-sm text-muted-foreground">
              If you change your mind later, you can always support Game Shlf
              development through the Settings page.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate("/settings")}
              className="w-full"
              variant="default"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Thank you for considering supporting Game Shlf! Your usage and
              feedback are valuable too. 🎮
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StripeCancel;

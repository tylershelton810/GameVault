import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme, themes, ThemeName } from "@/lib/theme";
import { Palette, Check, Bell, Heart, CreditCard } from "lucide-react";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import { useState, useEffect } from "react";
import { useAuth } from "../../../supabase/auth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "../../../supabase/supabase";

const Settings = () => {
  const { theme, setTheme, currentTheme } = useTheme();
  const { updateNotificationPreferences, getNotificationPreferences } =
    useAuth();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<
    Record<string, boolean>
  >({
    friend_requests: true,
  });
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  // Load notification preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await getNotificationPreferences();
        setNotificationPreferences(preferences);
      } catch (error) {
        console.error("Error loading notification preferences:", error);
        toast({
          title: "Error",
          description: "Failed to load notification preferences",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, [getNotificationPreferences, toast]);

  // Handle Stripe customer portal
  const handleCustomerPortal = async () => {
    setIsLoadingPortal(true);
    try {
      // For demo purposes, we'll use a placeholder customer ID
      // In a real app, you'd store the customer ID when they first make a purchase
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-create-customer-portal",
        {
          body: {
            customer_id: "cus_placeholder", // This should be the actual customer ID from your database
          },
        },
      );

      if (error) {
        console.error("Error creating customer portal session:", error);
        toast({
          title: "Error",
          description:
            "Failed to access billing portal. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description:
            "Failed to redirect to billing portal. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error accessing customer portal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  // Handle Stripe checkout
  const handleStripeCheckout = async (
    amount: number,
    type: "donation" | "subscription",
  ) => {
    setIsProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-create-checkout-session",
        {
          body: {
            amount,
            type,
            currency: "usd",
          },
        },
      );

      if (error) {
        console.error("Error creating checkout session:", error);
        toast({
          title: "Error",
          description: "Failed to create payment session. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "Failed to redirect to payment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle preference changes
  const handlePreferenceChange = async (key: string, value: boolean) => {
    const newPreferences = {
      ...notificationPreferences,
      [key]: value,
    };
    setNotificationPreferences(newPreferences);

    setIsSavingPreferences(true);
    try {
      await updateNotificationPreferences(newPreferences);
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      // Revert the change
      setNotificationPreferences(notificationPreferences);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation
        onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        showMobileMenu={true}
      />

      <div className="flex pt-16">
        <Sidebar
          activeItem="Settings"
          isMobile={false}
          isOpen={isMobileMenuOpen}
          onOpenChange={setIsMobileMenuOpen}
        />

        <div className="flex-1 p-6 md:p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Settings
              </h1>
              <p className="text-muted-foreground">
                Customize your GameVault experience
              </p>
            </div>

            <Separator />

            {/* Notification Settings */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Configure how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingPreferences ? (
                  <div className="text-muted-foreground">
                    Loading preferences...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="friend-requests"
                          className="text-base font-medium"
                        >
                          Friend Requests
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone sends you a friend request
                        </p>
                      </div>
                      <Switch
                        id="friend-requests"
                        checked={notificationPreferences.friend_requests}
                        onCheckedChange={(checked) =>
                          handlePreferenceChange("friend_requests", checked)
                        }
                        disabled={isSavingPreferences}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Support Developer */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Heart className="h-5 w-5 text-red-500" />
                  Support GameVault
                </CardTitle>
                <CardDescription>
                  Help support the development of GameVault. Your support is not
                  required but greatly appreciated!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground mb-4">
                    GameVault is developed and maintained by a single developer.
                    If you enjoy using the app and would like to support its
                    continued development, you can make a one-time donation or
                    set up recurring support. This is completely optional and
                    the app will always remain free to use.
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Your support helps cover server costs, API usage, and allows
                    for continued feature development.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      One-Time Donation
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Make a one-time contribution to support GameVault
                      development.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStripeCheckout(5, "donation")}
                        disabled={isProcessingPayment}
                        className="hover:bg-primary/10"
                      >
                        $5
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStripeCheckout(10, "donation")}
                        disabled={isProcessingPayment}
                        className="hover:bg-primary/10"
                      >
                        $10
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStripeCheckout(25, "donation")}
                        disabled={isProcessingPayment}
                        className="hover:bg-primary/10"
                      >
                        $25
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const amount = prompt("Enter donation amount (USD):");
                          if (
                            amount &&
                            !isNaN(Number(amount)) &&
                            Number(amount) > 0
                          ) {
                            handleStripeCheckout(Number(amount), "donation");
                          }
                        }}
                        disabled={isProcessingPayment}
                        className="hover:bg-primary/10"
                      >
                        Custom
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Monthly Support
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Become a monthly supporter and help ensure GameVault's
                      continued growth.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStripeCheckout(3, "subscription")}
                        disabled={isProcessingPayment}
                        className="bg-primary hover:bg-primary/90"
                      >
                        $3/month
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStripeCheckout(5, "subscription")}
                        disabled={isProcessingPayment}
                        className="bg-primary hover:bg-primary/90"
                      >
                        $5/month
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStripeCheckout(10, "subscription")}
                        disabled={isProcessingPayment}
                        className="bg-primary hover:bg-primary/90"
                      >
                        $10/month
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4 space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCustomerPortal}
                    disabled={isLoadingPortal || isProcessingPayment}
                    className="w-full max-w-xs"
                  >
                    {isLoadingPortal
                      ? "Loading..."
                      : "Manage Billing & Subscriptions"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    All payments are securely processed by Stripe. You can
                    cancel recurring support at any time through the billing
                    portal.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Theme Settings */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Palette className="h-5 w-5" />
                  Theme
                </CardTitle>
                <CardDescription>
                  Choose your preferred theme for the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(themes).map((themeOption) => (
                    <div
                      key={themeOption.name}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                        theme === themeOption.name
                          ? "border-primary shadow-md"
                          : "border-border hover:border-muted-foreground"
                      }`}
                      onClick={() => setTheme(themeOption.name as ThemeName)}
                      style={{
                        backgroundColor: `hsl(${themeOption.colors.card})`,
                        borderColor:
                          theme === themeOption.name
                            ? `hsl(${currentTheme.colors.primary})`
                            : `hsl(${currentTheme.colors.border})`,
                      }}
                    >
                      {theme === themeOption.name && (
                        <div className="absolute top-2 right-2">
                          <Check
                            className="h-5 w-5"
                            style={{
                              color: `hsl(${currentTheme.colors.primary})`,
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex gap-1">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{
                              backgroundColor: `hsl(${themeOption.colors.primary})`,
                              borderColor: `hsl(${themeOption.colors.border})`,
                            }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{
                              backgroundColor: `hsl(${themeOption.colors.accent})`,
                              borderColor: `hsl(${themeOption.colors.border})`,
                            }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{
                              backgroundColor: `hsl(${themeOption.colors.secondary})`,
                              borderColor: `hsl(${themeOption.colors.border})`,
                            }}
                          />
                        </div>
                        <h3
                          className="font-semibold text-lg"
                          style={{
                            color: `hsl(${themeOption.colors.cardForeground})`,
                          }}
                        >
                          {themeOption.displayName}
                        </h3>
                      </div>

                      <div className="space-y-2">
                        <div
                          className="h-3 rounded"
                          style={{
                            backgroundColor: `hsl(${themeOption.colors.primary})`,
                          }}
                        />
                        <div
                          className="h-2 rounded w-3/4"
                          style={{
                            backgroundColor: `hsl(${themeOption.colors.accent})`,
                          }}
                        />
                        <div
                          className="h-2 rounded w-1/2"
                          style={{
                            backgroundColor: `hsl(${themeOption.colors.muted})`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Additional Settings Sections */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Account</CardTitle>
                <CardDescription>
                  Manage your account settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Account settings coming soon...
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Legal</CardTitle>
                <CardDescription>
                  Privacy policy and terms of service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" asChild className="flex-1">
                    <a href="/privacy-policy">View Privacy Policy</a>
                  </Button>
                  <Button variant="outline" asChild className="flex-1">
                    <a href="/terms-of-service">View Terms of Service</a>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  These documents outline how we handle your data and the terms
                  of using GameVault.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

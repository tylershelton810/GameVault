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
import { Palette, Check, Bell } from "lucide-react";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import { useState, useEffect } from "react";
import { useAuth } from "../../../supabase/auth";
import { useToast } from "@/components/ui/use-toast";

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
                <CardTitle className="text-card-foreground">Privacy</CardTitle>
                <CardDescription>Manage your privacy settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Privacy settings coming soon...
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

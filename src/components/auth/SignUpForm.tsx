import { useState, useRef } from "react";
import { useAuth } from "../../../supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import AuthLayout from "./AuthLayout";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload } from "lucide-react";

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { signUp } = useAuth();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }

      setProfilePicture(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      await signUp(email, password, fullName, profilePicture || undefined);
      toast({
        title: "Account created successfully!",
        description:
          "Please check your email and click the verification link to activate your account before signing in.",
        duration: 8000,
      });
      // Don't navigate immediately - let user verify email first
      navigate("/login");
    } catch (error) {
      setError("Error creating account");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-card rounded-2xl shadow-sm p-8 w-full max-w-md mx-auto border border-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-card-foreground">
              Profile Picture (Optional)
            </Label>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar
                  className="h-20 w-20 cursor-pointer hover:opacity-80 transition-opacity border-2 border-border"
                  onClick={handleAvatarClick}
                >
                  <AvatarImage
                    src={previewUrl || undefined}
                    alt="Profile preview"
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <Camera className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={handleAvatarClick}
                >
                  <Upload className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAvatarClick}
                className="text-xs border-border text-card-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {profilePicture ? "Change Picture" : "Upload Picture"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="fullName"
              className="text-sm font-medium text-card-foreground"
            >
              Full Name
            </Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-12 rounded-lg bg-input border-border text-card-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-card-foreground"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-lg bg-input border-border text-card-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-card-foreground"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-lg bg-input border-border text-card-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Password must be at least 8 characters
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={isUploading}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {isUploading ? "Creating account..." : "Create account"}
          </Button>

          <div className="text-xs text-center text-muted-foreground mt-6">
            By creating an account, you agree to our{" "}
            <Link
              to="/"
              className="text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              to="/"
              className="text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Privacy Policy
            </Link>
          </div>

          <div className="text-sm text-center text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, GamepadIcon, Users, Star, Trophy } from "lucide-react";
import { useTheme } from "@/lib/theme";

const About = () => {
  const { currentTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 pt-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl">🎮</span>
            <h1 className="text-3xl font-bold text-foreground">Game Shlf</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track your gaming journey, connect with friends, and discover new
            games in your personalized gaming hub.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="text-center">
            <CardHeader className="pb-3">
              <GamepadIcon className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Game Library</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Organize your games into Playing, Played, and Want to Play
                collections
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-3">
              <Star className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Rating System</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Rate games on a 20-point scale with detailed reviews and
                personal notes
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-3">
              <Users className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Social Features</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect with friends, share your gaming activity, and discover
                new games
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-3">
              <Trophy className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">Game Clubs</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create and join gaming communities to discuss and share
                experiences
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Data Attribution */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Data Attribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Badge variant="outline" className="text-sm font-medium">
                IGDB
              </Badge>
              <p className="text-foreground font-medium">
                Game data provided by IGDB
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Game Shlf uses the Internet Game Database (IGDB) API to provide
              comprehensive game information, including metadata, cover art, and
              game details. IGDB is a comprehensive video game database that
              powers many gaming applications and websites.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Learn more:</span>
              <a
                href="https://www.igdb.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                IGDB.com
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle>About Game Shlf</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Game Shlf is designed to help gamers track their gaming journey,
              discover new titles, and connect with fellow gaming enthusiasts.
              Whether you're a casual player or a hardcore gamer, Game Shlf
              provides the tools you need to organize and enhance your gaming
              experience.
            </p>

            <Separator />

            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-foreground mb-2">
                  Key Features
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Personal game library management</li>
                  <li>• 20-point rating system (0.5 - 10.0)</li>
                  <li>• Social timeline and friend connections</li>
                  <li>• Game clubs and community discussions</li>
                  <li>• Personalized game recommendations</li>
                  <li>• Detailed game information and reviews</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">
                  Built With
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• React & TypeScript</li>
                  <li>• Supabase (Database & Auth)</li>
                  <li>• Tailwind CSS</li>
                  <li>• Radix UI Components</li>
                  <li>• IGDB API for game data</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;

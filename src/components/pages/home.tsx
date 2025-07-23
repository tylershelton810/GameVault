import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  Settings,
  User,
  Gamepad2,
  Star,
  Users,
  BookOpen,
  Library,
  MessageCircle,
  Trophy,
  Heart,
  Search,
  Zap,
  Shield,
  Target,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../supabase/auth";
import { useTheme } from "@/lib/theme";

export default function LandingPage() {
  const { user, signOut } = useAuth();
  const { currentTheme } = useTheme();

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Apple-style navigation */}
      <header className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[980px] mx-auto flex h-12 items-center justify-between px-4">
          <div className="flex items-center">
            <Link
              to="/"
              className="font-medium text-xl flex items-center gap-2"
            >
              <Gamepad2 className="h-6 w-6" />
              Game Shlf
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-sm font-light hover:text-muted-foreground transition-colors"
                  >
                    Game Shlf
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-8 w-8 hover:cursor-pointer">
                      <AvatarImage
                        src={
                          user.user_metadata?.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
                        }
                        alt={user.email || ""}
                      />
                      <AvatarFallback>
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="rounded-xl border-none shadow-lg"
                  >
                    <DropdownMenuLabel className="text-xs text-gray-500">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => signOut()}
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-sm font-light hover:text-muted-foreground transition-colors"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button
                    className="rounded-full text-sm px-4"
                    style={{
                      backgroundColor: `hsl(${currentTheme?.colors.primary})`,
                      color: `hsl(${currentTheme?.colors.primaryForeground})`,
                    }}
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-12">
        {/* Hero section */}
        <section className="relative py-24 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10"></div>
          <div className="relative max-w-4xl mx-auto px-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Zap
                className="h-4 w-4"
                style={{ color: `hsl(${currentTheme?.colors.accent})` }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: `hsl(${currentTheme?.colors.accent})` }}
              >
                Your Ultimate Gaming Companion
              </span>
            </div>
            <h1 className="text-6xl font-bold tracking-tight mb-6 text-foreground">
              Build Your Gaming
              <span
                className="block"
                style={{ color: `hsl(${currentTheme?.colors.primary})` }}
              >
                Community
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Organize your game library, join exclusive Game Clubs, and connect
              with fellow gamers who share your passion.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="px-8 py-3 text-lg rounded-full">
                    Go to Game Shlf
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/signup">
                    <Button
                      size="lg"
                      className="px-8 py-3 text-lg rounded-full"
                    >
                      Start Your Journey
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button
                      variant="outline"
                      size="lg"
                      className="px-8 py-3 text-lg rounded-full"
                    >
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Core Features section */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight mb-4 text-foreground">
                Three Pillars of Gaming Excellence
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Everything you need to enhance your gaming experience in one
                powerful platform
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Game Library */}
              <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="h-14 w-14 rounded-2xl flex items-center justify-center"
                      style={{
                        backgroundColor: `hsl(${currentTheme?.colors.primary})`,
                      }}
                    >
                      <Library className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Game Library</CardTitle>
                      <CardDescription>
                        Your personal gaming vault
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    Organize your entire game collection with smart
                    categorization, detailed ratings, and personal notes.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-sm">Currently Playing</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: `hsl(${currentTheme?.colors.primary})`,
                        }}
                      ></div>
                      <span className="text-sm">Completed Games</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: `hsl(${currentTheme?.colors.accent})`,
                        }}
                      ></div>
                      <span className="text-sm">Wishlist & Backlog</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Community */}
              <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="h-14 w-14 rounded-2xl flex items-center justify-center"
                      style={{
                        backgroundColor: `hsl(${currentTheme?.colors.accent})`,
                      }}
                    >
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Community</CardTitle>
                      <CardDescription>
                        Connect with fellow gamers
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    Build meaningful connections through shared gaming
                    experiences and discover new favorites.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Heart
                        className="h-4 w-4"
                        style={{ color: `hsl(${currentTheme?.colors.accent})` }}
                      />
                      <span className="text-sm">Follow Friends' Activity</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MessageCircle
                        className="h-4 w-4"
                        style={{ color: `hsl(${currentTheme?.colors.accent})` }}
                      />
                      <span className="text-sm">Share Reviews & Ratings</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Search
                        className="h-4 w-4"
                        style={{ color: `hsl(${currentTheme?.colors.accent})` }}
                      />
                      <span className="text-sm">Discover New Games</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Game Clubs */}
              <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br"
                      style={{
                        background: `linear-gradient(135deg, hsl(${currentTheme?.colors.primary}), hsl(${currentTheme?.colors.accent}))`,
                      }}
                    >
                      <Shield className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Game Clubs</CardTitle>
                      <CardDescription>
                        Exclusive gaming communities
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    Join specialized communities around your favorite games with
                    discussions, events, and shared experiences.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Target
                        className="h-4 w-4"
                        style={{
                          color: `hsl(${currentTheme?.colors.primary})`,
                        }}
                      />
                      <span className="text-sm">Game-Specific Discussions</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Trophy
                        className="h-4 w-4"
                        style={{
                          color: `hsl(${currentTheme?.colors.primary})`,
                        }}
                      />
                      <span className="text-sm">Community Events</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Star
                        className="h-4 w-4"
                        style={{
                          color: `hsl(${currentTheme?.colors.primary})`,
                        }}
                      />
                      <span className="text-sm">Exclusive Reviews</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Feature Showcase */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Game Library showcase */}
              <div className="space-y-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                    <Library
                      className="h-4 w-4"
                      style={{ color: `hsl(${currentTheme?.colors.primary})` }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: `hsl(${currentTheme?.colors.primary})` }}
                    >
                      Game Library
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold mb-4 text-foreground">
                    Your Games, Perfectly Organized
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Track your gaming progress with intelligent categorization,
                    detailed ratings, and personal notes. Never lose track of
                    what to play next.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="font-medium text-sm">Playing</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Currently active games
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: `hsl(${currentTheme?.colors.primary})`,
                        }}
                      ></div>
                      <span className="font-medium text-sm">Completed</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Finished adventures
                    </p>
                  </Card>
                </div>
              </div>

              {/* Right side - Visual representation */}
              <div className="relative">
                <Card className="p-6 bg-gradient-to-br from-card to-muted/20">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-3 rounded-lg bg-card border"
                      >
                        <div
                          className={`h-12 w-12 rounded-lg bg-gradient-to-br ${i === 1 ? "from-blue-400 to-blue-600" : i === 2 ? "from-purple-400 to-purple-600" : "from-green-400 to-green-600"}`}
                        ></div>
                        <div className="flex-1">
                          <div
                            className="h-3 bg-muted rounded mb-2"
                            style={{ width: `${60 + i * 10}%` }}
                          ></div>
                          <div
                            className="h-2 bg-muted/60 rounded"
                            style={{ width: `${40 + i * 5}%` }}
                          ></div>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, j) => (
                            <div
                              key={j}
                              className={`h-3 w-3 rounded-full ${
                                j < i + 2 ? "bg-yellow-400" : "bg-muted"
                              }`}
                            ></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>

            {/* Game Clubs showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mt-24">
              {/* Left side - Visual representation */}
              <div className="order-2 lg:order-1">
                <Card className="p-6 bg-gradient-to-br from-card to-accent/5">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="h-10 w-10 rounded-full bg-gradient-to-br"
                        style={{
                          background: `linear-gradient(135deg, hsl(${currentTheme?.colors.primary}), hsl(${currentTheme?.colors.accent}))`,
                        }}
                      ></div>
                      <div>
                        <div className="h-3 bg-foreground/80 rounded w-24 mb-1"></div>
                        <div className="h-2 bg-muted-foreground/60 rounded w-16"></div>
                      </div>
                      <div
                        className="ml-auto px-3 py-1 rounded-full bg-accent/20 text-xs font-medium"
                        style={{ color: `hsl(${currentTheme?.colors.accent})` }}
                      >
                        Active
                      </div>
                    </div>

                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-card/50"
                      >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20"></div>
                        <div className="flex-1">
                          <div
                            className="h-2 bg-muted rounded mb-2"
                            style={{ width: `${70 - i * 10}%` }}
                          ></div>
                          <div
                            className="h-2 bg-muted/60 rounded"
                            style={{ width: `${50 - i * 5}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart
                            className="h-3 w-3"
                            style={{
                              color: `hsl(${currentTheme?.colors.accent})`,
                            }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {3 - i + 2}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right side - Game Clubs content */}
              <div className="order-1 lg:order-2 space-y-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-4">
                    <Shield
                      className="h-4 w-4"
                      style={{ color: `hsl(${currentTheme?.colors.accent})` }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: `hsl(${currentTheme?.colors.accent})` }}
                    >
                      Game Clubs
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold mb-4 text-foreground">
                    Join Exclusive Gaming Communities
                  </h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Connect with passionate gamers in specialized clubs. Share
                    strategies, discuss lore, and participate in community
                    events.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageCircle
                        className="h-4 w-4"
                        style={{
                          color: `hsl(${currentTheme?.colors.primary})`,
                        }}
                      />
                    </div>
                    <span className="font-medium">Deep game discussions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Trophy
                        className="h-4 w-4"
                        style={{ color: `hsl(${currentTheme?.colors.accent})` }}
                      />
                    </div>
                    <span className="font-medium">Community challenges</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users
                        className="h-4 w-4"
                        style={{
                          color: `hsl(${currentTheme?.colors.primary})`,
                        }}
                      />
                    </div>
                    <span className="font-medium">Like-minded gamers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-4xl font-bold mb-6 text-foreground">
              Ready to Level Up Your Gaming Experience?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of gamers who have already transformed how they
              discover, organize, and enjoy games.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="px-8 py-3 text-lg rounded-full">
                    Go to Game Shlf
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/signup">
                    <Button
                      size="lg"
                      className="px-8 py-3 text-lg rounded-full"
                    >
                      Create Free Account
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button
                      variant="outline"
                      size="lg"
                      className="px-8 py-3 text-lg rounded-full"
                    >
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Gamepad2
                  className="h-8 w-8"
                  style={{ color: `hsl(${currentTheme?.colors.primary})` }}
                />
                <h4 className="text-2xl font-bold text-foreground">
                  Game Shlf
                </h4>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md">
                The ultimate platform for gamers to organize their library,
                connect with communities, and discover their next favorite game.
              </p>
              <div className="flex gap-4">
                {user ? (
                  <Link to="/dashboard">
                    <Button variant="outline" className="rounded-full">
                      Go to Game Shlf
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/signup">
                      <Button className="rounded-full">Get Started</Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="outline" className="rounded-full">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div>
              <h5 className="font-semibold text-foreground mb-4">Features</h5>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link
                    to={user ? "/game-library" : "/signup"}
                    className="hover:text-foreground transition-colors"
                  >
                    Game Library
                  </Link>
                </li>
                <li>
                  <Link
                    to={user ? "/game-clubs" : "/signup"}
                    className="hover:text-foreground transition-colors"
                  >
                    Game Clubs
                  </Link>
                </li>
                <li>
                  <Link
                    to={user ? "/friends" : "/signup"}
                    className="hover:text-foreground transition-colors"
                  >
                    Social Timeline
                  </Link>
                </li>
                <li>
                  <Link
                    to={user ? "/discover" : "/signup"}
                    className="hover:text-foreground transition-colors"
                  >
                    Discover Games
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold text-foreground mb-4">Community</h5>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link
                    to={user ? "/friends" : "/signup"}
                    className="hover:text-foreground transition-colors"
                  >
                    Find Friends
                  </Link>
                </li>
                <li>
                  <Link
                    to={user ? "/game-clubs" : "/signup"}
                    className="hover:text-foreground transition-colors"
                  >
                    Join Clubs
                  </Link>
                </li>
                <li>
                  <Link
                    to={user ? "/discover" : "/signup"}
                    className="hover:text-foreground transition-colors"
                  >
                    Game Reviews
                  </Link>
                </li>
                <li>
                  <Link
                    to={user ? "/settings" : "/signup"}
                    className="hover:text-foreground transition-colors"
                  >
                    Settings
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Game Shlf. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link
                to="/privacy-policy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <a
                href="https://app.termly.io/document/terms-of-use-for-website/your-terms-url"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
              <Link to="/" className="hover:text-foreground transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

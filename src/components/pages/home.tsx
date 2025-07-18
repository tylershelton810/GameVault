import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../supabase/auth";

export default function LandingPage() {
  const { user, signOut } = useAuth();

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Apple-style navigation */}
      <header className="fixed top-0 z-50 w-full bg-[rgba(255,255,255,0.8)] backdrop-blur-md border-b border-[#f5f5f7]/30">
        <div className="max-w-[980px] mx-auto flex h-12 items-center justify-between px-4">
          <div className="flex items-center">
            <Link
              to="/"
              className="font-medium text-xl flex items-center gap-2"
            >
              <Gamepad2 className="h-6 w-6" />
              GameVault
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-sm font-light hover:text-gray-500"
                  >
                    Dashboard
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
                    className="text-sm font-light hover:text-gray-500"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="rounded-full bg-black text-white hover:bg-gray-800 text-sm px-4">
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
        <section className="py-20 text-center">
          <h2 className="text-5xl font-semibold tracking-tight mb-1">
            Track Your Gaming Journey
          </h2>
          <h3 className="text-2xl font-medium text-gray-500 mb-4">
            Rate, review, and discover games with friends in your personal
            gaming vault.
          </h3>
          <div className="flex justify-center space-x-6 text-xl text-blue-600">
            <Link to="/dashboard" className="flex items-center hover:underline">
              Explore games <ChevronRight className="h-4 w-4" />
            </Link>
            <Link to="/signup" className="flex items-center hover:underline">
              Start collecting <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Features section */}
        <section className="py-20 bg-[#f5f5f7] text-center">
          <h2 className="text-5xl font-semibold tracking-tight mb-1">
            Everything for Gamers
          </h2>
          <h3 className="text-2xl font-medium text-gray-500 mb-4">
            Organize, rate, and share your gaming experiences
          </h3>
          <div className="flex justify-center space-x-6 text-xl text-blue-600">
            <Link to="/dashboard" className="flex items-center hover:underline">
              View library <ChevronRight className="h-4 w-4" />
            </Link>
            <Link to="/signup" className="flex items-center hover:underline">
              Join community <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-xl font-medium mb-2">Game Library</h4>
              <p className="text-gray-500">
                Organize games into Playing, Played, and Want to Play
                collections with beautiful card layouts.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="text-xl font-medium mb-2">Rating System</h4>
              <p className="text-gray-500">
                Rate games on a precise 20-point scale with interactive star
                indicators and half-filled states.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="text-xl font-medium mb-2">Social Features</h4>
              <p className="text-gray-500">
                Follow friends, see their gaming activity, and discover new
                games through social recommendations.
              </p>
            </div>
          </div>
        </section>

        {/* Grid section for other features */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
          <div className="bg-[#f5f5f7] rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight mb-1">
              Smart Organization
            </h2>
            <h3 className="text-xl font-medium text-gray-500 mb-4">
              Manage your backlog like a pro
            </h3>
            <div className="flex justify-center space-x-6 text-lg text-blue-600">
              <Link
                to="/dashboard"
                className="flex items-center hover:underline"
              >
                Try it now <ChevronRight className="h-4 w-4" />
              </Link>
              <Link to="/signup" className="flex items-center hover:underline">
                Get started <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 bg-white p-6 rounded-xl shadow-sm max-w-sm mx-auto">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                  </div>
                  <div className="flex space-x-1">
                    <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                    <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                    <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                    <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
                    <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-1"></div>
                    <div className="h-2 bg-gray-100 rounded w-1/3"></div>
                  </div>
                  <div className="flex space-x-1">
                    <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                    <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                    <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                    <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                    <div className="h-3 w-3 bg-yellow-200 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#f5f5f7] rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight mb-1">
              Social Timeline
            </h2>
            <h3 className="text-xl font-medium text-gray-500 mb-4">
              Connect with fellow gamers
            </h3>
            <div className="flex justify-center space-x-6 text-lg text-blue-600">
              <Link
                to="/dashboard"
                className="flex items-center hover:underline"
              >
                See activity <ChevronRight className="h-4 w-4" />
              </Link>
              <Link to="/signup" className="flex items-center hover:underline">
                Join friends <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 bg-white p-6 rounded-xl shadow-sm max-w-sm mx-auto text-left">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-2 bg-gray-100 rounded w-3/4 mb-1"></div>
                    <div className="h-2 bg-gray-100 rounded w-1/3"></div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 bg-gradient-to-br from-red-400 to-red-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-2 bg-gray-100 rounded w-1/2 mb-1"></div>
                    <div className="h-2 bg-gray-100 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#f5f5f7] py-12 text-xs text-gray-500">
        <div className="max-w-[980px] mx-auto px-4">
          <div className="border-b border-gray-300 pb-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">
                GameVault
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/dashboard" className="hover:underline">
                    Game Library
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:underline">
                    Social Feed
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:underline">
                    Discover Games
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:underline">
                    My Profile
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">
                Features
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/signup" className="hover:underline">
                    Rating System
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:underline">
                    Game Reviews
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:underline">
                    Friend Activity
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:underline">
                    Backlog Manager
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">
                Community
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/signup" className="hover:underline">
                    Find Friends
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:underline">
                    Game Groups
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:underline">
                    Discussions
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:underline">
                    Recommendations
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:underline">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Licenses
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="py-4">
            <p>Copyright © 2025 GameVault. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

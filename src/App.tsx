import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginForm from "./components/auth/LoginForm";
import SignUpForm from "./components/auth/SignUpForm";
import Dashboard from "./components/pages/dashboard";
import Success from "./components/pages/success";
import Home from "./components/pages/home";
import GameLibrary from "./components/pages/GameLibrary";
import Friends from "./components/pages/Friends";
import SocialTimeline from "./components/pages/SocialTimeline";
import Discover from "./components/pages/Discover";
import GamePage from "./components/pages/GamePage";
import RecommendedGames from "./components/pages/RecommendedGames";
import GameClubs from "./components/pages/GameClubs";
import GameClubPage from "./components/GameClub/GameClubPage";
import Settings from "./components/pages/Settings";
import About from "./components/pages/About";
import PrivacyPolicy from "./components/pages/PrivacyPolicy";
import TermsOfService from "./components/pages/TermsOfService";
import StripeSuccess from "./components/pages/StripeSuccess";
import StripeCancel from "./components/pages/StripeCancel";
import Account from "./components/pages/Account";
import { AuthProvider, useAuth } from "../supabase/auth";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen, LoadingSpinner } from "./components/ui/loading-spinner";
import { ThemeProvider } from "./lib/theme";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

console.log("TEST");
function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <SocialTimeline />
            </PrivateRoute>
          }
        />
        <Route
          path="/social-timeline"
          element={
            <PrivateRoute>
              <SocialTimeline />
            </PrivateRoute>
          }
        />
        <Route path="/success" element={<Success />} />
        <Route
          path="/game-library"
          element={
            <PrivateRoute>
              <GameLibrary />
            </PrivateRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <PrivateRoute>
              <Friends />
            </PrivateRoute>
          }
        />
        <Route
          path="/discover"
          element={
            <PrivateRoute>
              <Discover />
            </PrivateRoute>
          }
        />
        <Route
          path="/game/:gameId"
          element={
            <PrivateRoute>
              <GamePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/recommended/:gameId"
          element={
            <PrivateRoute>
              <RecommendedGames />
            </PrivateRoute>
          }
        />
        <Route
          path="/game-clubs"
          element={
            <PrivateRoute>
              <GameClubs />
            </PrivateRoute>
          }
        />
        <Route
          path="/game-club/:clubId"
          element={
            <PrivateRoute>
              <GameClubPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/about"
          element={
            <PrivateRoute>
              <About />
            </PrivateRoute>
          }
        />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route
          path="/stripe/success"
          element={
            <PrivateRoute>
              <StripeSuccess />
            </PrivateRoute>
          }
        />
        <Route
          path="/stripe/cancel"
          element={
            <PrivateRoute>
              <StripeCancel />
            </PrivateRoute>
          }
        />
        <Route
          path="/account"
          element={
            <PrivateRoute>
              <Account />
            </PrivateRoute>
          }
        />
        <Route
          path="/api/steam/callback"
          element={
            <PrivateRoute>
              <Account />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="electric-playground">
      <div className="min-h-screen bg-background text-foreground">
        <AuthProvider>
          <Suspense fallback={<LoadingScreen text="Loading application..." />}>
            <AppRoutes />
          </Suspense>
          <Toaster />
        </AuthProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;

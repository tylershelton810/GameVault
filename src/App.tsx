import { Suspense } from "react";
import { Navigate, Route, Routes, useRoutes } from "react-router-dom";
import routes from "tempo-routes";
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
import GameClubs from "./components/pages/GameClubs";
import GameClubPage from "./components/GameClub/GameClubPage";
import { AuthProvider, useAuth } from "../supabase/auth";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen, LoadingSpinner } from "./components/ui/loading-spinner";

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
      </Routes>
      {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen text="Loading application..." />}>
        <AppRoutes />
      </Suspense>
      <Toaster />
    </AuthProvider>
  );
}

export default App;

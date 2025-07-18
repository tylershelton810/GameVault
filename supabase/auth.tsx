import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    profilePicture?: File,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfilePicture: (file: File) => Promise<string>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (signed in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    profilePicture?: File,
  ) => {
    let avatarUrl = null;

    // First, sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) throw authError;

    // If profile picture is provided and user was created, upload it
    if (profilePicture && authData.user) {
      try {
        avatarUrl = await uploadProfilePicture(
          authData.user.id,
          profilePicture,
        );

        // Update user metadata with avatar URL
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            avatar_url: avatarUrl,
          },
        });

        if (updateError) {
          console.error("Error updating user metadata:", updateError);
        }
      } catch (uploadError) {
        console.error("Error uploading profile picture:", uploadError);
        // Don't throw here - user creation was successful, just picture upload failed
      }
    }
  };

  const uploadProfilePicture = async (
    userId: string,
    file: File,
  ): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("profile-pictures")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const updateProfilePicture = async (file: File): Promise<string> => {
    if (!user) throw new Error("No user logged in");

    const avatarUrl = await uploadProfilePicture(user.id, file);

    // Update user metadata
    const { error } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        avatar_url: avatarUrl,
      },
    });

    if (error) throw error;

    return avatarUrl;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, updateProfilePicture }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

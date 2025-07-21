import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeName = "electric-playground" | "game-social";

export interface ThemePalette {
  name: string;
  displayName: string;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
  };
}

// Convert hex to HSL
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const themes: Record<ThemeName, ThemePalette> = {
  "electric-playground": {
    name: "electric-playground",
    displayName: "Electric Playground",
    colors: {
      background: hexToHsl("#141414"), // Off Black
      foreground: hexToHsl("#EEEEEE"), // Near White
      card: hexToHsl("#222831"), // Graphite
      cardForeground: hexToHsl("#EEEEEE"), // Near White
      popover: hexToHsl("#222831"), // Graphite
      popoverForeground: hexToHsl("#EEEEEE"), // Near White
      primary: hexToHsl("#6A67CE"), // Electric Lavender
      primaryForeground: hexToHsl("#EEEEEE"), // Near White
      secondary: hexToHsl("#222831"), // Graphite
      secondaryForeground: hexToHsl("#EEEEEE"), // Near White
      muted: hexToHsl("#222831"), // Graphite
      mutedForeground: hexToHsl("#EEEEEE"), // Near White
      accent: hexToHsl("#F9A826"), // Gold/Amber
      accentForeground: hexToHsl("#141414"), // Off Black
      destructive: hexToHsl("#EF4444"), // Red
      destructiveForeground: hexToHsl("#EEEEEE"), // Near White
      border: hexToHsl("#222831"), // Graphite
      input: hexToHsl("#222831"), // Graphite
      ring: hexToHsl("#6A67CE"), // Electric Lavender
    },
  },
  "game-social": {
    name: "game-social",
    displayName: "Game Social",
    colors: {
      background: hexToHsl("#F8FAFC"), // Very Light Blue-Gray
      foreground: hexToHsl("#1E293B"), // Dark Slate
      card: hexToHsl("#FFFFFF"), // Pure White
      cardForeground: hexToHsl("#1E293B"), // Dark Slate
      popover: hexToHsl("#FFFFFF"), // Pure White
      popoverForeground: hexToHsl("#1E293B"), // Dark Slate
      primary: hexToHsl("#3B82F6"), // Bright Blue
      primaryForeground: hexToHsl("#FFFFFF"), // White
      secondary: hexToHsl("#F1F5F9"), // Light Blue-Gray
      secondaryForeground: hexToHsl("#475569"), // Medium Slate
      muted: hexToHsl("#F1F5F9"), // Light Blue-Gray
      mutedForeground: hexToHsl("#64748B"), // Slate Gray
      accent: hexToHsl("#10B981"), // Emerald Green
      accentForeground: hexToHsl("#FFFFFF"), // White
      destructive: hexToHsl("#EF4444"), // Red
      destructiveForeground: hexToHsl("#FFFFFF"), // White
      border: hexToHsl("#E2E8F0"), // Light Border
      input: hexToHsl("#F1F5F9"), // Light Input Background
      ring: hexToHsl("#3B82F6"), // Bright Blue
    },
  },
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  currentTheme: ThemePalette;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
}

export function ThemeProvider({
  children,
  defaultTheme = "electric-playground",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const stored = localStorage.getItem("app-theme");
    return (stored as ThemeName) || defaultTheme;
  });

  const currentTheme = themes[theme];

  useEffect(() => {
    localStorage.setItem("app-theme", theme);

    // Apply CSS custom properties to the root element
    const root = document.documentElement;
    const colors = currentTheme.colors;

    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--foreground", colors.foreground);
    root.style.setProperty("--card", colors.card);
    root.style.setProperty("--card-foreground", colors.cardForeground);
    root.style.setProperty("--popover", colors.popover);
    root.style.setProperty("--popover-foreground", colors.popoverForeground);
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-foreground", colors.primaryForeground);
    root.style.setProperty("--secondary", colors.secondary);
    root.style.setProperty(
      "--secondary-foreground",
      colors.secondaryForeground,
    );
    root.style.setProperty("--muted", colors.muted);
    root.style.setProperty("--muted-foreground", colors.mutedForeground);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--accent-foreground", colors.accentForeground);
    root.style.setProperty("--destructive", colors.destructive);
    root.style.setProperty(
      "--destructive-foreground",
      colors.destructiveForeground,
    );
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--input", colors.input);
    root.style.setProperty("--ring", colors.ring);
  }, [theme, currentTheme]);

  const value = {
    theme,
    setTheme,
    currentTheme,
  };

  return React.createElement(ThemeContext.Provider, { value }, children);
}

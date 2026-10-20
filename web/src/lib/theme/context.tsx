"use client";

import React, { createContext, useContext, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

let currentTheme: Theme = "light";
const themeListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("sajag_theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      currentTheme = saved;
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      currentTheme = prefersDark ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", currentTheme);
    }
  } catch {
    // ignore
  }
}

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function getThemeSnapshot(): Theme {
  return currentTheme;
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  const setTheme = (t: Theme) => {
    currentTheme = t;
    try {
      localStorage.setItem("sajag_theme", t);
      document.documentElement.setAttribute("data-theme", t);
    } catch {
      // ignore
    }
    for (const listener of themeListeners) {
      listener();
    }
  };

  const toggleTheme = () => {
    setTheme(currentTheme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/app-store";
import { applyTheme } from "@/lib/theme";

export function ThemeInit() {
  const preferences = useAppStore((state) => state.preferences);

  useEffect(() => {
    applyTheme(preferences.theme);
    document.documentElement.dataset.reduceMotion = String(preferences.reduceMotion);
    document.documentElement.style.setProperty("--x-cyan", preferences.accentColor);
  }, [preferences.accentColor, preferences.reduceMotion, preferences.theme]);

  return null;
}

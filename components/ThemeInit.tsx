"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/app-store";
import { applyTheme } from "@/lib/theme";

export function ThemeInit() {
  const theme = useAppStore((state) => state.preferences.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return null;
}

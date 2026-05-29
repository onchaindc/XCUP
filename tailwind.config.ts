import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#05070d",
        surface: "#0d1324",
        panel: "#10192e",
        glass: "rgba(255, 255, 255, 0.08)",
        line: "rgba(255, 255, 255, 0.12)",
        muted: "#8f9bb3",
        arcblue: "#18e3bd",
        arcpurple: "#ff5c39",
        gain: "#39d98a",
        loss: "#ff5470",
        wcgold: "#C9A84C",
        wcred: "#C1121F",
        wcglow: "rgba(201, 168, 76, 0.12)"
      },
      boxShadow: {
        glow: "0 24px 90px rgba(24, 227, 189, 0.18)",
        soft: "0 18px 55px rgba(0, 0, 0, 0.35)",
        trophy: "0 0 60px 0 rgba(201, 168, 76, 0.15)"
      }
    }
  },
  plugins: []
};

export default config;

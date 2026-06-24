import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: {
          50: "#fafbe9",
          100: "#f2f6c6",
          200: "#e8ee9c",
          300: "#dde872",
          400: "#d6e04d",
          500: "#c2ce38",
          600: "#a3ad28",
          700: "#7e861d",
          800: "#5a6115",
          900: "#3a3e0e",
        },
        mare: {
          50: "#eef4f8",
          100: "#d4e2ec",
          200: "#abc6d8",
          300: "#7ba6c0",
          400: "#5a8caa",
          500: "#46799a",
          600: "#3a647f",
          700: "#2f5066",
          800: "#243d4d",
          900: "#1a2b37",
        },
        ink: {
          900: "#1a1a1a",
          800: "#292927",
          700: "#3d3d39",
          600: "#57564f",
          500: "#75736a",
        },
        sand: {
          50: "#faf8f0",
          100: "#f2efe3",
          200: "#e6e0d1",
          300: "#cfc9b8",
          400: "#a8a496",
        },
      },
      fontFamily: {
        display: ["var(--font-archivo-black)", "Arial Black", "sans-serif"],
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};

export default config;

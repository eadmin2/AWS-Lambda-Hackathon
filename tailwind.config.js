/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e6eaf4",
          100: "#c3cbdf",
          200: "#9da9c8",
          300: "#7887b1",
          400: "#5c6e9f",
          500: "#41548d",
          600: "#324a85",
          700: "#203d7a",
          800: "#0f3170",
          900: "#0A2463", // Navy blue
        },
        secondary: {
          50: "#fff5f5",
          100: "#ffe6e6",
          200: "#ffcccc",
          300: "#ffb3b3",
          400: "#ff9999",
          500: "#ff8080",
          600: "#ff6666",
          700: "#ff4d4d",
          800: "#ff3333",
          900: "#990000", // Patriotic red
        },
        accent: {
          50: "#fffceb",
          100: "#fff8d6",
          200: "#fff3ad",
          300: "#ffee85",
          400: "#ffe95c",
          500: "#ffe433",
          600: "#ffdd0a",
          700: "#e6c700",
          800: "#bda300",
          900: "#ffd700", // Gold
        },
        success: {
          100: "#dcfce7",
          500: "#22c55e",
          900: "#14532d",
        },
        warning: {
          100: "#fef9c3",
          500: "#eab308",
          900: "#713f12",
        },
        error: {
          100: "#fee2e2",
          500: "#ef4444",
          900: "#7f1d1d",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

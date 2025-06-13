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
          700: "#1e3a7a",
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
          600: "#e60000",
          700: "#cc0000",
          800: "#b30000",
          900: "#990000", // Patriotic red
        },
        accent: {
          50: "#fffceb",
          100: "#fff8d6",
          200: "#fff3ad",
          300: "#ffee85",
          400: "#ffe95c",
          500: "#e6c700",
          600: "#ccb000",
          700: "#b39a00",
          800: "#998300",
          900: "#806d00", // Gold with better contrast
        },
        success: {
          100: "#dcfce7",
          500: "#15803d",
          900: "#14532d",
        },
        warning: {
          100: "#fef9c3",
          500: "#ca8a04",
          900: "#713f12",
        },
        error: {
          100: "#fee2e2",
          500: "#dc2626",
          900: "#7f1d1d",
        },
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
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
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink: {
          50: "#f0f0f5", 100: "#e0e0eb", 200: "#c2c2d6", 300: "#9494b8",
          400: "#6b6b99", 500: "#4a4a7a", 600: "#363660", 700: "#252545",
          800: "#16162e", 900: "#0a0a1a", 950: "#05050d",
        },
        volt: { 300: "#d4ff4d", 400: "#c8ff1a", 500: "#b8f000" },
        coral: { 400: "#ff6b6b", 500: "#ff4444" },
        sky: { 400: "#4ecdc4" },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
    },
  },
  plugins: [],
};
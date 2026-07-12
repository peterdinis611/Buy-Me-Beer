/** @type {import('tailwindcss').Config} */
export default {
  content: ["./views/**/*.ejs"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          coffee: "#BD5B00",
          beer: "#F5A623",
          dark: "#140e0a",
          card: "#292524",
        },
        app: {
          bg: "rgb(var(--color-bg) / <alpha-value>)",
          elevated: "rgb(var(--color-elevated) / <alpha-value>)",
          surface: "rgb(var(--color-surface) / <alpha-value>)",
          border: "rgb(var(--color-border) / <alpha-value>)",
          text: "rgb(var(--color-text) / <alpha-value>)",
          muted: "rgb(var(--color-muted) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["DM Sans", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 166, 35, 0)" },
          "50%": { boxShadow: "0 0 24px 4px rgba(245, 166, 35, 0.35)" },
        },
        "stat-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-8deg)" },
          "75%": { transform: "rotate(8deg)" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out both",
        "fade-in-down": "fade-in-down 0.5s ease-out both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.45s ease-out both",
        "slide-in-right": "slide-in-right 0.5s ease-out both",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 4s linear infinite",
        "pulse-glow": "pulse-glow 1.2s ease-in-out 2",
        "stat-pop": "stat-pop 0.45s ease-out",
        wiggle: "wiggle 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
    "./*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(18px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.22" },
          "50%": { opacity: "0.46" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "spin-reverse": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 6px rgba(167,139,250,.28)", opacity: "0.9" },
          "50%": { boxShadow: "0 0 28px rgba(147,51,234,.7)", opacity: "1" },
        },
        "glow-gold": {
          "0%, 100%": { boxShadow: "0 0 6px rgba(201,148,15,.25)" },
          "50%": { boxShadow: "0 0 30px rgba(201,148,15,.75)" },
        },
        "card-deal": {
          "0%": { transform: "translateX(-24px) rotate(-4deg)", opacity: "0" },
          "100%": { transform: "translateX(0) rotate(0deg)", opacity: "1" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        flicker: {
          "0%, 90%, 100%": { opacity: "1" },
          "92%": { opacity: "0.75" },
          "94%": { opacity: "1" },
          "96%": { opacity: "0.6" },
          "98%": { opacity: "1" },
        },
        "fortune-spin": {
          "0%": { transform: "rotate(0deg)", filter: "drop-shadow(0 0 8px rgba(201,148,15,.5))" },
          "50%": { filter: "drop-shadow(0 0 22px rgba(201,148,15,.95))" },
          "100%": { transform: "rotate(360deg)", filter: "drop-shadow(0 0 8px rgba(201,148,15,.5))" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-30px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 780ms cubic-bezier(0.18, 0.83, 0.34, 1) forwards",
        twinkle: "twinkle 6s ease-in-out infinite",
        "spin-slow": "spin-slow 10s linear infinite",
        "spin-reverse": "spin-reverse 7s linear infinite",
        float: "float 3.5s ease-in-out infinite",
        shimmer: "shimmer 2.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.2s ease-in-out infinite",
        "glow-gold": "glow-gold 2.5s ease-in-out infinite",
        "card-deal": "card-deal 0.5s cubic-bezier(0.17, 0.67, 0.35, 1.2) both",
        "gradient-x": "gradient-x 4s ease infinite",
        flicker: "flicker 7s ease-in-out infinite",
        "fortune-spin": "fortune-spin 8s linear infinite",
        "slide-in-left": "slide-in-left 500ms cubic-bezier(0.18, 0.83, 0.34, 1) forwards",
        "scale-in": "scale-in 400ms cubic-bezier(0.18, 0.83, 0.34, 1) forwards",
      },
      boxShadow: {
        "violet-neon": "0 0 0 1px rgba(167,139,250,.18), 0 0 24px rgba(147,51,234,.35)",
        "violet-neon-focus": "0 0 0 2px rgba(167,139,250,.55), 0 0 28px rgba(147,51,234,.45)",
      },
    },
  },
  plugins: [],
};

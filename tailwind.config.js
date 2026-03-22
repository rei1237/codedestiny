/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
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
      },
      animation: {
        "fade-in-up": "fade-in-up 780ms cubic-bezier(0.18, 0.83, 0.34, 1) forwards",
        twinkle: "twinkle 6s ease-in-out infinite",
      },
      boxShadow: {
        "violet-neon": "0 0 0 1px rgba(167,139,250,.18), 0 0 24px rgba(147,51,234,.35)",
        "violet-neon-focus": "0 0 0 2px rgba(167,139,250,.55), 0 0 28px rgba(147,51,234,.45)",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
    "./*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "midnight-ink": "#0A0E1A",
        "deep-indigo": "#1B2340",
        "moonveil-silver": "#A8B3C7",
        "pearl-mist": "#EDEFF5",
        "champagne-gold": "#D8B36C",
        "twilight-violet": "#9C87D4",
        // 운명의 서재 배너 (DestinyLibraryBanner) — 밝은 웜 라이트 팔레트
        "dlb-cream": "#FDF8F3",
        "dlb-rose": "#F4EAE0",
        "dlb-lilac": "#EDE0F0",
        "dlb-plum": "#3D2B45",
        "dlb-gold": "#D4B483",
        "dlb-gold-hi": "#F0DCA8",
        "dlb-gold-deep": "#C9A66B",
        "dlb-gold-ink": "#8A6D2F",
        // 연이/네오 듀얼 테마 토큰 (styles/theme-tokens.css의 CSS 변수 참조)
        cd: {
          bg: "var(--cd-bg)",
          surface: "var(--cd-surface)",
          "surface-2": "var(--cd-surface-2)",
          text: "var(--cd-text)",
          muted: "var(--cd-text-muted)",
          accent: "var(--cd-accent)",
          "accent-soft": "var(--cd-accent-soft)",
          gold: "var(--cd-gold)",
          "gold-soft": "var(--cd-gold-soft)",
          border: "var(--cd-border)",
          "cta-text": "var(--cd-cta-text)",
        },
      },
      fontFamily: {
        body: ["var(--font-body)"],
        display: ["var(--font-display)"],
        premium: ["var(--font-premium)"],
        playful: ["var(--font-playful)"],
        decorative: ["var(--font-decorative)"],
        // 운명의 서재 배너 헤드라인용 국문 세리프 스택
        "serif-ko": ["Nanum Myeongjo", "Noto Serif KR", "var(--font-display)", "serif"],
      },
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
        "moon-rise": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // 운명의 서재 배너 전용
        "dlb-rise": {
          "0%": { opacity: "0", transform: "translateY(6px) scale(0.9)" },
          "30%": { opacity: "0.8" },
          "100%": { opacity: "0", transform: "translateY(-22px) scale(1)" },
        },
        "dlb-sweep": {
          "0%": { transform: "translateX(-120%) skewX(-18deg)" },
          "100%": { transform: "translateX(220%) skewX(-18deg)" },
        },
        "dlb-bubble": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
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
        "moon-rise": "moon-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "dlb-rise": "dlb-rise 5.5s ease-in-out infinite",
        "dlb-sweep": "dlb-sweep 8s ease-in-out infinite",
        "dlb-bubble": "dlb-bubble 3s ease-in-out infinite",
      },
      boxShadow: {
        "violet-neon": "0 0 0 1px rgba(167,139,250,.18), 0 0 24px rgba(147,51,234,.35)",
        "violet-neon-focus": "0 0 0 2px rgba(167,139,250,.55), 0 0 28px rgba(147,51,234,.45)",
        "moon-glow": "0 0 40px -5px rgba(216,179,108,0.35), 0 0 80px -20px rgba(156,135,212,0.25)",
      },
    },
  },
  plugins: [],
};

export const destinyBiasTheme = {
  colors: {
    bgDeep: "#070314",
    bgPurple: "#16072e",
    neonPink: "#ff4fd8",
    neonViolet: "#8b5cf6",
    auroraCyan: "#22d3ee",
    chromeSilver: "#f8fafc",
    softGold: "#facc15",
  },
  gradients: {
    aurora: "linear-gradient(135deg, #ff4fd8, #8b5cf6, #22d3ee)",
    chrome: "linear-gradient(135deg, #ffffff, #f0abfc, #93c5fd, #ffffff)",
    midnight: "linear-gradient(180deg, #10051f, #05020d)",
  },
} as const;

export type DestinyBiasThemeChoice = {
  key: string;
  name: string;
  premium: boolean;
  description: string;
  preview: string;
};

export const destinyBiasThemeChoices: DestinyBiasThemeChoice[] = [
  {
    key: "moonlight_neon",
    name: "Aurora Glass",
    premium: false,
    description: "오로라 빛이 흐르는 유리 포토카드",
    preview: "linear-gradient(135deg, rgba(255,79,216,0.95), rgba(139,92,246,0.9), rgba(34,211,238,0.92))",
  },
  {
    key: "gold_nocturne",
    name: "Chrome Star",
    premium: true,
    description: "실버 크롬 테두리와 별빛 반사",
    preview: "linear-gradient(135deg, rgba(248,250,252,0.92), rgba(251,207,232,0.86), rgba(191,219,254,0.9))",
  },
  {
    key: "coral_haze",
    name: "Pink Top-kku",
    premium: false,
    description: "핑크 스티커 감성 탑꾸 에디션",
    preview: "linear-gradient(135deg, rgba(255,126,227,0.95), rgba(251,113,133,0.92), rgba(192,132,252,0.9))",
  },
  {
    key: "skywave_mint",
    name: "Midnight Stage",
    premium: true,
    description: "콘서트 무대의 딥 블루 네온",
    preview: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(59,130,246,0.86), rgba(34,211,238,0.84))",
  },
  {
    key: "jade_orbit",
    name: "Soft Fan Letter",
    premium: true,
    description: "민트 펄이 도는 편지형 포토카드",
    preview: "linear-gradient(135deg, rgba(209,250,229,0.96), rgba(167,243,208,0.88), rgba(147,197,253,0.8))",
  },
];

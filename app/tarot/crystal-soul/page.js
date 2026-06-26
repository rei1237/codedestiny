import CrystalSoulTarotClient from "./CrystalSoulTarotClient";

const CRYSTAL_SOUL_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "원석 소울 타로",
    description: "손끝으로 고른 원석과 다섯 장의 카드가 마음의 결, 관계의 온도, 오늘의 작은 선택을 함께 비추는 크리스탈 오라클 타로.",
    ogDescription: "원석을 선택하고 카드의 빛을 깨워 감정의 잔향과 오늘의 선택 방향을 읽는 몰입형 크리스탈 타로.",
  },
  en: {
    title: "Crystal Soul Tarot",
    description: "A crystal oracle tarot where the stone you choose and five cards reveal your emotional texture, relationship temperature, and small choice for today.",
    ogDescription: "Choose a crystal, awaken the light of the cards, and read the emotional echo and direction of today’s choice.",
  },
  ja: {
    title: "原石ソウルタロット",
    description: "指先で選んだ原石と5枚のカードが、心の質感、関係の温度、今日の小さな選択を照らすクリスタルオラクルタロット。",
    ogDescription: "原石を選び、カードの光を目覚めさせ、感情の余韻と今日の選択の方向を読む没入型クリスタルタロット。",
  },
};

const crystalSoulPageCopy = CRYSTAL_SOUL_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata = {
  title: crystalSoulPageCopy.title,
  description: crystalSoulPageCopy.description,
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: crystalSoulPageCopy.title,
    description: crystalSoulPageCopy.ogDescription,
    images: [{ url: "https://code-destiny.com/fuctionassets/stonetaro.webp" }],
  },
};

export default function CrystalSoulTarotPage() {
  return <CrystalSoulTarotClient />;
}

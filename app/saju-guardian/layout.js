import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";

const SAJU_GUARDIAN_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "Saju Guardian — 사주 가디언 소환진 | 꿀꿀 운세",
    description: "생년월일 사주 정보를 바탕으로 일주·월지·시지의 수호 인장을 열고 7일 실행 의식을 전합니다.",
    ogTitle: "Saju Guardian — 사주 가디언 소환진",
    ogDescription: "일주·월지·시지의 기운으로 지금 필요한 수호 인장과 7일 의식이 열립니다.",
    siteName: "꿀꿀 운세",
    imageAlt: "Saju Guardian 사주 가디언 소환진",
    twitterDescription: "생년월일 사주 기운으로 수호 인장과 7일 의식이 열립니다.",
    keywords: ["사주 가디언", "Saju Guardian", "수호 인장", "60갑자", "일주 가디언", "오행 인장", "사주 소환진", "꿀꿀 만세력"],
  },
  en: {
    title: "Saju Guardian — Guardian Seal Summoning | Code Destiny",
    description: "Open guardian seals from your Saju day pillar, month branch, and hour branch, then receive a 7-day ritual.",
    ogTitle: "Saju Guardian — Guardian Seal Summoning",
    ogDescription: "The energy of your day, month, and hour branches opens the guardian seal and 7-day ritual you need now.",
    siteName: "Code Destiny",
    imageAlt: "Saju Guardian seal summoning circle",
    twitterDescription: "Your birth-date Saju energy opens a guardian seal and 7-day ritual.",
    keywords: ["Saju Guardian", "guardian seal", "60 gapja", "day pillar guardian", "five element seal", "Saju summoning circle", "Code Destiny"],
  },
  ja: {
    title: "Saju Guardian — 四柱推命ガーディアン召喚陣 | Code Destiny",
    description: "生年月日の四柱推命情報をもとに、日柱・月支・時支の守護印を開き、7日間の実践儀式を届けます。",
    ogTitle: "Saju Guardian — 四柱推命ガーディアン召喚陣",
    ogDescription: "日柱・月支・時支の気で、今必要な守護印と7日間の儀式が開きます。",
    siteName: "Code Destiny",
    imageAlt: "Saju Guardian 四柱推命ガーディアン召喚陣",
    twitterDescription: "生年月日の四柱推命エネルギーで守護印と7日間の儀式が開きます。",
    keywords: ["四柱推命ガーディアン", "Saju Guardian", "守護印", "60甲子", "日柱ガーディアン", "五行印", "四柱推命召喚陣"],
  },
};

const sajuGuardianLayoutCopy = SAJU_GUARDIAN_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata = withUniqueRouteMetadata("/saju-guardian", {
  title: sajuGuardianLayoutCopy.title,
  description: sajuGuardianLayoutCopy.description,
  alternates: {
    canonical: "https://code-destiny.com/saju-guardian",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju-guardian",
    title: sajuGuardianLayoutCopy.ogTitle,
    description: sajuGuardianLayoutCopy.ogDescription,
    siteName: sajuGuardianLayoutCopy.siteName,
    locale: "ko_KR",
    images: [
      {
        url: "https://code-destiny.com/fuctionassets/saju-guardian-animal-v20260615.png",
        width: 1200,
        height: 630,
        alt: sajuGuardianLayoutCopy.imageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: sajuGuardianLayoutCopy.ogTitle,
    description: sajuGuardianLayoutCopy.twitterDescription,
    images: ["https://code-destiny.com/fuctionassets/saju-guardian-animal-v20260615.png"],
  },
  keywords: sajuGuardianLayoutCopy.keywords,
});

export default function SajuGuardianLayout({ children }) {
  return children;
}

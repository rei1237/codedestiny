import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";

const SAJU_PICTURE_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "Saju Guardian으로 이동 | 꿀꿀 운세",
    description: "사주 가디언 소환진은 /saju-guardian 경로에서 열립니다.",
  },
  en: {
    title: "Move to Saju Guardian | Honey Pig Manselyeok",
    description: "The Saju Guardian summoning circle opens at /saju-guardian.",
  },
  ja: {
    title: "Saju Guardianへ移動 | Honey Pig 万歳暦",
    description: "四柱ガーディアン召喚陣は /saju-guardian で開きます。",
  },
};

const sajuPictureLayoutCopy = SAJU_PICTURE_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata = withUniqueRouteMetadata("/saju-picture", {
  title: sajuPictureLayoutCopy.title,
  description: sajuPictureLayoutCopy.description,
  alternates: {
    canonical: "https://code-destiny.com/saju-guardian",
  },
});

export default function SajuPictureRedirectLayout({ children }) {
  return children;
}

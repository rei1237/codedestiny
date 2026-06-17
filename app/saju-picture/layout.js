import { withUniqueRouteMetadata } from "../../lib/generate-page-metadata";

export const metadata = withUniqueRouteMetadata("/saju-picture", {
  title: "Saju Guardian으로 이동 | 꿀꿀 만세력",
  description: "사주 가디언 소환진은 /saju-guardian 경로에서 열립니다.",
  alternates: {
    canonical: "https://code-destiny.com/saju-guardian",
  },
});

export default function SajuPictureRedirectLayout({ children }) {
  return children;
}

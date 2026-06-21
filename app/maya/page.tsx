import MayaCalendarView from "@/src/components/maya/MayaCalendarView";
import { buildFortuneJsonLd, generatePageMetadata } from "@/lib/generate-page-metadata";

const META = {
  path: "/maya",
  title: "마야 달력 - 마야점 프롬프트 생성기",
  description:
    "선택한 날짜의 Long Count, Tzolk'in, Haab 값을 월간 달력으로 확인하고 마야점 상담 프롬프트를 생성합니다.",
  keywords: ["마야 달력", "마야점", "Long Count", "Tzolk'in", "Haab", "마야점 프롬프트"],
  image: "https://assets.code-destiny.com/%EB%A7%88%EC%95%BC%EC%A0%90.webp",
  featureList: ["월간 마야 달력", "선택 날짜 상세 코드", "마야점 상담 프롬프트 생성"],
  applicationCategory: "LifestyleApplication",
} as const;

const JSON_LD = buildFortuneJsonLd(META);

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function MayaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <MayaCalendarView />
    </>
  );
}

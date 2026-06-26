import MayaCalendarView from "@/src/components/maya/MayaCalendarView";
import { buildFortuneJsonLd, generatePageMetadata } from "@/lib/generate-page-metadata";

const MAYA_PAGE_METADATA_COPY = {
  ko: {
    title: "마야 달력 - 마야점 프롬프트 생성기",
    description:
      "선택한 날짜의 Long Count, Tzolk'in, Haab 값을 월간 달력으로 확인하고 마야점 상담 프롬프트를 생성합니다.",
    keywords: ["마야 달력", "마야점", "Long Count", "Tzolk'in", "Haab", "마야점 프롬프트"],
    featureList: ["월간 마야 달력", "선택 날짜 상세 코드", "마야점 상담 프롬프트 생성"],
  },
  en: {
    title: "Maya Calendar - Maya Oracle Prompt Generator",
    description:
      "View Long Count, Tzolk'in, and Haab values for selected dates in a monthly calendar and generate a Maya oracle consultation prompt.",
    keywords: ["Maya calendar", "Maya oracle", "Long Count", "Tzolk'in", "Haab", "Maya oracle prompt"],
    featureList: ["Monthly Maya calendar", "Selected-date detail codes", "Maya oracle consultation prompt"],
  },
  ja: {
    title: "マヤ暦 - マヤ占いプロンプト生成",
    description:
      "選択した日付のLong Count、Tzolk'in、Haabを月間カレンダーで確認し、マヤ占い相談プロンプトを生成します。",
    keywords: ["マヤ暦", "マヤ占い", "Long Count", "Tzolk'in", "Haab", "マヤ占いプロンプト"],
    featureList: ["月間マヤ暦", "選択日付の詳細コード", "マヤ占い相談プロンプト生成"],
  },
  zh: {
    title: "玛雅历 - 玛雅占卜提示生成器",
    description:
      "在月历中查看所选日期的 Long Count、Tzolk'in 与 Haab 值，并生成玛雅占卜咨询提示。",
    keywords: ["玛雅历", "玛雅占卜", "Long Count", "Tzolk'in", "Haab", "玛雅占卜提示"],
    featureList: ["月度玛雅历", "所选日期详细代码", "玛雅占卜咨询提示生成"],
  },
} as const;

const META = {
  path: "/maya",
  ...MAYA_PAGE_METADATA_COPY.ko,
  image: "https://assets.code-destiny.com/%EB%A7%88%EC%95%BC%EC%A0%90.webp",
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

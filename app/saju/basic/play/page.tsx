import { redirect } from "next/navigation";

const SAJU_BASIC_PLAY_METADATA_COPY = {
  ko: {
    title: "사주 만세력 기본 해석 - 오행·십성·명식 분석 | Code Destiny",
    description:
      "생년월일시 기반 사주 명식으로 오행 균형과 십성 흐름을 분석하는 사주 서비스.",
  },
  en: {
    title: "Basic Saju Manse Calendar Reading - Five Elements, Ten Gods, and Chart Analysis | Code Destiny",
    description:
      "A saju service that analyzes Five Elements balance and Ten Gods flow from a birth-date-and-time chart.",
  },
  ja: {
    title: "四柱推命万歳暦 基本解釈 - 五行・十星・命式分析 | Code Destiny",
    description:
      "生年月日時に基づく四柱推命命式から、五行バランスと十星の流れを分析するサービスです。",
  },
  zh: {
    title: "四柱万年历基础解读 - 五行、十神与命盘分析 | Code Destiny",
    description:
      "根据出生年月日時四柱命盘，分析五行平衡与十神流向的四柱服务。",
  },
};

const metadataCopy = SAJU_BASIC_PLAY_METADATA_COPY.ko;

export const metadata = {
  title: metadataCopy.title,
  description: metadataCopy.description,
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function SajuBasicPlayPage() {
  redirect("/#destinyCardForm");
}

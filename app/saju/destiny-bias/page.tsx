import DestinyBiasRouteClient from "./DestinyBiasRouteClient";
import MyDestinyBiasShell from "./components/MyDestinyBiasShell";

const DESTINY_BIAS_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "최애운명 - 사주 기반 덕질 운명 분석 | Code Destiny",
    description: "내 사주와 최애의 사주를 비교해 공명 점수, 오행 보완 포인트, 오늘의 최애운명 액션을 카드로 확인하는 팬덤 맞춤 분석 서비스.",
    ogTitle: "최애운명 - 사주 기반 덕질 운명 분석",
    ogDescription: "AI는 해석만, 계산은 내부 명식 엔진으로 처리하는 최애운명 카드 분석.",
    ogAlt: "최애운명 OG 카드",
  },
  en: {
    title: "My Destiny Bias - Saju-Based Fandom Destiny Analysis | Code Destiny",
    description: "Compare your Saju with your bias, then check resonance score, Five Element support points, and today's destiny-bias action card.",
    ogTitle: "My Destiny Bias - Saju-Based Fandom Destiny Analysis",
    ogDescription: "A destiny-bias card analysis where AI writes the interpretation and the internal chart engine handles calculation.",
    ogAlt: "My Destiny Bias OG card",
  },
  ja: {
    title: "推し運命 - 四柱推命ベースの推し活運命分析 | Code Destiny",
    description: "あなたの四柱推命と推しの四柱推命を比べ、共鳴スコア、五行補完ポイント、今日の推し運命アクションをカードで確認します。",
    ogTitle: "推し運命 - 四柱推命ベースの推し活運命分析",
    ogDescription: "AIは解釈だけを担い、計算は内部命式エンジンで処理する推し運命カード分析です。",
    ogAlt: "推し運命OGカード",
  },
} as const;

const destinyBiasPageCopy = DESTINY_BIAS_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata = {
  title: destinyBiasPageCopy.title,
  description: destinyBiasPageCopy.description,
  alternates: {
    canonical: "https://code-destiny.com/saju/destiny-bias",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju/destiny-bias",
    title: destinyBiasPageCopy.ogTitle,
    description: destinyBiasPageCopy.ogDescription,
    images: [
      {
        url: "https://code-destiny.com/api/destiny-bias/og?title=%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85%20%EC%B9%B4%EB%93%9C&score=88&grade=A&relation=%EC%9A%B4%EB%AA%85%20%EA%B3%B5%EB%AA%85&price=50",
        width: 1200,
        height: 630,
        alt: destinyBiasPageCopy.ogAlt,
      },
    ],
  },
};

export default function DestinyBiasPage() {
  return (
    <MyDestinyBiasShell>
      <DestinyBiasRouteClient />
    </MyDestinyBiasShell>
  );
}

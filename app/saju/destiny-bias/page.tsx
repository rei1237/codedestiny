import DestinyBiasRouteClient from "./DestinyBiasRouteClient";
import MyDestinyBiasShell from "./components/MyDestinyBiasShell";

const DESTINY_BIAS_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "최애운명 - 사주 기반 덕질 운명 분석 | Code Destiny",
    description: "내 사주와 최애의 사주를 비교해 공명 점수, 오행 보완 포인트, 오늘의 최애운명 액션을 카드로 확인하는 팬덤 맞춤 분석 서비스.",
    ogTitle: "최애운명 - 사주 기반 덕질 운명 분석",
    ogDescription: "전문가는 해석만, 계산은 내부 명식 엔진으로 처리하는 최애운명 카드 분석.",
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
      {/* 분석 화면은 클라이언트에서만 그려져 크롤러에게는 사실상 빈 페이지였다. 아래 안내는
          서버에서 렌더해 이 분석이 무엇을 계산하는지 읽을 수 있게 한다. 네 축의 이름과 가중치는
          engine/compatibilityScore.ts 의 calculateBiasCompatibility 정의를 그대로 옮긴 것이다.
          🔴 이 섹션에 H1 을 두지 말 것 — 페이지의 H1 은 클라이언트가 이미 소유하고 있다. */}
      <section className="sr-only" aria-label="최애운명 분석 안내">
        <h2>최애운명 — 나와 최애의 기운을 네 축으로 갈라 보는 분석</h2>
        <p>
          최애를 좋아하는 마음은 하나인데 그 마음이 쓰이는 방식은 사람마다 다릅니다. 어떤 사람은 감정이
          먼저 움직이고, 어떤 사람은 오래 곁을 지키는 쪽으로 힘을 씁니다. 최애운명은 두 사람의 생년월일과
          이름, 지금의 무드를 입력받아 그 차이를 네 개의 축으로 나눠 점수화하고, 종합 점수는 네 축을 서로
          다른 비중으로 섞어 냅니다.
        </p>
        <h3>네 개의 축과 종합 점수의 비중</h3>
        <ul>
          <li>
            감정 공명 — 두 사람의 감정이 같은 지점에서 올라오는 정도입니다. 종합 점수에서 가장 큰 비중인
            34퍼센트를 차지하며, 태어난 계절의 오행이 같으면 여기에 가산이 붙습니다.
          </li>
          <li>
            팬덤 케미 — 좋아하는 방식이 서로를 밀어 주는 정도입니다. 비중은 28퍼센트이고, 계절 오행이
            상생 관계(화와 목, 수와 금)일 때 가산이 붙습니다.
          </li>
          <li>
            장기 흐름 — 이 마음이 오래갈 수 있는 조건을 봅니다. 비중은 20퍼센트이고, 두 사람의 출생 연도
            차이가 좁을수록 기본값이 높게 잡힙니다.
          </li>
          <li>
            응원 스타일 — 곁을 지키는 방식이 얼마나 맞물리는지 봅니다. 비중은 18퍼센트이고, 태어난 날짜의
            간격이 좁을수록 기본값이 높게 잡힙니다.
          </li>
        </ul>
        <h3>에너지 타입과 연결 키워드가 나오는 방식</h3>
        <p>
          에너지 타입은 태어난 계절에서 뽑은 오행 라벨과 생년월일 숫자를 한 자리로 줄인 값을 붙여 만듭니다.
          연결 키워드는 두 사람의 이름에서 뽑은 기운과 초점, 그리고 입력한 최애 무드와 관계 무드를 섞어
          중복 없이 다섯 개까지 고릅니다. 같은 값을 넣으면 언제 눌러도 같은 결과가 나옵니다.
        </p>
        <h3>점수를 읽는 법</h3>
        <p>
          네 축은 높고 낮음으로 우열을 가리는 지표가 아닙니다. 감정 공명이 높고 장기 흐름이 낮게 나왔다면
          그것은 나쁜 궁합이 아니라 지금의 마음이 순간의 온도를 따라 움직이고 있다는 뜻에 가깝습니다.
          점수 자체보다 네 축의 모양이 서로 어떻게 어긋나 있는지를 보는 편이 실제로 쓸모가 있습니다.
        </p>
        <h3>자주 묻는 질문</h3>
        <h4>최애의 정확한 생년월일을 몰라도 되나요?</h4>
        <p>
          네 축 중 장기 흐름과 응원 스타일은 출생 연도와 날짜의 간격을 직접 쓰므로, 날짜가 다르면 그 두 축이
          함께 움직입니다. 공개된 생일만 알고 연도를 모른다면 결과를 연도별로 비교해 보는 편이 정확합니다.
        </p>
        <h4>같은 사람인데 결과가 달라질 수 있나요?</h4>
        <p>
          입력값이 같으면 결과도 같습니다. 이름, 생년월일, 최애 무드, 관계 무드 네 가지가 모두 계산에
          들어가므로 무드를 바꾸면 연결 키워드와 점수가 함께 달라집니다.
        </p>
        <p>
          최애운명은 팬덤 문화를 위한 오락 콘텐츠입니다. 실재하는 인물의 성격이나 사생활을 규정하지 않으며,
          입력한 이름과 생년월일은 결과 카드를 만드는 계산에만 쓰입니다.
        </p>
      </section>
      <DestinyBiasRouteClient />
    </MyDestinyBiasShell>
  );
}

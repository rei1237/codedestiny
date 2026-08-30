import type { Metadata } from "next";
import SajuFptiRouteClient from "./SajuFptiRouteClient";
import RouteMetadataLocaleSync from "../components/RouteMetadataLocaleSync";
import ImmersiveRelatedLinks from "../components/ImmersiveRelatedLinks";
import ServiceIntroSection from "../components/ServiceIntroSection";

const SAJU_FPTI_METADATA_COPY = {
  ko: {
    title: "사주 FPTI 테스트 | 코드 데스티니",
    description:
      "사주 오행과 십성 분포를 기반으로 4축 FPTI 코드를 분석해주는 테스트. 무료 핵심 결과와 유료 심층 리포트를 제공합니다.",
  },
  en: {
    title: "Saju FPTI Test | Code Destiny",
    description:
      "Analyze your four-axis FPTI code from the Five Elements and Ten Gods distribution in your saju chart, with free core results and a paid deep report.",
  },
  ja: {
    title: "四柱推命FPTIテスト | Code Destiny",
    description:
      "四柱推命の五行と十星の分布をもとに4軸FPTIコードを分析するテストです。無料の基本結果と有料の深層リポートを提供します。",
  },
  zh: {
    title: "四柱 FPTI 测试 | Code Destiny",
    description:
      "基于四柱五行与十神分布分析四轴 FPTI 代码，提供免费核心结果与付费深度报告。",
  },
};

const metadataCopy = SAJU_FPTI_METADATA_COPY.ko;

export const metadata: Metadata = {
  title: metadataCopy.title,
  description: metadataCopy.description,
  alternates: {
    canonical: "/saju-fpti",
  },
};

export default function SajuFptiPage() {
  return (
    <>
      <RouteMetadataLocaleSync entries={SAJU_FPTI_METADATA_COPY} />
      <SajuFptiRouteClient />
      {/* 테스트 화면은 클라이언트가 그리고(ssr:false) 그 안의 설명은 짧다. 아래 안내는 서버에서
          렌더해 검색엔진이 이 테스트의 구조를 읽을 수 있게 한다. 네 축의 이름과 여덟 글자의 뜻은
          components/fpti/_lib/copy.ts 의 axisCardLabels·axis*Label 정의를 그대로 옮긴 것이고,
          FAQ 문답은 같은 파일 faqItems 의 내용과 어긋나지 않게 맞췄다.
          🔴 이 섹션에 H1 을 두지 말 것 — 페이지의 H1 은 클라이언트가 이미 소유하고 있어
          H1 이 2개가 되면 verify:seo-heading-integrity 와 verify:hydrated-h1-integrity 가 실패한다.
          🔴 분량을 줄이지 말 것 — 이 라우트는 광고 게재 불가(canLoadAdsense=false)인데 사이트맵에
          색인 가능 상태로 들어가 있어, verify-adsense-readiness 의
          verifyBlockedIndexableSitemapRouteQuality 가 렌더 텍스트 1,800자를 요구한다.
          2026-08-30: sr-only 였던 본문을 ServiceIntroSection 으로 가시화했다(성장 계획 1-D) — 본문 전체를
          숨긴 형태는 Google 의 Hidden text 정책 소지가 있고 AdSense 검수자에게도 보이지 않는다. 배치는 앱 아래. */}
      <ServiceIntroSection label="사주 FPTI 테스트 안내">
        <h2>사주 FPTI — 오행과 십성으로 읽는 네 개의 성향 축</h2>
        <p>
          FPTI는 사주 명식에 담긴 오행(목·화·토·금·수)의 균형과 십성(비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인)의
          분포를 네 개의 축으로 정리해 네 글자 코드로 보여 주는 성향 지표입니다. 사주를 처음 보는 사람이 가장 자주
          막히는 지점은 용어가 아니라 “그래서 나는 어떤 사람인가”로 이어지는 다리가 없다는 것입니다. 네 축은 그 다리를
          맡습니다. 명식을 새로 해석하는 것이 아니라, 이미 계산된 오행 강약과 십성 배치를 사람이 읽을 수 있는 방향으로
          옮겨 놓는 단계입니다.
        </p>
        <h3>네 개의 축이 각각 무엇을 보는가</h3>
        <ul>
          <li>
            에너지축 — 기운을 밖으로 쓰는지 안에 모으는지를 봅니다. 외향 발산형(A)은 사람과 사건 속에서 힘이 붙고,
            내면 축적형(M)은 혼자 정리하는 시간에서 힘이 회복됩니다.
          </li>
          <li>
            판단축 — 결정을 내릴 때 무엇을 먼저 보는지를 봅니다. 감응 공감형(H)은 관계와 분위기의 결을 먼저 읽고,
            구조 판단형(L)은 조건과 기준을 먼저 세웁니다.
          </li>
          <li>
            실행축 — 일을 굴리는 방식을 봅니다. 자유 탐색형(F)은 여지를 남겨 두고 움직이며,
            질서 구축형(B)은 순서와 규칙을 먼저 만들어 두고 시작합니다.
          </li>
          <li>
            전망축 — 시선이 어디에 머무는지를 봅니다. 현실 감각형(R)은 지금 손에 잡히는 것에서 출발하고,
            비전 직관형(V)은 아직 오지 않은 그림에서 출발합니다.
          </li>
        </ul>
        <p>
          네 축에서 한 글자씩 골라 나온 조합이 당신의 FPTI 코드이며, 가능한 조합은 모두 16가지입니다. 각 코드에는
          핵심 성향 한 줄, 강점과 주의할 점, 관계·일·재물 감각, 어울리는 루틴과 성장 방향이 도감 형태로 붙어 있습니다.
        </p>
        <h3>결과를 읽는 법</h3>
        <p>
          여덟 글자 중 어느 쪽도 좋고 나쁨이 아닙니다. 축은 능력의 높낮이가 아니라 힘이 흘러가는 방향을 가리키므로,
          같은 코드라도 어떤 환경에 놓이느냐에 따라 강점으로도 부담으로도 나타납니다. 출생 시간을 함께 넣으면 시주까지
          계산에 들어가 정밀 분석으로 잡히고, 시간을 모르면 연주·월주·일주 중심의 부분 분석이나 기본 패턴 분석으로
          표시됩니다. 결과 화면의 정확도 가이드가 지금 어느 단계로 계산됐는지 알려 줍니다.
        </p>
        <h3>계산에 실제로 쓰이는 것</h3>
        <p>
          네 축은 성격 설문이 아니라 명식에서 나옵니다. 생년월일시를 만세력으로 옮겨 연주·월주·일주·시주를 세우고,
          여덟 글자에 담긴 오행이 서로를 살리는지(상생) 누르는지(상극)를 세어 어느 기운이 강하고 어느 기운이
          모자란지를 먼저 정합니다. 그 위에 일간을 기준으로 십성을 배치하면, 재물과 관계와 일을 대하는 태도가
          어느 쪽으로 기울어 있는지가 드러납니다. 네 축은 그 두 층을 각각 한 글자로 압축한 결과입니다.
        </p>
        <p>
          그래서 같은 날 태어나도 태어난 시간이 다르면 코드가 달라질 수 있고, 반대로 오행 분포가 비슷하면 생일이
          멀어도 같은 코드로 묶입니다. 코드가 같다고 삶이 같다는 뜻은 아니며, 같은 출발선에서 무엇을 쓰기 쉬운지가
          닮았다는 정도로 읽는 편이 정확합니다.
        </p>
        <h3>자주 묻는 것</h3>
        <ul>
          <li>
            MBTI와 같은 것인가요 — 아닙니다. 심리 검사 문항으로 답을 모으는 방식이 아니라, 생년월일시에서 뽑은 사주
            흐름을 네 축으로 정리한 코드입니다. 네 글자라는 형식이 닮았을 뿐 근거가 다릅니다.
          </li>
          <li>
            결과가 평생 고정인가요 — 기본 성향은 출생 정보에서 계산되지만, 실제 삶에서 그 성향이 드러나는 방식은
            환경과 선택에 따라 달라집니다. 코드는 출발점이지 결론이 아닙니다.
          </li>
          <li>
            도감 설명과 개인 리포트는 무엇이 다른가요 — 도감은 16개 유형을 이해하기 위한 공통 설명이고, 리포트는
            당신의 명식에서 나온 오행 강약과 십성 배치를 함께 놓고 더 구체적으로 풀어 줍니다.
          </li>
        </ul>
        <p>
          핵심 코드와 무료 리포트 요약은 회원가입 없이 바로 확인할 수 있고, 심층 리포트는 유료로 제공됩니다.
          이 테스트는 오락과 자기 이해를 위한 콘텐츠이며 심리 상담이나 진단을 대신하지 않습니다. 건강, 법률, 투자,
          치료, 안전에 관한 결정은 전문 기관의 도움을 우선해 주세요.
        </p>
      </ServiceIntroSection>
      <ImmersiveRelatedLinks fromPath="/saju-fpti" />
    </>
  );
}

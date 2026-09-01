import LoveSimulationClient from "./LoveSimulationClient";
import ImmersiveRelatedLinks from "../../components/ImmersiveRelatedLinks";
import ServiceIntroSection from "../../components/ServiceIntroSection";

const LOVE_SIMULATION_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "LOVE CODE - 사주 연애 시뮬레이션 | Code Destiny",
    description: "상대방의 생년월일로 사주를 분석해 페르소나 캐릭터를 만들고, 다양한 데이트 코스와 선택지를 통해 상대방의 취향·성격을 미리 경험해보는 연애 시뮬레이션.",
    keywords: ["연애 시뮬레이션", "사주 연애", "상대방 사주 분석", "데이트 시뮬레이션", "love simulation", "saju love", "사주 궁합 게임"],
    ogTitle: "LOVE CODE - 사주 연애 시뮬레이션",
    ogDescription: "상대방의 생년월일로 사주 분석 후 연애 시뮬레이션을 체험하세요.",
    ogAlt: "LOVE CODE 사주 연애 시뮬레이션",
  },
  en: {
    title: "LOVE CODE - Saju Love Simulation | Code Destiny",
    description: "Create a Saju-based persona from the other person's birth date, then explore their taste and temperament through date routes and choices.",
    keywords: ["love simulation", "Saju love", "Saju analysis for crush", "date simulation", "Saju compatibility game"],
    ogTitle: "LOVE CODE - Saju Love Simulation",
    ogDescription: "Analyze a birth date through Saju and experience a love simulation.",
    ogAlt: "LOVE CODE Saju love simulation",
  },
  ja: {
    title: "LOVE CODE - 四柱推命恋愛シミュレーション | Code Destiny",
    description: "相手の生年月日から四柱推命ベースのペルソナを作り、デートコースと選択肢を通じて好みや性格を先に体験する恋愛シミュレーションです。",
    keywords: ["恋愛シミュレーション", "四柱推命 恋愛", "相手の四柱推命分析", "デートシミュレーション", "四柱推命相性ゲーム"],
    ogTitle: "LOVE CODE - 四柱推命恋愛シミュレーション",
    ogDescription: "相手の生年月日を四柱推命で分析し、恋愛シミュレーションを体験してください。",
    ogAlt: "LOVE CODE 四柱推命恋愛シミュレーション",
  },
} as const;

const loveSimulationPageCopy = LOVE_SIMULATION_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata = {
  title: loveSimulationPageCopy.title,
  description: loveSimulationPageCopy.description,
  keywords: loveSimulationPageCopy.keywords,
  alternates: {
    canonical: "https://code-destiny.com/saju/love-simulation",
  },
  openGraph: {
    type: "website",
    url: "https://code-destiny.com/saju/love-simulation",
    title: loveSimulationPageCopy.ogTitle,
    description: loveSimulationPageCopy.ogDescription,
    images: [
      {
        url: "https://code-destiny.com/fuctionassets/love%20code.webp",
        width: 1200,
        height: 630,
        alt: loveSimulationPageCopy.ogAlt,
      },
    ],
  },
};

export default function LoveSimulationPage() {
  return (
    <main style={{ background: "#070a16", color: "#e2e8f0" }}>
      <LoveSimulationClient />
      {/* 시뮬레이션은 클라이언트에서만 그려져 크롤러에게는 완전히 빈 페이지였다(2026-08-24
          실측: 가시 텍스트 45자). 아래 안내는 서버에서 렌더한다. 등장인물의 일간과 유형,
          다섯 수치의 초기값은 _data/loveCodeMvp.ts 의 LOVE_CHARACTERS · INITIAL_STATS 를 따랐다.
          🔴 이 라우트의 H1 은 여기가 소유한다 — 클라이언트(LoveSimulationEngine)의 제목은 전부 h2 다.
          2026-09-02 정정: 이 자리에 있던 "클라이언트가 H1 을 갖지 않는다"는 서술은 사실이 아니었다.
          엔진에 h1 이 4개 있었고, verify:hydrated-h1-integrity 의 dynamic() 탐지 정규식이
          LoveSimulationClient 의 `import(X).then(...)` 형태를 놓쳐 순회에서 통째로 빠져 있었다.
          🔴 막는 가드는 verify:hydrated-h1-integrity 다. verify:seo-heading-integrity 는 서버 HTML 만
          보므로 ssr:false 인 이 클라이언트의 h1 을 애초에 세지 못한다.
          2026-08-30: sr-only 였던 본문을 ServiceIntroSection 으로 가시화했다(성장 계획 1-D) — 본문 전체를
          숨긴 형태는 Google 의 Hidden text 정책 소지가 있고 AdSense 검수자에게도 보이지 않는다. 배치는 앱 아래. */}
      <ServiceIntroSection label="LOVE CODE 사주 연애 시뮬레이션 안내">
        <h1>LOVE CODE — 사주 일간으로 만든 인물과 걸어 보는 연애 시뮬레이션</h1>
        <p>
          궁합을 점수로 듣고 나면 대개 두 가지가 남습니다. 숫자 하나와, 그래서 어떻게 하라는 건지 모르겠다는
          기분입니다. LOVE CODE 는 결과를 말로 설명하는 대신 상황을 걷게 합니다. 상대의 생년월일에서 뽑은
          기질을 가진 인물을 마주 세우고, 데이트 장면마다 선택을 고르면 그 선택이 관계 수치를 실제로 움직입니다.
        </p>
        <h2>선택이 움직이는 다섯 가지 수치</h2>
        <ul>
          <li>호감 — 상대가 나를 향해 기울어 있는 정도입니다. 시작값은 48입니다.</li>
          <li>신뢰 — 말과 행동이 쌓여 만들어지는 안정감입니다. 시작값은 46입니다.</li>
          <li>케미 — 대화의 속도와 온도가 맞물리는 정도입니다. 시작값은 44입니다.</li>
          <li>긴장 — 관계를 밀고 당기는 압력입니다. 유일하게 낮게 시작해 30에서 출발합니다.</li>
          <li>안정 — 관계가 흔들린 뒤 돌아오는 힘입니다. 시작값은 48입니다.</li>
        </ul>
        <p>
          다섯 수치는 서로 독립적이지 않습니다. 긴장을 올리는 선택이 케미를 함께 끌어올리기도 하고, 안전한
          선택만 이어 가면 안정은 지켜지지만 케미가 자리를 잃습니다. 어떤 선택이 정답인지가 아니라, 내가
          기본값으로 어떤 쪽을 고르는 사람인지가 드러나는 구조입니다.
        </p>
        <h2>열여섯 명의 인물과 그 일간</h2>
        <p>
          등장인물은 남성 인물 여덟 명과 여성 인물 여덟 명, 모두 열여섯 명입니다. 각 인물은 사주의 열 개
          천간 중 하나를 일간으로 갖고, 그 일간의 성질이 말투와 선택 반응의 기준이 됩니다.
        </p>
        <ul>
          <li>병화 계열 — 강태준은 열정적인 에이스, 새벽은 도시의 붉은 빛으로 직진하는 반응을 보입니다.</li>
          <li>정화 계열 — 한윤서는 무대 위의 반짝이는 별, 하린은 핑크 네온의 장난꾸러기로 표현이 앞섭니다.</li>
          <li>갑목·을목 계열 — 윤시우와 소화는 청량한 확장을, 서연과 연이는 부드럽게 스며드는 결을 맡습니다.</li>
          <li>경금·신금 계열 — 권세현은 차가운 전략가, 네오는 조용한 은빛 소년, 김밍은 은빛의 로맨티스트로 거리를 재며 다가옵니다.</li>
          <li>임수·계수 계열 — 서이준과 지윤, 미카엘과 박지은은 속을 늦게 여는 대신 한 번 열면 깊게 갑니다.</li>
          <li>기토 계열 — 서유안은 포근한 문학 선배로, 흔들릴 때 자리를 지켜 주는 쪽에 섭니다.</li>
        </ul>
        <h2>걷게 되는 열한 개의 장면</h2>
        <p>
          장면은 좋은 날만 모아 두지 않았습니다. 설레는 자리와 불편한 자리를 섞어 두어야 내 선택 습관이
          드러나기 때문입니다. 각 장면의 선택지에는 오행 성질과 위험도가 붙어 있고, 위험도가 높은 선택일수록
          수치를 크게 흔듭니다.
        </p>
        <ul>
          <li>영화관 — 엔딩 크레딧이 올라간 뒤, 방금 본 것을 어떻게 말할지 고르는 자리입니다.</li>
          <li>드라이브 — 야간 도심을 달리며 침묵과 말 사이의 간격을 재는 자리입니다.</li>
          <li>전시회 — 조용한 갤러리에서 상대가 오래 머무는 작품 앞으로 다가갈지 정합니다.</li>
          <li>갑작스러운 비 — 우산 하나에 두 사람이 설 때 어깨의 거리를 정하는 자리입니다.</li>
          <li>기념일 깜짝 이벤트 — 예상하지 못한 선물을 어떻게 받는지가 드러납니다.</li>
          <li>계산서 배틀 — 식사가 끝난 뒤 계산의 주도권을 어떻게 다루는지 봅니다.</li>
          <li>방해자의 등장 — 완벽하던 데이트에 낯선 사람이 끼어들 때의 반응을 봅니다.</li>
          <li>과거의 그림자 — 산책 도중 상대가 전 연인으로 보이는 사람 앞에서 굳었을 때입니다.</li>
          <li>답장 템포 차이 — 늦은 밤 평소와 다른 속도로 온 답장을 어떻게 읽을지 정합니다.</li>
          <li>여행 계획 충돌 — 즉흥을 원하는 쪽과 일정표를 원하는 쪽이 부딪히는 자리입니다.</li>
          <li>친구 경계선 — 모임 사진 속 거리감이 불편해졌을 때 그것을 어떻게 다룰지 봅니다.</li>
        </ul>
        <h2>이 시뮬레이션을 읽는 법</h2>
        <p>
          결과는 그 사람의 실제 성격이 아니라, 입력한 생년월일에서 뽑은 기질을 인물로 옮겨 놓은 것입니다.
          같은 상대를 두고도 내가 다른 선택을 하면 다른 결말이 나오므로, 이 시뮬레이션이 실제로 보여 주는
          것은 상대가 아니라 관계 속에서 반복되는 내 선택 습관 쪽에 가깝습니다.
        </p>
        <p>
          전통 명리학의 상징 체계를 바탕으로 한 오락 콘텐츠입니다. 실재하는 인물의 성격이나 관계를 규정하지
          않으며, 입력한 정보는 인물의 기질을 계산하는 데에만 쓰입니다.
        </p>
      </ServiceIntroSection>
      <ImmersiveRelatedLinks fromPath="/saju/love-simulation" />
    </main>
  );
}

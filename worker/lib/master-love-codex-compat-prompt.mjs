/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  마스터 인연의 서 · 궁합  (MASTER_LOVE_CODEX_COMPAT)  —  챕터/프롬프트 정의
 * ───────────────────────────────────────────────────────────────────────────
 *  - 상품: "마스터 인연의 서 · 궁합" — featureKey: `master-love-codex-compat`
 *  - 결제: 회당 결제(B유형), 500코인 = 50,000원. 개인판(`master-love-codex`,
 *    300코인=30,000원)과 별개 SKU다. 상대 명식·명반까지 4개 차트를 근거로 삼는다.
 *  - 구성: 두 사람의 결 → 사주 궁합 → 자미두수 궁합 → 관계의 현실 → 종합 = 20챕터.
 *    개인판과 같은 5막×4장 구조라 리더/PDF/봉인 UI를 그대로 재사용한다.
 *  - 명식·명반은 로컬 결정론 계산, 궁합 판정은 master-love-codex-compat.js,
 *    LLM 은 해석 텍스트만 생성한다. 주어진 자료 밖의 성요·간지를 지어내면 안 된다.
 *  - 화자는 개인판과 동일한 "연애 고수" 1인이다. 별도 캐릭터/페르소나를 등장시키지 않는다.
 *
 *  ▶ 접근 키워드: `MASTER_LOVE_CODEX_COMPAT`, `master-love-codex-compat`
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  buildMasterLoveCodexSystemGuide,
  formatSajuForPrompt,
  formatZiweiForCodexPrompt,
} from "./master-love-codex-prompt.mjs";

export const MASTER_LOVE_CODEX_COMPAT_META = Object.freeze({
  featureKey: "master-love-codex-compat",
  label: "마스터 인연의 서 · 궁합",
  narrator: "연애 고수",
  paymentType: "per-use", // 회당 결제 (B유형)
  costCoins: 500,
  amountKRW: 50000,
  totalCharTarget: 50000,
  minTotalChars: 46000,
});

/**
 * 궁합 20챕터 정의. 스키마는 개인판(MASTER_LOVE_CODEX_CHAPTERS)과 동일하다.
 *  - compatFocus: master-love-codex-compat.js 결과 중 이 장에서 특히 볼 판정 축
 */
export const MASTER_LOVE_CODEX_COMPAT_CHAPTERS = Object.freeze([
  // ── 막 I · 두 사람의 결 ────────────────────────────────────────────────────
  {
    id: "facing", order: 1, symbol: "對",
    title: "제1장 · 마주 선 두 사람 — 첫인상의 궁합",
    scope:
      "두 사람의 궁합 총론을 가장 먼저 짚는다. 일간의 오행 관계와 양쪽 명궁 주성을 근거로 "
      + "이 관계가 어떤 결의 만남인지 한눈에 잡아 준다. 점수를 나열하지 말고, 처음 만났을 때 "
      + "서로에게 무엇이 먼저 보였을지를 장면으로 그린다. 이 책 전체를 관통할 관계의 축 세 가지를 예고한다.",
    minChars: 2600, sajuFocus: ["양쪽 일간", "오행 분포 대조"], ziweiPalaces: ["양쪽 명궁", "양쪽 부부궁"],
    compatFocus: ["dayStemRelation", "elementBalance", "palaceOverlay"],
    avoid: ["각자의 기질 상세 — 2·3장 담당", "일간 관계 심층 — 5장", "명반 상호 배치 심층 — 9장", "시기 전망 — 13·19장"],
  },
  {
    id: "self", order: 2, symbol: "己",
    title: "제2장 · 당신이라는 사람 — 관계 속의 나",
    scope:
      "상담자 본인의 연애 기질을 먼저 세운다. 궁합을 보러 왔지만 판단의 기준점은 자기 자신이다. "
      + "본인 일간·십성 분포와 명궁·복덕궁을 근거로, 관계에서 어떤 자리에 서려 하는 사람인지 짚는다. "
      + "상대 이야기는 아직 꺼내지 않는다.",
    minChars: 2500, sajuFocus: ["본인 일간", "본인 십성 분포", "신강약"], ziweiPalaces: ["본인 명궁", "본인 복덕궁"],
    compatFocus: ["yongshinSupport"],
    avoid: ["상대의 기질 — 3장 담당", "두 사람의 상호작용 — 4·5·6장", "용신 보완 심층 — 7장"],
  },
  {
    id: "other", order: 3, symbol: "彼",
    title: "제3장 · 상대라는 사람 — 그 사람의 결",
    scope:
      "상대의 기질을 상대 명식·명반 근거로 읽는다. 상대를 평가하거나 험담하지 않고, "
      + "'이 사람은 이런 방식으로 애정을 처리한다'는 설명으로 옮긴다. 상담자가 오해하기 쉬운 "
      + "상대의 행동 한두 가지를 그 사람의 결로 다시 번역해 준다.",
    minChars: 2600, sajuFocus: ["상대 일간", "상대 십성 분포", "상대 신강약"], ziweiPalaces: ["상대 명궁", "상대 복덕궁"],
    compatFocus: ["tenGodInteraction"],
    avoid: ["본인 기질 재서술 — 2장 담당", "십성 상호작용 심층 — 6장", "상대에게 통하는 화법 — 15장", "상대 부처궁 비교 — 10장"],
  },
  {
    id: "pull", order: 4, symbol: "引",
    title: "제4장 · 무엇이 서로를 끌었나",
    scope:
      "끌림의 원리를 두 명식의 관계에서 설명한다. 일간 상생상극과 오행 보완 관계, 상대가 덮어 주는 "
      + "내 결핍과 내가 덮어 주는 상대의 결핍을 근거로, 이 끌림이 무엇에서 왔고 어떤 조건에서 식는지 짚는다.",
    minChars: 2500, sajuFocus: ["일간 관계", "오행 보완", "지장간"], ziweiPalaces: ["양쪽 부부궁", "양쪽 명궁"],
    compatFocus: ["dayStemRelation", "elementBalance"],
    avoid: ["천간합·충 판정 자체 — 5장 담당", "용신 공급 판정 — 7장", "지지 교차 — 8장", "권태·온도 변화 — 13장"],
  },

  // ── 막 II · 사주 궁합 심층 ─────────────────────────────────────────────────
  {
    id: "daystem", order: 5, symbol: "干",
    title: "제5장 · 일간의 관계 — 두 기둥이 만나는 방식",
    scope:
      "두 일간의 상생·상극·비화, 천간합과 천간충을 정면으로 다룬다. 누가 누구를 살리고 누가 "
      + "설기되는지 방향까지 밝히고, 그 방향이 일상에서 어떤 역할 분담으로 나타나는지 연결한다. "
      + "상극이라도 나쁘다고 단정하지 말고 어떤 조건에서 그 긴장이 동력이 되는지 함께 쓴다.",
    minChars: 2600, sajuFocus: ["일간 상생상극", "천간합", "천간충", "음양"], ziweiPalaces: ["양쪽 명궁"],
    compatFocus: ["dayStemRelation"],
    avoid: ["십성 역할 구도 — 6장 담당", "용신 보완 — 7장", "지지 합충형파해 — 8장", "끌림의 서사 — 4장"],
  },
  {
    id: "tengod", order: 6, symbol: "星",
    title: "제6장 · 십성 상호작용 — 서로가 맡는 역할",
    scope:
      "상대가 내 명식에서 어떤 십성으로 앉고 내가 상대에게 무엇이 되는지 양방향으로 읽는다. "
      + "관성·재성·식상·인성 중 어디로 몰리는지 보고, 그 배치가 관계에서 만드는 역할 구도(끌어 주는 사람, "
      + "기대는 사람, 채근하는 사람)를 구체적 장면으로 옮긴다.",
    minChars: 2600, sajuFocus: ["십성 상호작용", "관성", "재성", "식상", "인성"], ziweiPalaces: ["양쪽 부부궁"],
    compatFocus: ["tenGodInteraction"],
    avoid: ["일간 상생상극 판정 — 5장 담당", "화해 화법 — 15장", "각자의 기질 소개 — 2·3장"],
  },
  {
    id: "yongshin", order: 7, symbol: "補",
    title: "제7장 · 서로를 채우는 자리 — 용신과 보완",
    scope:
      "각자의 보완 축(용신 방향)과 과다 축(기신 방향)을 놓고, 상대가 그것을 공급하는지 아니면 "
      + "더 키우는지 양방향으로 판정한다. 함께 있을 때 무엇이 채워지고 무엇이 과열되는지 짚고, "
      + "과열되는 축은 관계 밖에서 어떻게 덜어 낼지 실행 조언으로 연결한다.",
    minChars: 2500, sajuFocus: ["용신 방향", "기신 방향", "오행 균형", "조후"], ziweiPalaces: ["양쪽 복덕궁"],
    compatFocus: ["yongshinSupport", "elementBalance"],
    avoid: ["끌림의 원리 — 4장 담당", "십성 역할 — 6장", "지속 가능성·결혼 — 16장", "사화 교환 — 12장"],
  },
  {
    id: "branch", order: 8, symbol: "支",
    title: "제8장 · 지지의 합충형파해 — 리듬이 부딪치는 지점",
    scope:
      "네 기둥 × 네 기둥의 지지 교차를 읽는다. 육합·반합이 걸린 자리는 서로를 묶어 주고, "
      + "충·형·파·해가 걸린 자리는 리듬을 흔든다. 특히 일주끼리의 관계는 생활 리듬에, 년주끼리는 "
      + "배경과 집안 결에 걸린다는 무게 차이를 분명히 구분해 설명한다.",
    minChars: 2500, sajuFocus: ["지지 육합", "삼합", "충", "형", "파", "해", "공망"], ziweiPalaces: ["양쪽 형제궁", "양쪽 전택궁"],
    compatFocus: ["branchRelations"],
    avoid: ["반복되는 다툼의 구조 — 14장 담당", "천간 관계 — 5장", "살성 배치 — 11장", "연도별 흐름 — 19장"],
  },

  // ── 막 III · 자미두수 궁합 심층 ────────────────────────────────────────────
  {
    id: "overlay", order: 9, symbol: "命",
    title: "제9장 · 두 명반의 상호 배치",
    scope:
      "상대의 명궁이 내 명반에서 어느 궁에 떨어지고 내 명궁이 상대 명반에서 어디에 앉는지 읽는다. "
      + "상대가 내 삶의 어느 영역으로 들어오는 사람인지, 그리고 그 자리에 있는 주성·살성이 "
      + "관계의 온도를 어떻게 정하는지 연결한다.",
    minChars: 2700, sajuFocus: ["일주"], ziweiPalaces: ["양쪽 명궁", "상호 배치가 떨어지는 궁", "양쪽 신궁"],
    compatFocus: ["palaceOverlay"],
    avoid: ["부처궁 비교 — 10장 담당", "살성이 앉는 자리 — 11장", "사화 교환 — 12장", "사주 근거 심층 — 5~8장"],
  },
  {
    id: "spouse", order: 10, symbol: "配",
    title: "제10장 · 부처궁 교차 비교 — 서로가 그리는 배우자상",
    scope:
      "두 사람의 부부궁을 나란히 놓고 비교한다. 내가 그리는 배우자상이 상대의 실제 결과 겹치는지, "
      + "상대가 그리는 상이 나와 겹치는지 성요 단위로 확인한다. 어긋나는 지점은 '틀렸다'가 아니라 "
      + "'기대와 실제가 다른 자리'로 쓰고, 그 간격을 좁히는 방법을 함께 준다.",
    minChars: 2700, sajuFocus: ["관성", "재성"], ziweiPalaces: ["양쪽 부부궁", "양쪽 명궁", "양쪽 천이궁"],
    compatFocus: ["spouseCross"],
    avoid: ["명궁 상호 배치 — 9장 담당", "살성 영향 — 11장", "결혼 조건 — 16장", "각자의 기질 — 2·3장"],
  },
  {
    id: "malefic", order: 11, symbol: "忌",
    title: "제11장 · 살성이 앉는 자리 — 어디서 서로를 긁는가",
    scope:
      "각자의 살성이 상대 명반의 어느 궁에 떨어지는지 양방향으로 읽는다. 명궁·부부궁·질액궁·복덕궁에 "
      + "떨어진 것은 특히 무게를 두어 설명한다. 살성을 흉으로만 다루지 말고, 그 자리에서 무엇이 "
      + "예민해지고 그 예민함을 어떻게 다룰지 실행 조언까지 이어 간다.",
    minChars: 2500, sajuFocus: ["편관", "겁재", "형충"], ziweiPalaces: ["양쪽 질액궁", "양쪽 부부궁", "살성이 떨어지는 궁"],
    compatFocus: ["maleficImpact"],
    avoid: ["다툼의 반복 구조 — 14장 담당", "지지 충형 — 8장", "사화 교환 — 12장", "화해 화법 — 15장"],
  },
  {
    id: "sihua", order: 12, symbol: "祿",
    title: "제12장 · 사화의 교환 — 어디서 서로를 키우는가",
    scope:
      "화록·화권·화과·화기가 상대 명반의 어느 궁으로 떨어지는지 읽는다. 화록·화권·화과가 상대의 "
      + "관계·현실 자리에 앉으면 그 영역에서 서로를 키운다. 화기가 떨어진 자리는 서로 조심할 축으로 "
      + "쓰되 겁주지 않는다.",
    minChars: 2500, sajuFocus: ["식상", "재성"], ziweiPalaces: ["사화가 떨어지는 궁", "양쪽 재백궁", "양쪽 관록궁"],
    compatFocus: ["sihuaExchange"],
    avoid: ["살성 배치 — 11장 담당", "부처궁 비교 — 10장", "생활 기반·돈 — 16장", "연도별 흐름 — 19장"],
  },

  // ── 막 IV · 관계의 현실 ────────────────────────────────────────────────────
  {
    id: "temperature", order: 13, symbol: "溫",
    title: "제13장 · 관계의 온도 곡선 — 두 사람의 시간축",
    scope:
      "양쪽의 현재 대운과 다가오는 세운을 겹쳐 읽는다. 두 사람이 지금 같은 방향을 보고 있는지, "
      + "한쪽만 전환기에 있는지 밝히고 그 시차가 관계에서 어떤 온도 차로 나타나는지 설명한다. "
      + "연도를 못 박아 예언하지 말고 흐름과 대비로 서술한다.",
    minChars: 2700, sajuFocus: ["양쪽 대운", "양쪽 세운", "대운 전환"], ziweiPalaces: ["양쪽 부부궁", "양쪽 복덕궁"],
    compatFocus: ["axisScores"],
    avoid: ["연 단위 전망 — 19장 담당", "갈등 구조 — 14장", "결혼 시기 — 16장", "각자의 기질 — 2·3장"],
  },
  {
    id: "conflict", order: 14, symbol: "衝",
    title: "제14장 · 갈등의 뿌리 — 같은 다툼이 반복되는 이유",
    scope:
      "두 명식의 충·형과 살성 배치를 근거로, 이 관계에서 반복될 수 있는 다툼의 구조를 짚는다. "
      + "애정 부족이 아니라 처리 방식과 속도의 차이에서 오는 것임을 분명히 하고, 다툼이 커지는 "
      + "전형적 순서를 장면으로 재구성한 뒤 그 사슬을 어디서 끊을지 알려 준다.",
    minChars: 2600, sajuFocus: ["충", "형", "파해", "겁재", "편관"], ziweiPalaces: ["양쪽 질액궁", "양쪽 부부궁", "양쪽 형제궁"],
    compatFocus: ["branchRelations", "maleficImpact"],
    avoid: ["화해 방법·문장 — 15장 담당", "지지 판정 자체 — 8장", "살성 판정 자체 — 11장", "이별·결말 언급"],
  },
  {
    id: "repair", order: 15, symbol: "和",
    title: "제15장 · 상대에게 닿는 말 — 화해의 언어",
    scope:
      "상대의 식상·인성 배치와 복덕궁을 근거로, 이 사람에게 실제로 닿는 표현 방식을 찾는다. "
      + "같은 뜻을 어떤 문장으로 바꾸면 통하는지 예시를 들고, 반대로 상대가 닫히는 말투도 짚는다. "
      + "관계가 불리하게 읽힌 앞 장들의 지점을 여기서 실행 가능한 문장으로 돌려준다.",
    minChars: 2500, sajuFocus: ["식신", "상관", "정인", "편인"], ziweiPalaces: ["양쪽 부부궁", "양쪽 복덕궁"],
    compatFocus: ["tenGodInteraction", "spouseCross"],
    avoid: ["갈등의 원인 진단 — 14장 담당", "십성 판정 자체 — 6장", "상대 기질 소개 — 3장"],
  },
  {
    id: "future", order: 16, symbol: "續",
    title: "제16장 · 지속 가능성과 결혼운",
    scope:
      "관성·재성과 양쪽 대운, 부부궁·전택궁·재백궁을 근거로 이 관계가 생활로 이어질 때의 결을 읽는다. "
      + "돈·집·가족처럼 현실 조건에서 부딪칠 지점을 구체적으로 짚되, 결혼 여부를 단정하거나 "
      + "권하거나 말리지 않는다. 조건과 대응만 준다.",
    minChars: 2700, sajuFocus: ["관성", "재성", "대운"], ziweiPalaces: ["양쪽 부부궁", "양쪽 전택궁", "양쪽 재백궁"],
    compatFocus: ["yongshinSupport", "axisScores"],
    avoid: ["부처궁 비교 — 10장 담당", "연 단위 전망 — 19장", "온도 곡선 — 13장", "용신 판정 자체 — 7장"],
  },

  // ── 막 V · 종합과 봉인 ─────────────────────────────────────────────────────
  {
    id: "cross-check", order: 17, symbol: "校",
    title: "제17장 · 사주와 자미두수 — 합치점과 차이점",
    scope:
      "두 체계가 같은 결론으로 모이는 지점(합치점)과 다르게 읽히는 지점(차이점)을 나란히 제시한다. "
      + "한쪽 체계로 다른 쪽을 덮어쓰지 말고, 차이점에서는 두 읽기를 모두 보여 준 뒤 어느 쪽을 "
      + "먼저 볼지와 그 이유를 알려 준다. 두 체계가 함께 가리키는 결론이 이 책의 가장 단단한 근거임을 밝힌다.",
    minChars: 2800, sajuFocus: ["전체"], ziweiPalaces: ["양쪽 명궁", "양쪽 부부궁", "양쪽 복덕궁", "양쪽 천이궁"],
    compatFocus: ["cross", "axisScores"],
    avoid: ["앞 장들의 요약 나열", "지표 수치화 — 18장 담당", "연도별 전망 — 19장", "새 주제 도입"],
  },
  {
    id: "relation-dna", order: 18, symbol: "碼",
    title: "제18장 · 관계 DNA 프로필",
    scope:
      "두 사람의 관계를 열 개 지표로 수치화하고, 그 조합이 만드는 관계 유형을 이름 붙인다. "
      + "높은 값과 낮은 값이 실제 관계에서 어떤 장면을 만드는지 짝지어 설명한다. "
      + "수치는 제공된 궁합 판정 값과 어긋나지 않게 매긴다.",
    minChars: 2500, sajuFocus: ["십성", "오행"], ziweiPalaces: ["양쪽 명궁", "양쪽 부부궁", "양쪽 복덕궁"],
    compatFocus: ["axisScores", "cross"],
    avoid: ["두 체계 교차검증 서술 — 17장 담당", "연도별 전망 — 19장", "편지 어조 — 20장"],
    jsonMode: true,
  },
  {
    id: "three-years", order: 19, symbol: "流",
    title: "제19장 · 앞으로 3년의 관계 흐름",
    scope:
      "양쪽 세운과 대운을 겹쳐 앞으로 3년의 관계 흐름을 시기별로 짚는다. 각 구간마다 "
      + "무엇을 하기 좋은 시기이고 무엇을 미루는 편이 나은지 행동 단위로 준다. "
      + "특정 사건을 예언하지 말고 조건부로 서술한다.",
    minChars: 2800, sajuFocus: ["양쪽 세운", "양쪽 대운"], ziweiPalaces: ["양쪽 부부궁", "양쪽 천이궁", "양쪽 명궁"],
    compatFocus: ["axisScores"],
    avoid: ["기질·성향 재서술 — 2·3장 담당", "온도 곡선 총론 — 13장", "결혼 조건 — 16장", "교차검증 — 17장"],
  },
  {
    id: "letter", order: 20, symbol: "書",
    title: "제20장 · 두 사람에게 보내는 마지막 편지",
    scope:
      "앞의 열아홉 장을 관통하는 결론을 편지로 닫는다. 요약을 나열하지 말고, 이 관계에서 "
      + "상담자가 붙잡아야 할 한 가지와 놓아야 할 한 가지를 분명히 남긴다. "
      + "판정이 아니라 배웅의 어조로 끝낸다.",
    minChars: 2600, sajuFocus: ["전체"], ziweiPalaces: ["양쪽 명궁", "양쪽 부부궁"],
    compatFocus: ["cross"],
    avoid: ["앞 장들의 요약 나열", "새 근거·새 주제 도입", "지표 수치 재언급 — 18장", "시기 전망 — 19장"],
  },
]);

/**
 * 관계 DNA(18장) 지표 정의 — JSON 응답 스키마의 근거.
 * 개인판 LOVE_DNA_METRICS 와 같이 10개 고정이라 리더의 DNA 패널을 그대로 쓴다.
 */
export const LOVE_DNA_COMPAT_METRICS = Object.freeze([
  { key: "affinity", label: "친화" },
  { key: "communication", label: "소통" },
  { key: "trust", label: "신뢰" },
  { key: "passion", label: "열정" },
  { key: "tempo", label: "속도합" },
  { key: "endurance", label: "갈등내구" },
  { key: "realism", label: "현실합" },
  { key: "growth", label: "성장" },
  { key: "autonomy", label: "자립" },
  { key: "longevity", label: "지속" },
]);

// ─── 궁합 판정 직렬화 ───────────────────────────────────────────────────────

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}
function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function countsText(counts) {
  const source = asObject(counts);
  return Object.entries(source).map(([key, value]) => `${key} ${value}`).join(", ");
}
function overlayText(overlay, subject) {
  const o = asObject(overlay);
  if (!clean(o.landsOn)) return "";
  const stars = asArray(o.landingMainStars).join("·") || "주성 없음";
  const malefic = asArray(o.landingMaleficStars).join("·");
  return `  · ${subject}: ${clean(o.sourcePalace)}(${clean(o.sourceBranch)}) → ${clean(o.landsOn)} [${stars}${malefic ? ` / 살성 ${malefic}` : ""}]`;
}

/** 궁합 판정 결과(buildMasterLoveCodexCompatibility)를 프롬프트용 텍스트로 정리 */
export function formatCompatibilityForPrompt(compatibility) {
  const c = asObject(compatibility);
  const saju = asObject(c.saju);
  const ziwei = asObject(c.ziwei);
  const lines = [];

  const stem = asObject(saju.dayStemRelation);
  lines.push(`- 일간 관계: 본인 ${clean(stem.selfStem)}(${clean(stem.selfElement)}) ↔ 상대 ${clean(stem.partnerStem)}(${clean(stem.partnerElement)}) · ${clean(stem.relationLabel) || "판정 없음"}`);
  lines.push(`  · 음양 ${stem.samePolarity ? "같음" : "다름"}${stem.stemCombination ? " · 천간합 성립" : ""}${stem.stemClash ? " · 천간충 성립" : ""}`);
  if (clean(stem.partnerAsMyTenGod)) lines.push(`  · 상대는 내 명식에서 ${clean(stem.partnerAsMyTenGod)} · 나는 상대에게 ${clean(stem.meAsPartnerTenGod)}`);

  const balance = asObject(saju.elementBalance);
  lines.push(`- 오행: 본인 ${countsText(balance.selfCounts)} / 상대 ${countsText(balance.partnerCounts)}`);
  const covers = asArray(balance.partnerCoversMyGap).map((item) => clean(item.element)).join("·");
  const covered = asArray(balance.iCoverPartnerGap).map((item) => clean(item.element)).join("·");
  if (covers) lines.push(`  · 상대가 덮어 주는 내 결핍: ${covers}`);
  if (covered) lines.push(`  · 내가 덮어 주는 상대 결핍: ${covered}`);
  if (asArray(balance.overloadedTogether).length) lines.push(`  · 함께 있으면 과해지는 오행: ${asArray(balance.overloadedTogether).join("·")}`);
  if (asArray(balance.sharedGap).length) lines.push(`  · 둘 다 비어 있는 오행: ${asArray(balance.sharedGap).join("·")}`);

  const roles = asObject(saju.tenGodInteraction);
  const tally = (label, source) => {
    const entries = Object.entries(asObject(source));
    if (!entries.length) return;
    lines.push(`  · ${label}: ${entries.map(([key, value]) => `${key} ${value}`).join(", ")}`);
  };
  lines.push("- 십성 상호작용");
  tally("상대 네 기둥이 내 명식에서 맡는 역할", roles.partnerRoleTally);
  tally("내 네 기둥이 상대 명식에서 맡는 역할", roles.myRoleTally);

  const yong = asObject(saju.yongshinSupport);
  const yongSide = (label, side) => {
    const s = asObject(side);
    if (!clean(s.usefulElement)) return;
    lines.push(`  · ${label}: 보완 축 ${clean(s.usefulElement)} → 상대가 ${s.supplied ? `공급함(${s.suppliedCount})` : "공급하지 않음"}${s.amplified ? ` · 과다 축 ${clean(s.unfavorableElement)}를 더 키움` : ""}`);
  };
  lines.push(`- 용신 보완 (본인 ${clean(yong.selfStrength) || "-"} / 상대 ${clean(yong.partnerStrength) || "-"})`);
  yongSide("본인 기준", yong.self);
  yongSide("상대 기준", yong.partner);
  if (yong.mutual) lines.push("  · 서로의 보완 축을 함께 공급하는 상호 보완 관계");

  const branch = asObject(saju.branchRelations);
  lines.push(`- 지지 교차: 합 계열 ${asObject(branch).supportCount || 0}건 / 충형파해 ${asObject(branch).tensionCount || 0}건`);
  for (const item of asArray(branch.relations).slice(0, 10)) {
    lines.push(`  · ${clean(item.selfPillar)} ${clean(item.selfBranch)} ↔ ${clean(item.partnerPillar)} ${clean(item.partnerBranch)} : ${clean(item.type)}${clean(item.element) ? `(${clean(item.element)})` : ""}`);
  }
  if (asArray(branch.dayAxis).length) {
    lines.push(`  · 일주끼리: ${asArray(branch.dayAxis).map((item) => clean(item.type)).join("·")} (생활 리듬 축)`);
  }

  lines.push("- 명반 상호 배치");
  const overlay = asObject(ziwei.palaceOverlay);
  for (const [key, subject] of [
    ["partnerMingOntoMe", "상대 명궁 → 내 명반"],
    ["myMingOntoPartner", "내 명궁 → 상대 명반"],
    ["partnerSpouseOntoMe", "상대 부부궁 → 내 명반"],
    ["mySpouseOntoPartner", "내 부부궁 → 상대 명반"],
  ]) {
    const text = overlayText(overlay[key], subject);
    if (text) lines.push(text);
  }

  const spouse = asObject(ziwei.spouseCross);
  const selfSpouse = asObject(spouse.selfSpouse);
  const partnerSpouse = asObject(spouse.partnerSpouse);
  lines.push(`- 부처궁 교차: 본인 [${asArray(selfSpouse.mainStars).join("·") || "주성 없음"}${asArray(selfSpouse.maleficStars).length ? ` / 살성 ${asArray(selfSpouse.maleficStars).join("·")}` : ""}] / 상대 [${asArray(partnerSpouse.mainStars).join("·") || "주성 없음"}${asArray(partnerSpouse.maleficStars).length ? ` / 살성 ${asArray(partnerSpouse.maleficStars).join("·")}` : ""}]`);
  if (asArray(spouse.myIdealMatchesPartner).length) lines.push(`  · 내 부부궁 주성이 상대 명궁 주성과 겹침: ${asArray(spouse.myIdealMatchesPartner).join("·")}`);
  if (asArray(spouse.partnerIdealMatchesMe).length) lines.push(`  · 상대 부부궁 주성이 내 명궁 주성과 겹침: ${asArray(spouse.partnerIdealMatchesMe).join("·")}`);
  if (asArray(spouse.sharedSpouseStars).length) lines.push(`  · 두 부처궁이 공유하는 별: ${asArray(spouse.sharedSpouseStars).join("·")}`);
  if (spouse.bothSpouseEmpty) lines.push("  · 양쪽 부처궁 모두 주성 없음(차성조 — 대궁을 함께 본다)");

  const malefic = asObject(ziwei.maleficImpact);
  const maleficLine = (label, items) => {
    for (const item of asArray(items)) {
      lines.push(`  · ${label}: ${clean(item.fromPalace)}의 ${asArray(item.stars).join("·")} → ${clean(item.landsOn)}`);
    }
  };
  lines.push("- 살성 배치(민감궁 적중분)");
  maleficLine("내 살성", malefic.myHitsOnSensitive);
  maleficLine("상대 살성", malefic.partnerHitsOnSensitive);

  const sihua = asObject(ziwei.sihuaExchange);
  lines.push("- 사화 교환");
  for (const item of asArray(sihua.myTransformsOntoPartner)) {
    if (clean(item.landsOn)) lines.push(`  · 내 ${clean(item.transform)}(${clean(item.star)}, ${clean(item.holderPalace)}) → 상대 ${clean(item.landsOn)}`);
  }
  for (const item of asArray(sihua.partnerTransformsOntoMe)) {
    if (clean(item.landsOn)) lines.push(`  · 상대 ${clean(item.transform)}(${clean(item.star)}, ${clean(item.holderPalace)}) → 내 ${clean(item.landsOn)}`);
  }

  const sajuAxis = asObject(saju.axisScores);
  const ziweiAxis = asObject(ziwei.axisScores);
  lines.push(`- 사주 축(0~100): 끌림 ${sajuAxis.attraction} · 안정 ${sajuAxis.stability} · 소통 ${sajuAxis.communication} · 지속력 ${sajuAxis.endurance}`);
  lines.push(`- 명반 축(0~100): 공명 ${ziweiAxis.resonance} · 마찰 ${ziweiAxis.friction} · 성장 ${ziweiAxis.growth}`);

  const cross = asObject(c.cross);
  const bandKo = { high: "높음", mid: "중간", low: "낮음" };
  if (asArray(cross.convergence).length) {
    lines.push("- 두 체계가 같은 방향을 가리키는 축(합치점)");
    for (const item of asArray(cross.convergence)) {
      lines.push(`  · ${clean(item.theme)}: 사주 ${bandKo[item.sajuBand] || "-"}(${item.sajuScore}) / 명반 ${bandKo[item.ziweiBand] || "-"}(${item.ziweiScore})${item.weak ? " — 한쪽은 중간" : ""}`);
    }
  }
  if (asArray(cross.divergence).length) {
    lines.push("- 두 체계가 엇갈리는 축(차이점 — 한쪽으로 덮지 말 것)");
    for (const item of asArray(cross.divergence)) {
      lines.push(`  · ${clean(item.theme)}: 사주 ${bandKo[item.sajuBand] || "-"}(${item.sajuScore}) / 명반 ${bandKo[item.ziweiBand] || "-"}(${item.ziweiScore})`);
    }
  }

  if (asArray(c.uncertainty).length) {
    const NOTES = {
      self_birth_time_unknown: "본인 출생시간 미상 — 시주 제외",
      partner_birth_time_unknown: "상대 출생시간 미상 — 시주 제외",
      self_ziwei_noon_basis: "본인 명반은 정오 기준",
      partner_ziwei_noon_basis: "상대 명반은 정오 기준",
    };
    lines.push(`- 유의: ${asArray(c.uncertainty).map((key) => NOTES[key] || clean(key)).join(" / ")}`);
  }

  return lines.filter(Boolean).join("\n");
}

function formatPersonLine(info, fallbackLabel) {
  const b = asObject(info);
  const cal = b.calendarType === "lunar" ? "음력" : "양력";
  const parts = [clean(b.name) || fallbackLabel];
  if (b.gender) parts.push(b.gender === "male" ? "남성" : b.gender === "female" ? "여성" : clean(b.gender));
  if (b.birthDate) parts.push(`${cal} ${clean(b.birthDate)}`);
  if (b.birthTimeUnknown) parts.push("출생시간 모름(정오 기준)");
  else if (b.birthTime) parts.push(clean(b.birthTime));
  return parts.join(" · ");
}

// ─── 프롬프트 ───────────────────────────────────────────────────────────────

/**
 * 궁합판 공통 톤/규칙 가이드.
 *
 * 규칙 1~12 는 개인판과 공유한다 — `buildMasterLoveCodexSystemGuide`를 호출해 받고
 * 책 제목·근거 목록만 바꾼다. 여기 복사해 두면 한쪽만 고쳐져 두 상품의 톤이 갈라진다.
 * 13~17 은 두 사람을 다룰 때만 필요한 궁합 전용 규칙이다.
 * 화자는 개인판과 동일한 "연애 고수" 1인이며 별도 페르소나를 등장시키지 않는다.
 */
export function buildMasterLoveCodexCompatSystemGuide() {
  return buildMasterLoveCodexSystemGuide({
    bookTitle: "『마스터 인연의 서 · 궁합』",
    sourceNote: "[사주 명식]과 [자미두수 명반], [궁합 판정]",
    extraRules: [
      "13. 이 책을 읽는 사람은 상담자 한 명이다. 상대는 읽지 않는다. 상대를 심판하거나 험담하지 말고,",
      "    상대의 결을 설명한 뒤 반드시 상담자가 취할 수 있는 행동으로 번역하라.",
      "14. 궁합에 불리한 지점이 나와도 헤어짐을 권하거나 관계의 결말을 단정하지 마라. 어떤 조건에서 그 지점이",
      "    문제가 되고 어떤 대응으로 덜 수 있는지를 함께 써라. 겁주는 문장으로 장을 닫지 마라.",
      "15. 사주와 자미두수가 다르게 읽히는 지점은 한쪽으로 덮지 마라. 두 읽기를 나란히 보여 준 뒤",
      "    무엇을 먼저 볼지와 그 이유를 알려 주어라.",
      "16. 점수 자체를 본문에 숫자로 나열하지 마라. 수치는 강약의 근거로만 쓰고 서술로 풀어라.",
      "17. 근거를 쓸 때 그것이 상담자의 것인지 상대의 것인지 항상 밝혀라. 두 명식을 섞어 한 사람의 것처럼",
      "    쓰지 마라. 결론의 행동 주체는 늘 상담자다.",
    ],
  });
}

const COMPAT_FOCUS_LABELS = Object.freeze({
  dayStemRelation: "일간 관계",
  elementBalance: "오행 균형·보완",
  tenGodInteraction: "십성 상호작용",
  yongshinSupport: "용신 보완",
  branchRelations: "지지 합충형파해",
  palaceOverlay: "명반 상호 배치",
  spouseCross: "부처궁 교차",
  maleficImpact: "살성 배치",
  sihuaExchange: "사화 교환",
  axisScores: "궁합 축 점수",
  cross: "두 체계 합치점·차이점",
});

/**
 * 특정 궁합 챕터의 LLM 프롬프트를 만든다.
 *
 * @param {object} params
 * @param {object} params.selfSaju       calculateLifeBookAiSaju(본인)
 * @param {object} params.selfZiwei      calculateZiweiAiChart(본인)
 * @param {object} params.partnerSaju    calculateLifeBookAiSaju(상대)
 * @param {object} params.partnerZiwei   calculateZiweiAiChart(상대)
 * @param {object} params.compatibility  buildMasterLoveCodexCompatibility(...)
 * @param {object} params.birthInfo      본인 출생 정보
 * @param {object} params.partnerInfo    상대 출생 정보
 * @param {object} params.chapter        MASTER_LOVE_CODEX_COMPAT_CHAPTERS 항목
 * @param {string[]} [params.memory]     앞 장들의 요약(중복 방지·연결용)
 */
export function buildMasterLoveCodexCompatChapterPrompt({
  selfSaju, selfZiwei, partnerSaju, partnerZiwei, compatibility,
  birthInfo, partnerInfo, chapter, memory = [],
}) {
  const min = chapter.minChars || 2500;
  const palaces = (chapter.ziweiPalaces || []).join(", ");
  const sajuFocus = (chapter.sajuFocus || []).join(", ");
  const compatFocus = (chapter.compatFocus || []).map((key) => COMPAT_FOCUS_LABELS[key] || key).join(", ");
  const avoidList = (chapter.avoid || []).join(" / ");
  const memoryLines = (memory || []).map((line) => clean(line, 200)).filter(Boolean).slice(-8);
  const partnerLabel = clean(asObject(partnerInfo).name) || "상대";

  const body = [
    buildMasterLoveCodexCompatSystemGuide(),
    "",
    `[상담자] ${formatPersonLine(birthInfo, "상담자")}`,
    `[상대] ${formatPersonLine(partnerInfo, "상대")}`,
    "",
    "[사주 명식 — 상담자]",
    formatSajuForPrompt(selfSaju),
    "",
    `[사주 명식 — ${partnerLabel}]`,
    formatSajuForPrompt(partnerSaju),
    "",
    "[자미두수 명반 — 상담자]",
    formatZiweiForCodexPrompt(selfZiwei),
    "",
    `[자미두수 명반 — ${partnerLabel}]`,
    formatZiweiForCodexPrompt(partnerZiwei),
    "",
    "[궁합 판정 — 위 네 자료에서 계산된 값]",
    formatCompatibilityForPrompt(compatibility),
    "",
    memoryLines.length ? "[앞 장에서 이미 말한 것 — 반복하지 말고 이어서 쓸 것]" : "",
    ...memoryLines.map((line) => `- ${line}`),
    "",
    `[이번 장] ${chapter.title}`,
    `[해석 범위] ${chapter.scope}`,
    sajuFocus ? `[사주에서 특히 볼 것] ${sajuFocus}` : "",
    palaces ? `[명반에서 특히 볼 궁] ${palaces}` : "",
    compatFocus ? `[궁합 판정에서 특히 볼 축] ${compatFocus}` : "",
    avoidList ? `[이번 장에서 다루지 않을 것 — 다른 장이 맡는다] ${avoidList}` : "",
    "",
  ].filter((line) => line !== "");

  if (chapter.structured !== false) {
    return [
      ...body,
      "[작성 지시 — JSON]",
      "아래 JSON 스키마로만 답하라. 코드블록·설명문 없이 JSON 객체 하나만 출력한다.",
      "{",
      ...(chapter.jsonMode ? [
        '  "typeName": "이 관계의 유형 이름(10자 이내, 예: 늦게 뜨거워지는 짝)",',
        '  "typeSummary": "관계 유형 한 줄 요약(60자 내외)",',
        `  "metrics": [ ${LOVE_DNA_COMPAT_METRICS.map((m) => `{"key":"${m.key}","label":"${m.label}","score":0~100,"basis":"명식/명반/궁합 판정 근거 한 문장"}`).join(", ")} ],`,
      ] : []),
      '  "narration": "연애 고수의 짧은 도입 메시지(2~4문장)",',
      '  "evidence": [{"label":"실제 근거 용어","system":"사주 또는 자미두수","explanation":"쉬운 설명"}],',
      '  "insight": "두 사람의 일상 장면으로 번역한 핵심 해석",',
      '  "keySentence": "이번 장의 핵심 한 문장",',
      '  "caution": "갈등이 커지는 조건과 주의할 순간",',
      '  "actions": ["지금 할 수 있는 구체적 행동 1", "행동 2"],',
      '  "bridge": "다음 장으로 이어지는 한 문장",',
      '  "visualization": {"kind":"balance 또는 loop 또는 timeline","title":"정성적 읽기","items":[{"label":"항목","level":"low 또는 balanced 또는 high 또는 watch 또는 opportunity","note":"근거 설명"}]},',
      '  "body": "이전 버전 호환용 Markdown 본문"',
      "}",
      `- "body"는 공백 포함 최소 ${min}자 이상.`,
      ...(chapter.jsonMode ? [
        "- metrics는 반드시 10개 전부 채운다. score는 정수.",
        "- score 는 제공된 [궁합 판정]의 축 점수와 어긋나지 않게 매긴다(마찰이 높으면 갈등내구를 낮게 잡는 식).",
        "- 각 basis 는 실제 배치된 간지·성요 이름과 그것이 누구 것인지를 담아라. '두 분은 잘 맞습니다' 같은 무근거 문장은 금지.",
        "- typeName 에 '천생연분·운명의 짝·특별한 인연' 류의 상투어를 쓰지 마라. 두 사람의 관계 운영 방식이 보이는 이름을 지어라.",
      ] : []),
      "- JSON 문자열 안에서 줄바꿈은 \\n 으로 이스케이프한다.",
      "- visualization은 실제 제공된 근거로 설명 가능한 장에서만 채운다. 숫자, 점수, 확률, 퍼센트는 절대 쓰지 마라.",
    ].join("\n");
  }

  return [
    ...body,
    "[작성 지시]",
    "- 이 장 하나만 작성한다. 다른 장의 내용은 쓰지 않는다.",
    `- 분량: 공백 포함 최소 ${min}자 이상. 얕게 끝내지 말고 근거 → 해석 → 현실 장면 → 실행 조언 순으로 충분히 전개하라.`,
    "- 다음 소제목 흐름을 참고해 5~7개 단락으로 구성하라: ● 먼저 이것부터 / ● 두 명식과 명반의 근거 / ● 관계에서 드러나는 장면 / ● 서로에게 강점이 켜지는 순간 / ● 조심할 지점 / ● 이번 장의 실행 제안.",
    "- 근거를 인용할 때 실제 배치된 간지·성요 이름과 그것이 누구 것인지를 함께 명시하라(예: '상담자의 일간 계수(癸水)가', '상대 부부궁의 천동·태음이').",
    "- 이 장에서 서로 다른 근거를 최소 4개 인용하라. 상담자 쪽 2개 이상, 상대 쪽 2개 이상을 반드시 포함하고,",
    "  같은 근거를 여러 단락에서 다시 꺼내 쓰는 것은 인용 횟수로 세지 않는다.",
    "- '● 이번 장의 실행 제안'은 감정 지시('마음을 열어라', '상대를 믿어라')를 쓰지 말고,",
    "  이번 주에 상담자가 실제로 할 수 있는 행동 2~3개로 쓰라(무엇을, 어떤 상황에서, 어떤 말로).",
    "- 마크다운 표·코드블록·굵게 표시 없이, 소제목(●)과 문단만으로 작성하라.",
    "- 장의 마지막은 상담자에게 건네는 한 문장으로 닫아라.",
    "",
    `이제 "${chapter.title}"를 작성하라.`,
  ].join("\n");
}

/**
 * 목차/목표 분량 (무인증 공개용).
 * 필드 구성은 개인판 getMasterLoveCodexPlan() 과 동일하게 맞춘다 — 같은 엔드포인트가
 * mode 로만 갈리므로 형태가 다르면 소비처가 한쪽에서만 깨진다.
 * 가격(costCoins/amountKRW)은 넣지 않는다. 가격 정본은 서버 가격 조회(PriceBadge)다.
 */
export function getMasterLoveCodexCompatPlan() {
  const chapters = MASTER_LOVE_CODEX_COMPAT_CHAPTERS.map(({ id, order, symbol, title, minChars }) => ({
    id, order, symbol, title, minChars,
  }));
  return {
    featureKey: MASTER_LOVE_CODEX_COMPAT_META.featureKey,
    label: MASTER_LOVE_CODEX_COMPAT_META.label,
    narrator: MASTER_LOVE_CODEX_COMPAT_META.narrator,
    chapterCount: chapters.length,
    minTotalChars: chapters.reduce((sum, chapter) => sum + (chapter.minChars || 0), 0),
    totalCharTarget: MASTER_LOVE_CODEX_COMPAT_META.totalCharTarget,
    chapters,
  };
}

import { applyPromptTemplateOverride } from "./cms-prompt-template-store.js";

// 각 도메인의 primaryPalaces/readingChain/mustCheckStars/avoid 는 초기 상담(routes/ziwei-ai.js)이
// 주제별로 다른 리딩 축을 잡게 하려고 뒤에 더한 필드다. 기존 keywordWeights/analysisAngles/
// questionPatterns 는 프롬프트 생성기 상품(routes/fortune.js)과 관리자 미리보기(routes/admin.js)가
// 그대로 쓰므로 손대지 않았다.
//
// primaryPalaces 의 대궁·삼합은 자미두수 정법(본궁 + 대궁 + 삼합 두 궁 = 삼방사정)으로 잡았다.
// 예: 부부궁의 대궁은 관록궁(+6), 삼합은 천이궁(+4)·복덕궁(-4).
export const ZIWEI_PROMPT_TEMPLATES = Object.freeze({
  love: {
    domain: "love",
    domainKo: "연애/결혼",
    keywordWeights: {
      "부부궁": { weight: 0.95, depth: "핵심", markers: ["spouse", "fortune"] },
      "관계 리듬": { weight: 0.88, depth: "중요", markers: ["ming", "travel"] },
      "갈등 트리거": { weight: 0.84, depth: "중요", markers: ["sihua", "stars"] },
      "회복 전략": { weight: 0.8, depth: "보조", markers: ["annualFlow", "timing"] },
    },
    analysisAngles: [
      "부부궁/복덕궁/천이궁을 연결해 관계 안정성 분석",
      "명궁 기질과 감정 반응 패턴의 충돌 지점 특정",
      "단기 4주 관계 개선 행동 루틴 제시",
    ],
    questionPatterns: [
      "관계를 안정시키려면 어떤 대화 방식을 써야 하나요?",
      "반복되는 갈등 패턴을 끊는 핵심 행동은 무엇인가요?",
      "이번 달 연애 실행 우선순위 3가지를 알려주세요.",
    ],
    primaryPalaces: {
      main: "부부궁",
      opposite: "관록궁",
      triad: ["천이궁", "복덕궁"],
      support: ["명궁", "자녀궁"],
    },
    readingChain: [
      "부부궁의 주성과 강약을 먼저 확정한다. 무주성이면 대궁인 관록궁의 주성을 차성안궁으로 끌어와 읽는다",
      "부부궁 삼방사정(부부·관록·천이·복덕)에 회조하는 별을 모아 관계의 기본 온도를 잡는다",
      "복덕궁으로 이 사람이 관계에서 무엇을 정서적 보상으로 삼는지 밝히고, 명궁 기질과의 마찰 지점을 특정한다",
      "사화가 부부궁으로 비입하는지 부부궁에서 자화로 흩어지는지를 나눈다. 화록은 끌림, 화권은 주도권 다툼, 화과는 명분, 화기는 집착과 반복 갈등으로 읽는다",
      "대한과 올해 세운의 부부궁 이동으로 지금이 맺는 시기인지 정리하는 시기인지 판단한다",
    ],
    mustCheckStars: [
      "탐랑·염정·천요·함지: 끌림과 인연의 밀도",
      "천동·태음: 정서적 의존과 돌봄의 방향",
      "경양·타라·화성·영성: 관계에서 반복되는 마찰과 급발진",
      "좌보·우필·천괴·천월: 인연을 이어 주는 사람의 개입",
    ],
    avoid: [
      "결혼 시기나 상대의 존재를 연도로 단정하지 않는다",
      "이별을 예언형으로 말하지 않는다. 반복 패턴과 전환 조건으로 바꿔 말한다",
    ],
  },
  career: {
    domain: "career",
    domainKo: "직업/사업",
    keywordWeights: {
      "관록궁": { weight: 0.95, depth: "핵심", markers: ["career", "ming"] },
      "확장성": { weight: 0.88, depth: "중요", markers: ["travel", "annualFlow"] },
      "성과 리듬": { weight: 0.84, depth: "중요", markers: ["majorPeriods", "sihua"] },
      "전환 타이밍": { weight: 0.8, depth: "보조", markers: ["timing", "flow"] },
    },
    analysisAngles: [
      "관록궁 중심 직무 적합도와 지속성 분석",
      "명궁/복덕궁 에너지와 소진 리스크 분리",
      "90일 실행 계획으로 전환",
    ],
    questionPatterns: [
      "현재 커리어에서 가장 중요한 선택은 무엇인가요?",
      "이직/현직 유지 판단 기준을 알려주세요.",
      "성과를 높이고 소모를 줄이는 루틴을 제시해주세요.",
    ],
    primaryPalaces: {
      main: "관록궁",
      opposite: "부부궁",
      triad: ["명궁", "재백궁"],
      support: ["천이궁", "전택궁"],
    },
    readingChain: [
      "관록궁 주성과 강약으로 이 사람이 조직형인지 독립형인지, 관리형인지 개척형인지 기본 축을 잡는다",
      "관록궁 삼방사정(관록·부부·명궁·재백)을 함께 읽어 일이 실제 성과와 수입으로 이어지는 경로를 확인한다",
      "천이궁으로 밖에서 얻는 기회의 크기를, 전택궁으로 기반의 안정성을 나눠 본다",
      "사화가 관록궁에 어떻게 걸리는지 본다. 화록은 기회의 유입, 화권은 결정권과 책임, 화과는 평판, 화기는 과부하와 반복되는 제동이다",
      "대한이 관록·재백·명궁을 지나는 구간과 세운의 흐름을 겹쳐 확장 시기와 정비 시기를 구분한다",
    ],
    mustCheckStars: [
      "자미·천부·천상: 관리와 조율의 축",
      "무곡·칠살·파군·탐랑: 개척과 전환의 추진력",
      "문창·문곡·천괴·천월: 기획력과 귀인의 조력",
      "경양·타라·지공·지겁: 성과가 새는 지점과 무리한 확장",
    ],
    avoid: [
      "특정 직업명을 단정해 지정하지 않는다. 일의 성질과 환경 조건으로 말한다",
      "이직·창업 여부를 대신 결정해 주지 않는다. 판단 기준과 조건을 준다",
    ],
  },
  money: {
    domain: "money",
    domainKo: "돈/재물",
    keywordWeights: {
      "재백궁": { weight: 0.96, depth: "핵심", markers: ["wealth", "career"] },
      "수익 구조": { weight: 0.88, depth: "중요", markers: ["majorPeriods", "sihua"] },
      "손실 리스크": { weight: 0.84, depth: "중요", markers: ["health", "friends"] },
      "축적 루틴": { weight: 0.8, depth: "보조", markers: ["fortune", "timing"] },
    },
    analysisAngles: [
      "재백궁 단독이 아닌 관록/복덕/천이 연동 분석",
      "돈이 새는 패턴과 회수 전략 분리",
      "4주 재무 행동 계획 제시",
    ],
    questionPatterns: [
      "돈이 새는 핵심 패턴을 무엇부터 끊어야 하나요?",
      "현실적인 수익 경로 2~3개를 제안해주세요.",
      "이번 달 지출/저축 규칙을 만들어주세요.",
    ],
    primaryPalaces: {
      main: "재백궁",
      opposite: "복덕궁",
      triad: ["명궁", "관록궁"],
      support: ["전택궁", "천이궁"],
    },
    readingChain: [
      "재백궁 주성과 강약으로 돈이 들어오는 방식(안정형·변동형·기복형)을 먼저 규정한다",
      "재백궁 삼방사정(재백·복덕·명궁·관록)을 읽어 버는 힘과 쓰는 습관을 분리한다",
      "복덕궁은 소비의 동기이자 돈이 새는 통로다. 대궁이므로 반드시 함께 짚는다",
      "전택궁으로 자산이 남는 그릇인지 흘러 나가는 구조인지 확인한다",
      "사화를 재물 축에 대입한다. 화록은 유입, 화권은 규모 확장, 화과는 신용, 화기는 손실과 반복되는 지출 구멍이다",
      "대한·세운이 재백·전택·복덕을 지나는 시점으로 모을 때와 지킬 때를 나눈다",
    ],
    mustCheckStars: [
      "무곡·천부·태음: 축적과 관리의 안정성",
      "탐랑·파군·염정: 변동성이 큰 수익과 확장 욕구",
      "녹존·화록: 실질적인 재원의 자리",
      "지공·지겁·경양·타라: 손실과 과잉 투자 신호",
    ],
    avoid: [
      "구체적인 금액이나 수익률을 예측하지 않는다",
      "특정 투자 종목이나 상품을 권하지 않는다",
    ],
  },
  lawsuit: {
    domain: "lawsuit",
    domainKo: "송사/분쟁",
    keywordWeights: {
      "분쟁축": { weight: 0.94, depth: "핵심", markers: ["travel", "friends", "health"] },
      "법적 리스크": { weight: 0.88, depth: "중요", markers: ["career", "sihua"] },
      "대응 타이밍": { weight: 0.84, depth: "중요", markers: ["annualFlow", "majorPeriods"] },
      "증거 관리": { weight: 0.8, depth: "보조", markers: ["action", "checklist"] },
    },
    analysisAngles: [
      "질액/천이/교우궁 중심 분쟁 리스크 식별",
      "감정 대응과 법적 대응을 분리",
      "단기 대응 체크리스트 제시",
    ],
    questionPatterns: [
      "지금 가장 먼저 대비해야 할 법적 리스크는 무엇인가요?",
      "분쟁 상황에서 피해야 할 대응 방식을 알려주세요.",
      "2~6주 대응 우선순위를 제시해주세요.",
    ],
    primaryPalaces: {
      // 🔴 천이궁의 삼합은 부부궁·복덕궁이다(궁 배치가 명궁에서 역행하므로 지지 +4·+8 이
      // 각각 offset -4·-8 로 떨어진다). 예전에는 재백궁·관록궁이 적혀 있었는데 그건 명궁의
      // 삼합이다 — 삼방사정 정합성 가드(verify:ziwei-consult-categories)가 이제 막는다.
      main: "천이궁",
      opposite: "명궁",
      triad: ["부부궁", "복덕궁"],
      support: ["노복궁", "질액궁", "형제궁"],
    },
    readingChain: [
      "천이궁으로 바깥에서 벌어지는 일의 성질과 상대의 기세를 먼저 잡는다",
      "명궁(대궁)과 대조해 이 사람이 정면 대응형인지 회피형인지, 그 방식이 상황을 키우는지 줄이는지 본다",
      "화기가 앉은 궁을 분쟁의 발화점으로 삼고, 경양·타라가 만드는 마찰의 성격(급한 충돌인지 질질 끄는 지연인지)을 나눈다",
      "노복궁·형제궁으로 주변인의 개입이 도움인지 부담인지 가른다",
      "세운이 화기·살성이 앉은 궁을 지나는 구간을 대응 강도를 조절할 시기로 잡는다",
    ],
    mustCheckStars: [
      "경양·타라: 충돌의 속도와 지연의 성격",
      "화성·영성: 갑작스러운 격화",
      "화기: 반복되는 발화점",
      "천상·천량: 조정과 중재의 여지",
    ],
    avoid: [
      "승소·패소를 단정하지 않는다",
      "법률 자문을 대신하지 않는다. 전문가 상담을 병행하라고 안내한다",
    ],
  },
  relationship: {
    domain: "relationship",
    domainKo: "인간관계",
    keywordWeights: {
      "교우궁": { weight: 0.93, depth: "핵심", markers: ["friends", "siblings"] },
      "충돌 패턴": { weight: 0.87, depth: "중요", markers: ["ming", "fortune"] },
      "경계 설정": { weight: 0.83, depth: "중요", markers: ["travel", "annualFlow"] },
      "회복 루틴": { weight: 0.8, depth: "보조", markers: ["timing", "action"] },
    },
    analysisAngles: [
      "교우/형제/부부궁 연동으로 관계 구조 해석",
      "갈등 촉발 언행과 완화 언행 제시",
      "2주 단위 실행 계획",
    ],
    questionPatterns: [
      "인간관계 갈등을 줄이는 핵심 습관은 무엇인가요?",
      "상대를 자극하지 않는 대화 방식은 무엇인가요?",
      "관계 회복을 위한 2주 체크리스트를 제시해주세요.",
    ],
    primaryPalaces: {
      main: "노복궁",
      opposite: "형제궁",
      triad: ["부모궁", "자녀궁"],
      support: ["명궁", "천이궁"],
    },
    readingChain: [
      "노복궁으로 이 사람 주변에 모이는 사람의 성질과 관계의 밀도를 잡는다",
      "대궁인 형제궁과 함께 읽어 가까운 사이에서 힘을 얻는지 소모하는지 가른다",
      "명궁 기질이 관계에서 어떤 언행으로 나타나는지 연결해, 갈등을 만드는 자기 패턴을 짚는다",
      "천이궁으로 바깥 활동의 폭이 관계망의 크기와 피로도에 어떻게 작용하는지 본다",
      "사화 비입으로 관계에서 반복되는 주제를 특정한다. 화기가 관계 축에 걸리면 경계 설정이 핵심 처방이 된다",
    ],
    mustCheckStars: [
      "좌보·우필: 실질적으로 곁에 남는 조력",
      "천괴·천월: 결정적 순간의 귀인",
      "거문: 말로 인한 오해와 구설",
      "경양·타라·화성·영성: 관계를 끊어 내는 마찰",
    ],
    avoid: [
      "특정 인물을 나쁜 사람으로 규정하지 않는다",
      "관계를 끊으라고 지시하지 않는다. 경계의 방식으로 말한다",
    ],
  },
  health: {
    domain: "health",
    domainKo: "건강/멘탈",
    keywordWeights: {
      "질액궁": { weight: 0.94, depth: "핵심", markers: ["health", "fortune"] },
      "멘탈 소모": { weight: 0.88, depth: "중요", markers: ["ming", "travel"] },
      "회복 루틴": { weight: 0.83, depth: "중요", markers: ["annualFlow", "timing"] },
      "재발 방지": { weight: 0.8, depth: "보조", markers: ["action", "habit"] },
    },
    analysisAngles: [
      "질액/복덕/명궁을 연결해 회복력 분석",
      "과부하 트리거와 완충 전략 분리",
      "생활 루틴 조정 계획 제시",
    ],
    questionPatterns: [
      "요즘 멘탈 소모를 줄이려면 무엇부터 바꿔야 하나요?",
      "회복 루틴을 현실적으로 제안해주세요.",
      "과부하 전조 신호 체크포인트를 알려주세요.",
    ],
    primaryPalaces: {
      main: "질액궁",
      opposite: "부모궁",
      triad: ["전택궁", "형제궁"],
      support: ["복덕궁", "명궁"],
    },
    readingChain: [
      "질액궁의 주성과 강약으로 체질의 기본 경향과 취약해지기 쉬운 방향을 조심스럽게 잡는다",
      "복덕궁으로 정신적 부하가 어디서 쌓이는지 본다. 자미두수에서 멘탈은 질액궁보다 복덕궁이 더 정확하다",
      "명궁 기질과 겹쳐 이 사람이 무리하게 되는 상황의 조건을 특정한다",
      "화기와 살성이 질액·복덕에 걸리는지 확인하되, 병명으로 옮기지 말고 생활 리듬의 취약 구간으로 번역한다",
      "대한·세운이 질액·복덕을 지나는 구간을 회복에 투자할 시기로 제시한다",
    ],
    mustCheckStars: [
      "천동·천량: 회복력과 완충",
      "태음·거문: 수면·소화·정서 기복",
      "화성·영성: 급한 소진과 과열",
      "경양·타라: 만성적 긴장과 지연되는 피로",
    ],
    avoid: [
      "질병명을 진단하거나 단정하지 않는다",
      "치료나 복약을 권하지 않는다. 이상 신호가 있으면 의료진 상담을 권한다",
    ],
  },
  life_direction: {
    domain: "life_direction",
    domainKo: "인생 방향",
    keywordWeights: {
      "명궁": { weight: 0.94, depth: "핵심", markers: ["ming", "fortune"] },
      "관록 전환": { weight: 0.87, depth: "중요", markers: ["career", "travel"] },
      "우선순위": { weight: 0.83, depth: "중요", markers: ["annualFlow", "majorPeriods"] },
      "실행력": { weight: 0.8, depth: "보조", markers: ["action", "timing"] },
    },
    analysisAngles: [
      "명궁/관록/복덕 축으로 현재 과제 도출",
      "버릴 선택과 잡을 선택 분리",
      "90일 로드맵 구성",
    ],
    questionPatterns: [
      "지금 인생에서 가장 먼저 정리할 우선순위는 무엇인가요?",
      "3개월 실행 계획을 단계별로 제시해주세요.",
      "지금 피해야 할 선택을 알려주세요.",
    ],
    primaryPalaces: {
      main: "명궁",
      opposite: "천이궁",
      triad: ["재백궁", "관록궁"],
      support: ["신궁", "복덕궁"],
    },
    readingChain: [
      "명궁 주성과 강약으로 타고난 기본 축을 세우고, 신궁으로 후천에 실제 힘이 실리는 방향을 겹쳐 본다",
      "명궁 삼방사정(명궁·천이·재백·관록)으로 이 사람의 인생이 어느 쪽으로 흘러 결실을 맺는지 잡는다",
      "복덕궁으로 무엇을 할 때 소진되지 않는지 확인해, 방향과 지속 가능성을 분리한다",
      "사화 네 별의 궁 위치로 지금 생의 욕망·권한·인정·막힘이 어디에 놓였는지 지도를 그린다",
      "현재 대한의 성격과 올해 세운을 겹쳐 지금이 확장기인지 축적기인지 전환기인지 규정한다",
    ],
    mustCheckStars: [
      "명궁·신궁 주성: 선천 기질과 후천 무게중심",
      "화록·화권: 지금 힘이 실리는 영역",
      "화기: 반복해서 발목을 잡는 주제",
      "지공·지겁: 방향이 흩어지는 지점",
    ],
    avoid: [
      "인생 전체를 한 문장으로 규정하지 않는다",
      "선택을 대신 결정해 주지 않는다. 버릴 것과 잡을 것의 기준을 준다",
    ],
  },
  overall: {
    domain: "overall",
    domainKo: "전체 명반 해석",
    keywordWeights: {
      "명궁·신궁": { weight: 0.96, depth: "핵심", markers: ["ming", "body"] },
      "삼방사정": { weight: 0.9, depth: "핵심", markers: ["travel", "wealth", "career"] },
      "사화 배치": { weight: 0.88, depth: "중요", markers: ["sihua"] },
      "대한 흐름": { weight: 0.82, depth: "중요", markers: ["majorPeriods", "annualFlow"] },
    },
    analysisAngles: [
      "명궁·신궁을 축으로 명반 전체 구조를 먼저 규정",
      "12궁을 나열하지 않고 상호작용으로 연결",
      "대한·세운으로 현재 좌표를 확정",
    ],
    questionPatterns: [
      "제 명반의 전체 구조를 어떻게 읽어야 하나요?",
      "지금 제 인생의 좌표는 어디인가요?",
      "앞으로 가장 크게 작용할 흐름은 무엇인가요?",
    ],
    primaryPalaces: {
      main: "명궁",
      opposite: "천이궁",
      triad: ["재백궁", "관록궁"],
      support: ["신궁", "복덕궁", "부부궁", "전택궁"],
    },
    readingChain: [
      "명궁의 주성·강약·보좌성을 확정해 선천 기질의 골격을 세운다. 무주성이면 대궁 차성안궁으로 읽는다",
      "신궁으로 후천에 힘이 실리는 자리를 짚고, 명궁과 같은 방향인지 어긋나는지를 명시한다",
      "명궁 삼방사정(명궁·천이·재백·관록)의 회조를 모아 이 명반의 기본 규모와 성취 경로를 잡는다",
      "사화 네 별의 궁 위치로 욕망(화록)·권한(화권)·인정(화과)·막힘(화기)의 지도를 그린다",
      "12궁을 나열하지 말고 명궁을 중심으로 재백·관록·부부·복덕·질액이 서로 주고받는 관계로 엮는다",
      "대한의 순서와 현재 대한, 올해 세운을 겹쳐 지금 서 있는 좌표를 확정한다",
    ],
    mustCheckStars: [
      "명궁·신궁 주성과 그 강약 표기",
      "사화 네 별 전부(화록·화권·화과·화기)",
      "좌보·우필·문창·문곡·천괴·천월의 부조",
      "경양·타라·화성·영성·지공·지겁의 충파",
    ],
    avoid: [
      "12궁을 사전처럼 순서대로 나열하지 않는다",
      "별의 일반 정의를 설명하지 않는다. 이 사람의 삶에서 어떻게 나타나는지로만 말한다",
    ],
  },
  personality: {
    domain: "personality",
    domainKo: "타고난 성향",
    keywordWeights: {
      "명궁 주성": { weight: 0.96, depth: "핵심", markers: ["ming"] },
      "복덕궁": { weight: 0.89, depth: "핵심", markers: ["fortune"] },
      "신궁": { weight: 0.86, depth: "중요", markers: ["body"] },
      "자화 반응": { weight: 0.8, depth: "보조", markers: ["sihua"] },
    },
    analysisAngles: [
      "명궁 주성과 강약으로 선천 기질의 골격 규정",
      "복덕궁으로 내면의 동기와 즐거움의 원천 분리",
      "신궁으로 후천에 굳어진 습관 축 확인",
    ],
    questionPatterns: [
      "제가 타고난 기질의 핵심은 무엇인가요?",
      "제 강점이 약점으로 뒤집히는 순간은 언제인가요?",
      "저에게 잘 맞는 환경과 안 맞는 환경은 어떤 곳인가요?",
    ],
    primaryPalaces: {
      main: "명궁",
      opposite: "천이궁",
      triad: ["재백궁", "관록궁"],
      support: ["신궁", "복덕궁", "부모궁"],
    },
    readingChain: [
      "명궁 주성의 조합과 강약으로 기질의 골격을 세운다. 단일 주성인지 쌍성인지 무주성인지에 따라 서술 방식을 바꾼다",
      "명궁의 보좌성·살성이 그 기질을 어느 방향으로 다듬거나 거칠게 만드는지 짚는다",
      "복덕궁으로 이 사람이 무엇에서 즐거움과 안정을 얻는지 내면의 동기를 밝힌다",
      "신궁으로 후천에 굳어진 행동 습관을 잡고, 명궁의 선천 기질과 어긋나는 지점이 있으면 그 긴장을 설명한다",
      "천이궁(대궁)으로 밖에서 보이는 모습과 안의 모습이 얼마나 다른지 대조한다",
      "같은 기질이 강점으로 작동하는 환경과 약점으로 뒤집히는 환경을 조건으로 나눠 제시한다",
    ],
    mustCheckStars: [
      "명궁 주성과 강약 표기",
      "복덕궁 주성: 내면의 결",
      "좌보·우필·문창·문곡: 기질을 다듬는 힘",
      "경양·타라·화성·영성: 기질이 거칠게 튀는 방향",
    ],
    avoid: [
      "성격 유형 검사처럼 라벨을 붙이지 않는다",
      "좋은 성격과 나쁜 성격으로 가르지 않는다. 작동하는 조건으로 말한다",
    ],
  },
  study: {
    domain: "study",
    domainKo: "학업/시험",
    keywordWeights: {
      "관록궁": { weight: 0.94, depth: "핵심", markers: ["career", "ming"] },
      "집중 지속력": { weight: 0.88, depth: "중요", markers: ["fortune", "health"] },
      "시험 리듬": { weight: 0.84, depth: "중요", markers: ["annualFlow", "majorPeriods"] },
      "학습 환경": { weight: 0.8, depth: "보조", markers: ["parents", "property"] },
    },
    analysisAngles: [
      "관록궁 중심 학업 지속력과 성취 방식 분석",
      "명궁 기질과 실제 공부 습관의 어긋남 지점 특정",
      "시험 주기에 맞춘 12주 학습 리듬 제시",
    ],
    questionPatterns: [
      "제 기질에 맞는 공부 방식은 어떤 쪽인가요?",
      "시험 준비에서 무너지는 지점은 어디인가요?",
      "다음 시험까지의 학습 리듬을 잡아주세요.",
    ],
    primaryPalaces: {
      main: "관록궁",
      opposite: "부부궁",
      triad: ["명궁", "재백궁"],
      support: ["부모궁", "복덕궁"],
    },
    readingChain: [
      "관록궁 주성으로 이 사람이 누적형인지 몰입형인지, 넓게 훑는 쪽인지 깊게 파는 쪽인지 학습의 기본 결을 잡는다",
      "관록궁 삼방사정(관록·부부·명궁·재백)을 함께 읽어 공부가 자격과 성과로 이어지는 경로를 확인한다",
      "문창·문곡의 위치와 강약으로 글·시험·기획 중 어느 형식에서 힘이 실리는지 나눈다",
      "복덕궁으로 지구력의 원천을, 질액궁으로 무너지는 지점(수면·불안·번아웃)을 나눠 본다",
      "대한과 세운이 관록·명궁을 지나는 구간을 성과가 드러나는 시기로 잡는다",
    ],
    mustCheckStars: [
      "문창·문곡: 글과 시험의 형식 적합도",
      "천기·태음: 사고의 세밀함과 몰입의 결",
      "화과: 인정과 합격의 명분",
      "경양·타라·지공·지겁: 집중이 새는 지점과 반복되는 제동",
    ],
    avoid: [
      "합격·불합격을 단정하지 않는다. 준비 방식과 리듬으로 말한다",
      "특정 학교나 전공을 지정하지 않는다. 맞는 학습 환경의 성질로 말한다",
    ],
  },
  move: {
    domain: "move",
    domainKo: "이동/이주",
    keywordWeights: {
      "천이궁": { weight: 0.95, depth: "핵심", markers: ["travel", "ming"] },
      "환경 적합도": { weight: 0.88, depth: "중요", markers: ["property", "fortune"] },
      "이동 타이밍": { weight: 0.84, depth: "중요", markers: ["annualFlow", "majorPeriods"] },
      "정착 비용": { weight: 0.8, depth: "보조", markers: ["wealth", "health"] },
    },
    analysisAngles: [
      "천이궁 중심 이동이 운을 넓히는지 흩는지 판별",
      "명궁(대궁)과 대조해 익숙한 자리와 낯선 자리의 손익 비교",
      "이주·이직·유학 등 이동 형태별 준비 순서 제시",
    ],
    questionPatterns: [
      "지금 자리를 옮기는 편이 나은가요, 버티는 편이 나은가요?",
      "제게 운이 넓어지는 환경은 어떤 성질인가요?",
      "이동을 준비한다면 무엇부터 정리해야 하나요?",
    ],
    primaryPalaces: {
      main: "천이궁",
      opposite: "명궁",
      triad: ["부부궁", "복덕궁"],
      support: ["관록궁", "전택궁"],
    },
    readingChain: [
      "천이궁 주성과 강약으로 바깥에서 기회가 열리는 사람인지, 자리를 지킬 때 힘이 붙는 사람인지 축을 잡는다",
      "천이궁 삼방사정(천이·명궁·부부·복덕)을 함께 읽어 이동이 관계와 마음의 안정까지 흔드는지 본다",
      "전택궁으로 떠난 뒤 남는 기반의 무게를, 관록궁으로 옮긴 자리에서 일이 이어지는지를 나눠 본다",
      "사화가 천이궁에 어떻게 걸리는지 본다. 화록은 넓어지는 기회, 화권은 주도적 결단, 화과는 평판의 이동, 화기는 옮겨도 따라오는 반복 과제다",
      "대한이 천이·명궁을 지나는 구간과 세운을 겹쳐 떠날 시기와 자리를 다질 시기를 구분한다",
    ],
    mustCheckStars: [
      "천마: 이동 자체의 동력",
      "태양·거문: 낯선 환경에서의 노출과 구설",
      "천량·천동: 정착의 안정감과 돌봄의 필요",
      "지공·지겁·화성: 옮기는 과정에서 새는 비용과 급발진",
    ],
    avoid: [
      "이사·이민 여부를 대신 결정해 주지 않는다. 판단 기준과 조건을 준다",
      "특정 도시나 나라를 지정하지 않는다. 맞는 환경의 성질로 말한다",
    ],
  },
  property: {
    domain: "property",
    domainKo: "부동산/전택",
    keywordWeights: {
      "전택궁": { weight: 0.95, depth: "핵심", markers: ["property", "wealth"] },
      "기반 안정성": { weight: 0.88, depth: "중요", markers: ["siblings", "health"] },
      "매수·매도 시기": { weight: 0.84, depth: "중요", markers: ["majorPeriods", "annualFlow"] },
      "부채 관리": { weight: 0.8, depth: "보조", markers: ["wealth", "fortune"] },
    },
    analysisAngles: [
      "전택궁 단독이 아닌 재백/복덕/형제 연동으로 기반의 무게 분석",
      "보유가 안정인지 부담인지 분리",
      "12개월 주거·자산 정리 순서 제시",
    ],
    questionPatterns: [
      "지금 집을 늘리는 편이 나은가요, 줄이는 편이 나은가요?",
      "제 기반이 흔들리는 지점은 어디인가요?",
      "주거를 정리한다면 어떤 순서로 해야 하나요?",
    ],
    primaryPalaces: {
      main: "전택궁",
      opposite: "자녀궁",
      triad: ["형제궁", "질액궁"],
      support: ["재백궁", "복덕궁"],
    },
    readingChain: [
      "전택궁 주성과 강약으로 기반을 쌓는 사람인지 옮겨 다니며 사는 사람인지 축을 잡는다",
      "전택궁 삼방사정(전택·자녀·형제·질액)을 함께 읽어 공간이 몸과 관계에 주는 부담까지 본다",
      "재백궁으로 유지 비용을 감당할 흐름이 있는지, 복덕궁으로 그 공간이 마음을 쉬게 하는지 나눠 본다",
      "사화가 전택궁에 걸리는 방식을 본다. 화록은 늘어나는 자산, 화권은 결정권, 화과는 이름값, 화기는 묶이는 돈과 반복되는 수리·분쟁이다",
      "대한이 전택·재백을 지나는 구간을 늘릴 시기와 정리할 시기로 나눈다",
    ],
    mustCheckStars: [
      "무곡·천부: 축적과 보존의 힘",
      "태음: 부동산과 안식처의 결",
      "파군·칠살: 갈아엎고 옮기는 변동",
      "화기·지공·지겁: 묶이는 자금과 새는 유지비",
    ],
    avoid: [
      "매수·매도 시점을 연도로 단정하지 않는다",
      "투자 수익을 예측하지 않는다. 감당 가능한 조건과 리스크로 말한다",
    ],
  },
  children: {
    domain: "children",
    domainKo: "자녀/출산",
    keywordWeights: {
      "자녀궁": { weight: 0.95, depth: "핵심", markers: ["children", "spouse"] },
      "양육 방식": { weight: 0.88, depth: "중요", markers: ["parents", "ming"] },
      "돌봄 지속력": { weight: 0.84, depth: "중요", markers: ["health", "fortune"] },
      "가정 리듬": { weight: 0.8, depth: "보조", markers: ["property", "annualFlow"] },
    },
    analysisAngles: [
      "자녀궁 중심 관계 방식과 기대의 결 분석",
      "명궁 기질과 실제 양육 태도의 마찰 지점 특정",
      "돌봄 소모를 줄이는 현실 루틴 제시",
    ],
    questionPatterns: [
      "저는 아이와 어떤 방식으로 연결되는 사람인가요?",
      "양육에서 반복해 지치는 지점은 어디인가요?",
      "가정의 리듬을 어떻게 잡아야 할까요?",
    ],
    primaryPalaces: {
      main: "자녀궁",
      opposite: "전택궁",
      triad: ["부모궁", "노복궁"],
      support: ["부부궁", "복덕궁"],
    },
    readingChain: [
      "자녀궁 주성과 강약으로 이 사람이 자녀·후배·결과물과 맺는 기본 거리(밀착형인지 방임형인지)를 잡는다",
      "자녀궁 삼방사정(자녀·전택·부모·노복)을 함께 읽어 양육이 가정과 주변 도움 속에서 어떻게 굴러가는지 본다",
      "부모궁으로 자신이 받은 양육의 방식이 지금 되풀이되는지 확인하고, 명궁 기질과의 마찰을 특정한다",
      "사화가 자녀궁에 걸리는 방식을 본다. 화록은 늘어나는 인연과 결실, 화권은 통제와 기대, 화과는 자랑과 명분, 화기는 집착과 반복되는 걱정이다",
      "대한과 세운이 자녀·전택을 지나는 구간을 관계의 밀도가 달라지는 시기로 잡는다",
    ],
    mustCheckStars: [
      "천동·태음: 돌봄의 결과 정서적 밀착",
      "탐랑·염정: 자녀와의 활력과 긴장",
      "천량·천상: 보호와 조율의 역할",
      "화기·경양·타라: 반복되는 걱정과 소모의 지점",
    ],
    avoid: [
      "자녀의 수나 임신·출산 시기를 단정하지 않는다",
      "아이의 미래를 예언형으로 말하지 않는다. 관계 방식과 조율 조건으로 바꿔 말한다",
    ],
  },
  family: {
    domain: "family",
    domainKo: "부모/가족",
    keywordWeights: {
      "부모궁": { weight: 0.95, depth: "핵심", markers: ["parents", "ming"] },
      "지원과 압력": { weight: 0.88, depth: "중요", markers: ["health", "siblings"] },
      "돌봄 부담": { weight: 0.84, depth: "중요", markers: ["fortune", "majorPeriods"] },
      "거리 조절": { weight: 0.8, depth: "보조", markers: ["friends", "annualFlow"] },
    },
    analysisAngles: [
      "부모궁 중심 윗세대에게서 오는 도움과 압력의 분리",
      "질액궁(대궁)과 대조해 가족 관계가 몸과 마음에 남기는 부담 확인",
      "거리와 역할을 다시 잡는 실행 순서 제시",
    ],
    questionPatterns: [
      "부모님과의 거리를 어떻게 잡아야 하나요?",
      "가족에게서 오는 부담이 반복되는 이유는 무엇인가요?",
      "돌봄과 제 생활을 어떻게 나눠야 할까요?",
    ],
    primaryPalaces: {
      main: "부모궁",
      opposite: "질액궁",
      triad: ["자녀궁", "노복궁"],
      support: ["명궁", "형제궁"],
    },
    readingChain: [
      "부모궁 주성과 강약으로 윗세대가 이 사람에게 자원이었는지 과제였는지 기본 축을 잡는다",
      "부모궁 삼방사정(부모·질액·자녀·노복)을 함께 읽어 돌봄이 몸과 주변 관계로 어떻게 번지는지 본다",
      "질액궁(대궁)으로 그 관계가 몸에 남기는 흔적을, 형제궁으로 부담을 나눌 사람이 있는지 나눠 본다",
      "사화가 부모궁에 걸리는 방식을 본다. 화록은 실질적 지원, 화권은 간섭과 결정권, 화과는 체면과 명분, 화기는 끊기지 않는 죄책감과 반복 갈등이다",
      "대한이 부모·질액을 지나는 구간을 돌봄의 무게가 달라지는 시기로 잡는다",
    ],
    mustCheckStars: [
      "태양·태음: 아버지·어머니 축의 기운",
      "천량: 손윗사람의 보호와 책임",
      "거문: 말로 쌓이는 오해와 구설",
      "화기·경양·타라: 반복되는 갈등과 끊어내기 어려운 얽힘",
    ],
    avoid: [
      "부모의 건강이나 수명을 단정하지 않는다",
      "관계를 끊으라거나 이어가라고 결정해 주지 않는다. 거리 조절의 기준을 준다",
    ],
  },
});

export function getZiweiPromptTemplate(domain) {
  const key = String(domain || "").trim();
  return applyPromptTemplateOverride("ziwei", key, ZIWEI_PROMPT_TEMPLATES[key] || null);
}

export function classifyQuestionToZiweiDomain(question) {
  const text = String(question || "").toLowerCase();
  // 🔴 순서가 곧 우선순위다(첫 매칭이 이긴다). 신규 도메인은 기존 7종 **뒤**, 그러나
  // life_direction **앞**에 둔다 — 기존 분류를 건드리지 않으면서, "인생/방향/미래" 같은
  // 넓은 말에 삼켜지지 않게 하려는 배치다.
  //
  // 🔴 키워드는 부분 문자열로 매칭된다. 한국어에서 짧은 토막은 엉뚱한 단어를 문다 —
  // 예전에 lawsuit 에 있던 한 글자 "법" 은 "방법·요법·법인"에까지 걸려서, 평범한
  // "가장 좋은 방법이 뭔가요" 질문을 송사 상담으로 보냈다. 두 글자 이상으로만 적는다.
  const map = {
    lawsuit: ["소송", "고소", "재판", "법적", "변호사", "송사", "분쟁", "합의금"],
    career: ["직업", "진로", "이직", "사업", "회사", "커리어"],
    money: ["돈", "재물", "수익", "매출", "투자", "저축"],
    love: ["연애", "결혼", "재회", "인연", "상대"],
    relationship: ["인간관계", "가족", "친구", "동료", "갈등"],
    health: ["건강", "멘탈", "스트레스", "불안", "회복"],
    study: ["학업", "시험", "공부", "수능", "자격증", "합격", "유학", "진학", "대학원"],
    children: ["자녀", "임신", "출산", "육아", "양육"],
    property: ["부동산", "집값", "주택", "전세", "매매", "청약", "아파트", "이사"],
    move: ["이민", "이주", "해외", "전근", "파견", "귀국"],
    family: ["부모", "어머니", "아버지", "엄마", "아빠", "시부모", "장인"],
    life_direction: ["인생", "방향", "미래", "운명", "전환"],
  };

  for (const [domain, keywords] of Object.entries(map)) {
    if (keywords.some((keyword) => text.includes(keyword))) return domain;
  }
  return "life_direction";
}

// 초기 상담의 focusArea 를 도메인 템플릿으로 잇는다. custom 은 사용자가 쓴 질문에서 도메인을 뽑고,
// 뽑히지 않으면 classifyQuestionToZiweiDomain 의 기본값인 life_direction 으로 떨어진다.
//
// 🔴 이 표는 worker/routes/ziwei-ai.js 의 FOCUS_AREA_LABELS·TOPICS 와
// app/ziwei-ai/ZiweiAiClient.tsx 의 FOCUS_OPTIONS 까지 **손으로 맞춘 목록 네 벌**이다.
// 한 곳만 고치면 조용히 어긋난다 — 예전에 lawsuit·life_direction 템플릿이 다 쓰여 있는데도
// 선택지에 없어서 도달 자체가 불가능했다. verify:ziwei-consult-categories 가 네 벌을 대조한다.
const FOCUS_AREA_TO_DOMAIN = Object.freeze({
  overall: "overall",
  personality: "personality",
  career: "career",
  money: "money",
  love: "love",
  relationship: "relationship",
  health: "health",
  lawsuit: "lawsuit",
  life_direction: "life_direction",
  study: "study",
  move: "move",
  property: "property",
  children: "children",
  family: "family",
});

export function resolveZiweiDomainFromFocus(focusArea, question = "") {
  const key = String(focusArea || "").trim();
  if (key === "custom") return classifyQuestionToZiweiDomain(question);
  return FOCUS_AREA_TO_DOMAIN[key] || "overall";
}

/**
 * 도메인 템플릿을 초기 상담 프롬프트에 끼울 텍스트 블록으로 만든다.
 * 새 필드가 없는 CMS 오버라이드 템플릿이 와도 있는 항목만 출력하고 넘어간다.
 */
export function buildZiweiDomainBriefLines(template) {
  if (!template || typeof template !== "object") return [];
  const lines = [`[상담 주제 특화 — ${template.domainKo || template.domain || "일반"}]`];

  const palaces = template.primaryPalaces;
  if (palaces && typeof palaces === "object") {
    lines.push(`- 주궁: ${palaces.main || "명궁"}${palaces.opposite ? ` / 대궁: ${palaces.opposite}` : ""}`);
    const triad = Array.isArray(palaces.triad) ? palaces.triad.join("·") : "";
    const support = Array.isArray(palaces.support) ? palaces.support.join("·") : "";
    if (triad) lines.push(`- 삼합으로 함께 보는 궁: ${triad}`);
    if (support) lines.push(`- 보조로 반드시 참조할 궁: ${support}`);
  }

  if (Array.isArray(template.readingChain) && template.readingChain.length) {
    lines.push("- 리딩 순서(이 순서를 논리 사슬로 문장에 드러낼 것):");
    template.readingChain.forEach((step, index) => lines.push(`  ${index + 1}) ${step}`));
  }

  if (Array.isArray(template.mustCheckStars) && template.mustCheckStars.length) {
    lines.push("- 이 주제에서 반드시 확인할 성요(명반에 실제로 있는 것만 인용):");
    template.mustCheckStars.forEach((item) => lines.push(`  · ${item}`));
  }

  if (Array.isArray(template.analysisAngles) && template.analysisAngles.length) {
    lines.push("- 분석 앵글:");
    template.analysisAngles.forEach((item) => lines.push(`  · ${item}`));
  }

  if (Array.isArray(template.avoid) && template.avoid.length) {
    lines.push("- 이 주제에서 하지 말 것:");
    template.avoid.forEach((item) => lines.push(`  · ${item}`));
  }

  return lines;
}

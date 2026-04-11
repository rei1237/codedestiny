import { NextRequest, NextResponse } from "next/server";
import {
  calcSukuyoForServer,
  calcRelationType,
  MANSIONS_27,
  type SukuyoCalcResult,
} from "../../../../lib/sukuyo-engine-server";
import { callVertexGemini } from "@/app/_lib/callVertexGemini";

export const runtime = "nodejs";
export const maxDuration = 300;

// 
// 챕터 메타
// 
const CHAPTER_META = [
  { num: 1,  title: "영혼의 원형",           subtitle: "당신의 별자리가 새긴 운명 코드",     icon: "🌑" },
  { num: 2,  title: "감정의 조수간만",        subtitle: "달의 주기가 만들어내는 정서 파동",   icon: "🌊" },
  { num: 3,  title: "페르소나와 브랜딩",      subtitle: "세상이 당신을 기억하는 방식",        icon: "🎭" },
  { num: 4,  title: "자산의 중력",            subtitle: "부를 끌어당기는 달빛 전략",         icon: "💰" },
  { num: 5,  title: "보이지 않는 톱니바퀴",  subtitle: "성공 뒤에 숨겨진 협력 역학",        icon: "⚙️" },
  { num: 6,  title: "관계의 정밀 레이더",     subtitle: "6대 숙요 관계 역학 완전 분析",      icon: "📡" },
  { num: 7,  title: "파괴적 혁신",           subtitle: "위기를 기회로 전환하는 달빛 전략",  icon: "💥" },
  { num: 8,  title: "조화로운 성장",         subtitle: "나를 살리는 공간과 환경의 법칙",    icon: "🌿" },
  { num: 9,  title: "정서적 유대",           subtitle: "깊은 연결을 만드는 감정 지능",      icon: "❤️" },
  { num: 10, title: "운명적 거리",           subtitle: "가까이해야 할 것과 멀리해야 할 것", icon: "🧭" },
  { num: 11, title: "달의 주기",            subtitle: "월령 에너지 사이클 완전 攻略",       icon: "🌙" },
  { num: 12, title: "관계를 정화하는 연금술", subtitle: "인연의 독소를 황금으로 바꾸는 법", icon: "⚗️" },
  { num: 13, title: "영혼의 마스터플랜",     subtitle: "달빛 전략가의 10년 로드맵",         icon: "🗺️" },
];

// 
// Gemini
// 
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pickGeminiKeys(): string[] {
  const extra = String(process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GOOGLE_API_KEY_4,
    process.env.GEMINI_API_KEY_CF,
    process.env.GOOGLE_API_KEY_CF,
    ...extra,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
}

function pickGeminiModels(): string[] {
  const env = String(process.env.PSYCHO_ANALYSIS_GEMINI_MODEL ?? "").trim();
  const base = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  return env ? [env, ...base] : base;
}

function parseGeminiText(payload: unknown): string {
  const p = payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  for (const c of p?.candidates ?? []) {
    for (const part of c?.content?.parts ?? []) {
      if (part?.text?.trim()) return part.text.trim();
    }
  }
  return "";
}

async function callGemini(prompt: string): Promise<string> {
  // ─── Vertex AI 우선 시도 ──────────────────────────────────────
  try {
    const vtxt = await callVertexGemini(prompt, { temperature: 0.88, maxOutputTokens: 16384 });
    if (vtxt) return vtxt;
  } catch { /* Vertex 실패 → API 키 폴백 */ }

  // ─── GEMINI API 키 폴백 ──────────────────────────────────────
  const keys = pickGeminiKeys();
  const models = pickGeminiModels();
  if (!keys.length) return "";

  let attempts = 0;
  const maxAttempts = 4;

  for (const model of models) {
    if (attempts >= maxAttempts) break;
    for (const key of keys) {
      if (attempts >= maxAttempts) break;
      attempts += 1;
      try {
        const url = GEMINI_ENDPOINT.replace("{model}", model) + `?key=${key}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.88,
              maxOutputTokens: 16384,
              topK: 40,
              topP: 0.95,
            },
          }),
          signal: AbortSignal.timeout(18_000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = parseGeminiText(data);
        if (text) return text;
      } catch {
        // try next
      }
    }
  }
  return "";
}

// 
// 프롬프트 빌더 (엔진 traits 데이터 적극 활용)
// 
type PartnerCtx = {
  sukuyo: SukuyoCalcResult;
  name: string;
  year: number;
  gender: string;
} | null;

function buildSukuyoPrompt(
  sukuyo: SukuyoCalcResult,
  birthYear: number,
  chapterNum: number,
  partner: PartnerCtx = null
): string {
  const t = sukuyo.traits;
  const mansionFull = `${sukuyo.mansion}숙(${sukuyo.mansionCh}宿)`;

  const partnerBlock = partner ? (() => {
    const pt = partner.sukuyo.traits;
    const pMansionFull = `${partner.sukuyo.mansion}숙(${partner.sukuyo.mansionCh}宿)`;
    const rel = calcRelationType(sukuyo.mansionIdx, partner.sukuyo.mansionIdx);
    return `\n\n[궁합 상대방 숙요 데이터 — 핵심 궁합 분析 요소]
상대방: ${partner.name || '상대방'} (${partner.gender === 'F' ? '여성' : '남성'}, ${partner.year}년생)
상대 숙요: ${pMansionFull} (${partner.sukuyo.mansionEn})
상대 본질: ${pt.core}
상대 사랑 코드: ${pt.love}
두 사람 숙요 관계: ${rel.rel} — ${rel.desc}
궁합 해설: 본인(${mansionFull})과 상대(${pMansionFull})의 에너지 역학을 중심으로 궁합을 심층 분析할 것`;
  })() : '';

  const baseCtx = `[숙요점 원본 엔진 데이터]
탄생 숙요: ${mansionFull} (${sukuyo.mansionEn})  인덱스 ${sukuyo.mansionIdx + 1}/27
방위: ${sukuyo.direction}방  오행: ${sukuyo.element}  상징 동물: ${sukuyo.animal}
음력 생일: ${sukuyo.lunarMonth}월 ${sukuyo.lunarDay}일${sukuyo.isLeap ? " (윤달)" : ""}
출생년 천간지지: ${sukuyo.yearGan}년${sukuyo.yearZhi}년  서기 ${birthYear}년
재능 지수: ${t.talent}/100  대표 유명인: ${t.celebs}

[숙요 원본 특성 데이터 — 분析의 핵심 씨앗]
핵심 본질(core): ${t.core}
숨겨진 이면(hidden): ${t.hidden}
카르마 패턴(karma): ${t.karma}
삶의 만트라(mantra): ${t.mantra}
직업 코드(work): ${t.work}
사랑 코드(love): ${t.love}
재물 코드(wealth): ${t.wealth}${partnerBlock}`;

  const styleGuide = `[작성 스타일]
화법: "달빛 전략의 마스터"로서 고수의 품격과 따뜻한 통찰을 겸비한 존댓말
분량: 3,500자 이상
구조: ## 섹션 제목 형식으로 3~4개 섹션 구분
금지: 미신적 내용(부적굿무속), 무책임한 예언, 단순 길흉 나열
필수: 위 [숙요 원본 특성 데이터]를 깊이 해석해 심리학행동과학달의 주기 과학과 연계, 구체적 실행 가이드 제시
반드시 ${mansionFull}의 고유 언어와 비유로 다른 숙요와 차별화`;

  switch (chapterNum) {
    case 1:
      return `당신은 동양 최고의 숙요점(宿曜點) 심층 분析 전문가입니다.
아래 데이터를 바탕으로 [챕터 1: 영혼의 원형]을 작성하세요.

${baseCtx}

[작성 목차]
## 1. 우주의 좌표 — ${mansionFull}의 본질
"${t.core}" — 이 원본 텍스트를 3배 이상 심화확장하여 달이 이 별자리를 지날 때 태어난 영혼의 우주적 의미와 신화적 상징을 칼 융의 원형론과 결합해 서술하세요.

## 2. 타고난 원형 코드
재능 지수 ${t.talent}/100대표 유명인 ${t.celebs}의 삶과 대비시켜 이 숙요 태생의 성격재능삶의 패턴을 3,000자 이상 심층 서술하세요.

## 3. 빛과 그림자
"${t.hidden}" — 이 내면의 그림자를 심리학적으로 완전 해부하고, 강점이 동시에 맹점이 되는 이유를 분析하세요.

## 4. 영혼 코드 활성화 루틴
만트라 "${t.mantra}"를 일상에서 구현하는 구체적인 아침/저녁 루틴을 제시하세요.

${styleGuide}`;

    case 2:
      return `당신은 달의 주기와 정서 심리학의 통합 전문가입니다.
[챕터 2: 감정의 조수간만]을 작성하세요.

${baseCtx}
현재 음력일: ${sukuyo.lunarDay}일

[작성 목차]
## 1. ${mansionFull}이 만드는 정서의 파도
"${t.core}" — 이 본질 에너지가 달의 삭망 사이클(신월상현보름하현그믐)과 어떻게 공명하는지 설명하세요.

## 2. 에너지 상승기 vs 하강기
${mansionFull} 태생의 에너지가 최고조최저점에 달하는 달의 시기와 각 시기별 최적 행동 전략을 분析하세요.

## 3. 감정 조수를 다스리는 기술
"${t.hidden}" — 이 내면의 그림자가 감정 폭풍으로 발현될 때를 안정시키는 과학적심리학적 방법을 제시하세요.

## 4. 월령 활용 실전 캘린더
음력 1일~30일을 3단계(충전기활동기정리기)로 구분한 ${mansionFull} 맞춤 에너지 관리 가이드를 작성하세요.

${styleGuide}`;

    case 3:
      return `당신은 퍼스널 브랜딩과 숙요 심리학 통합 전문가입니다.
[챕터 3: 페르소나와 브랜딩]을 작성하세요.

${baseCtx}

[작성 목차]
## 1. 세상에 남기는 달빛 인장
"${t.desc}" — 이 특성이 첫인상과 사회적 퍼스널리티에 어떻게 투영되는지 서술하세요.

## 2. 숙요 브랜드 코드
"${t.work}"의 직업 코드를 현대적 퍼스널 브랜딩으로 전환하는 전략을 제시하세요. SNS직장사교 현장 활용법을 포함하세요.

## 3. 그림자 페르소나 극복
"${t.hidden}" — 무의식적으로 드러내는 불리한 인상을 전략적으로 보완하는 방법을 제시하세요.

## 4. 달빛 브랜딩 실행 플랜
30일 브랜딩 강화 액션 플랜을 단계별로 구체적으로 제시하세요.

${styleGuide}`;

    case 4:
      return `당신은 숙요 달빛 재정 전략의 최고 전문가입니다.
[챕터 4: 자산의 중력]을 작성하세요.

${baseCtx}

[작성 목차]
## 1. ${mansionFull}의 재물 코드
"${t.wealth}" — 이 재물 코드를 완전 해부하여 이 숙요 태생이 돈을 끌어당기는 고유 패턴을 심층 분析하세요.

## 2. 달의 상승기에 집중할 투자 원칙
음력 사이클 중 이 숙요 태생에게 최적의 재정 결정 타이밍과 각 시기별 투자저축지출 전략을 제시하세요.

## 3. 재물 파괴 패턴 경고
"${t.hidden}" — 무의식적으로 저지르는 재물 소멸 패턴을 분析하고 구체적인 차단 전략을 제시하세요.

## 4. 달빛 재정 로드맵
1년 단위 재정 강화 전략을 계절별월령별로 구분해 실용적으로 제시하세요.

${styleGuide}`;

    case 5:
      return `당신은 조직 심리학과 숙요 협력 역학의 통합 전문가입니다.
[챕터 5: 보이지 않는 톱니바퀴]를 작성하세요.

${baseCtx}

[작성 목차]
## 1. 당신이 조직에서 맡는 역할
"${t.karma}" — 이 카르마 패턴이 팀과 조직에서 어떤 역할로 발현되는지를 분析하세요.

## 2. 협력 시너지 극대화 전략
"${t.work}"의 직업 코드를 기반으로 다른 사람들과 함께 일할 때 최대 성과를 내는 조건과 환경을 제시하세요.

## 3. 마찰 포인트와 해결법
"${t.hidden}" — 협업에서 반복적으로 나타나는 충돌 패턴과 달빛 해결 전략을 제시하세요.

## 4. 네트워크 확장 실전 가이드
이 숙요의 에너지에 맞는 인맥 구축과 관리 방법을 구체적으로 제시하세요.

${styleGuide}`;

    case 6: {
      const relPairs = [
        { offset: 0 }, { offset: 9 }, { offset: 6 },
        { offset: 3 }, { offset: 1 }, { offset: 2 },
      ].map(({ offset }) => {
        const idx = (sukuyo.mansionIdx + offset) % 27;
        const slot = MANSIONS_27[idx];
        const rt = calcRelationType(sukuyo.mansionIdx, idx);
        return `${rt.rel}: ${slot.name}숙(${slot.ch}宿)  ${rt.desc}`;
      }).join("\n");

      return `당신은 숙요 관계 역학의 세계 최고 전문가입니다.
[챕터 6: 관계의 정밀 레이더]를 작성하세요.

${baseCtx}

[6대 숙요 관계 역학 계산 결과]
${relPairs}

[작성 목차]
## 1. 6대 관계 역학 완전 해부
안(安)괴(壞)성(成)쇠(衰)우(友)친(親) 각 관계 유형의 심리학적 의미와 "${t.karma}"의 카르마 패턴과 연계해 상세히 분析하세요.

## 2. 최고의 파트너와 최악의 파트너
성(成) 관계를 극대화하고 괴(壞)쇠(衰) 관계의 충격을 최소화하는 전략을 제시하세요.

## 3. 사랑과 우정의 달빛 지도
"${t.love}"의 사랑 코드를 기반으로 연애결혼우정에서 가장 잘 맞는 상대와 조심해야 할 상대를 분析하세요.

## 4. 관계 레이더 실전 활용법
만남에서 관계 유형을 파악하고 적절한 전략을 선택하는 실용적인 방법을 제시하세요.

${styleGuide}`;
    }

    case 7:
      return `당신은 위기 관리와 숙요 변환 전략의 최고 전문가입니다.
[챕터 7: 파괴적 혁신]을 작성하세요.

${baseCtx}

[작성 목차]
## 1. 위기를 부르는 패턴
"${t.hidden}" — ${mansionFull} 태생이 반복적으로 직면하는 위기의 유형과 그 심리적 원인을 완전 해부하세요.

## 2. 달빛 전환 전략
괴(壞) 에너지가 발생할 때 이를 성(成) 에너지로 전환하는 구체적인 전략을 제시하세요.

## 3. 변화를 선도하는 혁신가 모드
"${t.core}" — 이 본질 에너지를 창조적 혁신으로 승화시키는 방법을 제시하세요.

## 4. 위기 예방 메뉴얼
달의 주기에 따른 위기 예측과 사전 대비 시스템을 만드는 방법을 상세히 제시하세요.

${styleGuide}`;

    case 8:
      return `당신은 환경 설계와 숙요 공간 에너지의 통합 전문가입니다.
[챕터 8: 조화로운 성장]을 작성하세요.

${baseCtx}

[작성 목차]
## 1. 나를 성장시키는 공간의 법칙
${mansionFull}의 에너지(${sukuyo.element}, ${sukuyo.direction}방, 상징: ${sukuyo.animal})와 조화로운 공간 환경의 특성을 분析하세요.

## 2. 방위와 색상의 달빛 처방
이 숙요 태생에게 에너지를 충전해주는 방위, 색상, 소재, 자연 환경을 과학적심리학적 근거와 함께 제시하세요.

## 3. 일터와 주거 환경 최적화
"${t.work}"의 직업 코드를 기반으로 직장과 가정에서 이 숙요 에너지를 극대화하는 공간 설계 방법을 제시하세요.

## 4. 계절별 성장 전략
"${t.core}"의 본질 에너지가 봄여름가을겨울 각 계절에 어떻게 발현되는지, 각 계절 집중 전략을 제시하세요.

${styleGuide}`;

    case 9:
      return `당신은 감정 지능(EQ)과 숙요 정서 연결의 통합 전문가입니다.
[챕터 9: 정서적 유대]를 작성하세요.

${baseCtx}

[작성 목차]
## 1. ${mansionFull}의 감정 언어
"${t.love}" — 이 사랑 코드가 일상의 모든 감정 교류 방식에 어떻게 투영되는지 설명하세요.

## 2. 깊은 연결을 만드는 달빛 기술
"${t.karma}"의 카르마 패턴에서 드러나는 감정 교류 패턴을 분析하고, 상대방과 진정한 유대를 형성하는 기술을 제시하세요.

## 3. 상처 치유와 감정 회복
"${t.hidden}" — 이 내면의 상처 패턴을 인식하고, 달의 주기를 활용한 자기 치유 방법을 제시하세요.

## 4. 관계 심화 30일 감정 훈련
매일 실천 가능한 감정 지능 강화 루틴을 구체적으로 제시하세요.

${styleGuide}`;

    case 10:
      return `당신은 인연의 거리감과 숙요 에너지 경계의 전문가입니다.
[챕터 10: 운명적 거리]를 작성하세요.

${baseCtx}

[작성 목차]
## 1. 가까이해야 할 에너지
"${t.karma}"의 카르마 패턴과 성(成)친(親)우(友) 관계 유형을 통해 삶을 풍요롭게 만드는 사람장소습관의 공통 특성을 분析하세요.

## 2. 멀리해야 할 에너지
괴(壞)쇠(衰) 에너지가 ${mansionFull} 태생에게 미치는 영향을 구체적으로 분析하고 차단 전략을 제시하세요.

## 3. 운명적 인연 지도
"${t.celebs}"과 같은 재능을 가진 인물들의 삶에서 나타나는 핵심 인연 패턴을 통해 당신에게 올 귀인의 특성을 제시하세요.

## 4. 에너지 경계 설정 가이드
월령 사이클에 따른 사교 에너지 관리와 건강한 경계 설정 방법을 실용적으로 제시하세요.

${styleGuide}`;

    case 11: {
      const moonPhases = [
        "🌑 삭(새달): 새로운 씨앗 — 내면 성찰과 의도 설정",
        "🌒 초승달: 가느다란 빛의 출발 — 첫 행동 개시",
        "🌓 상현달: 빛이 절반 — 결정과 추진",
        "🌔 보름 전날: 에너지 절정 직전 — 핵심 역량 집중",
        "🌕 망(보름): 완전한 달빛 — 성과 수확공개",
        "🌖 하현 전날: 서서히 내려놓기 — 정리와 갈무리",
        "🌗 하현달: 휴식과 재충전 개시",
        "🌘 그믐: 해독과 정화 — 불필요한 것 방출",
      ].join("\n");

      return `당신은 달의 주기 과학과 숙요 에너지의 통합 전문가입니다.
[챕터 11: 달의 주기]를 작성하세요.

${baseCtx}
현재 음력일: ${sukuyo.lunarDay}일

[달의 8단계 에너지 사이클]
${moonPhases}

[작성 목차]
## 1. ${mansionFull}과 달의 조응
"${t.core}"의 본질 에너지가 달의 8단계 각각에서 어떻게 증폭약화되는지 상세히 분析하세요.

## 2. 최강의 달 시기 完全 活用
${mansionFull} 태생의 에너지가 최고점에 달하는 달의 시기와 그 시기에 집중해야 할 3가지 핵심 활동을 제시하세요.

## 3. 에너지 저점의 전략적 활용
달이 기울 때 나타나는 "${t.hidden}"의 그림자 패턴을 역이용하여 내면을 강화하는 방법을 제시하세요.

## 4. 월령 맞춤 실전 캘린더
한 달(음력 1일~30일)을 8단계 에너지 구간으로 나눈 ${mansionFull} 專用 실천 캘린더를 제시하세요.

${styleGuide}`;
    }

    case 12:
      return `당신은 관계 정화와 숙요 연금술의 최고 전문가입니다.
[챕터 12: 관계를 정화하는 연금술]을 작성하세요.

${baseCtx}

[작성 목차]
## 1. 毒이 되는 관계 패턴 해독
"${t.hidden}" — 이 내면의 그림자가 독성 관계를 끌어당기는 메커니즘을 심리학적으로 분析하세요.

## 2. 달빛 정화 의식
괴(壞)쇠(衰) 에너지 관계에서 자신을 정화하고 에너지를 회복하는 월령 기반 실천법을 제시하세요.

## 3. 쓴 인연을 황금으로 바꾸는 연금술
"${t.karma}"의 카르마 패턴에서 반복되는 관계 시련의 숨겨진 교훈을 해독하고, 성장 연료로 전환하는 방법을 제시하세요.

## 4. 새로운 인연 초대 의식
정화된 에너지 장(場)에서 성(成)친(親) 관계 인연을 끌어당기는 실전 행동 가이드를 제시하세요.

${styleGuide}`;

    case 13:
      return `당신은 숙요점 마스터 전략가로서 인생 로드맵 설계의 최고 전문가입니다.
[챕터 13: 영혼의 마스터플랜]을 작성하세요.

${baseCtx}

[작성 목차]
## 1. ${mansionFull} 태생의 10년 운세 지도
"${t.core}" + "${t.karma}" — 이 두 에너지 축을 기반으로 향후 10년의 주요 에너지 흐름(상승기전환기정화기)을 달의 대주기와 연계해 분析하세요.

## 2. 생애 핵심 미션 해독
만트라 "${t.mantra}"가 가리키는 이 영혼의 궁극적 사명과 삶의 목적을 해독하세요.

## 3. 3510년 마스터플랜
${t.celebs}와 같은 재능을 지닌 인물들의 성공 패턴을 참고하여 3단계(3년5년10년) 목표와 액션 플랜을 구체적으로 제시하세요.

## 4. 달빛 전략가의 일일 루틴
위 모든 챕터의 핵심을 통합한 ${mansionFull} 태생의 이상적인 하루 루틴과 월령 활용법을 최종 정리하세요.

${styleGuide}`;

    default:
      return `${mansionFull}의 달빛 전략 챕터 ${chapterNum}을 심층 분析하는 3,500자 이상의 리포트를 작성하세요.\n\n${baseCtx}\n\n${styleGuide}`;
  }
}

// 
// 응답 섹션 파서
// 
function parseSections(text: string): { title: string; body: string }[] {
  if (!text) return [];
  const parts = text.split(/^## /m).filter(Boolean);
  return parts.map((p) => {
    const nl = p.indexOf("\n");
    return nl === -1
      ? { title: p.trim(), body: "" }
      : { title: p.slice(0, nl).trim(), body: p.slice(nl + 1).trim() };
  });
}

// 
// 정적 폴백 텍스트 빌더 (Gemini 실패 시)
// 
function buildFallbackChapterText(sukuyo: SukuyoCalcResult, chapterNum: number): string {
  const meta = CHAPTER_META[chapterNum - 1];
  const t = sukuyo.traits;
  const mansionFull = `${sukuyo.mansion}숙(${sukuyo.mansionCh}宿)`;
  return `## ${meta.icon} ${meta.title}\n### ${meta.subtitle}\n\n` +
    `**${mansionFull}의 핵심 본질**\n\n${t.core}\n\n` +
    `**삶의 만트라**\n\n${t.mantra}\n\n` +
    `**직업 코드**\n\n${t.work}\n\n` +
    `**사랑 코드**\n\n${t.love}\n\n` +
    `**재물 코드**\n\n${t.wealth}\n\n` +
    `---\n*💡 AI 분析 서비스가 일시적으로 응답하지 않아 기본 데이터를 표시합니다. 챕터를 다시 불러오려면 재시도 버튼을 사용하세요.*`;
}

// 
// POST 핸들러
// 
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const year    = Number(body.year)    || 1990;
    const month   = Number(body.month)   || 1;
    const day     = Number(body.day)     || 1;
    const hour    = Number(body.hour)    ?? 12;
    const chapter = Number(body.chapter) || 1;

    if (chapter < 1 || chapter > 13) {
      return NextResponse.json({ ok: false, error: "invalid chapter" }, { status: 400 });
    }

    // 파트너 데이터 처리
    const partnerYear   = body.partnerYear   ? Number(body.partnerYear)   : null;
    const partnerMonth  = body.partnerMonth  ? Number(body.partnerMonth)  : null;
    const partnerDay    = body.partnerDay    ? Number(body.partnerDay)    : null;
    const partnerHour   = body.partnerHour  != null ? Number(body.partnerHour) : 12;
    const partnerName   = typeof body.partnerName === 'string' ? body.partnerName.trim() : '';
    const partnerGender = typeof body.partnerGender === 'string' ? body.partnerGender : 'F';

    let partner: PartnerCtx = null;
    if (partnerYear && partnerMonth && partnerDay) {
      const partnerSukuyo = calcSukuyoForServer(partnerYear, partnerMonth, partnerDay, partnerHour);
      partner = { sukuyo: partnerSukuyo, name: partnerName || '상대방', year: partnerYear, gender: partnerGender };
    }

    // 서비스 숙요 엔진으로 계산
    const sukuyo = calcSukuyoForServer(year, month, day, hour);
    const chapterMeta = CHAPTER_META[chapter - 1];

    // 챕터별 Gemini 콘텐츠 생성
    const prompt = buildSukuyoPrompt(sukuyo, year, chapter, partner);
    let rawText = "";
    let usedFallback = false;
    let fallbackReason = "";

    try {
      rawText = await callGemini(prompt);
      if (!rawText) {
        usedFallback = true;
        fallbackReason = "Gemini가 빈 응답을 반환했습니다.";
        rawText = buildFallbackChapterText(sukuyo, chapter);
      }
    } catch (aiErr: unknown) {
      usedFallback = true;
      fallbackReason = aiErr instanceof Error ? aiErr.message : "Gemini 호출 실패";
      console.warn("[api/premium/sukuyo-life] fallback:", fallbackReason);
      rawText = buildFallbackChapterText(sukuyo, chapter);
    }

    const sections = parseSections(rawText);

    return NextResponse.json({
      ok: true,
      sukuyo: {
        mansionIdx: sukuyo.mansionIdx,
        mansion: sukuyo.mansion,
        mansionCh: sukuyo.mansionCh,
        mansionEn: sukuyo.mansionEn,
        icon: sukuyo.icon,
        direction: sukuyo.direction,
        element: sukuyo.element,
        animal: sukuyo.animal,
        lunarMonth: sukuyo.lunarMonth,
        lunarDay: sukuyo.lunarDay,
        yearGan: sukuyo.yearGan,
        yearZhi: sukuyo.yearZhi,
        talent: sukuyo.traits.talent,
        celebs: sukuyo.traits.celebs,
        desc: sukuyo.traits.desc,
        mantra: sukuyo.traits.mantra,
      },
      chapter,
      text: rawText,
      sections,
      chapterMeta,
      usedFallback,
      fallbackReason: usedFallback ? fallbackReason : undefined,
    });
  } catch (err) {
    console.error("[sukuyo-life]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
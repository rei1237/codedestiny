// 나크샤트라 결정판 AI 심화 상담 — 프롬프트 라이브러리 (3덱: 숙요/베다/융합)
//
// 네오의 팩폭 작전실(neo-operation-room-prompt.js) 섹션 레지스트리 패턴을 본떠,
// 덱A 숙요 대가 상담 + 덱B 베다 대가 상담 + 덱C 두 시선의 융합 해석을 섹션 단위로 생성한다.
// 톤 = 권위 + 따뜻함(Phase 3 전문가톤 연속). 각 섹션 LLM은 { "keyInsight", "body" }를 반환.
// 근거: assembleNatalCodex 계산값(숙요 본명수·칠요·사신·격각 / 나크샤트라·지배성·샥티·가나·나디·파다·다샤).
//
// 🔴 이 상품의 핵심은 "하나의 별을 두 개의 언어로 읽는다"이다. 덱A·덱B만 나열하면 상품이 아니다 —
//    덱C(융합)가 두 결과를 실제로 대조해 공통점·차이·그 이유·현실 적용까지 끌고 가야 한다.
//    그래서 덱C는 반드시 덱A·덱B가 끝난 뒤 그 본문 요약을 근거로 받아 생성한다(2페이즈).

import { getNakshatraAttributes } from "../../constants/nakshatra-attributes.js";

// ── 페르소나(덱별) ────────────────────────────────────────────────────────────
export const NAKSHATRA_PERSONA = Object.freeze({
  sukuyo:
    "너는 30년 경력의 숙요점(宿曜占) 대가다. 27수의 칠요(七曜)·사신(四神)·오행·격각(命業胎榮親友衰安危成壞)을 꿰뚫는다. " +
    "권위 있게 단정하되, 다정한 존댓말로 짚어 준다. 위로만 늘어놓지 말고 계산 근거로 정확히 명명한다.",
  vedic:
    "너는 30년 경력의 베다 점성학(조티시) 대가다. 나크샤트라의 지배성·샥티(고유 힘)·주신·가나·나디·요니·파다(나바암샤)·비쇼타리 다샤를 근거로 읽는다. " +
    "권위 있게 단정하되, 다정한 존댓말로 짚어 준다. 산스크리트 용어는 짧게 풀어 설명한다.",
  fusion:
    "너는 숙요점 대가와 베다 점성학 대가의 상담을 30년간 나란히 읽어 온 비교 점성 연구자다. " +
    "두 대가가 같은 하늘을 각자의 언어로 읽은 기록을 받아, 어디서 같은 말을 하고 어디서 갈리는지, " +
    "그 차이가 왜 생기는지, 그래서 이 사람의 삶에서 무엇이 달라지는지를 정리한다. " +
    "두 전통을 뭉개 하나로 섞지 않는다 — 각각이 말한 바를 그대로 인용하고 그 위에서 결론을 세운다. " +
    "권위 있게 단정하되 다정한 존댓말로 쓴다. 이미 나온 문장을 다른 말로 되풀이하지 않고 매 문단 새 정보를 얹는다.",
});

// ── 섹션 레지스트리(2덱) ──────────────────────────────────────────────────────
// 각 섹션: { id, deck, title, minChars, scope, rules[] }. LLM 반환 스키마는 { body } 고정.
export const SUKUYO_SECTIONS = Object.freeze([
  { id: "sukuyoOpening", deck: "sukuyo", title: "본명수 개시 — 첫 진단", minChars: 600,
    scope: "사용자의 질문을 첫 두 문장에서 직접 짚고, 본명수(방위·사신·칠요)로 첫 인상을 단정한다.",
    rules: ["질문과 무관한 일반론으로 시작하지 않는다.", "[근거]의 본명수·칠요·사신을 인용한다."] },
  { id: "sukuyoNature", deck: "sukuyo", title: "타고난 결 — 칠요와 오행", minChars: 900,
    scope: "본명수의 원형(archetype)·칠요·오행을 근거로 타고난 성향의 핵을 깊이 진단한다.",
    rules: ["칠요(예: 목·화·토·금·수·일·월)와 원형을 인용해 근거를 남긴다.", "강점 3~5개를 계산 근거와 연결한다."] },
  { id: "sukuyoRelation", deck: "sukuyo", title: "인연과 거리 — 격각의 결", minChars: 800,
    scope: "격각(命業胎榮親友衰安危成壞) 관점에서 이 사람이 사람을 대하는 방식·인연의 거리·반복되는 관계 패턴을 짚는다.",
    rules: ["격각의 관계 원리를 단순 길흉이 아니라 관계 심리로 풀어낸다."] },
  { id: "sukuyoStrengthShadow", deck: "sukuyo", title: "강점과 그림자", minChars: 700,
    scope: "타고난 강한 기운과 약한 기운(그림자)을 나눠, 밀 자리와 지킬 자리를 판단한다.",
    rules: ["[근거]의 강점·그림자를 확장해 구체적 상황으로 풀어낸다."] },
  { id: "sukuyoFlow", deck: "sukuyo", title: "흐름과 조언 — 오늘부터", minChars: 700,
    scope: "본명수의 결에 맞춰 지금 흐름을 읽고, 오늘부터 실천할 조언을 준다.",
    rules: ["결정론 금지('~할 것이다'→'~한 경향/~해 보세요'). 의료·투자 표현 금지.", "실천 조언은 오늘~이번 달에 할 수 있는 구체 행동으로."] },
]);

export const VEDIC_SECTIONS = Object.freeze([
  { id: "vedicOpening", deck: "vedic", title: "나크샤트라 개시 — 지배성과 샥티", minChars: 600,
    scope: "질문을 짚고, 나크샤트라의 지배성·샥티(고유 힘)·주신으로 첫 진단을 단정한다.",
    rules: ["[근거]의 지배성·샥티·주신을 인용한다.", "산스크리트 용어는 짧게 풀이."] },
  { id: "vedicNature", deck: "vedic", title: "원형과 기질 — 가나·나디·요니", minChars: 900,
    scope: "가나(기질)·나디(체질)·요니(본능 원형)와 근원 동기(푸루샤르타)로 타고난 기질을 깊이 진단한다.",
    rules: ["가나·나디·요니를 인용해 근거를 남긴다.", "지어낸 값을 쓰지 않는다."] },
  { id: "vedicPada", deck: "vedic", title: "파다와 나바암샤", minChars: 700,
    scope: "파다(나크샤트라 4분할)와 그 나바암샤 라시를 근거로 성향의 미세한 결을 읽는다.",
    rules: ["[근거]에 파다가 '미상'이면 시각 미상으로 파다는 생략함을 밝히고 무리하게 만들지 않는다."] },
  { id: "vedicDasha", deck: "vedic", title: "비쇼타리 다샤 — 시기의 흐름", minChars: 800,
    scope: "현재 대운(마하다샤)/안타르다샤를 근거로 지금이 어떤 시기인지, 무엇이 열리고 닫히는지 판단한다.",
    rules: ["[근거]의 현재 다샤 행성을 인용한다. 시기를 구체적으로 명시하되 단정하지 않는다."] },
  { id: "vedicDirection", deck: "vedic", title: "삶의 방향 — 푸루샤르타", minChars: 700,
    scope: "근원 동기(다르마·아르타·카마·목샤)를 축으로 이번 생에서 충만함을 얻는 방향을 짚는다.",
    rules: ["동기를 인용해 삶의 축으로 연결한다."] },
  { id: "vedicPractice", deck: "vedic", title: "실천 — 오늘의 처방", minChars: 700,
    scope: "지배성·나디에 맞춘 생활·마음의 처방을 준다(전통 문헌 기반 라이프스타일·마음가짐).",
    rules: ["결정론 금지. 의료·법률·투자 표현 금지(질병 진단·투자 권유 불가).", "실천 가능한 구체 행동으로."] },
]);

// ── 덱C: 융합 해석 ────────────────────────────────────────────────────────────
// 이 덱만 `needsDeckDigest: true` — 덱A·덱B 본문 요약을 근거로 받아야 비교가 성립한다.
// avoid[]: 앞뒤 섹션의 주제를 침범해 같은 말을 되풀이하는 것을 막는다(master-love-codex 패턴).
export const FUSION_SECTIONS = Object.freeze([
  { id: "fusionArchetype", deck: "fusion", title: "별의 원형 — 영혼의 본질", minChars: 1100, needsDeckDigest: true,
    scope: "두 대가가 각자 그린 상(像)을 겹쳐, 이 사람이 어떤 원형으로 태어났는지 한 인격으로 세운다. 의식이 붙잡는 것과 무의식이 끌리는 것, 가장 깊은 욕망과 그 이면의 두려움을 짚는다.",
    rules: [
      "숙요의 원형(archetype)과 베다의 샥티·주신을 각각 인용해 '두 이름이 같은 얼굴을 가리킨다'를 실제로 보여 준다.",
      "욕망과 두려움은 한 쌍으로 쓴다 — 무엇을 원하기 때문에 무엇을 두려워하는지 인과로 연결한다.",
    ],
    avoid: ["구체적 연애·직업 사례(뒤 섹션 담당)", "실천 조언(마지막 섹션 담당)"] },
  { id: "fusionCompare", deck: "fusion", title: "두 시선의 대조 — 같은 자리를 다르게 읽다", minChars: 1300, needsDeckDigest: true,
    scope: "숙요 대가와 베다 대가가 같은 항목을 두고 실제로 어떻게 다르게 말했는지 3~4개 축으로 나란히 놓고 비교한다.",
    rules: [
      "반드시 '숙요는 …라고 보고, 베다는 …라고 본다' 형태로 두 진술을 나란히 제시한 뒤 해석을 얹는다.",
      "축마다 소제목(### )을 달고, 표면 대조에 그치지 말고 그 진술이 어느 계산값에서 나왔는지 근거를 밝힌다.",
      "억지로 대립시키지 않는다 — 실제로 같은 말을 하는 축이면 그렇다고 쓴다.",
    ],
    avoid: ["차이가 생기는 원리 설명(다음 섹션 담당)", "공통 메시지 정리(다음 섹션 담당)"] },
  { id: "fusionConvergence", deck: "fusion", title: "두 체계가 함께 말하는 것", minChars: 1000, needsDeckDigest: true,
    scope: "두 전통이 서로 독립적으로 도달한 동일한 결론을 뽑아, 그것이 이 사람의 삶에서 어떤 장면으로 나타나는지 구체화한다.",
    rules: [
      "'두 체계가 각각 다른 계산으로 같은 결론에 닿았다'는 사실 자체가 신뢰의 근거임을 짚는다.",
      "공통 메시지는 2~3개로 압축하고, 각각에 실제 생활 장면을 하나씩 붙인다.",
    ],
    avoid: ["대조 항목 재나열", "심리 구조 분석(뒤 섹션 담당)"] },
  { id: "fusionDivergence", deck: "fusion", title: "갈라지는 이유 — 관측·상징·철학", minChars: 1200, needsDeckDigest: true,
    scope: "두 체계가 다르게 읽는 지점의 원인을 계산 원리와 문화적 배경에서 설명한다.",
    rules: [
      "원인을 최소 세 층위로 나눠 쓴다 — ① 계산·관측 기준의 차이(항성 기준 시데리얼 대 27수 배당, 경계일 처리) ② 상징 체계의 차이(칠요·사신 대 지배성·샥티) ③ 철학의 차이(관계와 거리를 보는 눈 대 시기와 업을 보는 눈).",
      "[근거]에 경계일 병기가 있으면 그것을 이 차이의 실물 사례로 인용한다.",
      "어느 쪽이 옳다고 판정하지 않는다 — 서로 다른 질문에 답하는 도구임을 밝힌다.",
    ],
    avoid: ["공통 메시지 재정리", "실천 조언"] },
  { id: "fusionPsyche", deck: "fusion", title: "내면의 지형 — 애착과 회복", minChars: 1300, needsDeckDigest: true,
    scope: "두 해석을 심리 구조로 번역한다. 애착 방식, 자존감이 흔들리는 지점, 오래된 상처의 모양, 회복 경로, 에너지가 차는 환경과 빠지는 환경을 짚는다.",
    rules: [
      "혼자 있을 때와 사람들과 있을 때 각각 어떤 상태가 되는지 나눠 쓴다.",
      "스트레스 반응을 신체·감정·행동 세 층위로 구분해 설명한다.",
      "질병·진단·치료를 말하지 않는다. 심리 '경향'으로만 쓴다.",
    ],
    avoid: ["연애 관계의 구체 사례(다음 섹션 담당)", "직업·재물"] },
  { id: "fusionLove", deck: "fusion", title: "사랑하는 방식", minChars: 1200, needsDeckDigest: true,
    scope: "상대를 고르는 기준, 끌리는 사람과 멀어지는 사람, 애정 표현 방식, 집착과 질투가 나오는 조건, 갈등을 푸는 방식, 장기 관계에서 반복되는 국면, 이별 후 회복 경로를 짚는다.",
    rules: [
      "숙요의 격각(인연의 거리)과 베다의 요니·가나(본능 원형)를 각각 인용해 근거를 남긴다.",
      "'좋은 궁합/나쁜 궁합'으로 사람을 재단하지 않는다 — 이 사람이 관계에서 취하는 자세를 설명한다.",
    ],
    avoid: ["심리 일반론 반복", "카르마·영성"] },
  { id: "fusionWork", deck: "fusion", title: "재능과 재물", minChars: 1200, needsDeckDigest: true,
    scope: "타고난 재능과 약점, 리더형·전문가형·창작형·사업형 중 어디에 가까운지, 돈이 들어오는 경로와 새는 경로, 결정을 내릴 때의 습관을 짚는다.",
    rules: [
      "유형은 단정하지 말고 '어느 쪽에 가깝다'로 쓰되, 근거가 되는 계산값을 반드시 밝힌다.",
      "특정 종목·상품·투자 권유를 하지 않는다. 돈을 대하는 태도와 판단 습관만 다룬다.",
    ],
    avoid: ["연애", "실천 조언 목록(마지막 섹션 담당)"] },
  { id: "fusionKarma", deck: "fusion", title: "반복되는 과제", minChars: 1000, needsDeckDigest: true,
    scope: "이번 생에서 되풀이되는 주제, 반드시 마주치게 되는 벽, 그것을 넘었을 때 열리는 다음 국면을 짚는다.",
    rules: [
      "베다의 근원 동기(푸루샤르타)와 숙요의 그림자를 겹쳐 '이 사람의 숙제'를 한 문장으로 정의한 뒤 풀어 쓴다.",
      "전생·응보로 겁주지 않는다. 성장 과제로 다룬다.",
    ],
    avoid: ["심리 분석 재서술", "영성 수행법"] },
  { id: "fusionSpirit", deck: "fusion", title: "고요와 직관", minChars: 900, needsDeckDigest: true,
    scope: "이 사람에게 맞는 고요의 형태, 직관이 열리는 조건, 내면의 평화를 회복하는 방식, 삶의 의미를 어디서 찾는지 짚는다.",
    rules: [
      "지배성·나디에 맞춘 구체적인 방식을 제안한다(앉아서 하는 쪽인지 움직이며 하는 쪽인지 등).",
      "특정 종교·교단을 권하지 않는다.",
    ],
    avoid: ["카르마 과제 재서술", "실천 조언 목록"] },
  { id: "fusionPractice", deck: "fusion", title: "오늘부터의 행동", minChars: 1300, needsDeckDigest: true,
    scope: "상담 전체를 실행 가능한 행동으로 옮긴다. 마지막에 이 상담에서 가장 중요한 통찰 세 가지를 뽑아 정리한다.",
    rules: [
      "행동 조언은 6~8개, 각각 '언제·무엇을·어떻게'가 드러나게 한 문장으로 쓴다(예: 결정을 미루기보다 오늘 안에 가장 작은 한 가지부터 시작하세요).",
      "마지막에 반드시 `### 가장 중요한 세 가지` 소제목을 달고 `- ` 목록으로 정확히 3개를 쓴다. 각 항목은 25자 이내 한 줄 결론으로 시작하고 ' — ' 뒤에 한 문장 설명을 붙인다.",
      "결정론 금지. 의료·법률·투자 표현 금지.",
    ],
    avoid: ["앞 섹션의 해석을 다시 설명하는 것 — 여기서는 '그래서 무엇을 할 것인가'만 다룬다"] },
]);

export const NAKSHATRA_SECTIONS = Object.freeze([...SUKUYO_SECTIONS, ...VEDIC_SECTIONS, ...FUSION_SECTIONS]);

/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   섹션별 사용자 프롬프트는 계산된 27수·나크샤트라 결과를 입력으로 받으므로 생년 정보만으로는 조립되지 않는다.
   덱(숙요/베다/융합)마다 페르소나가 다르므로 섹션을 고르면 그 덱의 시스템 프롬프트를 보여준다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const section = NAKSHATRA_SECTIONS.find((item) => item.id === options.variant) || NAKSHATRA_SECTIONS[0];
  const deck = section?.deck || "sukuyo";

  return {
    systemPrompt: NAKSHATRA_PERSONA[deck] || NAKSHATRA_PERSONA.sukuyo,
    prompt: "",
    partial: true,
    partialReason: "섹션별 사용자 프롬프트는 계산된 27수·나크샤트라 결과를 입력으로 받습니다. 덱별 페르소나(시스템 프롬프트)만 표시합니다.",
    variantKey: section?.id || "",
    variants: NAKSHATRA_SECTIONS.map((item) => ({ key: item.id, label: `${item.deck} · ${item.title || item.id}` })),
    notes: section?.scope ? [`${section.title} 범위: ${section.scope}`] : [],
  };
}

// 생성 페이즈 — 융합 덱은 두 대가의 상담이 끝난 뒤에만 쓸 수 있다.
export const NAKSHATRA_PHASE_DECKS = Object.freeze([...SUKUYO_SECTIONS, ...VEDIC_SECTIONS]);
export const NAKSHATRA_PHASE_FUSION = FUSION_SECTIONS;
export const NAKSHATRA_TOTAL_MIN_CHARS = NAKSHATRA_SECTIONS.reduce((sum, s) => sum + s.minChars, 0);

// ── 근거(계산값) 컨텍스트 ─────────────────────────────────────────────────────
function line(label, value) {
  return value == null || value === "" ? "" : `- ${label}: ${value}`;
}

// assembleNatalCodex(codex) → LLM 근거 텍스트 + 인용 토큰.
export function buildFactContext(codex, question) {
  const dy = codex?.dongyang || {};
  const iv = codex?.india || {};
  const attrs = getNakshatraAttributes(iv.index) || {};
  const dasha = iv.dasha || {};
  const pada = iv.pada != null ? `${iv.pada}${iv.padaDetail ? ` · 나바암샤 ${iv.padaDetail.navamsaSignKo}` : ""}` : "미상(시각 미상)";
  const sukuyoLines = [
    line("본명수", dy.nameKo ? `${dy.nameKo}수(${dy.nameHan})` : ""),
    line("방위·사신", [dy.direction, dy.fourSymbol].filter(Boolean).join(" · ")),
    line("칠요(七曜)", dy.sevenLuminary),
    line("원형", dy.archetypeTitle),
    line("키워드", (dy.keywords || []).join(" · ")),
    line("강점", (dy.strengths || []).join(" · ")),
    line("그림자", (dy.shadows || []).join(" · ")),
  ].filter(Boolean).join("\n");
  const vedicLines = [
    line("나크샤트라", iv.nameKo ? `${iv.nameKo}(${iv.nameEn})` : ""),
    line("지배성", iv.lordKo),
    line("샥티(고유 힘)", attrs.shakti),
    line("주신", iv.deity ? `${iv.deity} — ${iv.deityRole}` : ""),
    line("가나·나디·요니", [iv.ganaKo, iv.nadiKo, iv.yoni].filter(Boolean).join(" · ")),
    line("파다", pada),
    line("근원 동기(푸루샤르타)", iv.motiveKo),
    line("현재 다샤", dasha.currentMahadashaKo ? `${dasha.currentMahadashaKo} / ${dasha.currentAntardashaKo}` : ""),
  ].filter(Boolean).join("\n");
  const tokens = [dy.nameKo && `${dy.nameKo}수`, dy.nameHan, dy.sevenLuminary, dy.fourSymbol, iv.nameKo, iv.nameEn, iv.lordKo, attrs.shakti, iv.ganaKo, iv.nadiKo, dasha.currentMahadashaKo]
    .map((t) => String(t || "").trim()).filter((t) => t.length >= 2);
  const summaryText = `【숙요(宿曜) 계산 근거】\n${sukuyoLines}\n\n【베다(Jyotish) 계산 근거】\n${vedicLines}`;
  return { summaryText, evidenceTokens: [...new Set(tokens)].slice(0, 20) };
}

// ── 중복 억제용 컨텍스트 빌더 ─────────────────────────────────────────────────
// master-love-codex 의 buildMemory 패턴: 이미 쓴 섹션들의 첫 문장만 넘겨
// 같은 말을 다른 표현으로 되풀이하는 것을 막는다(요청: 절대 반복 금지).
export function buildWrittenMemory(done, limit = 10) {
  const rows = (Array.isArray(done) ? done : [])
    .slice(-limit)
    .map((entry) => {
      const first = String(entry?.body || "").split(/(?<=[.!?。])\s|\n/)[0] || "";
      const line = first.trim().slice(0, 90);
      return line ? `- ${entry.title || entry.id}: ${line}` : "";
    })
    .filter(Boolean);
  return rows.join("\n");
}

// 융합 덱 전용 — 덱A·덱B 본문을 압축해 "두 대가가 실제로 무엇이라 말했는지"를 근거로 넘긴다.
// 이게 없으면 융합 섹션이 계산값만 보고 또 한 번 일반론을 쓰게 된다.
export function buildDeckDigest(done, perSection = 420) {
  const pick = (deck) => (Array.isArray(done) ? done : [])
    .filter((entry) => entry?.deck === deck && entry?.body)
    .map((entry) => `- [${entry.title}] ${String(entry.body).replace(/\s+/g, " ").trim().slice(0, perSection)}`)
    .join("\n");
  const sukuyo = pick("sukuyo");
  const vedic = pick("vedic");
  if (!sukuyo && !vedic) return "";
  return [
    "【숙요 대가가 말한 것】",
    sukuyo || "(없음)",
    "",
    "【베다 대가가 말한 것】",
    vedic || "(없음)",
  ].join("\n");
}

// ── 섹션 프롬프트 빌더 ────────────────────────────────────────────────────────
export function buildSectionPrompt(section, ctx) {
  const persona = NAKSHATRA_PERSONA[section.deck] || NAKSHATRA_PERSONA.sukuyo;
  const q = String(ctx?.question || "").trim();
  const digest = section.needsDeckDigest ? String(ctx?.deckDigest || "").trim() : "";
  const memory = String(ctx?.writtenMemory || "").trim();
  return [
    persona,
    "",
    "아래 [근거]는 이 사람의 사주에서 실제로 계산된 값이다. 반드시 이 값을 인용해 근거 있는 상담을 쓴다.",
    "",
    "[근거]",
    ctx?.summaryText || "",
    ...(digest ? ["", "[앞서 두 대가가 읽은 것]", digest] : []),
    ...(memory ? ["", "[이미 말한 것 — 되풀이 금지]", memory] : []),
    "",
    q ? `[사용자 질문]\n${q}` : "[사용자 질문]\n(자유 상담 — 전반적인 흐름을 짚어 준다)",
    "",
    `[이 챕터: ${section.title}]`,
    `- 목적: ${section.scope}`,
    `- 최소 분량: 공백 포함 ${section.minChars}자 이상. 얕게 끝내지 말고 근거 → 해석 → 구체적 장면 → 의미 순으로 두텁게 쓴다.`,
    "- 문단마다 새 정보를 얹는다. 앞에서 한 말을 다른 표현으로 바꿔 다시 쓰지 않는다.",
    "- 가독성: 소제목은 `### `, 목록은 `- `, 강조는 `**굵게**`, 인용은 `> `로 쓴다(다른 마크다운 문법은 쓰지 않는다).",
    ...(section.rules || []).map((r) => `- 규칙: ${r}`),
    ...(section.avoid || []).map((a) => `- 이 챕터에서 다루지 않는 것: ${a}`),
    "",
    "출력은 반드시 아래 JSON 하나만. 마크다운 코드블록·설명·인사말 금지.",
    '{ "keyInsight": "이 챕터의 결론 한 줄(40자 이내, 문장으로)", "body": "이 챕터 상담문(문단·줄바꿈 허용, 따뜻한 존댓말)" }',
  ].join("\n");
}

// ── 파싱/병합 ────────────────────────────────────────────────────────────────
export function extractJsonObject(text) {
  const raw = String(text || "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return {};
  }
}

export function parseSectionResponse(text) {
  const obj = extractJsonObject(text);
  const body = typeof obj.body === "string" ? obj.body : (typeof obj.text === "string" ? obj.text : "");
  const keyInsight = typeof obj.keyInsight === "string" ? obj.keyInsight : "";
  return { keyInsight: keyInsight.trim().slice(0, 120), body: body.trim() };
}

// `### 가장 중요한 세 가지` 블록에서 카드 3장을 뽑는다(fusionPractice 전용).
// 없으면 빈 배열 — UI 는 그때 카드 영역을 렌더하지 않는다.
export function extractTopInsights(body) {
  const text = String(body || "");
  const at = text.indexOf("### 가장 중요한 세 가지");
  if (at < 0) return [];
  return text
    .slice(at)
    .split("\n")
    .filter((line) => /^\s*-\s+/.test(line))
    .slice(0, 3)
    .map((line) => {
      const raw = line.replace(/^\s*-\s+/, "").replace(/\*\*/g, "").trim();
      const [head, ...rest] = raw.split(/\s*—\s*/);
      return { title: (head || "").trim().slice(0, 40), detail: rest.join(" — ").trim() };
    })
    .filter((item) => item.title);
}

// results: [{ id, keyInsight, body }] → { sukuyo, vedic, fusion } (섹션 순서 유지)
export function mergeConsultationSections(results) {
  const byId = new Map((Array.isArray(results) ? results : []).map((r) => [r.id, r]));
  const pick = (sections) => sections
    .map((s) => {
      const hit = byId.get(s.id) || {};
      return { id: s.id, title: s.title, keyInsight: hit.keyInsight || "", body: hit.body || "" };
    })
    .filter((s) => s.body && s.body.length > 0);
  return {
    sukuyo: pick(SUKUYO_SECTIONS),
    vedic: pick(VEDIC_SECTIONS),
    fusion: pick(FUSION_SECTIONS),
  };
}

// LLM 결과에 내부 구현 단어가 새면 걸러낸다(네오 hasForbiddenResultText 패턴).
export function hasForbiddenResultText(value) {
  return /\b(mock|dry-run|provider|system prompt|assistant|JSON)\b/i.test(JSON.stringify(value || ""));
}

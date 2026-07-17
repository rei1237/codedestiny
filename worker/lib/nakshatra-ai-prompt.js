// 나크샤트라 결정판 AI 심화 상담 — 프롬프트 라이브러리 (2덱: 숙요/베다)
//
// 네오의 팩폭 작전실(neo-operation-room-prompt.js) 섹션 레지스트리 패턴을 본떠,
// "2회 봐주는" = 덱A 숙요 대가 상담 + 덱B 베다 대가 상담을 각각 여러 섹션으로 생성한다.
// 톤 = 권위 + 따뜻함(Phase 3 전문가톤 연속). 각 섹션 LLM은 { "body": "마크다운 프로세" }만 반환.
// 근거: assembleNatalCodex 계산값(숙요 본명수·칠요·사신·격각 / 나크샤트라·지배성·샥티·가나·나디·파다·다샤).

import { getNakshatraAttributes } from "../../constants/nakshatra-attributes.js";

// ── 페르소나(덱별) ────────────────────────────────────────────────────────────
export const NAKSHATRA_PERSONA = Object.freeze({
  sukuyo:
    "너는 30년 경력의 숙요점(宿曜占) 대가다. 27수의 칠요(七曜)·사신(四神)·오행·격각(命業胎榮親友衰安危成壞)을 꿰뚫는다. " +
    "권위 있게 단정하되, 다정한 존댓말로 짚어 준다. 위로만 늘어놓지 말고 계산 근거로 정확히 명명한다.",
  vedic:
    "너는 30년 경력의 베다 점성학(조티시) 대가다. 나크샤트라의 지배성·샥티(고유 힘)·주신·가나·나디·요니·파다(나바암샤)·비쇼타리 다샤를 근거로 읽는다. " +
    "권위 있게 단정하되, 다정한 존댓말로 짚어 준다. 산스크리트 용어는 짧게 풀어 설명한다.",
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

export const NAKSHATRA_SECTIONS = Object.freeze([...SUKUYO_SECTIONS, ...VEDIC_SECTIONS]);

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

// ── 섹션 프롬프트 빌더 ────────────────────────────────────────────────────────
export function buildSectionPrompt(section, ctx) {
  const persona = NAKSHATRA_PERSONA[section.deck] || NAKSHATRA_PERSONA.sukuyo;
  const q = String(ctx?.question || "").trim();
  return [
    persona,
    "",
    "아래 [근거]는 이 사람의 사주에서 실제로 계산된 값이다. 반드시 이 값을 인용해 근거 있는 상담을 쓴다.",
    "",
    "[근거]",
    ctx?.summaryText || "",
    "",
    q ? `[사용자 질문]\n${q}` : "[사용자 질문]\n(자유 상담 — 전반적인 흐름을 짚어 준다)",
    "",
    `[이 챕터: ${section.title}]`,
    `- 목적: ${section.scope}`,
    `- 최소 분량: 공백 포함 ${section.minChars}자 이상.`,
    ...(section.rules || []).map((r) => `- 규칙: ${r}`),
    "",
    "출력은 반드시 아래 JSON 하나만. 마크다운 코드블록·설명·인사말 금지.",
    '{ "body": "이 챕터 상담문(문단·줄바꿈 허용, 따뜻한 존댓말)" }',
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
  return { body: body.trim() };
}

// results: [{ id, body }] → { sukuyo: [{id,title,body}], vedic: [...] } (섹션 순서 유지)
export function mergeConsultationSections(results) {
  const byId = new Map(results.map((r) => [r.id, r]));
  const pick = (sections) => sections
    .map((s) => ({ id: s.id, title: s.title, body: (byId.get(s.id) || {}).body || "" }))
    .filter((s) => s.body && s.body.length > 0);
  return {
    sukuyo: pick(SUKUYO_SECTIONS),
    vedic: pick(VEDIC_SECTIONS),
  };
}

// LLM 결과에 내부 구현 단어가 새면 걸러낸다(네오 hasForbiddenResultText 패턴).
export function hasForbiddenResultText(value) {
  return /\b(mock|dry-run|provider|system prompt|assistant|JSON)\b/i.test(JSON.stringify(value || ""));
}

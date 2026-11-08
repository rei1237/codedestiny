/** @jest-environment node */
// 초융합 그룹 계획 2판(6단계, 2026-11-08) — 새 결제 세션에만 박히고, 옛 판 프롬프트 바이트는 그대로다.
import { createHash } from "node:crypto";
import { describe, expect, it, jest } from "@jest/globals";
import { FUSION_PREMIUM_VERSION, FUSION_PREMIUM_V2, FUSION_PREMIUM_TARGETS_V2 as targets } from "../../lib/fusion-premium-report.js";
import { FUSION_EXPERT_VERSION, fusionEvidenceReferences, normalizeFusionSignals, ownFusionEvidencePath } from "../../worker/lib/fusion-expert-contract.js";
import { FUSION_GEMINI_ENUM_CHAR_BUDGET, buildFusionSectionGroupPrompt, fusionGeminiSchemaIssues, fusionGroupsForStage } from "../../worker/lib/fusion-fortune-prompt.js";
import { createMemoryFusionFortuneStore, fusionPlan2SoftIssues, generateFusionFortuneRequest, generateFusionFortuneWithRealLLM, scrubFusionPlan2Assembly } from "../../worker/lib/fusion-fortune.js";
import { normalizeFusionPlan2Subchapters, resolveFusionEvidenceReference, scrubFusionSection } from "../../worker/lib/fusion-group-plan.js";

const systems = ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"];
const base = { version: FUSION_EXPERT_VERSION, locale: "ko", birthTimeKnown: true, birthPlaceKnown: true, topic: "이직", customerQuestion: "지금 옮길지 준비부터 할지", systems: Object.fromEntries(systems.map((system) => [system, system === "tarot" ? { cards: [{ name: "바보", orientation: "upright", positionKey: "current", meaningSummary: "시작" }] } : { expertEvidence: { theme: "준비", pattern: "책임" } }])), tarotSpread: { cards: [] } };
const v2 = { ...base, reportVersion: FUSION_PREMIUM_V2 };
const plan2 = { ...v2, groupPlanVersion: 2 };
const plan = { version: FUSION_PREMIUM_VERSION, question: "이직을 결정하기 전에 무엇을 확인할까요?", questions: [{ id: "q1", title: "내 일하는 성향은?" }, { id: "q2", title: "옮길 조건은?" }, { id: "q3", title: "어떻게 준비할까?" }] };
const env = { ENABLE_FUSION_FORTUNE_REAL_LLM: "true", ALLOW_FUSION_FORTUNE_REAL_LLM: "true", GEMINIF_API_KEY: "mock-only", GEMINI_CONTEXT_CACHE: "false" };
const allGroups = (context) => [...fusionGroupsForStage(1, context), ...fusionGroupsForStage(2, context)];

function prose(seed, n) { const lines = []; for (let i = 0; lines.join("\n\n").length < n; i++) lines.push(`${seed}의 ${i}번째 장면에서는 준비와 책임의 근거를 살펴 역할을 나누고, 비교한 조건을 기록하여 스스로 확인할 다음 행동을 정합니다.`); return lines.join("\n\n"); }
function payload(group, context, { ratio = 1, chapters = 4, evidence, extra = "" } = {}) {
  const out = {};
  for (const key of group.keys) {
    if (key === "visualization") continue;
    if (key === "consultationPlan") { out[key] = plan; continue; }
    if (key === "title" || key === "shareText") { out[key] = "내 선택의 기준"; continue; }
    const content = prose(key, Math.round((targets[key] || 100) * ratio)) + extra;
    if (key === "finalVerdict") { out[key] = { headline: "조건부터 확인해요", confidence: 0, rationale: content, systemVerdicts: systems.map((id) => ({ key: id, stance: "conditional", note: "준비할 조건을 확인해요" })), doNow: ["기록하기", "비교하기", "확인하기"], avoid: ["재촉하기", "과장하기"] }; continue; }
    if (!key.endsWith("Section") && !["integratedReading", "timingAndAction"].includes(key)) { out[key] = content; continue; }
    const system = group.systems[0] || "saju";
    const refs = evidence || fusionEvidenceReferences(system, context.systems[system]);
    const count = content.split("\n\n").length;
    out[key] = { title: "질문에 맞춘 " + key, content, keyPoints: ["준비의 범위", "책임의 조건", "행동의 기준"], subchapters: Array.from({ length: chapters }, (_, i) => ({ title: `${key} ${i + 1}번째 확인`, start: Math.floor(i * count / chapters), end: Math.floor((i + 1) * count / chapters), questionIds: [`q${i % 3 + 1}`], evidenceKeys: refs, artKey: system })), signals: [{ domain: "work", period: "current", stance: "adapt", summary: "준비할 조건을 확인해요", evidenceKeys: fusionEvidenceReferences(system, context.systems[system]) }], luckyActions: ["기록", "비교", "확인"], cautionPatterns: ["재촉", "과장", "단정"] };
  }
  return out;
}

describe("plan 2 keeps every older prompt byte-identical", () => {
  // 6단계 시작 전(2026-11-08) 실측한 기준값. 바뀌면 옛 세션의 프롬프트·캐시 접두사가 바뀐 것이다.
  const BASELINE = {
    v1: "dff746730e6f9ad9f698733ebb9d499a4a3990304385fe60cb537eb3745627c4",
    expert: "8619d19eb07cfc2f92ce7c501c41152100ebcb119ae0519138162f3e48c26cbd",
    premiumV1: "4628cd4280f44abe6fb280d28d30b638b90a3ddcb8f6bde1f1366fb3a44c0dfa",
    premiumV2: "fb8680e5951d1a613cf637fe0ac098bd88920c009c73c5aeeacfd0f6f064c05e",
  };
  const hashPrompts = (context) => {
    const hash = createHash("sha256");
    const hashPlan = { version: FUSION_PREMIUM_VERSION, question: "이직 전 확인", questions: [1, 2, 3].map((n) => ({ id: `q${n}`, title: `질문 ${n}` })) };
    for (const group of allGroups(context)) {
      const prompt = buildFusionSectionGroupPrompt({ context, group, priorSections: { consultationPlan: hashPlan }, referenceDate: new Date("2026-11-08T00:00:00Z") });
      hash.update(group.id + "\0" + prompt.systemPrompt + "\0" + prompt.userPrompt + "\0" + JSON.stringify(prompt.geminiSchema) + "\0");
    }
    return hash.digest("hex");
  };
  it.each([["v1", { ...base, version: "fusion-fortune.v1" }], ["expert", base], ["premiumV1", { ...base, reportVersion: FUSION_PREMIUM_VERSION }], ["premiumV2", v2]])("%s", (name, context) => {
    expect(hashPrompts(context)).toBe(BASELINE[name]);
  });
  it("hands the question text only to the first chapter and keeps one cache prefix per stage", () => {
    for (const stage of [1, 2]) {
      const built = fusionGroupsForStage(stage, plan2).map((group) => [group, buildFusionSectionGroupPrompt({ context: plan2, group, priorSections: { consultationPlan: plan } })]);
      expect(new Set(built.map(([, prompt]) => prompt.promptPrefix)).size).toBe(1);
      for (const [group, prompt] of built) {
        const tail = prompt.userPrompt.slice(prompt.promptPrefix.length);
        expect(tail.includes(`"customerQuestion":"${plan2.customerQuestion}"`)).toBe(group.id === "saju");
        expect(tail).toContain("분량은 넉넉하게 쓴다");
        if (group.id === "saju") expect(tail).toContain("타고난 기질과 공감의 장");
      }
    }
  });
});

describe("plan 2 is pinned on new paid sessions only", () => {
  const store = () => createMemoryFusionFortuneStore();
  const capture = () => jest.fn(async () => ({ result: {}, deliverable: false, generationSource: "gemini_partial" }));
  const contextBuilder = async () => ({ ok: true, context: { birthTimeKnown: true, reportVersion: FUSION_PREMIUM_V2 } });
  const request = (generator, extra = {}) => generateFusionFortuneRequest({ input: { birthDate: "1995-04-18", birthTime: "08:30", calendarType: "solar", gender: "female", topic: "삶", concern: "", reportVersion: FUSION_PREMIUM_V2 }, userId: "u", requestId: `r-${Math.random()}`, store: store(), resolvePaidAccess: async () => ({ ok: true }), contextBuilder, generator, ...extra });
  it("pins a new v2 context, keeps a saved context as it was, and rolls back with the env switch", async () => {
    const fresh = capture(); await request(fresh);
    expect(fresh.mock.calls[0][0].context.groupPlanVersion).toBe(2);
    const resumed = capture(); await request(resumed, { priorSnapshot: { context: { birthTimeKnown: true, reportVersion: FUSION_PREMIUM_V2 } } });
    expect(resumed.mock.calls[0][0].context.groupPlanVersion).toBeUndefined();
    const rolledBack = capture(); await request(rolledBack, { env: { FUSION_GROUP_PLAN_V2_ENABLED: "false" } });
    expect(rolledBack.mock.calls[0][0].context.groupPlanVersion).toBeUndefined();
  });
});

describe("plan 2 final attempt salvages instead of rejecting", () => {
  const saju = (context) => fusionGroupsForStage(1, context).find((group) => group.id === "saju");
  const runSaju = async (context, value) => {
    const saved = [];
    const result = await generateFusionFortuneWithRealLLM({ context, env, stage: 1, priorSnapshot: { attempts: { saju: 1 } }, onAttempt: async () => 2, onCheckpoint: async (snapshot) => { saved.push(snapshot); },
      providerCall: async () => ({ ok: true, text: JSON.stringify(value), provider: "gemini", model: "gemini-2.5-flash" }) });
    return { result, saved };
  };
  it("drops only the unsafe sentence on the last paid attempt", async () => {
    const value = payload(saju(plan2), plan2, { extra: " 상대는 반드시 돌아온다." });
    const { saved } = await runSaju(plan2, value);
    expect(saved.at(-1).sajuSection.content).not.toContain("반드시 돌아온다");
    expect(saved.at(-1).sajuSection.content.length).toBeGreaterThan(value.sajuSection.content.length * 0.9);
    const old = await runSaju(v2, payload(saju(v2), v2, { extra: " 상대는 반드시 돌아온다." }));
    expect(old.saved).toHaveLength(0);
  });
  it("uses a neutral plan when the first chapter never returns one", async () => {
    const value = payload(saju(plan2), plan2); delete value.consultationPlan;
    const { saved } = await runSaju(plan2, value);
    expect(saved.at(-1).consultationPlan.questions).toHaveLength(3);
    expect(JSON.stringify(saved.at(-1).consultationPlan)).not.toContain(plan2.customerQuestion);
  });
  it("accepts 1-3 subchapters and deep or unprefixed evidence paths under plan 2 only", async () => {
    const deep = ["saju.expertEvidence.theme.detail", "pattern"];
    const { saved } = await runSaju(plan2, payload(saju(plan2), plan2, { chapters: 2, evidence: deep }));
    expect(saved.at(-1).sajuSection.subchapters.map((chapter) => chapter.evidenceKeys)).toEqual([["saju.expertEvidence.theme", "saju.expertEvidence.pattern"], ["saju.expertEvidence.theme", "saju.expertEvidence.pattern"]]);
    const old = await runSaju(v2, payload(saju(v2), v2, { chapters: 2 }));
    expect(old.saved).toHaveLength(0);
  });
});

describe("plan 2 length repair after every draft exists", () => {
  async function runBook({ ratios = {}, unsafe = () => false } = {}) {
    let prior = {}; const attempts = {}; const lengthRepairs = {}; const calls = []; const results = []; let generated;
    for (const stage of [1, 2]) for (let wave = 0; wave < 14; wave++) {
      generated = await generateFusionFortuneWithRealLLM({ context: plan2, stage, requestId: "plan2", env, priorResult: prior, priorSnapshot: { attempts: { ...attempts }, lengthRepairs: { ...lengthRepairs } },
        onCheckpoint: async (result) => { prior = { ...prior, ...result }; },
        onAttempt: async (id, options = {}) => { if (options.lengthRepair) lengthRepairs[id] = true; attempts[id] = (attempts[id] || 0) + 1; return attempts[id]; },
        providerCall: async (_env, prompt, options) => {
          const id = options.logContext.sectionGroup;
          const repair = prompt.includes("직전 시도는 이 부분을");
          calls.push(repair ? `${id}:repair` : id);
          const group = allGroups(plan2).find((item) => item.id === id);
          return { ok: true, text: JSON.stringify(payload(group, plan2, { ratio: repair ? 1 : ratios[id] || 1, extra: unsafe(id, attempts[id]) ? " 상대는 반드시 돌아온다." : "" })), provider: "gemini", model: options.model };
        } });
      results.push(generated);
      prior = generated.result;
      if (generated.deliverable) break;
    }
    return { generated, calls, results, lengthRepairs };
  }
  it("repairs at most two groups, shortest first, in a request that wrote no drafts", async () => {
    const { generated, calls, results, lengthRepairs } = await runBook({ ratios: { domainYun: 0.4, domainNeo: 0.6, domainHanbi: 0.65 } });
    expect(generated.deliverable).toBe(true);
    expect(calls.filter((call) => call.endsWith(":repair")).sort()).toEqual(["domainNeo:repair", "domainYun:repair"]);
    expect(lengthRepairs).toEqual({ domainYun: true, domainNeo: true });
    expect(results.some((result) => result.qualityIssues?.includes("repair_pending"))).toBe(true);
    const yun = allGroups(plan2).find((group) => group.id === "domainYun");
    for (const key of yun.keys) if (targets[key]) expect(generated.result[key].content.length).toBeGreaterThanOrEqual(targets[key]);
  });
  it("never drops a domain chapter that only needed one unsafe sentence removed", async () => {
    const { generated } = await runBook({ unsafe: (id) => id === "domainYeoni" });
    const yeoni = allGroups(plan2).find((group) => group.id === "domainYeoni");
    expect(generated.deliverable).toBe(true);
    for (const key of yeoni.keys) if (targets[key]) expect(generated.result[key]?.content).toBeTruthy();
    expect(JSON.stringify(generated.result)).not.toContain("반드시 돌아온다");
  });
});

describe("plan 2 soft issues, assembly scrub and evidence paths", () => {
  it("flags a re-quoted question outside the first chapter only", () => {
    const quote = "지금 옮길지 준비부터 할지 고민하는 마음이 큽니다.";
    const group = (id) => allGroups(plan2).find((item) => item.id === id);
    const text = [1, 2, 3].map((n) => `${n}번째로 보면 ${quote}`).join("\n\n");
    const domain = group("domainYun");
    const source = Object.fromEntries(domain.keys.map((key) => [key, { content: text }]));
    expect(fusionPlan2SoftIssues(source, domain, plan2).map((issue) => issue.code)).toContain("QUESTION_REQUOTED");
    expect(fusionPlan2SoftIssues({ sajuSection: { content: text } }, group("saju"), plan2).map((issue) => issue.code)).not.toContain("QUESTION_REQUOTED");
  });
  it("removes a sentence repeated from an earlier chapter while at least 85% remains", () => {
    const shared = "흐름이 바뀌는 시기에는 먼저 지켜야 할 생활의 기준을 정하고 그다음 움직임을 고르는 편이 안전합니다.";
    const words = ["바람", "골목", "서랍", "편지", "계단", "창가", "우산", "시계", "노트", "찻잔", "화분", "열쇠", "지도", "등불", "모래", "구름", "다리", "선반", "거울", "의자", "담요", "액자", "연필"];
    const filler = (seed, step) => Array.from({ length: 12 }, (_, i) => `${seed}에서 ${[1, 2, 3, 4, 5].map((k) => words[(i * step + k * (step + 3) + seed.length) % words.length]).join(" ")}을 차례로 적어 둡니다.`).join(" ");
    const composed = { executiveSummary: `${filler("요약", 5)} ${shared}`, sajuSection: { content: `${filler("사주", 7)}\n\n${shared}`, keyPoints: ["가", "나", "다"] }, ziweiSection: { content: `${filler("자미", 11)}\n\n${shared}`, keyPoints: ["가", "나", "다"] } };
    scrubFusionPlan2Assembly(composed, plan2);
    expect(composed.executiveSummary).toContain(shared);
    expect(composed.ziweiSection.content).not.toContain(shared);
    const tiny = { executiveSummary: shared, sajuSection: { content: shared } };
    scrubFusionPlan2Assembly(tiny, plan2);
    expect(tiny.sajuSection.content).toBe(shared);
  });
  it("keeps subchapter ranges contiguous when a scrub empties a paragraph", () => {
    const section = { content: "첫 문단입니다.\n\n지울 문장입니다.\n\n셋째 문단입니다.", subchapters: [{ title: "a", start: 0, end: 1 }, { title: "b", start: 1, end: 2 }, { title: "c", start: 2, end: 3 }] };
    const next = scrubFusionSection(section, (sentence) => sentence.startsWith("지울"));
    expect(next.subchapters.map(({ start, end }) => [start, end])).toEqual([[0, 1], [1, 2]]);
    const normalized = normalizeFusionPlan2Subchapters({ content: "가.\n\n나.\n\n다.", subchapters: [{ title: "하나" }] }, { references: ["saju.expertEvidence.theme"], questionIds: ["q1"] });
    expect(normalized.subchapters).toEqual([expect.objectContaining({ start: 0, end: 3, evidenceKeys: ["saju.expertEvidence.theme"], questionIds: ["q1"] })]);
  });
  it("owns evidence paths written without the system prefix", () => {
    const context = { systems: { saju: { expertEvidence: { yearlyLuck: [{ pillar: "갑자" }], theme: "준비" } } } };
    expect(ownFusionEvidencePath("yearlyLuck[0].pillar", "saju", context)).toBe("saju.expertEvidence.yearlyLuck.0.pillar");
    expect(ownFusionEvidencePath("expertEvidence.theme", "saju", context)).toBe("saju.expertEvidence.theme");
    expect(ownFusionEvidencePath("unknown.path", "saju", context)).toBe("unknown.path");
    const section = normalizeFusionSignals({ signals: [{ domain: "work", stance: "adapt", period: "current", summary: "준비", evidenceKeys: ["yearlyLuck[0].pillar"] }] }, "saju", context);
    expect(section.signals).toHaveLength(1);
    expect(resolveFusionEvidenceReference("yearlyLuck[0].pillar", ["saju.expertEvidence.yearlyLuck"])).toBe("saju.expertEvidence.yearlyLuck");
  });
});

// 🔴 2026-11-08 실호출: 분야 묶음 3개(본문 키 2개씩)가 키마다 6체계 근거 경로 enum(약 1,650자)을 반복해
//    Gemini가 생성 전에 400(스키마 과복잡)을 돌려줬다. 실제 근거 키 이름·개수로 요청 본문을 검사한다.
describe("plan 2 request bodies stay inside Gemini's schema limits", () => {
  const EVIDENCE = {
    saju: ["usefulGod", "unfavorableGod", "majorLuck", "yearlyLuck", "natalInteractions", "seasonalBalance", "gyeokguk", "hiddenStemExposures"],
    ziwei: ["palaces", "lifePalace", "bodyPalace", "fourTransformations", "majorLuck", "minorLuck", "yearlyLuck", "sanFangSiZheng", "bureau"],
    vedic: ["lagna", "moon", "moonNakshatra", "houses", "transits", "dasha"],
    sukuyo: ["birth", "target", "targetDate", "dayFortune"],
    astrology: ["planets", "houseCusps", "houseSystem", "aspects", "ascendant", "midheaven", "transits"],
  };
  const card = (n) => ({ name: `카드${n}`, orientation: "upright", positionKey: `p${n}`, meaningSummary: "시작" });
  const real = { ...plan2, systems: { ...Object.fromEntries(Object.entries(EVIDENCE).map(([system, keys]) => [system, { expertEvidence: Object.fromEntries(keys.map((key) => [key, "값"])) }])), tarot: { cards: [1, 2, 3, 4, 5, 6].map(card) } } };
  const prompts = () => allGroups(real).map((group) => [group, buildFusionSectionGroupPrompt({ context: real, group, priorSections: { consultationPlan: plan }, schemaInPrompt: false })]);

  it("keeps every group's response schema under the enum budget with supported keywords only", () => {
    expect(prompts().map(([group, prompt]) => [group.id, fusionGeminiSchemaIssues(prompt.geminiSchema)])).toEqual(allGroups(real).map((group) => [group.id, []]));
  });
  it("moves the evidence path list into the prompt when the schema cannot carry it", () => {
    const refs = systems.flatMap((system) => fusionEvidenceReferences(system, real.systems[system]));
    const yun = prompts().find(([group]) => group.id === "domainYun")[1];
    expect(JSON.stringify(yun.geminiSchema)).not.toContain("tarot.cards.0.name");
    for (const ref of refs) expect(yun.userPrompt).toContain(ref);
    const saju = prompts().find(([group]) => group.id === "saju")[1];
    expect(JSON.stringify(saju.geminiSchema)).toContain("saju.expertEvidence.gyeokguk");
  });
  it("flags the schema shape that Gemini rejected", () => {
    const enumValues = Array.from({ length: 100 }, (_, i) => `astrology.expertEvidence.k${i}`);
    expect(fusionGeminiSchemaIssues({ type: "OBJECT", properties: { a: { type: "ARRAY", items: { type: "STRING", enum: enumValues } } }, required: ["a"] })).toContain("enum_chars");
    expect(fusionGeminiSchemaIssues({ type: "OBJECT", properties: {}, additionalProperties: false })).toContain("keyword:additionalProperties");
    expect(enumValues.join("").length).toBeGreaterThan(FUSION_GEMINI_ENUM_CHAR_BUDGET);
  });
});

describe("plan 2 never drops a chapter after a 400", () => {
  const rejected = { ok: false, error: "GEMINI_INVALID_REQUEST", providerCode: "GEMINI_INVALID_REQUEST", status: 400, retryable: false };
  async function runBook(reject) {
    let prior = {}; const attempts = {}; const calls = []; let generated;
    for (const stage of [1, 2]) for (let wave = 0; wave < 16; wave++) {
      generated = await generateFusionFortuneWithRealLLM({ context: plan2, stage, requestId: "plan2-400", env, priorResult: prior, priorSnapshot: { attempts: { ...attempts } },
        onCheckpoint: async (result) => { prior = { ...prior, ...result }; },
        onAttempt: async (id, options = {}) => { if (options.unbilled) return attempts[id]; attempts[id] = (attempts[id] || 0) + 1; return attempts[id]; },
        providerCall: async (_env, prompt, options) => {
          const id = options.logContext.sectionGroup;
          const group = allGroups(plan2).find((item) => item.id === id);
          const keys = Object.keys(options.responseSchema?.properties || {});
          const call = { id, schema: options.responseSchema ? JSON.stringify(options.responseSchema) : "", keys, prompt };
          calls.push(call);
          if (reject(call)) return rejected;
          const one = keys.length ? { ...group, keys: group.keys.filter((key) => keys.includes(key)) } : group;
          return { ok: true, text: JSON.stringify(payload(one, plan2)), provider: "gemini", model: options.model };
        } });
      prior = generated.result;
      if (generated.deliverable) break;
    }
    return { generated, calls, attempts };
  }
  const chapterKeys = (id) => allGroups(plan2).find((group) => group.id === id).keys.filter((key) => targets[key]);

  it("resends a rejected schema simplified inside the same attempt", async () => {
    const { generated, calls, attempts } = await runBook((call) => call.id === "domainYun" && call.schema.includes('"enum"'));
    expect(generated.deliverable).toBe(true);
    expect(generated.qualityIssues).not.toContain("domain_chapter_missing");
    for (const key of chapterKeys("domainYun")) expect(generated.result[key].content.length).toBeGreaterThan(100);
    const yun = calls.filter((call) => call.id === "domainYun");
    expect(yun).toHaveLength(2);
    expect(yun[1].schema).not.toContain('"enum"');
    expect(attempts.domainYun).toBe(1);
  });
  it("falls back to no schema, then splits chapters, before shipping a group empty", async () => {
    const { generated, calls, attempts } = await runBook((call) => call.id === "domainHanbi" && call.keys.length !== 1);
    expect(generated.deliverable).toBe(true);
    expect(generated.qualityIssues).not.toContain("domain_chapter_missing");
    for (const key of chapterKeys("domainHanbi")) {
      expect(generated.result[key].content.length).toBeGreaterThan(100);
      expect(attempts[`rescue-${key}`]).toBe(1);
    }
    expect(calls.some((call) => call.id === "domainHanbi" && !call.schema && call.prompt.includes("응답 JSON 스키마"))).toBe(true);
  });
});

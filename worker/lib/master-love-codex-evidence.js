// Calculation facts only. The model explains these records; it cannot create them.
export const CODEX_EVIDENCE_VERSION = "codex-evidence-v3";

const SAJU_FIELDS = [
  [/일간|기질|전체/, "dayMaster"], [/월지|전체/, "monthPillar"],
  [/일주|일지|전체/, "dayPillar"], [/십성|식신|상관|식상|인성|정인|편인|관성|재성|편관|전체/, "tenGodsByPillar"],
  [/지장간|전체/, "pillarDetails"], [/오행|용신|기신|전체/, "fiveElements"],
  [/용신|기신|오행|전체/, "elementBalance"], [/조후|월지|신강약|전체/, "seasonalBalance"],
  [/신강약|전체/, "strength"], [/합|충|형|파|해|전체/, "natalInteractions"],
  [/대운|전체/, "majorLuck"], [/세운|전체/, "yearlyLuck"],
];
const present = value => value != null && value !== "" && (!(typeof value === "object") || Object.keys(value).length > 0);

export function buildCodexEvidence({ chapter, saju, ziweiChart, partnerSaju, partnerZiweiChart, compatibility }) {
  const records = [];
  const focus = (chapter.sajuFocus || []).join(" ");
  const palaces = (chapter.ziweiPalaces || []).join(" ");
  const add = (subject, system, path, value, certainty = "calculated", period = "natal") => {
    if (present(value)) records.push({ id: `${subject}.${system}.${path}`, subject, system, path, value, certainty, period });
  };
  for (const [subject, s, z] of [["self", saju, ziweiChart], ["partner", partnerSaju, partnerZiweiChart]]) {
    if (!s && !z) continue;
    for (const [pattern, key] of SAJU_FIELDS) {
      if (!pattern.test(focus)) continue;
      const certainty = s?.calculationMeta?.timeUnknown && ["majorLuck", "yearlyLuck"].includes(key) ? "provisional" : "calculated";
      if (key === "yearlyLuck") {
        for (const year of s?.yearlyLuck || []) add(subject, "saju", `${key}.${year.year}`, year, certainty, String(year.year));
      } else add(subject, "saju", key, s?.[key], certainty, key === "majorLuck" ? "major-luck-cycles" : "natal");
    }
    // Every chapter needs an identifiable natal anchor even if its requested
    // specialist factor (e.g. monthly luck) is not produced by the engine.
    add(subject, "saju", "dayMaster", s?.dayMaster);
    for (const palace of z?.palaces || []) {
      if (palaces.includes(palace.name)) add(subject, "ziwei", `palaces.${palace.name}`, palace,
        z?.uncertainty?.birthTimeUnknown ? "provisional" : "calculated");
    }
  }
  for (const key of chapter.compatFocus || []) {
    if (key === "cross") continue;
    for (const system of ["saju", "ziwei"]) {
      add("pair", system, key, compatibility?.[system]?.[key],
        compatibility?.uncertainty?.length ? "provisional" : "calculated");
    }
  }
  const unique = [...new Map(records.map(record => [record.id, record])).values()];
  const axes = [
    ...(compatibility?.cross?.convergence || []).map(axis => ({ ...axis, status: "agreement" })),
    ...(compatibility?.cross?.divergence || []).map(axis => ({ ...axis, status: "conflict" })),
    ...(compatibility?.cross?.pending || []).map(axis => ({ ...axis, status: "pending" })),
  ];
  // A natal chart pair has no validated numerical cross-system equivalence.
  // Do not turn two independently calculated facts into a claimed agreement.
  const crossChecks = axes.length ? axes.map(axis => ({ id: `cross.${axis.sajuAxis}.${axis.ziweiAxis}`, ...axis }))
    : [{ id: "cross.context", status: "pending", reason: "no_calculated_direction", theme: chapter.title }];
  return { version: CODEX_EVIDENCE_VERSION, chapterId: chapter.id, records: unique, crossChecks };
}

export function formatCodexEvidence(contract) {
  return [
    "[이 장의 검증 가능한 근거 — 아래 ID와 값만 인용]",
    JSON.stringify(contract),
    "evidence 각 항목에 evidenceId, subject, system(saju 또는 ziwei), period, certainty를 아래 기록과 정확히 일치시킨다. natal은 원국, 연도는 해당 세운, major-luck-cycles는 기록된 대운 기간만 뜻한다. label과 explanation은 요청된 출력 언어로 쓴다.",
    "crossChecks는 아래 각 판정을 {id,status,explanation}으로 설명한다. status를 바꾸지 않는다. pending은 판단 보류이며 일치나 불일치로 확정하지 않는다.",
    "사주와 자미두수의 근거를 각각 인용하되 provisional은 가정임을 설명한다. 한 체계의 근거가 없으면 새로 만들어 채우지 않는다.",
    "핵심 해석 → 사주 근거 → 자미두수 근거 → 일치·상충·판단 보류의 이유 → 행동 순서로 전개한다.",
    "월운 등 목록에 없는 시기 자료, 없는 별·사화·합충을 만들지 않는다. element-count-balance는 수량 보완 지표이며 확정 용신이 아니다.",
    "궁합 pair 근거와 개인 self/partner 원국 근거를 구분한다. 점수는 성공 확률이나 적중률이 아니다.",
  ].join("\n");
}

const SYSTEM_ALIASES = { saju: "saju", "사주": "saju", "四柱": "saju", ziwei: "ziwei", "자미두수": "ziwei", "紫微斗數": "ziwei", "紫微斗数": "ziwei" };
const nonEmpty = value => typeof value === "string" && value.trim().length > 0;

// Measured 2026-09-17 (gemini-2.5-flash, production prompt): the model cites the right
// records but spells the reference as `id` or `path`, and omits crossChecks. Facts are
// therefore copied from the calculation record; the model only chooses and explains them.
function findCodexRecord(item, contract, byId) {
  const direct = byId.get(item?.evidenceId) || byId.get(item?.id);
  if (direct) return direct;
  const path = String(item?.path || item?.evidenceId || item?.id || "");
  const system = SYSTEM_ALIASES[String(item?.system || "").trim()];
  const matches = contract.records.filter(record => record.path === path
    && (!item?.subject || record.subject === item.subject) && (!system || record.system === system));
  return matches.length === 1 ? matches[0] : null;
}

/** Rewrites parsed.evidence / parsed.crossChecks in place to the calculation contract. */
export function normalizeCodexEvidence(parsed, contract) {
  const byId = new Map(contract.records.map(record => [record.id, record]));
  parsed.evidence = (Array.isArray(parsed.evidence) ? parsed.evidence : []).map(item => {
    const record = findCodexRecord(item, contract, byId);
    if (!record || !nonEmpty(item?.explanation)) return null;
    const { evidenceId: _e, id: _i, path: _p, ...rest } = item;
    return { ...rest, label: nonEmpty(item.label) ? item.label : record.path, evidenceId: record.id,
      subject: record.subject, system: record.system, period: record.period, certainty: record.certainty };
  }).filter(Boolean);
  const checks = Array.isArray(parsed.crossChecks) ? parsed.crossChecks : [];
  // Status is a calculated verdict; only an explanation the model actually wrote is shown.
  parsed.crossChecks = contract.crossChecks.map(expected => {
    const written = checks.find(actual => actual?.id === expected.id && nonEmpty(actual.explanation));
    return written ? { id: expected.id, status: expected.status, explanation: written.explanation } : null;
  }).filter(Boolean);
  return parsed;
}

export function assertCodexEvidence(parsed, contract) {
  normalizeCodexEvidence(parsed, contract);
  const cited = new Set(parsed.evidence.map(item => item.evidenceId));
  for (const system of ["saju", "ziwei"]) {
    if (contract.records.some(record => record.system === system)
        && !contract.records.some(record => record.system === system && cited.has(record.id))) throw new Error("LLM_EVIDENCE_INCOMPLETE");
  }
  if (contract.records.some(record => record.subject === "partner")
      && !contract.records.some(record => record.subject === "partner" && cited.has(record.id))) throw new Error("LLM_PARTNER_EVIDENCE_MISSING");
  const sentences = String(parsed.body || "").split(/[.!?。！？\n]+/).map(text => text.replace(/\s+/g, "").trim()).filter(text => text.length >= 40);
  const counts = new Map();
  for (const sentence of sentences) {
    const count = (counts.get(sentence) || 0) + 1;
    if (count >= 3) throw new Error("LLM_OUTPUT_REPEATED");
    counts.set(sentence, count);
  }
}

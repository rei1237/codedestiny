import { assertCodexConsultation } from "./master-love-codex-consultation.js";
import { escapeRawControlCharsInJsonStrings } from "./json-text-repair.js";
import { assertCodexEvidence, codexRecordLabel, normalizeCodexEvidence } from "./master-love-codex-evidence.js";
import { countPaidReportBodyChars, dropRepeatedReportSentences, paidReportBody, reportSentenceKey } from "./paid-report-quality.js";
import { tokensRequiredForChars } from "./llm-budget.js";

/** Shared editorial contract for both books; calculations and pricing remain unchanged. */
/**
 * Safe body range. V1 chapters keep min+500~min+900 byte-for-byte; a V2 chapter (plan 2, 2026-11-08
 * "분량은 넉넉하게") carries its own wider targetChars.
 */
export function codexBodyTarget(chapter) {
  const min = Number(chapter?.minChars) || 2400;
  return Array.isArray(chapter?.targetChars) ? chapter.targetChars : [min + 500, min + 900];
}

/** V2-only prompt lines. Empty for V1 chapters, so their prompt bytes stay unchanged. */
export function codexV2PromptLines(chapter) {
  if (!chapter?.perspective) return [];
  return [
    `[이 장의 관점] ${chapter.perspective}`,
    "[V2 문장 규칙] '결국 중요한 것은', '다시 말해', '앞서 말했듯', '그렇기 때문에 더더욱' 같은 상투 연결구를 쓰지 않는다. 장을 여는 첫 문장과 닫는 마지막 문장은 앞 장들과 다른 구조(장면·질문·근거 한 줄 등)로 시작한다.",
    "[V2 말투] 한 장 안에서 종결어미를 한 가지로 통일한다(합니다체로 썼다면 끝까지 합니다체). 해요체와 합니다체를 섞지 않는다.",
    "[V2 질문 인용] 상담자의 상황·질문 원문은 그 질문이 배정된 장(questions가 있는 장)에서만 한 번 받아 답한다. 배정되지 않은 장에서는 질문·상황 문장을 다시 옮겨 적지 말고, 이미 들은 배경으로만 삼는다.",
  ];
}

export function buildCodexEditorialContract(chapter, compatibility) {
  const min = chapter.minChars || 2400;
  const [targetLo, targetHi] = codexBodyTarget(chapter);
  const bands = { low: "낮음", mid: "중간", high: "높음" };
  const axes = [...(compatibility?.cross?.convergence || []), ...(compatibility?.cross?.divergence || [])];
  return [
    "[완성 원고 기준 — 요약과 본문을 서로 다르게 활용]",
    `body는 최소 ${min}자이며 안전한 목표는 ${targetLo}~${targetHi}자다. 다른 JSON 필드와 지표는 본문 분량에 포함하지 않는다.`,
    "body에 4~6개의 소제목(##)을 두고, 각 절에서 근거 → 쉬운 뜻 → 서로 다른 생활 장면 → 선택 가능한 대응 순서로 설명한다. 문단은 2~4문장씩 나눈다. 같은 조언을 바꿔 말해서 분량을 채우지 마라.",
    "narration은 2~3문장, insight는 180~360자의 요약이다. keySentence는 한 문장이다. 요약의 긴 문단을 body에 복사하지 않는다. 본문은 사례와 이유를 추가한다.",
    "evidence는 이 장의 핵심 3~6개만 고른다. 실제 제공된 간지·궁·성요를 쓰고, 궁합에서는 본인/상대/교차 근거 중 누구의 것인지 label에 표시한다. 각 explanation은 해당 배치의 쉬운 뜻 한 문장이다.",
    "자미(묘) 같은 괄호 강약 표기는 독자용 문장에 그대로 복사하지 말고 쉬운 말로 풀어라. 제공되지 않은 별·사화·합충을 만들지 마라. 원국 내부의 합과 두 사람 사이의 합을 혼동하지 마라.",
    "actions는 2~3개다. 각 항목에 언제 실행할지, 실제로 할 행동, 말할 문장 또는 확인할 기준을 포함한다. '서로 존중하세요/노력하세요/소통하세요'만으로 끝내지 마라.",
    "caution은 나쁜 사건 예언이 아니라 문제가 커지는 조건과 멈출 신호다. 진단명·상대의 속마음·결혼/이별 시점·성공 확률을 확정하지 않는다.",
    "JSON의 요약·본문·지표·시각화는 같은 결론이어야 한다. 장별 범위를 지키고 앞 장의 핵심을 다시 늘어놓지 않는다. 점수는 해석 보조 지표이며 확률이나 실측 심리검사 결과가 아니다.",
    ...(axes.length ? [
      "[궁합 계산의 방향 — 아래 판정을 수사적 표현으로 뒤집지 마라]",
      ...axes.map(axis => `${axis.theme}: 사주 ${bands[axis.sajuBand] || axis.sajuBand}, 명반 ${bands[axis.ziweiBand] || axis.ziweiBand}.`),
      "양쪽 모두 낮은 끌림을 '강렬한 끌림/운명적 만남'으로 서술하지 않는다. 마찰이 크다는 것을 매력의 증거로 바꾸지 않는다. 상반된 축은 다름을 설명하고 한쪽으로 덮지 않는다.",
    ] : []),
  ].join("\n");
}

export function buildCodexChapterMemory(chapters = []) {
  return chapters.slice(-8).map(chapter => {
    const summary = chapter.content?.keySentence || String(chapter.body || "").split("\n")
      .map(line => line.trim()).find(line => line && !/^(?:#{1,6}\s|●)/.test(line));
    return summary ? `${String(chapter.title || "").trim()}: ${String(summary).trim().slice(0, 160)}` : "";
  }).filter(Boolean);
}

/** Explicitly labelled fixture; its caller must enforce the three staging-only flags. */
export function buildCodexStagingChapter(chapter, metricDefs) {
  const paragraph = `스테이징 검증용 ${chapter.title} 본문입니다. 실제 상담 해석이 아닙니다. 이 원고는 구매 권한 확인 이후 챕터 생성, 저장, 재열람과 모바일 표시가 연결되는지 확인합니다.\n\n`;
  const paragraphs = Array.from({ length: Math.ceil(((chapter.minChars || 2400) + 200) / paragraph.length) }, (_, index) => {
    let sentence = 0;
    return paragraph.replace(/([^.!?。！？\n]+)([.!?。！？\n]|$)/g, (_match, text, separator) => `[fixture ${chapter.id}:${index}:${sentence++}] ${text}${separator}`);
  });
  return {
    body: `## 스테이징 검증 원고\n\n${paragraphs.join("")}`,
    narration: "스테이징 검증 원고입니다. 실제 상담 결과가 아닙니다.",
    evidence: [{ label: "스테이징 입력", system: "검증", explanation: "서비스 실행과 저장 연결을 검증합니다." }],
    insight: "실제 LLM 비용 없이 생성·저장·복구 흐름을 확인합니다.",
    keySentence: "스테이징 fixture는 실제 상담 품질 평가에 사용하지 않습니다.",
    caution: "이 내용으로 운세나 관계를 판단하지 않습니다.",
    actions: ["생성 후 새로고침하여 저장된 회차를 확인하세요.", "다시 로그인하여 같은 결과가 열리는지 확인하세요."],
    bridge: "다음 장에서도 동일한 저장 계약을 확인합니다.",
    ...(chapter.jsonMode ? { typeName: "스테이징 검증 유형", typeSummary: "실제 성향 분석이 아닌 검증 데이터입니다.",
      metrics: metricDefs.map(({ key, label }) => ({ key, label, score: 50, basis: "스테이징 검증용 고정 지표입니다." })) } : {}),
  };
}

/** Validate newly generated chapters only; never invalidate an older purchased book. */
/**
 * Acceptance floor for a delivered chapter. The prompt still asks for minChars + 500~900;
 * measured gemini-2.5-flash chapters land at ~76–110% of minChars, so rejecting everything
 * under 100% failed every paid book at 0/20 (production, 2026-09-16~17).
 */
export function codexChapterFloor(chapter) {
  return Math.ceil((Number(chapter?.minChars) || 2400) * 0.7);
}

/**
 * A draft under minChars earns exactly one length repair inside the existing attempt cap (rule L2,
 * docs/handoff/2026-09-27-llm-length-never-fatal.md). It is a repair trigger, never a rejection:
 * the 0.7 acceptance floor above stays, so a repair (or a last attempt) is delivered at any length
 * and the longest valid candidate wins. Without it, R3/R4 (2026-10-09) shipped 10~11 of 20 chapters
 * at 73~76% of minChars with no repair, because 0.7 alone let them through silently.
 */
export function codexChapterRepairFloor(chapter) {
  return Number(chapter?.minChars) || 2400;
}

/**
 * Floor for a chapter after sentences shared with earlier chapters are cut. The model's own output
 * must still clear codexChapterFloor; judging the cut body by that floor failed chapter 2 on every
 * retry (shared chart facts) and closed the whole paid book after three waves (production, 2026-09-17).
 */
export function codexDedupedChapterFloor(chapter) {
  return Math.ceil((Number(chapter?.minChars) || 2400) * 0.5);
}

/** Removes sentences already delivered earlier in the book (or earlier in this body). */
export function dedupeCodexBody(body, priorBodies = []) {
  const seen = new Set();
  for (const prior of priorBodies) {
    for (const sentence of paidReportBody(prior).split(/[.!?。？！\n]+/u)) {
      const normalized = reportSentenceKey(sentence);
      if (normalized.length >= 24) seen.add(normalized);
    }
  }
  return String(body || "").split("\n").map(line => {
    // Heading lines are skipped whole, exactly as hasRepeatedReportPassage skips them.
    if (!paidReportBody(line).replace(/\s/gu, "")) return line;
    const kept = (line.match(/[^.!?。？！]+[.!?。？！]*/gu) || []).filter(sentence => {
      const normalized = reportSentenceKey(sentence).replace(/[.!?。？！]+$/u, "");
      if (normalized.length < 24) return true;
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    }).join("").trim();
    return kept ? line.slice(0, line.length - line.trimStart().length) + kept : null;
  }).filter(line => line !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function assertCodexChapterQuality(parsed, chapter, metricDefs = [], evidenceContract = null, { allowShort = false } = {}) {
  const source = chapter.structured === false ? { body: parsed } : parsed;
  const body = typeof source?.body === "string" ? source.body.trim() : "";
  if (!countPaidReportBodyChars(body)) throw new Error("LLM_OUTPUT_EMPTY");
  if (chapter.structured === false) {
    if (!allowShort && body.length < codexChapterFloor(chapter)) throw new Error("LLM_OUTPUT_TOO_SHORT");
    return;
  }
  if (evidenceContract) assertCodexEvidence(source, evidenceContract);
  assertCodexConsultation(source, evidenceContract);
  const hasText = value => typeof value === "string" && value.trim().length > 0;
  if (!["narration", "insight", "keySentence", "caution", "bridge"].every(key => hasText(source[key]))
      || !Array.isArray(source.evidence) || !source.evidence.some(item => hasText(item?.label) && hasText(item?.system) && hasText(item?.explanation))
      || !Array.isArray(source.actions) || source.actions.filter(hasText).length < 2) {
    throw new Error("LLM_OUTPUT_INCOMPLETE");
  }
  if (chapter.jsonMode) {
    const metrics = Array.isArray(source.metrics) ? source.metrics : [];
    if (!hasText(source.typeName) || !hasText(source.typeSummary)
        || metrics.length !== metricDefs.length
        || !metricDefs.every(({ key }) => {
          const matches = metrics.filter(item => item?.key === key);
          return matches.length === 1 && Number.isInteger(matches[0].score)
            && matches[0].score >= 0 && matches[0].score <= 100 && hasText(matches[0].basis);
        })) throw new Error("LLM_DNA_INCOMPLETE");
  }
  if (!allowShort && body.length < codexChapterFloor(chapter)) throw new Error("LLM_OUTPUT_TOO_SHORT");
}

/** Invalid responses must not trap a purchased retry behind the same cached output. */
export function qualityCheckedCodexCache(store, validate) {
  const valid = value => { try { validate(value); return true; } catch { return false; } };
  return {
    async get(key) { const value = await store.get(key); return value && valid(value) ? value : null; },
    async set(key, value, ttl) { if (valid(value)) await store.set(key, value, ttl); },
  };
}

/** Recover only syntactically complete chapter objects; quality validation remains separate. */
export function parseChapterJson(text) {
  const raw = String(text ?? "").trim();
  if (!raw) throw new Error("LLM_JSON_INVALID");
  const fenced = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)]
    .map(match => match[1].trim())
    .filter(Boolean);
  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  // Provider explanations may contain their own braces. A complete fenced payload is more
  // authoritative than the wrapper, so parse it before the broad first/last-brace fallback.
  const candidates = [...fenced, withoutFence];
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(withoutFence.slice(start, end + 1));

  for (const candidate of [...new Set(candidates)]) {
    for (const prepared of [...new Set([candidate, escapeRawControlCharsInJsonStrings(candidate)])]) {
      try {
        const parsed = JSON.parse(prepared);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      } catch { /* try the next recoverable representation */ }
    }
  }
  throw new Error("LLM_JSON_INVALID");
}

/** Two bounded provider attempts cover malformed JSON and incomplete content too. */
export async function generateCodexChapterResponse(call, prompt, { chapter, metricDefs, evidenceContract = null, deadlineAt = Infinity, minBudgetMs = 1000, maxAttempts = 2, previousError = "", allowShort = false, finalAttempt = false, repairHint = "", options = {} }) {
  let failure = previousError ? new Error(previousError) : null;
  const attemptCount = Math.min(2, Math.max(1, maxAttempts));
  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    const remaining = deadlineAt - Date.now();
    if (remaining < minBudgetMs) throw failure || new Error("GENERATION_BUDGET_EXCEEDED");
    const minChars = Number(chapter?.minChars) || 2400;
    const [targetLo, targetHi] = chapter?.targetChars ? codexBodyTarget(chapter) : [minChars + 300, minChars + 900];
    const instruction = !failure ? ""
      : failure.message === "LLM_SOFT_ISSUES"
        ? `\n[재작성] ${repairHint || "이전 응답의 말투·질문 인용을 고쳐라."} 근거·분량(body ${targetLo}~${targetHi}자)·나머지 필드와 JSON 형식은 그대로 지켜라.`
      : failure.message === "LLM_OUTPUT_TOO_SHORT"
        // A length repair must name the target; a generic rewrite returned the same ~75% length.
        ? `\n[재작성] 이전 응답은 LLM_OUTPUT_TOO_SHORT: body가 최소 ${minChars}자에 못 미쳤다. 앞의 근거와 같은 문장을 반복하지 말고 생활 장면·대화 예시·대응 기준을 새로 더해 body를 ${targetLo}~${targetHi}자로 완성하라. 나머지 필드와 JSON 형식은 그대로 지켜라.`
        : `\n[재작성] 이전 응답은 ${failure.message} 기준을 통과하지 못했다. JSON 문자열을 올바르게 닫고, body의 최소 분량·계산 근거·필수 필드를 지켜 완성된 새 응답을 작성하라.`;
    // V2 plans for 1.2× the upper target so the wider range is not cut off; V1 keeps min+900.
    const planned = Math.max(8000, tokensRequiredForChars((chapter.targetChars ? Math.ceil(chapter.targetChars[1] * 1.2) : (chapter.minChars || 2400) + 900) + (evidenceContract?.consultation ? (evidenceContract.consultation.forecast ? 5000 : evidenceContract.consultation.questions.length * 1600) : 0)));
    // A cut-off draft is never salvaged mid-sentence, so its retry gets twice the room (paid delivery beats the length target).
    const tokens = failure?.message === "LLM_OUTPUT_TRUNCATED" ? Math.max(planned, Math.min(32768, planned * 2)) : planned;
    const ai = await call(prompt + instruction, {
      ...options, attempts: 1, maxProviderAttempts: 1, baseTokens: tokens, capTokens: Math.max(tokens, evidenceContract?.consultation ? 24000 : 14000), thinkingBudget: 0,
      timeoutMs: Math.min(Number(options.timeoutMs) || remaining, remaining),
    });
    if (ai?.ok === false) {
      throw Object.assign(new Error(ai.message || ai.error || "LLM provider unavailable"), {
        code: "LLM_PROVIDER_UNAVAILABLE", status: ai.status, retryable: true,
      });
    }
    let parsed = null;
    try {
      if (ai?.truncated) throw new Error("LLM_OUTPUT_TRUNCATED");
      if (!ai?.text) throw new Error("LLM_OUTPUT_EMPTY");
      parsed = parseChapterJson(ai.text);
      assertCodexChapterQuality(parsed, chapter, metricDefs, evidenceContract, { allowShort });
      return { ai, parsed };
    } catch (error) {
      failure = error;
      // 마지막 유료 시도는 던지지 않는다: 본문이 있으면 정리·보충해 배달한다(2026-11-08 사용자 규칙).
      if (finalAttempt && attempt === attemptCount - 1) {
        let salvaged = null;
        try { salvaged = salvageCodexChapter({ text: ai?.text, parsed, chapter, metricDefs, evidenceContract }); } catch { salvaged = null; }
        if (salvaged) {
          try {
            assertCodexChapterQuality(salvaged, chapter, metricDefs, evidenceContract, { allowShort: true });
            return { ai, parsed: salvaged, salvaged: error.message };
          } catch { /* nothing deliverable; the original failure stands */ }
        }
      }
    }
  }
  throw failure;
}

const SENTENCE = /[^.!?。！？\n]+[.!?。！？]+["'”’)\]」』]*/gu;
function proseSentences(body) {
  return String(body || "").split("\n").filter(line => line.trim() && !/^\s*(?:#{1,6}\s|●|[-*]\s)/u.test(line))
    .flatMap(line => line.match(SENTENCE) || []).map(sentence => sentence.trim()).filter(sentence => sentence.length >= 8);
}

/** Pulls the body string out of a cut-off or malformed JSON reply, ending on a whole sentence. */
export function recoverCodexBodyText(text) {
  const raw = String(text ?? "");
  const marker = raw.match(/"body"\s*:\s*"/u);
  let body = "";
  if (marker) {
    const rest = raw.slice(marker.index + marker[0].length);
    for (let i = 0; i < rest.length; i += 1) {
      const ch = rest[i];
      if (ch === "\\") {
        const next = rest[i + 1];
        if (next === undefined) break;
        if (next === "u") { const code = parseInt(rest.slice(i + 2, i + 6), 16); if (Number.isFinite(code)) body += String.fromCharCode(code); i += 5; continue; }
        body += next === "n" ? "\n" : next === "t" ? "\t" : next === "r" ? "" : next;
        i += 1; continue;
      }
      if (ch === '"') break;
      body += ch;
    }
  } else if (!/^\s*[{[`]/u.test(raw)) body = raw;
  const ends = [...body.matchAll(/[.!?。！？]["'”’)\]」』]*(?=\s|$)/gu)];
  return ends.length ? body.slice(0, ends.at(-1).index + ends.at(-1)[0].length).trim() : "";
}

/**
 * Last-attempt salvage: keeps the model's prose and fills only what a validator would reject,
 * from the chapter's own sentences and the calculation records. Returns null when no body exists.
 */
export function salvageCodexChapter({ text = "", parsed = null, chapter, metricDefs = [], evidenceContract = null }) {
  const source = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? structuredClone(parsed) : {};
  if (typeof source.body !== "string" || !countPaidReportBodyChars(source.body)) source.body = recoverCodexBodyText(text);
  source.body = dropRepeatedReportSentences(String(source.body || "").trim(), "");
  if (!countPaidReportBodyChars(source.body)) return null;
  const sentences = proseSentences(source.body);
  const has = value => typeof value === "string" && value.trim().length > 0;
  const pick = (index, fallback) => sentences[Math.min(Math.max(0, index), sentences.length - 1)] || fallback;
  if (!has(source.narration)) source.narration = sentences.slice(0, 2).join(" ") || chapter.title;
  if (!has(source.keySentence)) source.keySentence = pick(0, chapter.title);
  if (!has(source.insight)) source.insight = sentences.slice(1, 4).join(" ").slice(0, 360) || source.keySentence;
  if (!has(source.caution)) source.caution = sentences.find(line => /주의|조심|멈추|커지|서두르/u.test(line)) || pick(sentences.length - 2, source.keySentence);
  if (!has(source.bridge)) source.bridge = pick(sentences.length - 1, source.keySentence);
  const actions = (Array.isArray(source.actions) ? source.actions : []).filter(has);
  for (const line of [...sentences.filter(line => /보세요|해 보|정해 두|적어 두|말해 보/u.test(line)),
    "이번 주에 이 장에서 짚은 장면이 실제로 오면, 그때의 내 반응을 한 줄로 적어 두세요.",
    "다음 대화 전에 이 장의 대응 기준 하나를 미리 정해 두고, 대화가 끝난 뒤 지켰는지 확인해 보세요."]) {
    if (actions.length >= 2) break;
    if (!actions.includes(line)) actions.push(line);
  }
  source.actions = actions.slice(0, 3);
  if (evidenceContract) {
    normalizeCodexEvidence(source, evidenceContract);
    const cited = new Set(source.evidence.map(item => item.evidenceId));
    const addRecord = record => {
      if (!record || cited.has(record.id)) return;
      cited.add(record.id);
      source.evidence.push({ label: codexRecordLabel(record), evidenceId: record.id, subject: record.subject, system: record.system,
        period: record.period, certainty: record.certainty, explanation: `${codexRecordLabel(record)} 기록을 이 장의 해석 근거로 함께 봅니다.` });
    };
    for (const system of ["saju", "ziwei"]) if (!evidenceContract.records.some(record => record.system === system && cited.has(record.id)))
      addRecord(evidenceContract.records.find(record => record.system === system && record.subject !== "partner") || evidenceContract.records.find(record => record.system === system));
    if (evidenceContract.records.some(record => record.subject === "partner") && !evidenceContract.records.some(record => record.subject === "partner" && cited.has(record.id)))
      addRecord(evidenceContract.records.find(record => record.subject === "partner"));
    salvageCodexConsultation(source, evidenceContract, sentences);
  } else if (!Array.isArray(source.evidence) || !source.evidence.some(item => has(item?.label) && has(item?.system) && has(item?.explanation))) {
    source.evidence = [{ label: "계산 근거", system: "사주", explanation: "이 장은 명식과 명반의 계산 기록을 함께 읽었습니다." }];
  }
  if (chapter.jsonMode) {
    if (!has(source.typeName)) source.typeName = "관계를 살피는 유형";
    if (!has(source.typeSummary)) source.typeSummary = source.keySentence;
    const metrics = Array.isArray(source.metrics) ? source.metrics : [];
    source.metrics = metricDefs.map(({ key, label }) => {
      const found = metrics.filter(item => item?.key === key);
      const row = found.length === 1 ? found[0] : null;
      return row && Number.isInteger(row.score) && row.score >= 0 && row.score <= 100 && has(row.basis) ? row
        : { key, label, score: Number.isFinite(Number(row?.score)) ? Math.min(100, Math.max(0, Math.round(Number(row.score)))) : 50,
          basis: has(row?.basis) ? row.basis : "명식과 명반을 함께 본 중간 해석값입니다." };
    });
  }
  return source;
}

function salvageCodexConsultation(source, contract, sentences) {
  const c = contract?.consultation;
  if (!c) return;
  const records = new Map(contract.records.map(record => [record.id, record]));
  const text = value => typeof value === "string" && value.trim().length >= 8;
  const line = (value, fallback) => text(value) ? value : fallback;
  const base = ["saju", "ziwei"].map(system => contract.records.find(record => record.system === system)?.id).filter(Boolean);
  const answers = Array.isArray(source.questionAnswers) ? source.questionAnswers : [];
  const lead = sentences[0] || "이 질문은 이 장에서 짚은 흐름 안에서 함께 읽어야 정확합니다.";
  source.questionAnswers = c.questions.map(question => {
    const row = answers.find(answer => answer?.questionId === question.id) || {};
    const ids = (Array.isArray(row.evidenceIds) ? row.evidenceIds : []).filter(id => records.has(id));
    for (const id of base) if (!ids.some(key => records.get(key).system === records.get(id).system)) ids.push(id);
    const actions = (Array.isArray(row.actions) ? row.actions : []).filter(text);
    while (actions.length < 2) actions.push(actions.length ? "결정 전에 하루를 두고, 내가 바라는 관계의 모습을 한 문장으로 적어 보세요." : "지금 상대에게 보낼 말이 있다면 짧고 부담 없는 한 문장으로 정리해 두세요.");
    return { questionId: question.id, answer: line(row.answer, lead), reasoning: line(row.reasoning, sentences.slice(1, 3).join(" ") || lead),
      outlook: line(row.outlook, "흐름은 서두르기보다 상대의 반응을 확인하며 한 걸음씩 넓힐 때 안정됩니다."), actions,
      reassess: line(row.reassess, "다음 달 흐름이 바뀌는 시점에 상대의 반응을 다시 보고 판단을 고쳐 보세요."), evidenceIds: ids };
  });
  if (!c.forecast) { source.periodReadings = []; return; }
  const readings = Array.isArray(source.periodReadings) ? source.periodReadings : [];
  const valueLine = record => {
    const value = record?.value || {};
    const pillar = typeof value.pillar === "string" ? value.pillar : "";
    return pillar ? `${pillar} 기운이 들어오는 시기입니다` : record ? `${codexRecordLabel(record)} 흐름을 보는 시기입니다` : "흐름을 확인하는 시기입니다";
  };
  const make = (periodId, ids) => {
    const row = readings.find(reading => reading?.periodId === periodId) || {};
    const lead = valueLine(records.get(ids[0]));
    return { periodId, interpretation: line(row.interpretation, `${lead}. 관계에서는 속도를 맞추며 흐름을 확인하는 때로 읽습니다.`),
      action: line(row.action, "이 시기에는 중요한 결정을 한 번에 내리기보다 작은 약속 하나를 지켜 보세요."),
      reassess: line(row.reassess, "시기가 끝날 때 관계의 온도가 어떻게 달라졌는지 다시 살펴보세요."), evidenceIds: ids };
  };
  source.periodReadings = [
    ...c.periods.map(period => make(period.id, [
      contract.records.find(record => record.path.startsWith("monthlyLuck.") && Date.parse(record.value.from) < Date.parse(period.until + "T00:00:00+09:00") && Date.parse(record.value.until) > Date.parse(period.from + "T00:00:00+09:00"))?.id,
      contract.records.find(record => record.system === "ziwei" && record.period === period.from.slice(0, 4))?.id
        || contract.records.find(record => record.system === "ziwei" && record.period === "natal")?.id,
    ].filter(Boolean))),
    ...c.years.map(year => make(`year-${year}`, ["saju", "ziwei"].map(system => contract.records.find(record => record.system === system && record.period === String(year))?.id).filter(Boolean))),
  ];
}

const POLITE_DA = /(?:니다|니까)$/u;
const POLITE_YO = /요$/u;
/** Ending forms of reader prose (headings and bullets excluded). */
function sentenceEnding(sentence) { return sentence.replace(/[.!?。！？"'”’)\]」』\s]+$/u, ""); }
const grams = text => { const flat = String(text || "").replace(/[\s.,!?。！？"'“”‘’·…~]/gu, ""); const out = new Set(); for (let i = 0; i + 6 <= flat.length; i += 1) out.add(flat.slice(i, i + 6)); return out; };
const consultationSources = consultation => [consultation?.situation, ...(consultation?.questions || []).map(question => question.text)]
  .filter(value => String(value || "").trim().length >= 6);

/** Chapter orders that answer the reader's questions (and the forecast chapter). */
export function codexQuestionOwnerOrders(consultation) {
  return new Set([...(consultation?.questions || []).map(question => Number(question.chapterOrder)), 19]);
}

export function codexRequotedSentences(body, sources) {
  const sourceGrams = sources.map(grams);
  return proseSentences(body).filter(sentence => {
    const own = grams(sentence);
    return sourceGrams.some(set => { let shared = 0; for (const gram of own) if (set.has(gram) && ++shared >= 3) return true; return false; });
  });
}

/**
 * V2 soft issues: never fatal, they earn one hinted repair and a bounded scrub at assembly.
 * REGISTER_DRIFT — one chapter mixes 해요 and 합니다 (both over 30% of ≥6 endings).
 * QUESTION_REQUOTED — a chapter without an assigned question re-quotes the situation/questions (>2 sentences).
 */
export function detectCodexSoftIssues(body, chapter, consultation = null) {
  if (!chapter?.perspective) return [];
  const issues = [];
  const endings = proseSentences(body).map(sentenceEnding);
  const yo = endings.filter(line => POLITE_YO.test(line)).length;
  const da = endings.filter(line => POLITE_DA.test(line)).length;
  if (yo + da >= 6 && yo / (yo + da) > 0.3 && da / (yo + da) > 0.3) issues.push({ code: "REGISTER_DRIFT", minority: yo < da ? "해요체" : "합니다체" });
  const sources = consultationSources(consultation);
  if (sources.length && !codexQuestionOwnerOrders(consultation).has(Number(chapter.order))) {
    const quoted = codexRequotedSentences(body, sources);
    if (quoted.length > 2) issues.push({ code: "QUESTION_REQUOTED", sentences: quoted.slice(0, 6) });
  }
  return issues;
}

export function codexSoftIssueHint(issues = []) {
  return issues.map(issue => issue.code === "REGISTER_DRIFT"
    ? `이전 응답은 한 장 안에서 해요체와 합니다체를 섞었다(${issue.minority}가 섞임). 처음부터 끝까지 한 가지 종결어미로 통일하라.`
    : `이전 응답은 이 장에 배정되지 않은 상담자의 질문·상황 문장을 다시 옮겨 적었다(예: "${String(issue.sentences?.[0] || "").slice(0, 60)}"). 질문 원문을 다시 쓰지 말고 이미 들은 배경으로만 삼아라.`).join(" ");
}

/** Assembly scrub: drops re-quoted sentences only while ≥85% of the body survives. */
export function scrubCodexSoftIssues(body, chapter, consultation = null) {
  const issues = detectCodexSoftIssues(body, chapter, consultation);
  if (!issues.some(issue => issue.code === "QUESTION_REQUOTED")) return body;
  let next = String(body);
  for (const sentence of new Set(codexRequotedSentences(body, consultationSources(consultation)))) next = next.replace(sentence, "");
  next = next.replace(/[ \t]{2,}/gu, " ").replace(/\n{3,}/gu, "\n\n").trim();
  return countPaidReportBodyChars(next) >= countPaidReportBodyChars(body) * 0.85 ? next : body;
}

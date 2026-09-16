import assert from "node:assert/strict";
import { calculateLifeBookAiSaju } from "../worker/lib/life-book-ai-saju.js";
import { calculateZiweiAiChart } from "../worker/lib/ziwei-ai-chart.js";
import { buildMasterLoveCodexCompatibility } from "../worker/lib/master-love-codex-compat.js";
import { MASTER_LOVE_CODEX_CHAPTERS, LOVE_DNA_METRICS, buildMasterLoveCodexChapterPrompt } from "../worker/lib/master-love-codex-prompt.mjs";
import { MASTER_LOVE_CODEX_COMPAT_CHAPTERS, LOVE_DNA_COMPAT_METRICS, buildMasterLoveCodexCompatChapterPrompt } from "../worker/lib/master-love-codex-compat-prompt.mjs";
import { buildCodexEvidence, formatCodexEvidence } from "../worker/lib/master-love-codex-evidence.js";
import { generateCodexChapterResponse, buildCodexStagingChapter, buildCodexChapterMemory } from "../worker/lib/master-love-codex-quality.js";

// Calculation + provider-boundary mocks only. Token estimates are not billed token measurements.
const birthInfo = { name: "검증 입력", birthDate: "1990-05-12", birthTime: "09:30", gender: "female", calendarType: "solar", birthTimeUnknown: true };
const partnerInfo = { ...birthInfo, birthDate: "1991-11-03", gender: "male" };
const saju = calculateLifeBookAiSaju(birthInfo, { year: 2026 }), partnerSaju = calculateLifeBookAiSaju(partnerInfo, { year: 2026 });
const ziweiChart = calculateZiweiAiChart({ birthInfo }, { year: 2026 }), partnerZiweiChart = calculateZiweiAiChart({ birthInfo: partnerInfo }, { year: 2026 });
const compatibility = buildMasterLoveCodexCompatibility({ selfSaju: saju, selfZiwei: ziweiChart, partnerSaju, partnerZiwei: partnerZiweiChart });
for (const mode of ["solo", "compat"]) {
  const chapters = mode === "solo" ? MASTER_LOVE_CODEX_CHAPTERS : MASTER_LOVE_CODEX_COMPAT_CHAPTERS;
  const metricDefs = mode === "solo" ? LOVE_DNA_METRICS : LOVE_DNA_COMPAT_METRICS;
  const book = [], cache = new Map(); let calls = 0, beforeChars = 0, afterChars = 0, outputChars = 0;
  for (const chapter of chapters) {
    const evidenceContract = buildCodexEvidence({ chapter, saju, ziweiChart, ...(mode === "compat" ? { partnerSaju, partnerZiweiChart, compatibility } : {}) });
    const params = { chapter, saju, ziweiChart, selfSaju: saju, selfZiwei: ziweiChart, partnerSaju, partnerZiwei: partnerZiweiChart,
      compatibility, birthInfo, partnerInfo, memory: buildCodexChapterMemory(book) };
    const build = mode === "solo" ? buildMasterLoveCodexChapterPrompt : buildMasterLoveCodexCompatChapterPrompt;
    const before = build(params) + "\n" + formatCodexEvidence(evidenceContract), after = build({ ...params, evidenceProvided: true }) + "\n" + formatCodexEvidence(evidenceContract);
    assert.ok(after.includes(JSON.stringify(evidenceContract)), "Every calculation record and cross-check is retained");
    assert.ok(after.includes("미상"), "Birth-time uncertainty remains visible");
    beforeChars += before.length; afterChars += after.length;
    const parsed = buildCodexStagingChapter(chapter, metricDefs);
    parsed.evidence = evidenceContract.records.map(record => ({ evidenceId: record.id, subject: record.subject, system: record.system,
      period: record.period, certainty: record.certainty, label: record.path, explanation: "계산 근거를 확인하는 모의 검증입니다." }));
    parsed.crossChecks = evidenceContract.crossChecks.map(record => ({ id: record.id, status: record.status, explanation: "계산된 방향과 생시 미상 한계를 유지합니다." }));
    const call = async (_prompt, options) => {
      calls++; assert.equal(options.maxProviderAttempts, 1); assert.equal(options.baseTokens, 8000);
      return { ok: true, text: JSON.stringify(parsed) };
    };
    const generated = await generateCodexChapterResponse(call, after, { chapter, metricDefs, evidenceContract, maxAttempts: 1 });
    outputChars += generated.parsed.body.length;
    const row = { id: chapter.id, title: chapter.title, body: generated.parsed.body, content: generated.parsed };
    book.push(row); cache.set(chapter.id, row);
  }
  assert.equal(calls, 20); assert.equal(new Set(book.map(row => row.id)).size, 20);
  const reopened = chapters.map(chapter => cache.get(chapter.id));
  assert.deepEqual(reopened, book); assert.equal(calls, 20);
  assert.ok(afterChars < beforeChars);
  console.log(JSON.stringify({ mode, requiredChapters: 20, mockProviderCalls: calls, reopenAdditionalCalls: 0, beforeInputChars: beforeChars,
    afterInputChars: afterChars, inputReductionPercent: Math.round((1 - afterChars / beforeChars) * 1000) / 10,
    beforeEstimatedInputTokens: Math.ceil(beforeChars / 4), afterEstimatedInputTokens: Math.ceil(afterChars / 4),
    mockOutputChars: outputChars, billedTokensMeasured: false }));
}

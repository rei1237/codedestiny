/**
 * 초융합 운세 그룹 계획 2판 (2026-11-08, 6단계).
 * 새 결제 세션의 컨텍스트에만 `groupPlanVersion: 2` 가 박힌다. 진행 중인 세션·v1·expert·옛 premium-v2는
 * 이 파일의 어느 것도 타지 않는다(이 판의 행동은 모두 isFusionGroupPlanV2 뒤에 있다).
 *
 * - 마지막 시도는 반려 대신 위험 문장만 덜어 내고 살린다(finalAttempt salvage).
 * - 소장은 1~6개를 받는다(스키마와 같은 범위).
 * - 분량 미달·소프트 이슈(질문 재인용·말투 이탈)는 책당 최대 2그룹만, 모든 초안이 나온 뒤 수리한다.
 * - 조립할 때 그룹 사이 반복과 질문 재인용을 85% 이상 남는 동안만 덜어 낸다.
 */
import { isDomainFusion } from "../../lib/fusion-premium-report.js";
import { codexCrossRepeatSentences, codexRequotedSentences } from "./master-love-codex-quality.js";

export const FUSION_GROUP_PLAN_VERSION = 2;
export const FUSION_PLAN2_REPAIR_LIMIT = 2;
export const FUSION_PLAN2_SCRUB_KEEP_RATIO = 0.85;
export const FUSION_PLAN2_REQUOTE_LIMIT = 2;

export const isFusionGroupPlanV2 = (context) => isDomainFusion(context) && Number(context?.groupPlanVersion) === FUSION_GROUP_PLAN_VERSION;

/** 새 세션에만 판을 박는다. env 스위치를 "false" 로 두면 새 세션도 옛 판으로 간다(롤백). */
export function shouldPinFusionGroupPlanV2(input, env = {}) {
  return isDomainFusion(input) && String(env.FUSION_GROUP_PLAN_V2_ENABLED || "").toLowerCase() !== "false";
}

const SENTENCE_PIECES = /[^.!?。！？\n]+(?:[.!?。！？]+["'”’)\]」』]*)?\s*/gu;
const paragraphsOf = (content) => String(content || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** 문장 단위로 isBad 인 문장을 뺀다. 줄 구조(제목 줄 등)는 그대로 둔다. */
export function scrubFusionText(value, isBad) {
  if (typeof value !== "string" || !value) return value;
  return value.split("\n").map((line) => {
    const pieces = line.match(SENTENCE_PIECES) || [];
    if (!pieces.length) return line;
    return pieces.filter((piece) => !piece.trim() || !isBad(piece.trim())).join("").trimEnd();
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * 장 하나(content + subchapters 문단 범위)에서 문장을 뺀다. 비게 된 문단은 지우고 소장 범위를 다시 맞춘다 —
 * 범위가 틀어지면 화면이 소장을 통째로 버린다. 소장이 빈 범위가 되면 그 소장만 빠진다(장은 남는다).
 */
export function scrubFusionSection(section, isBad) {
  if (typeof section === "string") return scrubFusionText(section, isBad);
  if (!section || typeof section !== "object" || typeof section.content !== "string") return section;
  const paragraphs = paragraphsOf(section.content);
  const kept = [];
  const position = [];
  for (const paragraph of paragraphs) {
    position.push(kept.length);
    const next = scrubFusionText(paragraph, isBad);
    if (next) kept.push(next);
  }
  position.push(kept.length);
  const shift = (index) => position[Math.max(0, Math.min(paragraphs.length, Number(index) || 0))];
  const next = { ...section, content: kept.join("\n\n") };
  if (Array.isArray(section.subchapters)) {
    next.subchapters = section.subchapters.map((chapter) => Number.isInteger(chapter?.start) && Number.isInteger(chapter?.end)
      ? { ...chapter, start: shift(chapter.start), end: shift(chapter.end) } : chapter)
      .filter((chapter) => !Number.isInteger(chapter?.start) || chapter.end > chapter.start);
  }
  if (Array.isArray(section.keyPoints)) next.keyPoints = section.keyPoints.filter((point) => typeof point !== "string" || !isBad(point));
  if (typeof section.title === "string" && isBad(section.title)) next.title = scrubFusionText(section.title, isBad) || section.title;
  return next;
}

const STRUCTURE_KEYS = new Set(["consultationPlan", "signals", "subchapters", "evidenceKeys", "questionIds", "visualization", "systemVerdicts"]);

/** 그룹 값 전체를 훑어 문장을 뺀다. 구조 메타데이터(상담 계획·신호·근거 경로)는 건드리지 않는다. */
export function scrubFusionGroupValue(value, isBad) {
  const walk = (node, key) => {
    if (STRUCTURE_KEYS.has(key)) return node;
    if (typeof node === "string") return scrubFusionText(node, isBad);
    if (Array.isArray(node)) return node.map((item) => walk(item)).filter((item) => typeof item !== "string" || item.trim());
    if (node && typeof node === "object") {
      if (typeof node.content === "string") {
        const section = scrubFusionSection(node, isBad);
        return Object.fromEntries(Object.entries(section).map(([k, v]) => [k, k === "content" || STRUCTURE_KEYS.has(k) ? v : walk(v, k)]));
      }
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v, k)]));
    }
    return node;
  };
  return Object.fromEntries(Object.entries(value || {}).map(([key, node]) => [key, walk(node, key)]));
}

const sentenceKey = (sentence) => String(sentence || "").replace(/\s+/g, " ").trim();

/** 한 필드 안에서 60자 이상 같은 문장이 다시 나오면 두 번째부터 뺀다(필드 안 반복 반려의 구제). */
export function dedupeFusionFieldSentences(value, minChars = 60) {
  const out = {};
  for (const [key, node] of Object.entries(value || {})) {
    const seen = new Set();
    const isBad = (sentence) => {
      const k = sentenceKey(sentence);
      if (k.length < minChars) return false;
      if (seen.has(k)) return true;
      seen.add(k);
      return false;
    };
    out[key] = node && typeof node === "object" && typeof node.content === "string" ? scrubFusionSection(node, isBad)
      : typeof node === "string" && !["title", "shareText"].includes(key) ? scrubFusionText(node, isBad) : node;
  }
  return out;
}

/**
 * 소장 근거 경로를 허용 참조(체계.expertEvidence.키 · tarot.cards.n.필드) 하나로 맞춘다.
 * 깊은 경로(`saju.expertEvidence.yearlyLuck.0.pillar`)·접두사 없는 경로(`yearlyLuck[0].pillar`)도 그 키의 참조가 된다.
 */
export function resolveFusionEvidenceReference(key, references = []) {
  const path = String(key || "").trim().replace(/^\$?\.?systems\./, "").replace(/\[(\d+)\]/g, ".$1").replace(/^\.+/, "");
  if (!path) return "";
  const covers = (ref, candidate) => candidate === ref || candidate.startsWith(`${ref}.`);
  const direct = references.find((ref) => covers(ref, path));
  if (direct) return direct;
  return references.find((ref) => {
    const [, ...rest] = ref.split(".");
    const tail = rest.join(".");
    const bare = ref.includes(".expertEvidence.") ? ref.split(".expertEvidence.")[1] : "";
    return covers(tail, path) || (bare && covers(bare, path));
  }) || "";
}

/** 소장 범위를 1~6개 모두 문단 수에 맞춰 고르게 다시 나눈다(옛 normalizeFusionSubchapters 는 4~6개만 맞춘다). */
export function normalizeFusionPlan2Subchapters(section, { references = [], questionIds = [] } = {}) {
  if (!section || typeof section.content !== "string") return section;
  const total = paragraphsOf(section.content).length;
  if (!total) return section;
  const ids = new Set(questionIds);
  let chapters = Array.isArray(section.subchapters) ? section.subchapters.filter((chapter) => chapter && typeof chapter === "object").slice(0, 6) : [];
  if (!chapters.length) chapters = [{ title: String(section.title || "").trim() || "이 장의 판단" }];
  chapters = chapters.slice(0, total);
  const contiguous = chapters.every((chapter, index) => Number.isInteger(chapter.start) && Number.isInteger(chapter.end)
    && chapter.start === (index ? chapters[index - 1].end : 0) && chapter.end > chapter.start) && chapters[chapters.length - 1].end === total;
  return { ...section, subchapters: chapters.map((chapter, index) => {
    const evidenceKeys = [...new Set((Array.isArray(chapter.evidenceKeys) ? chapter.evidenceKeys : []).map((key) => resolveFusionEvidenceReference(key, references)).filter(Boolean))];
    const linked = (Array.isArray(chapter.questionIds) ? chapter.questionIds : []).filter((id) => ids.has(id));
    return { ...chapter,
      title: String(chapter.title || "").trim() || String(section.title || "").trim() || `판단 ${index + 1}`,
      start: contiguous ? chapter.start : Math.floor(index * total / chapters.length),
      end: contiguous ? chapter.end : Math.floor((index + 1) * total / chapters.length),
      evidenceKeys: evidenceKeys.length ? evidenceKeys : references.slice(0, 1),
      questionIds: linked.length ? linked : questionIds.slice(0, 1) };
  }) };
}

/** 사주 그룹이 마지막 시도에서도 상담 계획을 못 냈을 때 쓰는 최소 계획. 질문 원문은 옮기지 않는다. */
export function fallbackFusionConsultationPlan(version) {
  return { version, question: "지금의 선택을 어떤 기준으로 정할까요?", questions: [
    { id: "q1", title: "타고난 기질이 지금의 고민에 어떻게 작용하나요?" },
    { id: "q2", title: "앞으로의 흐름에서 언제 무엇을 조심해야 하나요?" },
    { id: "q3", title: "지금 바로 해볼 수 있는 선택과 확인 기준은 무엇인가요?" },
  ] };
}

/** 질문 원문을 받은 그룹(첫 장)만 질문을 다시 옮겨 적을 수 있다. */
export const fusionPlan2QuestionOwner = (group) => group?.id === "saju";

export function fusionRequotedSentences(prose, question) {
  const source = String(question || "").trim();
  if (source.length < 6) return [];
  return codexRequotedSentences(prose, [source]);
}

/** 반복은 앞 장(읽는 순서)과 비교한다. 장이 비게 되면 원본을 둔다. */
export function fusionCrossRepeatSentences(prose, priorProses = []) {
  return priorProses.length ? codexCrossRepeatSentences(prose, priorProses) : [];
}

/** 덜어 낸 본문이 원본의 85% 이상 남을 때만 덜어 낸다. 하나도 남지 않으면 원본. */
export function boundedFusionScrub(section, sentences, proseOf) {
  if (!sentences.length) return section;
  const drop = new Set(sentences.map(sentenceKey));
  const next = scrubFusionSection(section, (sentence) => drop.has(sentenceKey(sentence)));
  const before = proseOf(section).length;
  const after = proseOf(next).length;
  return after > 0 && after >= before * FUSION_PLAN2_SCRUB_KEEP_RATIO ? next : section;
}

export function fusionSoftIssueHint(issues = []) {
  return issues.map((issue) => issue.code === "QUESTION_REQUOTED"
    ? `직전 응답은 고객의 질문 원문을 다시 옮겨 적었습니다(예: "${String(issue.sentences?.[0] || "").slice(0, 60)}"). 질문은 첫 장에서 이미 다뤘으니 원문을 다시 쓰지 말고, 상담 계획의 세부 질문에 이 장의 근거로 답하세요.`
    : issue.code === "REGISTER_DRIFT"
    ? `직전 응답은 이 장 화자의 말투에서 벗어났습니다(${(issue.drift || []).join(", ")}). 처음부터 끝까지 화자의 말투 하나로 통일하세요.`
    : "").filter(Boolean).join("\n");
}

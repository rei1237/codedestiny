// 결정론 카피 조립기. ChemiResult → ChemiCopy. LLM 없음, 시계 없음.
// 선택은 pickDeterministic(pool, result.copySeed, slot) — 같은 결과·같은 COPY_VERSION 이면 같은 문장.
import { pickDeterministic } from "../engine/hash.js";
import { TYPE_COPY } from "./types.js";
import { CAUTIONS, NEUTRAL_CAUTIONS } from "./cautions.js";
import {
  LABELS,
  ENTERTAINMENT_NOTICE,
  MINOR_NOTICE,
  PRESET_NOTICE,
  SIGNAL_POINTS,
  TEN_GOD_POINTS,
  GENERIC_POINTS,
  GENERIC_EVIDENCE,
  DATA_GAP_NOTES,
} from "./shared.js";

export const COPY_VERSION = "chemi-copy-1.0.0";
export const PARTNER_TOKEN = "[최애]";

export { TYPE_COPY, CAUTIONS, NEUTRAL_CAUTIONS, LABELS, ENTERTAINMENT_NOTICE, MINOR_NOTICE, SIGNAL_POINTS, TEN_GOD_POINTS, GENERIC_POINTS };

const JOSA_PAIRS = { "가": ["이", "가"], "는": ["은", "는"], "를": ["을", "를"], "와": ["과", "와"], "랑": ["이랑", "랑"] };
const JOSA_PATTERN = /\[최애\](가|는|를|와|랑)?/g;

/** 이름 마지막 글자의 받침 유무. 한글이 아니면 null(조사를 원문대로 둔다). */
export function hasFinalConsonant(name) {
  const ch = String(name || "").trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28 !== 0;
}

/** [최애] 치환 + 바로 뒤 조사(이/가·은/는·을/를·과/와·이랑/랑) 교정. */
export function fill(text, name) {
  const final = hasFinalConsonant(name);
  return String(text).replace(JOSA_PATTERN, (_, josa) => {
    if (!josa || final === null) return name + (josa || "");
    return name + JOSA_PAIRS[josa][final ? 0 : 1];
  });
}

function modeOf(result) {
  return result.minorMode ? "minor" : "adult";
}

function findSignal(signals, predicate) {
  for (const s of signals) if (predicate(s)) return s;
  return null;
}

/** 포인트 3개: 유형 핵심 → 판정 외 보조 신호 → 오행·십신 참고. 빈 슬롯 없음 보장. */
function buildPoints(result, bundle, mode, name) {
  const seed = result.copySeed;
  const signals = result.signals;
  const matched = new Set(result.matchedSignalKeys);
  const used = new Set();
  const points = [];

  // 1) 유형 핵심 포인트 — 근거는 유형 규칙 + 판정 신호 증거
  const matchedEvidence = signals.filter((s) => matched.has(s.key)).map((s) => s.evidenceKo);
  points.push({
    label: LABELS.points[0],
    text: fill(pickDeterministic(bundle.corePoints[mode], seed, "point.core"), name),
    evidenceKo: matchedEvidence.length ? matchedEvidence.join(" · ") : "유형 규칙: " + result.chemiTypeRuleKo,
  });
  for (const k of matched) used.add(k);

  // 2) 판정에 쓰이지 않은 가중 신호(일주 → 연·월지 순, 중립 포함)
  const ordered = [...signals].sort((a, b) => b.weight - a.weight);
  const second = findSignal(ordered, (s) => !used.has(s.key) && s.weight > 0 && SIGNAL_POINTS[s.key]);
  if (second) {
    used.add(second.key);
    points.push({
      label: LABELS.points[1],
      text: fill(pickDeterministic(SIGNAL_POINTS[second.key], seed, "point.signal"), name),
      evidenceKo: second.evidenceKo,
    });
  }

  // 3) 오행·십신 참고
  const third =
    findSignal(ordered, (s) => !used.has(s.key) && s.key.startsWith("element.") && SIGNAL_POINTS[s.key]) ||
    findSignal(ordered, (s) => !used.has(s.key) && s.key.startsWith("tenGod.")) ||
    findSignal(ordered, (s) => !used.has(s.key) && s.weight > 0 && SIGNAL_POINTS[s.key]);
  if (third) {
    used.add(third.key);
    const tenGod = third.key.startsWith("tenGod.") ? third.key.slice("tenGod.".length) : null;
    const text = tenGod ? TEN_GOD_POINTS[tenGod] : pickDeterministic(SIGNAL_POINTS[third.key], seed, "point.third");
    if (text) points.push({ label: LABELS.points[points.length], text: fill(text, name), evidenceKo: third.evidenceKo });
  }

  // 폴백: 일반 풀로 3개까지 채운다(서로 다른 슬롯이라 중복 최소화)
  let slot = 0;
  while (points.length < 3) {
    const pool = GENERIC_POINTS.filter((t) => !points.some((p) => p.text === t));
    points.push({
      label: LABELS.points[points.length],
      text: fill(pickDeterministic(pool, seed, "point.generic." + slot), name),
      evidenceKo: GENERIC_EVIDENCE,
    });
    slot += 1;
  }
  return points.slice(0, 3);
}

function buildCaution(result) {
  const seed = result.copySeed;
  const signals = result.signals;
  const friction = [...signals].filter((s) => s.tone === "friction").sort((a, b) => b.weight - a.weight);
  for (const s of friction) {
    const key = s.key.startsWith("tenGod.") ? "tenGod.friction" : s.key;
    const pool = CAUTIONS[key];
    if (pool) return { label: LABELS.caution, text: pickDeterministic(pool, seed, "caution"), evidenceKo: s.evidenceKo };
  }
  return { label: LABELS.caution, text: pickDeterministic(NEUTRAL_CAUTIONS, seed, "caution"), evidenceKo: "마찰 신호 없음" };
}

/**
 * @param {import("../types").ChemiResult} result computeChemi 결과
 * @returns {import("../types").ChemiCopy}
 */
export function assembleChemiCopy(result) {
  if (!result || typeof result !== "object" || !result.chemiTypeId) throw new Error("IDOL_CHEMI_COPY_RESULT_REQUIRED");
  const bundle = TYPE_COPY[result.chemiTypeId];
  if (!bundle) throw new Error("IDOL_CHEMI_COPY_TYPE_UNKNOWN");
  const mode = modeOf(result);
  const name = (result.partner && result.partner.displayName) || "최애";
  const seed = result.copySeed;

  const scenario = pickDeterministic(bundle.scenarios[mode], seed, "scenario");
  const notices = [ENTERTAINMENT_NOTICE];
  for (const gap of result.dataGaps || []) notices.push(DATA_GAP_NOTES[gap] || gap);
  if (result.minorMode) notices.push(MINOR_NOTICE);
  if (result.partner && result.partner.kind === "preset") notices.push(PRESET_NOTICE);

  return {
    copyVersion: COPY_VERSION,
    title: result.chemiTypeNameKo,
    shortTitle: result.chemiTypeShortKo,
    oneLiner: fill(pickDeterministic(bundle.oneLiners[mode], seed, "oneLiner"), name),
    points: buildPoints(result, bundle, mode, name),
    scenario: { label: LABELS.scenario, setting: scenario.setting, text: fill(scenario.text, name) },
    caution: buildCaution(result),
    finish: { label: LABELS.finish, text: fill(pickDeterministic(bundle.finish[mode], seed, "finish"), name) },
    notices,
  };
}

/**
 * Layer 2 오케스트레이터 — 가용 엔진 어댑터 기여를 가중 blend해 결정론적 DirectionField를 만든다.
 * 결정론: Math.random/Date 미사용. 시간 의존은 input.dateSeed(명시 주입)만.
 * 근거: docs/destiny-compass/step3-architecture.md §3.
 */
import type {
  CompassInput,
  DirectionField,
  DirectionKey,
  DirectionScore,
  EngineContribution,
  LuckyGuide,
  ScoreBand,
  Severity,
  SystemKey,
  TimelineKey,
  TimelinePhase,
  Weather,
} from "./types";
import { BAND_THRESHOLD, DIRECTION_KEYS, WEATHER_THRESHOLD } from "./constants";
import { availableAdapters, normalizedWeights } from "./adapters/registry";

const TIMELINE_KEYS: readonly TimelineKey[] = ["d30", "d90", "y1", "y3"];
// 항로 곡선: 근래는 현재 기운을 반영, 멀수록 완만히 회복(희망 리프레이밍 — 흐린 구간도 지나간다).
const PERIOD_LIFT: Record<TimelineKey, number> = { d30: -4, d90: 6, y1: 16, y3: 24 };

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
function clamp0100(n: number): number {
  return n < 0 ? 0 : n > 100 ? 100 : n;
}
// 상단 톤다운: 90 초과 구간을 90~97로 눌러 '100' 극단을 지운다(운세는 단정 지양).
// 밴드 경계(strong 70 / steady 45)엔 영향이 없도록 90 이하는 그대로 둔다.
function softenScore(n: number): number {
  return n <= 90 ? n : Math.round(90 + (n - 90) * 0.7);
}
function bandOf(score: number): ScoreBand {
  if (score >= BAND_THRESHOLD.strong) return "strong";
  if (score >= BAND_THRESHOLD.steady) return "steady";
  return "caution";
}
function weatherOf(momentum: number): Weather {
  for (const [threshold, w] of WEATHER_THRESHOLD) if (momentum >= threshold) return w;
  return "storm";
}

// 결정론 시드: 동일 입력 → 동일 문자열
function buildSeed(input: CompassInput): string {
  const b = input.birth;
  return [
    b.birthDate,
    b.birthTime || "",
    b.gender,
    b.calendarType || "solar",
    b.lunarLeap ? 1 : 0,
    input.emotion,
    input.answers.map((a) => `${a.qid}:${a.choice}`).join("|"),
    input.dateSeed,
  ].join("~");
}
function hashInt(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

// 감정 렌즈(Layer 2.5): raw 기여는 불변, 최종 표시 스코어의 주목도만 결정론 조정.
const EMOTION_NUDGE: Partial<Record<CompassInput["emotion"], Partial<Record<DirectionKey, number>>>> = {
  tired: { rest: 8, health: 4 },
  numb: { rest: 6, study: 3 },
  anxious: { rest: 5 },
  hopeful: { venture: 5 },
  excited: { venture: 6, career: 3 },
};
function applyEmotionLens(dirs: DirectionScore[], input: CompassInput): DirectionScore[] {
  const nudge = EMOTION_NUDGE[input.emotion] || {};
  return dirs.map((d) => {
    const next = clamp0100(d.score + (nudge[d.key] || 0));
    return { ...d, score: next, band: bandOf(next) };
  });
}

// Lucky 가이드(결정론 템플릿) — 표시 문구는 copy.ts 의 로케일 테이블에서 이 키로 조회한다.
const LUCKY = {
  avoid: ["overwork", "impulsive_decision", "dwelling_on_feelings", "staying_up_late"],
  recommend: ["short_walk", "overdue_contact", "declutter", "new_learning"],
  person: ["initial_person", "old_friend", "first_reacher", "calm_helper"],
  place: ["near_water", "north_direction", "quiet_cafe", "high_place"],
  color: ["rose", "lavender", "champagne_gold", "deep_plum", "cream"],
  food: ["fish_seaweed", "nuts", "warm_soup", "seasonal_fruit"],
  time: ["morning", "dusk", "noon", "late_afternoon"],
} as const;
function buildLuckyGuide(seed: string): LuckyGuide {
  const h = hashInt(seed);
  const pick = (arr: readonly string[], salt: number) => arr[(h + salt) % arr.length];
  return {
    avoidKeys: [pick(LUCKY.avoid, 1)],
    recommendKeys: [pick(LUCKY.recommend, 2)],
    luckyPersonKey: pick(LUCKY.person, 3),
    luckyPlaceKey: pick(LUCKY.place, 4),
    luckyColorKey: pick(LUCKY.color, 5),
    luckyFoodKey: pick(LUCKY.food, 6),
    luckyTimeKey: pick(LUCKY.time, 7),
  };
}

interface Contribution {
  system: SystemKey;
  weight: number;
  c: EngineContribution;
}

function buildTimeline(contributions: Contribution[], seed: string): Record<TimelineKey, TimelinePhase> {
  const timeline = {} as Record<TimelineKey, TimelinePhase>;
  for (const tk of TIMELINE_KEYS) {
    let sum = 0;
    let w = 0;
    for (const { weight, c } of contributions) {
      const h = c.timelineHint?.[tk];
      if (typeof h === "number") {
        sum += h * weight;
        w += weight;
      }
    }
    const base = w > 0 ? (sum / w) * 100 : 55;
    // 현재 기운(base) + 기간별 회복 곡선 + 결정론 변주(±7). 4구간이 동일 날씨로 뭉치지 않게.
    const jitter = (hashInt(`${seed}|tl|${tk}`) % 15) - 7;
    const momentum = clamp0100(Math.round(base + PERIOD_LIFT[tk] + jitter));
    const weather = weatherOf(momentum);
    timeline[tk] = { weather, momentum, headlineKey: `compass.timeline.${tk}.${weather}` };
  }
  return timeline;
}

export async function computeDirectionField(input: CompassInput): Promise<DirectionField> {
  const adapters = availableAdapters(input);
  const weights = normalizedWeights(adapters);

  const raw: Partial<Record<SystemKey, EngineContribution | null>> = {};
  const contributions: Contribution[] = [];
  for (const a of adapters) {
    let c: EngineContribution | null = null;
    try {
      c = await a.contribute(input);
    } catch {
      c = null; // 한 엔진 실패해도 나머지로 진행(결과 왜곡 없음)
    }
    raw[a.system] = c;
    if (c) contributions.push({ system: a.system, weight: weights.get(a.system) || 0, c });
  }

  // 방향별 가중 blend(0..1) + 기여 시스템 추적 + 품질 집계
  const acc = {} as Record<DirectionKey, { sum: number; systems: SystemKey[] }>;
  for (const key of DIRECTION_KEYS) acc[key] = { sum: 0, systems: [] };
  let qualitySum = 0;
  for (const { system, weight, c } of contributions) {
    qualitySum += (typeof c.dataQuality === "number" ? c.dataQuality : 1) * weight;
    for (const key of DIRECTION_KEYS) {
      const v = c.directions[key] || 0;
      if (v > 0) {
        acc[key].sum += v * weight;
        if (!acc[key].systems.includes(system)) acc[key].systems.push(system);
      }
    }
  }

  let directions: DirectionScore[] = DIRECTION_KEYS.map((key) => {
    const score = clamp0100(Math.round(acc[key].sum * 100));
    return { key, labelKey: key, score, band: bandOf(score), contributingSystems: acc[key].systems };
  });

  directions = applyEmotionLens(directions, input);
  // 상단 톤다운(100 극단 완화) — 감정 렌즈 이후 1회 적용, 밴드 재산정
  directions = directions.map((d) => {
    const s = softenScore(d.score);
    return { ...d, score: s, band: bandOf(s) };
  });
  // 안정 정렬: 점수 내림차순, 동점은 key 사전순(결정론)
  directions.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const primary = directions[0];
  const strong = directions[0];
  const blocked = directions[directions.length - 1];
  const severity: Severity = blocked.band === "caution" ? "high" : blocked.band === "steady" ? "mid" : "low";

  const seed = buildSeed(input);

  // 신뢰도 = 데이터 품질 + 대표 방향의 선명도(평균 대비 두드러짐).
  // 운세는 단정을 지양 → 최대 0.95로 상한(신뢰도 100% 미표시).
  const quality = clamp01(qualitySum);
  const meanScore = directions.reduce((s, d) => s + d.score, 0) / directions.length;
  const decisiveness = clamp01((primary.score - meanScore) / 40);
  const confidence = clamp01(0.5 + quality * 0.25 + decisiveness * 0.2);

  return {
    directions,
    primary,
    strongArea: { key: strong.key, labelKey: strong.key },
    blockedArea: { key: blocked.key, labelKey: blocked.key, severity },
    timeline: buildTimeline(contributions, seed),
    lucky: buildLuckyGuide(seed),
    confidence,
    sources: contributions.map((c) => c.system),
    seed,
    raw,
  };
}

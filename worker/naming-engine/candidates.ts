// 인덱스 탐색 + 하드 필터(설계서 §8). 점수 식은 score.ts 와 같은 함수·같은 순서로 계산한다 —
// 여기서 빠르게 고른 상위 K 는 engine.ts 가 scoreCandidate 로 처음부터 다시 계산하고, 두 값이 같은지는 테스트가 본다.
//
// 2자 이름: 성 획수가 정해지면 이름 획수 쌍마다 4격 등급(정격 흉 차단)을 한 번만 보고,
// 통과한 쌍에서 (획수, 소리오행) 칸마다 상위 SEARCH.perStrokeSound 글자끼리만 조합한다.
// 동음 블랙리스트는 상위 K 에 들 만한 조합에만 늦게 확인한다(block 은 버리고 warn 은 감점).

import { CONFIDENCE, DIST_BONUS, PRACTICAL, SEARCH, WEIGHTS } from "./config/weights";
import { awkwardForName, DISEASE_RADICAL, feminineCharForMale, hasNegativeMeaning, mismatchesGender } from "./config/negative-meaning";
import type { SchoolPreset } from "./config/school-presets";
import type { BlacklistEntry, HanjaEntry, HanjaReading, NamingData } from "./data";
import type { SajuNeeds } from "./saju-input";
import { blacklistHit, strokeBase, syllablePenalties, unitPenalty, unitSaju, type StrokeBase } from "./score";
import { hasBatchim, initialOf, soundElement, soundFlowOfElements } from "./sound";
import { charStrokes, type ResolvedSurname } from "./strokes";
import type { GridName } from "./suri";
import { ELEMENTS, fnv1a, type Grade } from "./types";

export type Tier = "free" | "paid";

/** 글자 한 음(같은 한자도 음이 둘이면 단위가 둘). 요청마다 한 번 만든다. */
export interface Unit {
  entry: HanjaEntry;
  reading: HanjaReading;
  strokes: number;
  /** 소리오행 ELEMENTS 색인 */
  sound: number;
  saju: number;
  penalty: number;
  /** 음절이 그 자리에서 드문 만큼의 감점 [첫째 자리, 둘째 자리, 외자] — 조합 단계에서 더한다 */
  position: [number, number, number];
  /** 원국에 없던 오행(기피 제외)을 채우면 그 ELEMENTS 색인, 아니면 −1 */
  fills: number;
  batchim: boolean;
  /** 음이 ㄹ 로 시작 — 이름 첫 자리에서만 감점 */
  rieul: boolean;
  /** 이 글자가 허용되는 최소 완화 단계(고정 글자는 0) */
  stage: number;
  seed: number;
  /** 칸 안 정렬 키: 35·saju − 15·penalty */
  rank: number;
}

export interface SearchContext {
  surname: ResolvedSurname;
  needs: SajuNeeds;
  preset: SchoolPreset;
  data: NamingData;
  nameLength: 1 | 2;
  gender: "M" | "F" | "N";
  fixed: { position: number; entry: HanjaEntry; hangul: string | null } | null;
  avoid: ReadonlySet<string>;
  tier: Tier;
  inputHash: string;
  /**
   * 주면 이 한글 이름(성 제외, nameLength 음절)만 탐색한다 — 추천 모드의 성별 자연 이름, 선택 모드의 부모가 고른 이름.
   * perSyllable = 음절마다 남기는 글자 수(순위 높은 순). minNameUse = 그 음으로 이름에 쓰인 횟수 하한(고정 글자 제외). 없으면 풀 전체 탐색.
   */
  names?: { allowed: readonly string[]; perSyllable: number; minNameUse: number } | null;
}

export interface SearchHit {
  picks: Unit[];
  /** 빠른 경로 총점(scoreCandidate 의 total 과 같아야 한다) */
  total: number;
  tie: number;
  /** 이 조합이 허용되는 최소 완화 단계 */
  stage: number;
}

/**
 * 글자(음 단위)가 허용되는 최소 완화 단계. null 은 어떤 단계에서도 추천하지 않는다(첫째 훈이 부정 뜻·반대 성별 호칭, 이름에 어색한 글자, 疒부, 남자 이름의 女부 글자).
 * 훈 없음·자원오행 신뢰도 하한 미만·무료의 분쟁 글자는 3단계에서만 허용한다.
 */
export function unitStage(entry: HanjaEntry, reading: HanjaReading, tier: Tier, gender: "M" | "F" | "N"): number | null {
  if (hasNegativeMeaning(reading.hun) || mismatchesGender(reading.hun, gender)) return null;
  if (entry.radical === DISEASE_RADICAL || awkwardForName(entry.ch) || feminineCharForMale(entry.ch, entry.radical, gender)) return null;
  const lowConfidence = !entry.jawon || (entry.confidence ?? 0) < CONFIDENCE.floor;
  const freeDisputed = tier === "free" && entry.disputes.length > 0;
  return !reading.hun || lowConfidence || freeDisputed ? 3 : 0;
}

/** 4격 등급이 허용되는 최소 완화 단계. 정격 흉은 null — 끝까지 막는다. */
export function gridStage(grades: Record<GridName, Grade>): number | null {
  if (grades.jeong === "bad") return null;
  if (grades.jeong === "half") return 2;
  if (grades.won === "bad" || grades.hyeong === "bad") return 1;
  return 0;
}

// prefixSeed = fnv1a(`${inputHash}|`). FNV 는 상태를 이어 받으므로 fnv1a(글자, prefixSeed) === fnv1a(`${inputHash}|${글자}`).
function makeUnit(entry: HanjaEntry, reading: HanjaReading, ctx: SearchContext, stage: number, prefixSeed: number): Unit | null {
  const element = soundElement(reading.hangul, ctx.preset.soundMapping);
  if (!element) return null;
  const { needs } = ctx;
  const jawon = entry.jawon;
  const saju = unitSaju(entry, needs);
  const penalty = unitPenalty(entry, reading);
  return {
    entry,
    reading,
    strokes: charStrokes(entry, ctx.preset.strokeMethod),
    sound: ELEMENTS.indexOf(element),
    saju,
    penalty,
    position: syllablePenalties(reading.hangul, ctx.data.syllableUse),
    fills: jawon && needs.natalCounts[jawon] === 0 && !needs.caution.includes(jawon) ? ELEMENTS.indexOf(jawon) : -1,
    batchim: hasBatchim(reading.hangul),
    rieul: initialOf(reading.hangul) === "ㄹ",
    stage,
    seed: fnv1a(entry.ch + reading.hangul, prefixSeed),
    rank: WEIGHTS.saju * saju - WEIGHTS.practical * penalty,
  };
}

export interface UnitSet {
  /** 고정 글자가 아닌 자리의 후보(뜻 거르기·기피 글자 제외, 단계 표시 포함) */
  open: Unit[];
  /** 고정 글자의 음들(필터 면제) */
  fixed: Unit[];
}

export function buildUnits(ctx: SearchContext): UnitSet {
  const prefixSeed = fnv1a(`${ctx.inputHash}|`);
  const open: Unit[] = [];
  for (const entry of ctx.data.pool) {
    if (ctx.avoid.has(entry.ch)) continue;
    if (ctx.fixed && ctx.fixed.entry === entry) continue;
    for (const reading of entry.readings) {
      const stage = unitStage(entry, reading, ctx.tier, ctx.gender);
      if (stage === null) continue;
      const unit = makeUnit(entry, reading, ctx, stage, prefixSeed);
      if (unit) open.push(unit);
    }
  }
  const fixed: Unit[] = [];
  if (ctx.fixed) {
    for (const reading of ctx.fixed.entry.readings) {
      if (ctx.fixed.hangul && reading.hangul !== ctx.fixed.hangul) continue;
      const unit = makeUnit(ctx.fixed.entry, reading, ctx, 0, prefixSeed);
      if (unit) fixed.push(unit);
    }
  }
  return { open, fixed };
}

const byRank = (a: Unit, b: Unit) => b.rank - a.rank || b.seed - a.seed;

interface Bucket { units: Unit[]; maxSaju: number; minPenalty: number }
/** 획수 → 소리오행 5칸. */
type Buckets = Map<number, (Bucket | null)[]>;

function bucketize(units: Unit[], cap: number): Buckets {
  const grouped = new Map<number, Unit[][]>();
  for (const unit of units) {
    let row = grouped.get(unit.strokes);
    if (!row) grouped.set(unit.strokes, (row = ELEMENTS.map(() => [])));
    row[unit.sound].push(unit);
  }
  const buckets: Buckets = new Map();
  for (const [strokes, row] of [...grouped].sort((a, b) => a[0] - b[0])) {
    buckets.set(strokes, row.map((list) => {
      if (!list.length) return null;
      const kept = list.sort(byRank).slice(0, cap);
      return {
        units: kept,
        maxSaju: Math.max(...kept.map((u) => u.saju)),
        minPenalty: Math.min(...kept.map((u) => u.penalty)),
      };
    }));
  }
  return buckets;
}

/** 작은 쪽이 앞: 총점이 낮거나, 같으면 tie 가 낮은 것. */
const below = (a: { total: number; tie: number }, b: { total: number; tie: number }) =>
  a.total < b.total || (a.total === b.total && a.tie < b.tie);

class TopK {
  readonly items: SearchHit[] = [];
  constructor(private readonly k: number) {}

  admits(total: number, tie: number): boolean {
    if (this.items.length < this.k) return true;
    return below(this.items[0], { total, tie });
  }

  push(hit: SearchHit): void {
    const items = this.items;
    if (items.length < this.k) {
      items.push(hit);
      let i = items.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (!below(items[i], items[parent])) break;
        [items[i], items[parent]] = [items[parent], items[i]];
        i = parent;
      }
      return;
    }
    if (!below(items[0], hit)) return;
    items[0] = hit;
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < items.length && below(items[left], items[smallest])) smallest = left;
      if (right < items.length && below(items[right], items[smallest])) smallest = right;
      if (smallest === i) break;
      [items[i], items[smallest]] = [items[smallest], items[i]];
      i = smallest;
    }
  }

  /** 높은 순. */
  sorted(): SearchHit[] {
    return [...this.items].sort((a, b) => b.total - a.total || b.tie - a.tie);
  }

  /** 상위 K 를 넘어설 수 없는 상한이면 true. */
  hopeless(bound: number): boolean {
    return this.items.length >= this.k && bound < this.items[0].total;
  }
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** 같은 완화 단계 안에서 상위 K 조합을 찾는다(높은 순). */
export function searchStage(ctx: SearchContext, units: UnitSet, stage: number, k: number = SEARCH.topK): SearchHit[] {
  const { surname, data, preset } = ctx;
  const surnameSyllables = Array.from(surname.hangul);
  const surnameSound = surnameSyllables.map((s) => soundElement(s, preset.soundMapping) as (typeof ELEMENTS)[number]);
  const surnameLast = surnameSyllables[surnameSyllables.length - 1];
  const surnameRepeat = surnameSyllables.some((s, i) => i > 0 && s === surnameSyllables[i - 1]);
  const surnameAllBatchim = surnameSyllables.every(hasBatchim);

  const open = units.open.filter((u) => u.stage <= stage);
  const positionUnits = (position: number) => (ctx.fixed && ctx.fixed.position === position ? units.fixed : open);

  const baseCache = new Map<string, StrokeBase>();
  const baseFor = (strokes: number[]) => {
    const key = strokes.join(",");
    let base = baseCache.get(key);
    if (!base) baseCache.set(key, (base = strokeBase(surname.strokes, strokes, data)));
    return base;
  };

  const blacklistMemo = new Map<string, BlacklistEntry | null>();
  const blacklistFor = (full: string) => {
    let hit = blacklistMemo.get(full);
    if (hit === undefined) blacklistMemo.set(full, (hit = blacklistHit(full, data.blacklist)));
    return hit;
  };

  const heap = new TopK(k);
  const dist = (a: number, b: number) => {
    const filled = (a >= 0 ? 1 : 0) + (b >= 0 && b !== a ? 1 : 0);
    return Math.min(DIST_BONUS.max, filled * DIST_BONUS.perElement);
  };

  // 한 조합을 점수화해 힙에 넣는다. picks 는 이름 글자 순서.
  const consider = (picks: Unit[], base: StrokeBase, sound: number, gridMin: number) => {
    const meanSaju = picks.length === 1 ? picks[0].saju : (picks[0].saju + picks[1].saju) / 2;
    const saju = clamp01(meanSaju + dist(picks[0].fills, picks.length === 2 ? picks[1].fills : -1));
    let repeated = surnameRepeat || picks[0].reading.hangul === surnameLast;
    if (picks.length === 2 && picks[1].reading.hangul === picks[0].reading.hangul) repeated = true;
    const pair = (picks[0].rieul ? PRACTICAL.initialRieul : 0)
      + (repeated ? PRACTICAL.repeatedSyllable : 0)
      + (surnameAllBatchim && picks.every((p) => p.batchim) ? PRACTICAL.allBatchim : 0);
    const position = picks.length === 1 ? picks[0].position[2] : picks[0].position[0] + picks[1].position[1];
    const practicalRaw = 1 - picks.reduce((acc, p) => acc + p.penalty, 0) - pair - position;
    const fixedPart = base.weighted + WEIGHTS.saju * saju + WEIGHTS.sound * sound;
    let total = fixedPart + WEIGHTS.practical * clamp01(practicalRaw);
    const tie = picks.length === 1
      ? picks[0].seed
      : (Math.imul(picks[0].seed ^ 0x9e3779b9, 0x01000193) ^ picks[1].seed) >>> 0;
    if (!heap.admits(total, tie)) return;
    const hit = blacklistFor(surname.hangul + picks.map((p) => p.reading.hangul).join(""));
    if (hit && hit.grade === "block") return;
    if (hit) {
      total = fixedPart + WEIGHTS.practical * clamp01(practicalRaw - PRACTICAL.blacklistWarn);
      if (!heap.admits(total, tie)) return;
    }
    const stageNeeded = Math.max(gridMin, ...picks.map((p) => p.stage));
    heap.push({ picks, total, tie, stage: stageNeeded });
  };

  if (ctx.names) {
    // 이름 목록 탐색: 음절마다 순위 높은 글자 perSyllable 개끼리만 조합한다(고정 글자 자리는 전부).
    const bySyllable = (list: Unit[], cap: number) => {
      const grouped = new Map<string, Unit[]>();
      for (const unit of list) {
        const row = grouped.get(unit.reading.hangul);
        if (row) row.push(unit);
        else grouped.set(unit.reading.hangul, [unit]);
      }
      for (const [syllable, row] of grouped) grouped.set(syllable, row.sort(byRank).slice(0, cap));
      return grouped;
    };
    const { perSyllable: cap, minNameUse } = ctx.names;
    const used = open.filter((u) => u.reading.nameUse >= minNameUse);
    const listFor = (position: number) => (ctx.fixed && ctx.fixed.position === position ? units.fixed : used);
    const first = bySyllable(listFor(0), ctx.fixed?.position === 0 ? Infinity : cap);
    const second = ctx.nameLength === 2 && ctx.fixed ? bySyllable(listFor(1), ctx.fixed.position === 1 ? Infinity : cap) : first;
    const soundTable = ELEMENTS.flatMap((e) => ELEMENTS.map((f) => soundFlowOfElements(
      ctx.nameLength === 1 ? [...surnameSound, e] : [...surnameSound, e, f]).score));
    for (const name of ctx.names.allowed) {
      const syllables = Array.from(name);
      if (syllables.length !== ctx.nameLength) continue;
      const rowA = first.get(syllables[0]);
      if (!rowA) continue;
      if (ctx.nameLength === 1) {
        for (const x of rowA) {
          const base = baseFor([x.strokes]);
          const gs = gridStage(base.grades);
          if (gs === null || gs > stage) continue;
          consider([x], base, soundTable[x.sound * ELEMENTS.length], gs);
        }
        continue;
      }
      const rowB = second.get(syllables[1]);
      if (!rowB) continue;
      for (const x of rowA) {
        for (const y of rowB) {
          if (x.entry === y.entry) continue;
          const base = baseFor([x.strokes, y.strokes]);
          const gs = gridStage(base.grades);
          if (gs === null || gs > stage) continue;
          consider([x, y], base, soundTable[x.sound * ELEMENTS.length + y.sound], gs);
        }
      }
    }
    return heap.sorted();
  }

  if (ctx.nameLength === 1) {
    const soundTable = ELEMENTS.map((e) => soundFlowOfElements([...surnameSound, e]).score);
    for (const unit of [...positionUnits(0)].sort(byRank)) {
      const base = baseFor([unit.strokes]);
      const gs = gridStage(base.grades);
      if (gs === null || gs > stage) continue;
      consider([unit], base, soundTable[unit.sound], gs);
    }
    return heap.sorted();
  }

  const soundTable = ELEMENTS.flatMap((e) => ELEMENTS.map((f) => soundFlowOfElements([...surnameSound, e, f]).score));
  const first = bucketize(positionUnits(0), ctx.fixed?.position === 0 ? Infinity : SEARCH.perStrokeSound);
  const second = ctx.fixed ? bucketize(positionUnits(1), ctx.fixed.position === 1 ? Infinity : SEARCH.perStrokeSound) : first;

  // 4격을 통과한 획수 쌍을 고정 몫이 큰 순으로 — 힙이 빨리 차야 상한 가지치기가 듣는다.
  const pairs: { a: number; b: number; base: StrokeBase; gs: number }[] = [];
  for (const a of first.keys()) {
    for (const b of second.keys()) {
      const base = baseFor([a, b]);
      const gs = gridStage(base.grades);
      if (gs === null || gs > stage) continue;
      pairs.push({ a, b, base, gs });
    }
  }
  pairs.sort((x, y) => y.base.weighted - x.base.weighted || x.a - y.a || x.b - y.b);

  for (const { a, b, base, gs } of pairs) {
    const rowA = first.get(a) as (Bucket | null)[];
    const rowB = second.get(b) as (Bucket | null)[];
    for (let e = 0; e < ELEMENTS.length; e++) {
      const bucketA = rowA[e];
      if (!bucketA) continue;
      for (let f = 0; f < ELEMENTS.length; f++) {
        const bucketB = rowB[f];
        if (!bucketB) continue;
        const sound = soundTable[e * ELEMENTS.length + f];
        const bound = base.weighted + WEIGHTS.sound * sound
          + WEIGHTS.saju * clamp01((bucketA.maxSaju + bucketB.maxSaju) / 2 + DIST_BONUS.max)
          + WEIGHTS.practical * clamp01(1 - bucketA.minPenalty - bucketB.minPenalty);
        if (heap.hopeless(bound)) continue;
        for (const x of bucketA.units) {
          for (const y of bucketB.units) {
            if (x.entry === y.entry) continue; // 같은 한자 두 번 금지
            consider([x, y], base, sound, gs);
          }
        }
      }
    }
  }
  return heap.sorted();
}

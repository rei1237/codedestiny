// 작명 엔진 v2 진입점(설계서 §3·§7·§8). 계산만 한다 — 라우트·결제·LLM·저장은 Phase 4 에서 이 함수를 부른다.
// 같은 입력·프리셋·티어·데이터 버전이면 같은 출력(Date·Math.random 없음).

import { MAX_DESIRED_NAMES, MAX_RELAXATION_STAGE, NATURAL_NAMES, NATURALNESS, SEARCH } from "./config/weights";
import { DEFAULT_SCHOOL_PRESET, SCHOOL_PRESETS, type SchoolPreset } from "./config/school-presets";
import { buildUnits, searchStage, type SearchContext, type SearchHit, type Tier, type UnitSet } from "./candidates";
import { loadNamingData, type NamingData } from "./data";
import { selectDiverse } from "./diversify";
import { sajuNeedsFromBirth, type NamingBirth, type SajuNeeds } from "./saju-input";
import { scoreCandidate, type NamedCandidate } from "./score";
import { resolveSurname, type ResolvedSurname } from "./strokes";
import { NamingEngineError, fnv1a, type Element } from "./types";

export const ENGINE_VERSION = "naming-engine-v2-20261003";
export const MAX_AVOID_CHARS = 20;

export interface NamingInput {
  /** 성 한자 선택 필수(복성은 2자) */
  surname: { hangul: string; hanja: string[] };
  gender: "M" | "F" | "N";
  /** options.saju 를 주면 생략할 수 있다(테스트·재계산 없는 재사용) */
  birth?: NamingBirth;
  nameLength: 1 | 2;
  /** 돌림자. hangul 을 주면 그 음만 쓴다(林 → 림/임 중 하나) */
  fixedChar?: { position: 0 | 1; ch: string; hangul?: string } | null;
  avoidChars?: string[];
  /** "hangul"(순한글 이름)은 Phase 3 범위 밖 — mode-unsupported */
  mode?: "hanja" | "hangul";
  schoolPreset?: string;
  /** "recommend"(기본) = 성별 자연 이름에서 추천 / "choose" = 부모가 고른 한글 이름(desiredNames)마다 한자 조합을 찾는다 */
  strategy?: "recommend" | "choose";
  /** choose 일 때 1~MAX_DESIRED_NAMES 개, 한글 1~2음절. 이름마다 음절 수가 그 이름의 길이다(nameLength 무시) */
  desiredNames?: string[];
}

export interface NamingEngineOptions {
  tier: Tier;
  /** 주면 생년월일로 사주를 다시 계산하지 않는다(birth 도 있으면 해시는 birth 로 — 무료·유료가 같은 순서) */
  saju?: SajuNeeds;
  /** 테스트용 데이터 주입. 기본은 번들 데이터 */
  data?: NamingData;
}

export interface NamingResultV2 {
  engineVersion: string;
  dataVersion: string;
  schoolPreset: string;
  /** 정규화 입력 해시(티어·로케일 제외). 동점 정렬의 씨앗 */
  inputHash: string;
  tier: Tier;
  /** 목표 개수를 채운 완화 단계(0 엄격 ~ 3). 끝까지 못 채우면 3 */
  relaxationStage: number;
  surname: ResolvedSurname;
  saju: { useful: Element[]; caution: Element[]; derivedSupport: Element[]; timeUnknown: boolean; jongConditional: boolean; basis: string };
  strategy: "recommend" | "choose";
  /** choose 일 때 입력 순서(중복 제거). recommend 는 빈 배열 */
  desiredNames: string[];
  /** 결과 전체에 붙는 고지 키 */
  notices: string[];
  /** choose 는 고른 이름 순서로 묶이고(묶음 안은 단계·총점 순), 모자라면 추천 이름이 뒤에 붙는다 */
  candidates: NamedCandidate[];
}

const single = (text: unknown) => typeof text === "string" && Array.from(text.trim()).length === 1;

interface NormalizedInput {
  preset: SchoolPreset;
  surname: ResolvedSurname;
  gender: "M" | "F" | "N";
  nameLength: 1 | 2;
  fixedChar: { position: 0 | 1; ch: string; hangul: string | null } | null;
  avoid: string[];
  strategy: "recommend" | "choose";
  desiredNames: string[];
}

function normalizeInput(input: NamingInput, data: NamingData): NormalizedInput {
  if (!input || typeof input !== "object") throw new NamingEngineError("input-invalid", "입력 없음");
  const mode = input.mode ?? "hanja";
  if (mode === "hangul") throw new NamingEngineError("mode-unsupported", "순한글 이름 모드는 아직 지원하지 않는다");
  if (mode !== "hanja") throw new NamingEngineError("input-invalid", `mode ${String(mode)}`);

  const presetId = input.schoolPreset || DEFAULT_SCHOOL_PRESET;
  const preset = SCHOOL_PRESETS[presetId];
  if (!preset) throw new NamingEngineError("preset-unknown", presetId);

  if (!["M", "F", "N"].includes(input.gender)) throw new NamingEngineError("input-invalid", "gender");
  if (input.nameLength !== 1 && input.nameLength !== 2) throw new NamingEngineError("input-invalid", "nameLength 는 1 또는 2");

  const rawAvoid = input.avoidChars ?? [];
  if (!Array.isArray(rawAvoid) || rawAvoid.some((ch) => !single(ch))) throw new NamingEngineError("input-invalid", "avoidChars 는 한 글자씩");
  // 한자 입력은 NFC 로 맞춘다(호환 한자 → 통합 한자, strokes.ts resolveSurname 과 같은 이유).
  const avoid = [...new Set(rawAvoid.map((ch) => ch.trim().normalize("NFC")))].sort();
  if (avoid.length > MAX_AVOID_CHARS) throw new NamingEngineError("avoid-too-many", String(avoid.length));

  let fixedChar: NormalizedInput["fixedChar"] = null;
  if (input.fixedChar) {
    const { position, ch, hangul } = input.fixedChar;
    if ((position !== 0 && position !== 1) || position >= input.nameLength || !single(ch)) {
      throw new NamingEngineError("input-invalid", "fixedChar");
    }
    const entry = data.poolByChar.get(ch.trim().normalize("NFC"));
    if (!entry) throw new NamingEngineError("fixed-char-unknown", ch);
    if (avoid.includes(entry.ch)) throw new NamingEngineError("fixed-char-avoided", ch);
    const reading = hangul ? String(hangul).trim() : null;
    if (reading && !entry.readings.some((r) => r.hangul === reading)) throw new NamingEngineError("fixed-char-reading", `${ch} ${reading}`);
    fixedChar = { position, ch: entry.ch, hangul: reading };
  }

  const strategy = input.strategy ?? "recommend";
  if (strategy !== "recommend" && strategy !== "choose") throw new NamingEngineError("input-invalid", "strategy");
  let desiredNames: string[] = [];
  if (strategy === "choose") {
    const raw = input.desiredNames;
    if (!Array.isArray(raw) || raw.some((name) => typeof name !== "string")) throw new NamingEngineError("input-invalid", "desiredNames");
    desiredNames = [...new Set(raw.map((name) => name.trim().normalize("NFC")))];
    if (!desiredNames.length || desiredNames.length > MAX_DESIRED_NAMES || desiredNames.some((name) => !/^[가-힣]{1,2}$/.test(name))) {
      throw new NamingEngineError("input-invalid", "desiredNames 는 한글 1~2음절 1~5개");
    }
  }

  return {
    preset,
    surname: resolveSurname(input.surname, preset.strokeMethod, data),
    gender: input.gender,
    nameLength: input.nameLength,
    fixedChar,
    avoid,
    strategy,
    desiredNames,
  };
}

/** 정규화 입력 → 16자리 hex. 티어·로케일은 넣지 않는다(무료 → 유료 전환에도 같은 해시). */
export function namingInputHash(normalized: NormalizedInput, birth: NamingBirth | undefined, needs: SajuNeeds): string {
  const canonical = JSON.stringify({
    s: [normalized.surname.hangul, normalized.surname.hanja.join("")],
    g: normalized.gender,
    b: birth ? [birth.date, birth.time ?? null, birth.calendarType] : ["saju", needs.useful.join(), needs.caution.join()],
    n: normalized.nameLength,
    f: normalized.fixedChar ? [normalized.fixedChar.position, normalized.fixedChar.ch, normalized.fixedChar.hangul] : null,
    a: normalized.avoid,
    p: normalized.preset.id,
    // 추천 모드는 키를 넣지 않는다 — Phase 6.5 이전 레코드와 같은 해시를 유지한다.
    ...(normalized.strategy === "choose" ? { m: normalized.desiredNames } : {}),
  });
  return fnv1a(canonical).toString(16).padStart(8, "0") + fnv1a(canonical, 0x9747b28c).toString(16).padStart(8, "0");
}

const candidateKey = (hit: SearchHit) => hit.picks.map((p) => p.entry.ch + p.reading.hangul).join("|");

const naturalMemo = new WeakMap<NamingData, Map<string, string[]>>();

/** 그 성별·길이에서 실제로 쓰이는 이름(NATURAL_NAMES). 코드포인트 순 — 결정론. */
export function naturalNames(data: NamingData, gender: "M" | "F" | "N", nameLength: 1 | 2): string[] {
  let memo = naturalMemo.get(data);
  if (!memo) naturalMemo.set(data, (memo = new Map()));
  const key = `${gender}${nameLength}`;
  let names = memo.get(key);
  if (names) return names;
  const n = NATURAL_NAMES;
  names = [];
  for (const [name, [male, female, maleRecent, femaleRecent]] of data.givenUse || []) {
    if (Array.from(name).length !== nameLength) continue;
    const total = male + female;
    const [own, recent] = gender === "M" ? [male, maleRecent] : [female, femaleRecent];
    const ok = gender === "N"
      ? total >= n.neutralMinTotal && Math.min(male, female) / total >= n.neutralMinShare && maleRecent + femaleRecent >= n.minRecent
      : own >= n.minUse && own / total >= n.minShare && recent >= n.minRecent;
    if (ok) names.push(name);
  }
  names.sort();
  memo.set(key, names);
  return names;
}

interface Picked { candidate: NamedCandidate; stage: number; key: string }

/**
 * 완화 단계 0 → 3 으로 count 개까지 고른다. 엄격 단계에서 고른 후보를 먼저 두고, 모자라면 다음 단계에서 부족분만 채운다(정격 흉은 끝까지 막힌다).
 * already = 앞에서 이미 고른 후보(다양화 비교용). byHanja = 같은 한글 이름 안에서 한자끼리 다양화(선택 모드 — 한글이 같으면 유사도가 늘 1이다).
 */
function collect(
  ctx: SearchContext, units: UnitSet, count: number, already: NamedCandidate[], seen: Set<string>,
  mask: number | null, reasonKey: string | null, byHanja = false,
): Picked[] {
  const keyed = <T extends { hangul: string; hanja: string[] }>(item: T): T => (byHanja ? { ...item, hangul: item.hanja.join("") } : item);
  const picked: Picked[] = [];
  for (let stage = 0; stage <= MAX_RELAXATION_STAGE && picked.length < count; stage++) {
    const fresh = searchStage(ctx, units, stage)
      .filter((hit) => !seen.has(candidateKey(hit)))
      .map((hit) => {
        const candidate = scoreCandidate(
          ctx.surname,
          hit.picks.map((p) => ({ entry: p.entry, reading: p.reading })),
          ctx.needs,
          ctx.preset,
          ctx.data,
        );
        if (hit.stage > 0) candidate.reasonKeys.push(`relaxed.stage-${hit.stage}`);
        if (reasonKey) candidate.reasonKeys.push(reasonKey);
        const { hangul, hanja, sound, total } = candidate;
        return keyed({ hangul, hanja, sound, total, tie: hit.tie, key: candidateKey(hit), stage: hit.stage, candidate });
      })
      .sort((x, y) => y.total - x.total || y.tie - x.tie);
    // MMR 이 고른 묶음은 화면 순위를 위해 총점 순으로 다시 세운다(단계 사이 순서는 유지 — 엄격 단계가 앞).
    const before = [...already, ...picked.map((p) => p.candidate)].map(keyed);
    const chosen = selectDiverse(fresh, count - picked.length, before, mask)
      .sort((x, y) => y.total - x.total || y.tie - x.tie);
    for (const pick of chosen) {
      seen.add(pick.key);
      picked.push({ candidate: pick.candidate, stage: pick.stage, key: pick.key });
    }
  }
  return picked;
}

export function runNamingEngine(input: NamingInput, options: NamingEngineOptions): NamingResultV2 {
  const tier: Tier = options?.tier === "paid" ? "paid" : "free";
  const data = options?.data || loadNamingData();
  const normalized = normalizeInput(input, data);
  const needs = options?.saju || sajuNeedsFromBirth(input.birth as NamingBirth, normalized.gender);
  const inputHash = namingInputHash(normalized, input.birth, needs);
  const count = tier === "paid" ? SEARCH.paidCount : SEARCH.freeCount;

  const fixedChar = normalized.fixedChar;
  const fixedEntry = fixedChar ? data.poolByChar.get(fixedChar.ch)! : null;
  const ctx: SearchContext = {
    surname: normalized.surname,
    needs,
    preset: normalized.preset,
    data,
    nameLength: normalized.nameLength,
    gender: normalized.gender,
    fixed: fixedChar && fixedEntry ? { position: fixedChar.position, entry: fixedEntry, hangul: fixedChar.hangul } : null,
    avoid: new Set(normalized.avoid),
    tier,
    inputHash,
  };
  const units = buildUnits(ctx);
  const notices = ["samjae.reference-only"];
  const seen = new Set<string>();
  const selected: Picked[] = [];
  const mask = fixedChar?.position ?? null;

  // 추천: 그 성별에서 실제로 쓰이는 이름 × 이름에 실제로 쓰인 한자만 먼저 찾고, 모자라면 풀 전체에서 채운다.
  const recommend = () => {
    const allowed = naturalNames(data, ctx.gender, ctx.nameLength);
    const natural = collect(
      { ...ctx, names: { allowed, perSyllable: NATURAL_NAMES.perSyllable, minNameUse: NATURALNESS.rareBelow } },
      units, count - selected.length, selected.map((p) => p.candidate), seen, mask, "name.natural",
    );
    selected.push(...natural);
    if (selected.length >= count) return;
    const general = collect(ctx, units, count - selected.length, selected.map((p) => p.candidate), seen, mask, null);
    if (general.length) notices.push("names.fallback");
    selected.push(...general);
  };

  if (normalized.strategy === "choose") {
    // 고른 이름마다 따로 찾는다. 돌림자는 그 자리 음절이 맞는 이름에만 쓴다.
    let unfixedUnits: UnitSet | null = null;
    const groups = normalized.desiredNames.map((name) => {
      const syllables = Array.from(name);
      const fits = !!fixedChar && !!fixedEntry && fixedChar.position < syllables.length
        && (fixedChar.hangul
          ? fixedChar.hangul === syllables[fixedChar.position]
          : fixedEntry.readings.some((r) => r.hangul === syllables[fixedChar.position]));
      const nameCtx = (minNameUse: number): SearchContext => ({
        ...ctx,
        nameLength: syllables.length as 1 | 2,
        fixed: fits ? { position: fixedChar!.position, entry: fixedEntry!, hangul: syllables[fixedChar!.position] } : null,
        names: { allowed: [name], perSyllable: Infinity, minNameUse },
      });
      // 돌림자를 안 쓰는 이름은 그 글자도 다른 자리 후보로 돌려받아야 한다.
      const nameUnits = fits || !ctx.fixed ? units : (unfixedUnits ||= buildUnits({ ...ctx, fixed: null }));
      const mask = fits ? fixedChar!.position : null;
      // 이름에 실제로 쓰인 한자 조합이 먼저. 드문 한자로는 무료 개수까지만 채운다 — 그 너머는 뜻이 낯선 조합(罅襤 등)이라
      // 차라리 다른 이름의 몫이나 추천 이름(desired.padded)으로 넘긴다.
      const group = collect(nameCtx(NATURALNESS.rareBelow), nameUnits, count, [], seen, mask, "name.chosen", true);
      const rareUpTo = Math.min(count, SEARCH.freeCount);
      if (group.length < rareUpTo) {
        group.push(...collect(nameCtx(0), nameUnits, rareUpTo - group.length, group.map((p) => p.candidate), seen, mask, "name.chosen", true));
      }
      return group;
    });
    // 몫은 고르게 나누고(나머지는 앞 이름), 모자란 이름의 몫은 앞 이름부터 넘겨받는다.
    const n = groups.length;
    const take = groups.map((group, i) => Math.min(group.length, Math.floor(count / n) + (i < count % n ? 1 : 0)));
    let spare = count - take.reduce((a, b) => a + b, 0);
    groups.forEach((group, i) => {
      const extra = Math.min(group.length - take[i], spare);
      take[i] += extra;
      spare -= extra;
    });
    groups.forEach((group, i) => selected.push(...group.slice(0, take[i])));
    if (groups.some((group) => !group.length)) notices.push("desired.unavailable");
    if (selected.length < count) {
      const before = selected.length;
      recommend();
      if (selected.length > before) notices.push("desired.padded");
    }
  } else {
    recommend();
  }

  const relaxationStage = selected.length < count ? MAX_RELAXATION_STAGE : Math.max(0, ...selected.map((p) => p.stage));
  const candidates = selected.map((p) => p.candidate);
  if (needs.timeUnknown) notices.push("saju.time-unknown");
  if (needs.jongConditional) notices.push("saju.jong-conditional");
  if (normalized.surname.source === "pool") notices.push("surname.pool-strokes");
  if (candidates.some((c) => c.reasonKeys.includes("sound.school-sensitive"))) notices.push("sound.school-differs");
  if (relaxationStage > 0) notices.push(`relaxed.stage-${relaxationStage}`);
  if (candidates.length < count) notices.push("candidates.short");

  return {
    engineVersion: ENGINE_VERSION,
    dataVersion: data.dataVersion,
    schoolPreset: normalized.preset.id,
    inputHash,
    tier,
    relaxationStage,
    surname: normalized.surname,
    saju: {
      useful: [...needs.useful],
      caution: [...needs.caution],
      derivedSupport: [...needs.support],
      timeUnknown: needs.timeUnknown,
      jongConditional: needs.jongConditional,
      basis: needs.basis,
    },
    strategy: normalized.strategy,
    desiredNames: [...normalized.desiredNames],
    notices,
    candidates,
  };
}

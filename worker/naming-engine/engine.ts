// 작명 엔진 v2 진입점(설계서 §3·§7·§8). 계산만 한다 — 라우트·결제·LLM·저장은 Phase 4 에서 이 함수를 부른다.
// 같은 입력·프리셋·티어·데이터 버전이면 같은 출력(Date·Math.random 없음).

import { MAX_RELAXATION_STAGE, SEARCH } from "./config/weights";
import { DEFAULT_SCHOOL_PRESET, SCHOOL_PRESETS, type SchoolPreset } from "./config/school-presets";
import { buildUnits, searchStage, type SearchContext, type SearchHit, type Tier } from "./candidates";
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
  /** 결과 전체에 붙는 고지 키 */
  notices: string[];
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

  return {
    preset,
    surname: resolveSurname(input.surname, preset.strokeMethod, data),
    gender: input.gender,
    nameLength: input.nameLength,
    fixedChar,
    avoid,
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
  });
  return fnv1a(canonical).toString(16).padStart(8, "0") + fnv1a(canonical, 0x9747b28c).toString(16).padStart(8, "0");
}

const candidateKey = (hit: SearchHit) => hit.picks.map((p) => p.entry.ch + p.reading.hangul).join("|");

export function runNamingEngine(input: NamingInput, options: NamingEngineOptions): NamingResultV2 {
  const tier: Tier = options?.tier === "paid" ? "paid" : "free";
  const data = options?.data || loadNamingData();
  const normalized = normalizeInput(input, data);
  const needs = options?.saju || sajuNeedsFromBirth(input.birth as NamingBirth, normalized.gender);
  const inputHash = namingInputHash(normalized, input.birth, needs);
  const count = tier === "paid" ? SEARCH.paidCount : SEARCH.freeCount;

  const ctx: SearchContext = {
    surname: normalized.surname,
    needs,
    preset: normalized.preset,
    data,
    nameLength: normalized.nameLength,
    gender: normalized.gender,
    fixed: normalized.fixedChar
      ? { position: normalized.fixedChar.position, entry: data.poolByChar.get(normalized.fixedChar.ch)!, hangul: normalized.fixedChar.hangul }
      : null,
    avoid: new Set(normalized.avoid),
    tier,
    inputHash,
  };
  const units = buildUnits(ctx);

  // 엄격 단계에서 고른 후보를 먼저 두고, 모자라면 다음 단계에서 부족분만 채운다(정격 흉은 끝까지 막힌다).
  const selected: NamedCandidate[] = [];
  const seen = new Set<string>();
  let relaxationStage = 0;
  for (let stage = 0; stage <= MAX_RELAXATION_STAGE; stage++) {
    relaxationStage = stage;
    const fresh = searchStage(ctx, units, stage)
      .filter((hit) => !seen.has(candidateKey(hit)))
      .map((hit) => {
        const candidate = scoreCandidate(
          ctx.surname,
          hit.picks.map((p) => ({ entry: p.entry, reading: p.reading })),
          needs,
          ctx.preset,
          data,
        );
        if (hit.stage > 0) candidate.reasonKeys.push(`relaxed.stage-${hit.stage}`);
        const { hangul, hanja, sound, total } = candidate;
        return { hangul, hanja, sound, total, tie: hit.tie, key: candidateKey(hit), candidate };
      })
      .sort((x, y) => y.total - x.total || y.tie - x.tie);
    // MMR 이 고른 묶음은 화면 순위를 위해 총점 순으로 다시 세운다(단계 사이 순서는 유지 — 엄격 단계가 앞).
    const picked = selectDiverse(fresh, count - selected.length, selected, normalized.fixedChar?.position ?? null)
      .sort((x, y) => y.total - x.total || y.tie - x.tie);
    for (const pick of picked) {
      seen.add(pick.key);
      selected.push(pick.candidate);
    }
    if (selected.length >= count) break;
  }

  const notices = ["samjae.reference-only"];
  if (needs.timeUnknown) notices.push("saju.time-unknown");
  if (needs.jongConditional) notices.push("saju.jong-conditional");
  if (normalized.surname.source === "pool") notices.push("surname.pool-strokes");
  if (selected.some((c) => c.reasonKeys.includes("sound.school-sensitive"))) notices.push("sound.school-differs");
  if (relaxationStage > 0) notices.push(`relaxed.stage-${relaxationStage}`);
  if (selected.length < count) notices.push("candidates.short");

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
    notices,
    candidates: selected,
  };
}

// 인생 보정 P4 — 서버 계산 경로. 설계: docs/context/life-calibration.md (P4)
// 본인 ProfileCard.birth → 기존 엔진(호출만) → P3 연도 신호 래퍼 → computeLifeCalibration → LifeCalibration 캐시(inputHash).
// 🔴 메모(noteCipher)는 복호화하지 않는다. 엔진 내부·calculateLocalResult 는 건드리지 않는다.
// 엔진 하나가 실패하면 그 엔진만 unavailable(이유 코드)로 두고 나머지로 계산한다. 숙요(anchor 미정)·서양(경로 없음)은 늘 unavailable.
import { withMongoRetry } from "./db.js";
import { ProfileCard } from "./models.js";
import { LifeCalibration, LifeCalibrationConsent, LifeEvent } from "./life-calibration-models.js";
import { vedicYearSignals, sukuyoYearSignals, VEDIC_SIGNALS_VERSION } from "./life-calibration-signals.js";
import { calculateNatalSaju, resolveNatalInstant } from "../../lib/korean-calendar/index.js";
import { daeun } from "../../lib/korean-calendar/daeun.js";
import { analyzeNatalCore } from "../../lib/saju/natal-core/index.mjs";
import { LIFE_CALIBRATION_CONSENT_VERSION } from "../../lib/life-calibration/life-events.mjs";
import {
  computeLifeCalibration,
  isLifeCalibrationCacheFresh,
  lifeCalibrationCacheFields,
  lifeCalibrationInputHash,
  unavailableEngine,
} from "../../lib/life-calibration/life-calibration.mjs";
import { sajuYearSignals, cyclesFromDaeun, SAJU_SIGNALS_VERSION } from "../../lib/life-calibration/saju-signals.mjs";
import { westernYearSignals } from "../../lib/life-calibration/western-signals.mjs";

const ZIWEI_VERSION = "life-calibration-ziwei-v1";
const pad = (n) => String(n).padStart(2, "0");

export async function readLifeCalibrationConsent(env, uid) {
  const doc = await withMongoRetry(env, () => LifeCalibrationConsent.findById(String(uid)).lean());
  return doc?.consent?.granted === true && doc.consent.version === LIFE_CALIBRATION_CONSENT_VERSION ? doc.consent : null;
}

/** ProfileCard.birth/location → calculateNatalSaju 입력. 장소가 없으면 엔진 기본값(서울). */
export function natalInputFromProfile(profile) {
  const b = profile?.birth || {};
  if (![b.year, b.month, b.day].every(Number.isInteger)) return null;
  const timeUnknown = b.timeUnknown === true || !Number.isInteger(b.hour);
  const loc = profile?.location || {};
  const place = Number.isFinite(loc.lng) && typeof loc.tz === "string" && loc.tz
    ? { name: String(loc.label || ""), longitude: loc.lng, latitude: Number.isFinite(loc.lat) ? loc.lat : null, timezone: loc.tz }
    : undefined;
  return {
    birthDate: `${b.year}-${pad(b.month)}-${pad(b.day)}`,
    birthTime: timeUnknown ? null : `${pad(b.hour)}:${pad(Number.isInteger(b.minute) ? b.minute : 0)}`,
    birthTimeUnknown: timeUnknown,
    calendarType: ["solar", "lunar", "lunar_leap"].includes(b.calType) ? b.calType : "solar",
    ...(place ? { birthPlace: place } : {}),
  };
}

const genderOf = (profile) => (["M", "F"].includes(profile?.gender) ? profile.gender : null);

function sajuSignals({ natal, profile, years }) {
  const gender = genderOf(profile);
  if (!gender) return unavailableEngine("saju", SAJU_SIGNALS_VERSION, "gender-required");
  const p = natal.pillars;
  const split = (text) => (text ? { g: text[0], j: text[1] } : null);
  const pillars = Object.fromEntries([["y", p.year], ["m", p.month], ["d", p.day], ["h", p.hour]].filter(([, v]) => v).map(([k, v]) => [k, split(v)]));
  const core = analyzeNatalCore(pillars);
  const applied = { useful: core?.yongshin?.eokbu?.useful || [], avoid: core?.yongshin?.eokbu?.avoid || [] };
  const clock = natal.calculationMeta.termClock;
  const cycles = cyclesFromDaeun(daeun(clock, { gender, birthCivilYear: natal.calculationMeta.civil.year }));
  return sajuYearSignals({ natal: core, applied, cycles, years });
}

async function ziweiSignals({ profile, years }) {
  const b = profile.birth;
  if (b.timeUnknown === true || !Number.isInteger(b.hour)) return unavailableEngine("ziwei", ZIWEI_VERSION, "birth-time-required");
  const gender = genderOf(profile);
  if (!gender) return unavailableEngine("ziwei", ZIWEI_VERSION, "gender-required");
  const [eng, norm, wrap] = await Promise.all([
    import("../../app/_lib/ziwei-engine.ts"),
    import("../../app/_lib/normalize-ziwei-input.ts"),
    import("../../lib/life-calibration/ziwei-signals.ts"),
  ]);
  const n = norm.normalizeZiweiInput({
    name: "self", birthYear: b.year, birthMonth: b.month, birthDay: b.day, birthHour: b.hour, birthMinute: Number.isInteger(b.minute) ? b.minute : 0,
    gender, calendarType: b.calType === "solar" || !b.calType ? "solar" : "lunar", isLeapMonth: b.calType === "lunar_leap", unknownHour: false,
    timezone: profile.location?.tz || "Asia/Seoul",
  });
  const chart = eng.normalizeZiweiForAdvancedReport(eng.calculateZiweiChart(n.input));
  return wrap.ziweiYearSignals({ chart, years });
}

async function vedicSignals({ env, natal, profile, years }) {
  const loc = profile.location || {};
  if (natal.calculationMeta.timeUnknown) return unavailableEngine("vedic", VEDIC_SIGNALS_VERSION, "birth-time-required");
  if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng) || !loc.tz) return unavailableEngine("vedic", VEDIC_SIGNALS_VERSION, "birth-place-required");
  const civil = natal.calculationMeta.civil;
  const instant = resolveNatalInstant(civil, loc.tz);
  const { getSwissVedicPlanets } = await import("./swiss-ephemeris.js");
  // localOnly: 외부 천문 API 를 부르지 않는다(로컬 WASM 만).
  const raw = await getSwissVedicPlanets(env, { ...civil, timezone: instant.offsetMinutes / 60, lat: loc.lat, lon: loc.lng }, { localOnly: true });
  return vedicYearSignals({ moonLongitude: raw?.planets?.Moon, ascendantLongitude: raw?.ascendantSidereal, birthUtc: instant.iso, years });
}

const safe = async (engine, version, fn) => {
  try {
    return await fn();
  } catch (error) {
    console.warn("[life-calibration] engine unavailable", JSON.stringify({ engine, code: String(error?.code || error?.name || "error").slice(0, 40) }));
    return unavailableEngine(engine, version, "engine-error");
  }
};

/** 엔진 다섯 개의 연도 신호. deps 로 엔진별 계산을 바꿀 수 있다(테스트). */
export async function buildLifeCalibrationSignals(env, profile, years, deps = {}) {
  const natalInput = natalInputFromProfile(profile);
  let natal = null;
  try { natal = natalInput ? calculateNatalSaju(natalInput, { allowMissingLongitude: true }) : null; } catch { natal = null; }
  if (!natal) {
    return [
      unavailableEngine("saju", SAJU_SIGNALS_VERSION, "birth-required"),
      unavailableEngine("ziwei", ZIWEI_VERSION, "birth-required"),
      westernYearSignals(),
      unavailableEngine("vedic", VEDIC_SIGNALS_VERSION, "birth-required"),
      sukuyoYearSignals({ years }),
    ];
  }
  const ctx = { env, natal, profile, years };
  return Promise.all([
    safe("saju", SAJU_SIGNALS_VERSION, () => (deps.saju || sajuSignals)(ctx)),
    safe("ziwei", ZIWEI_VERSION, () => (deps.ziwei || ziweiSignals)(ctx)),
    westernYearSignals(),
    safe("vedic", VEDIC_SIGNALS_VERSION, () => (deps.vedic || vedicSignals)(ctx)),
    // 숙요 연도 기준(anchor)은 미정이다 — 결정 전까지 unavailable.
    sukuyoYearSignals({ years }),
  ]);
}

/**
 * 동의·본인 프로필·사건을 확인하고 보정을 계산한다. 같은 inputHash 캐시가 있으면 그것을 돌려준다.
 * @returns {Promise<{status:'ok', cache:'hit'|'miss', calibration:object} | {status:'consent-required'|'profile-not-self'|'no-events'}>}
 */
export async function loadSelfLifeCalibration(env, { uid, profileId, now = new Date(), deps = {} } = {}) {
  const userId = String(uid);
  if (!await readLifeCalibrationConsent(env, userId)) return { status: "consent-required" };
  const profile = await withMongoRetry(env, () => ProfileCard.findOne({ userId, profileId }).select("isSelf birth gender location").lean());
  if (!profile || profile.isSelf !== true) return { status: "profile-not-self" };
  const rows = await withMongoRetry(env, () => LifeEvent.find({ userId, profileId }).sort({ year: 1, month: 1 }).lean());
  // 메모는 읽지 않는다 — 보정·해시·블록에 쓰지 않는 값이다.
  const events = (rows || []).map(({ year, month, domain, outcome, intensity, certainty, source }) => ({ year, month: month ?? null, domain, outcome, intensity, certainty, source }));
  if (!events.length) return { status: "no-events" };
  const years = [...new Set(events.map((e) => e.year))];
  const signals = await buildLifeCalibrationSignals(env, profile, years, deps);
  const inputHash = lifeCalibrationInputHash(events, signals);
  const _id = `${userId}:${profileId}`;
  const cached = await withMongoRetry(env, () => LifeCalibration.findById(_id).lean()).catch(() => null);
  if (isLifeCalibrationCacheFresh(cached, inputHash) && cached.result) return { status: "ok", cache: "hit", calibration: cached.result };
  const calibration = computeLifeCalibration({ events, signals });
  // 캐시 쓰기 실패는 계산 결과를 막지 않는다(다음 요청이 다시 계산).
  await withMongoRetry(env, () => LifeCalibration.updateOne(
    { _id },
    { $set: { ...lifeCalibrationCacheFields(calibration), userId, profileId, computedAt: now } },
    { upsert: true },
  )).catch(() => null);
  return { status: "ok", cache: "miss", calibration };
}

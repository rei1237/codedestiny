// 홈 "오늘의 운세" 허브 — GET /api/fortune/today-hub
//
// 프로필 카드의 생년 정보를 받아 사주·숙요점·베다점 **세 점술의 기존 엔진을 그대로 돌려**
// 오늘의 길흉을 낸다. 이 파일에는 점술 로직이 없다 — 배선만 한다.
//
//   사주   calculateLifeBookAiSaju(명식 정본) + judgeSajuDayFortune(일진 길흉)
//   숙요점 Solar.getLunar()(기본 숙요점과 같은 음력 변환) + buildSukuyoFromLunar + judgeDayFortune
//   베다점 Swiss Ephemeris 시데리얼 달 + assembleTodayMoon(= /api/nakshatra/today 와 동일 경로)
//
// 무료·무인증이다. 결제 게이트도 로그인 요구도 걸지 않는다(홈 퍼널 최상단).
// 개인 생년이 쿼리에 실리므로 응답은 private 캐시만 허용한다.
//
// 🔴 베다는 Swiss WASM 이 필요해 실패할 수 있다. 그때 세 장을 통째로 버리지 않고
//    vedic: null 로 내려 나머지 두 장은 살린다(홈 첫 화면이 통째로 비는 것을 막는다).

import { Solar } from "lunar-javascript";
import { getRoutePath, json, methodNotAllowed, notFound } from "../lib/http.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";
import { judgeSajuDayFortune } from "../lib/saju-day-fortune.js";
import { buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { judgeDayFortune } from "../lib/sukuyo-relation-core.js";
import { assembleTodayMoon } from "../lib/nakshatra-codex.js";
import { getSwissVedicPlanets } from "../lib/swiss-ephemeris.js";
import { primeCmsRecords } from "../lib/cms-records.js";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 타라발라 9구간 tier → 숙요·사주와 같은 5티어 어휘. 세 점술이 서로 다른 등급 이름을
// 쓰면 한 화면에서 비교가 안 된다. Janma(mixed)는 "본디 자리"라 양날 — pivotal 로 읽는다.
const TARA_TIER_TO_DAY_TIER = {
  mixed: "pivotal",
  auspicious: "auspicious",
  caution: "caution",
  "great-caution": "great-caution",
};

const DAY_TIER_LABEL = {
  pivotal: "특별한 날",
  "great-auspicious": "대길일",
  auspicious: "길일",
  caution: "주의일",
  "great-caution": "흉일",
};

// 타라발라 구간별 점수. judgeDayFortune(22~92)·judgeSajuDayFortune(12~96)과 같은 스케일로
// 맞춰 세 카드의 점수를 나란히 읽을 수 있게 한다.
const TARA_SCORE = {
  Janma: 78, Sampat: 90, Vipat: 34, Kshema: 84, Pratyari: 38,
  Sadhaka: 82, Vadha: 22, Mitra: 80, "Ati-Mitra": 88,
};

function kstParts(now) {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1, day: kst.getUTCDate() };
}

function dateKey({ year, month, day }) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function clean(value) {
  return String(value == null ? "" : value).trim();
}

// 프로필 카드가 넘기는 값만 받는다(양력/음력/윤달). 그 외는 양력으로 읽는다.
function normalizeCalendarType(raw) {
  const token = clean(raw).toLowerCase();
  if (token === "lunar_leap" || token === "lunar-leap") return "lunar_leap";
  if (token === "lunar" || token.includes("음")) return "lunar";
  return "solar";
}

function parseBirthQuery(query) {
  const birth = clean(query.get("birth"));
  const match = birth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;

  const timeRaw = clean(query.get("time"));
  const timeMatch = timeRaw.match(/^(\d{1,2}):(\d{2})$/);
  const hour = timeMatch ? Number(timeMatch[1]) : 12;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  const timeUnknown = !timeMatch || hour > 23 || minute > 59;

  return {
    year,
    month,
    day,
    hour: timeUnknown ? 12 : hour,
    minute: timeUnknown ? 0 : minute,
    timeUnknown,
    birthDate: birth,
    birthTime: timeUnknown ? "" : `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    calendarType: normalizeCalendarType(query.get("cal")),
    gender: clean(query.get("gender")).toLowerCase() === "male" ? "male" : "female",
  };
}

// 기본 숙요점(worker/routes/sukuyo.js resolveSukuyoLunarFromProfile)과 같은 음력 변환.
// 프로필이 음력으로 입력됐으면 변환하지 않고 그대로 쓴다.
function toLunarParts(input) {
  if (input.calendarType === "lunar" || input.calendarType === "lunar_leap") {
    return { month: input.month, day: input.day, isLeap: input.calendarType === "lunar_leap" };
  }
  const lunar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getLunar();
  const lunarMonth = Number(lunar.getMonth());
  return { month: Math.abs(lunarMonth), day: Number(lunar.getDay()), isLeap: lunarMonth < 0 };
}

function todayDayPillar(today) {
  // 일주는 정오 기준으로 잡는다(자시 경계에서 하루가 튀지 않게 — 숙요 달력과 같은 관례).
  const eightChar = Solar.fromYmdHms(today.year, today.month, today.day, 12, 0, 0).getLunar().getEightChar();
  return { stem: clean(eightChar.getDayGan()), branch: clean(eightChar.getDayZhi()) };
}

function buildSaju(input, today) {
  const natal = calculateLifeBookAiSaju({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthTimeUnknown: input.timeUnknown,
    calendarType: input.calendarType === "solar" ? "solar" : "lunar",
    gender: input.gender,
  });
  const verdict = judgeSajuDayFortune(natal, todayDayPillar(today));
  if (!verdict) return null;
  return {
    system: "saju",
    label: "사주",
    anchor: verdict.anchor,
    headline: verdict.headline,
    body: verdict.advice,
    tier: verdict.tier,
    tierLabel: verdict.tierLabel,
    score: verdict.score,
    detail: `내 일간 ${verdict.dayMasterKo}(${verdict.dayMaster}) · 오늘 ${verdict.tenGod}`,
  };
}

function buildSukuyo(natalIndex, todayLunar) {
  const todaySukuyo = buildSukuyoFromLunar(todayLunar.month, todayLunar.day, { isLeapMonth: todayLunar.isLeap });
  if (!todaySukuyo) return null;
  const verdict = judgeDayFortune(natalIndex, todaySukuyo.index);
  if (!verdict) return null;
  return {
    system: "sukuyo",
    label: "숙요점",
    anchor: `오늘의 수(宿) · ${todaySukuyo.nameKo}(${todaySukuyo.nameHan})`,
    headline: verdict.headline,
    body: verdict.advice,
    tier: verdict.tier,
    tierLabel: verdict.tierLabel,
    score: verdict.score,
    detail: `내 본명수 대비 ${verdict.relationType}(${verdict.relationTypeHan})`,
  };
}

function buildVedic(todayMoon, natalSukuyoName) {
  const tara = todayMoon?.personal?.taraBala;
  const nakshatra = todayMoon?.todayNakshatra;
  if (!tara || !nakshatra) return null;
  const tier = TARA_TIER_TO_DAY_TIER[tara.tier] || "auspicious";
  return {
    system: "vedic",
    label: "베다점",
    anchor: `오늘의 달자리 · ${nakshatra.nameKo || nakshatra.nameEn} (지배성 ${nakshatra.lordKo})`,
    headline: `${tara.ko} — ${DAY_TIER_LABEL[tier]}`,
    body: tara.desc,
    tier,
    tierLabel: DAY_TIER_LABEL[tier],
    score: TARA_SCORE[tara.key] || 60,
    detail: `내 본명 별자리에서 ${tara.count}번째 자리${natalSukuyoName ? ` · 본명수 ${natalSukuyoName}` : ""}`,
  };
}

// 오늘 달의 시데리얼 황경. Swiss 가 죽어도 나머지 두 점술은 살려야 하므로 예외를 삼킨다.
async function resolveTodayMoon(env, today, natalIndex, requestUrl) {
  try {
    const swiss = await getSwissVedicPlanets(
      env,
      { year: today.year, month: today.month, day: today.day, hour: 12, minute: 0, timezone: 9, lat: 37.5665, lon: 126.978 },
      { requestUrl },
    );
    const moonLon = Number(swiss?.planets?.Moon);
    if (!Number.isFinite(moonLon)) return null;
    const lunar = Solar.fromYmdHms(today.year, today.month, today.day, 12, 0, 0).getLunar();
    const lunarMonth = Number(lunar.getMonth());
    return assembleTodayMoon({
      moonLon,
      lunar: { month: Math.abs(lunarMonth), day: Number(lunar.getDay()), isLeap: lunarMonth < 0 },
      myMansionIndex: natalIndex,
    });
  } catch (error) {
    console.warn("[today-hub-vedic-skip]", String(error?.message || error).slice(0, 200));
    return null;
  }
}

async function handleTodayHub(request, env) {
  const url = new URL(request.url);
  const input = parseBirthQuery(url.searchParams);
  if (!input) {
    return json({
      ok: false,
      code: "INVALID_BIRTH",
      message: "프로필 카드의 생년월일(birth=YYYY-MM-DD)이 필요합니다.",
    }, { status: 400 });
  }

  // 숙요 본명수별 조언 표의 CMS 오버라이드를 judgeDayFortune 호출 전에 채운다.
  // 실패해도 내부에서 삼키고 코드 기본값으로 진행한다(기본 숙요점과 같은 관례).
  await primeCmsRecords(env);

  const today = kstParts(new Date());
  const todayLunar = toLunarParts({ ...today, hour: 12, minute: 0, calendarType: "solar" });
  const natalLunar = toLunarParts(input);
  const natalSukuyo = buildSukuyoFromLunar(natalLunar.month, natalLunar.day, { isLeapMonth: natalLunar.isLeap });
  const natalIndex = Number.isInteger(Number(natalSukuyo?.index)) ? Number(natalSukuyo.index) : null;

  let saju = null;
  try {
    saju = buildSaju(input, today);
  } catch (error) {
    console.warn("[today-hub-saju-skip]", String(error?.message || error).slice(0, 200));
  }

  const sukuyo = natalIndex == null ? null : buildSukuyo(natalIndex, todayLunar);
  const todayMoon = await resolveTodayMoon(env, today, natalIndex, request.url);
  const vedic = buildVedic(todayMoon, natalSukuyo?.nameKo ? `${natalSukuyo.nameKo}수` : "");

  if (!saju && !sukuyo && !vedic) {
    return json({
      ok: false,
      code: "TODAY_HUB_UNAVAILABLE",
      message: "오늘의 운세를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }

  return json({
    ok: true,
    date: dateKey(today),
    systems: { saju, sukuyo, vedic },
  }, {
    // 생년이 쿼리에 실리므로 공유 캐시에 올리지 않는다. 날짜가 바뀌면 어차피 값이 바뀐다.
    headers: { "Cache-Control": "private, max-age=1800" },
  });
}

export async function handleFortuneTodayRoutes(request, env) {
  const path = getRoutePath(request, "/api/fortune");
  if (path !== "/today-hub") return notFound();
  if (request.method !== "GET") return methodNotAllowed();
  try {
    return await handleTodayHub(request, env);
  } catch (error) {
    console.error("[today-hub-error]", error);
    return json({
      ok: false,
      code: "TODAY_HUB_FAILED",
      message: "오늘의 운세를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    }, { status: 500 });
  }
}

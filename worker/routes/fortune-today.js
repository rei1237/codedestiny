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
//
// 응답의 두 축:
//   birth 유무   있으면 개인 길흉(등급·점수·십성 관계·타라발라), 없으면 날짜만으로 참인 부분만.
//                birth 를 아예 안 준 것은 공개 모드이고, **형식이 틀린 것만** 400 이다.
//   detail=1     각 점술의 sections(전문 상세)를 함께 싣는다. 플래그가 없으면 홈 카드용
//                highlights(≤3)까지만 실어 홈 payload 를 가볍게 유지한다.

import { Solar } from "lunar-javascript";
// 🔴 일주는 한국 음양력 코어에서 잡는다. 값은 안 움직인다 — 정오 일주는 lunar-javascript 와
// 코어가 표본 7,224건(1950~2035)에서 전건 일치한다(실측 2026-08-27). 달력 축을 하나로 두는 것이 목적이다.
import { BRANCH_HANJA, STEM_HANJA, ganji } from "../../lib/korean-calendar/index.js";
import { getRoutePath, json, methodNotAllowed, notFound } from "../lib/http.js";
import { calculateLifeBookAiSaju } from "../lib/life-book-ai-saju.js";
import { judgeSajuDayFortune } from "../lib/saju-day-fortune.js";
import { buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { judgeDayFortune } from "../lib/sukuyo-relation-core.js";
import { assembleTodayMoon } from "../lib/nakshatra-codex.js";
import { getSwissVedicPlanets } from "../lib/swiss-ephemeris.js";
import { primeCmsRecords } from "../lib/cms-records.js";
import { readCmsThroughCache } from "../lib/cms-cache.js";
import { buildTodaySajuDetail, buildTodaySajuPublic } from "../lib/today-saju-detail.js";
import { buildTodaySukuyoDetail, buildTodaySukuyoPublic } from "../lib/today-sukuyo-detail.js";
import { buildTodayVedicDetail, buildTodayVedicPublic, computePanchanga } from "../lib/today-vedic-detail.js";
import { getNakshatraAttributes } from "../../constants/nakshatra-attributes.js";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 공개 모드(생년 없음) 응답의 엣지 캐시 수명. 아래 Cache-Control: public, max-age=1800 과 같은 값이라
// 클라이언트가 보던 신선도 계약은 그대로다. 이 라우트는 DB 를 안 쓰지만 스위스 천문 서브리퀘스트와
// 사주·숙요 계산 때문에 콜드 3.2초·웜 0.8초가 걸린다(실측 2026-08-21, code-destiny.com).
const PUBLIC_HUB_CACHE_TTL_SECONDS = 1800;
const PUBLIC_HUB_STALE_TTL_SECONDS = 3600;

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

// 판창가의 바라(요일). kstParts 가 이미 KST 로 옮긴 Y/M/D 라 UTC 로 다시 세면 된다.
function weekdayOf({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// 본명 나크샤트라 이름. assembleTodayMoon 이 타라발라를 잴 때 쓰는 것과 같은 대응
// (본명수 index + 13) % 27 을 그대로 따른다 — 여기서 다른 규칙을 쓰면 두 값이 어긋난다.
function natalNakshatraNameKo(natalMansionIndex) {
  if (!Number.isInteger(natalMansionIndex)) return "";
  const attrs = getNakshatraAttributes((natalMansionIndex + 13) % 27);
  return attrs ? attrs.nameKo : "";
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

// birth 가 아예 없으면 공개 모드(null), 있는데 형식이 틀리면 거부(false).
// 두 경우를 한 값으로 뭉뚱그리면 "생년 없이 들어온 방문자"와 "잘못 만든 링크"를 구분할 수 없다.
function parseBirthQuery(query) {
  const birth = clean(query.get("birth"));
  if (!birth) return null;
  const match = birth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return false;

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
  const core = ganji({ year: today.year, month: today.month, day: today.day, hour: 12, minute: 0 });
  if (!core) {
    // today 는 지금 날짜라 코어 지원 범위(1900~2100) 안이다. 여기 오면 표가 깨진 것이다.
    throw new Error(`korean-calendar core returned no ganji for ${today.year}-${today.month}-${today.day}`);
  }
  return { stem: STEM_HANJA[core.day.stemIndex], branch: BRANCH_HANJA[core.day.branchIndex] };
}

// detail=1 이 아니면 sections 를 싣지 않는다(홈 payload 를 가볍게 유지).
function withDepth(card, depth, wantDetail) {
  if (!card) return null;
  const out = { ...card, highlights: depth?.highlights || [] };
  if (wantDetail) out.sections = depth?.sections || [];
  return out;
}

function buildSaju(input, today, wantDetail) {
  const dayPillar = todayDayPillar(today);
  if (!input) {
    const publicCard = buildTodaySajuPublic(dayPillar);
    if (!publicCard) return null;
    return {
      system: "saju",
      label: "사주",
      anchor: publicCard.anchor,
      headline: publicCard.headline,
      body: publicCard.body,
      tier: null,
      tierLabel: null,
      score: null,
      detail: "",
      personalized: false,
      highlights: publicCard.highlights,
      ...(wantDetail ? { sections: publicCard.sections } : {}),
    };
  }

  const natal = calculateLifeBookAiSaju({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthTimeUnknown: input.timeUnknown,
    calendarType: input.calendarType === "solar" ? "solar" : "lunar",
    gender: input.gender,
  });
  const verdict = judgeSajuDayFortune(natal, dayPillar);
  if (!verdict) return null;
  return withDepth({
    system: "saju",
    label: "사주",
    anchor: verdict.anchor,
    headline: verdict.headline,
    body: verdict.advice,
    tier: verdict.tier,
    tierLabel: verdict.tierLabel,
    score: verdict.score,
    detail: `내 일간 ${verdict.dayMasterKo}(${verdict.dayMaster}) · 오늘 ${verdict.tenGod}`,
    personalized: true,
  }, buildTodaySajuDetail({ verdict, natal }), wantDetail);
}

function buildSukuyo(natalIndex, natalSukuyo, todayLunar, wantDetail) {
  const todaySukuyo = buildSukuyoFromLunar(todayLunar.month, todayLunar.day, { isLeapMonth: todayLunar.isLeap });
  if (!todaySukuyo) return null;

  if (natalIndex == null) {
    const publicCard = buildTodaySukuyoPublic(todaySukuyo);
    if (!publicCard) return null;
    return {
      system: "sukuyo",
      label: "숙요점",
      anchor: publicCard.anchor,
      headline: publicCard.headline,
      body: publicCard.body,
      tier: null,
      tierLabel: null,
      score: null,
      detail: "",
      personalized: false,
      highlights: publicCard.highlights,
      ...(wantDetail ? { sections: publicCard.sections } : {}),
    };
  }

  const verdict = judgeDayFortune(natalIndex, todaySukuyo.index);
  if (!verdict) return null;
  return withDepth({
    system: "sukuyo",
    label: "숙요점",
    anchor: `오늘의 수(宿) · ${todaySukuyo.nameKo}(${todaySukuyo.nameHan})`,
    headline: verdict.headline,
    body: verdict.advice,
    tier: verdict.tier,
    tierLabel: verdict.tierLabel,
    score: verdict.score,
    detail: `내 본명수 대비 ${verdict.relationType}(${verdict.relationTypeHan})`,
    personalized: true,
  }, buildTodaySukuyoDetail({ verdict, todayMansion: todaySukuyo, natalMansion: natalSukuyo }), wantDetail);
}

function buildVedic(sky, natalSukuyoName, wantDetail) {
  if (!sky) return null;
  const tara = sky.todayMoon?.personal?.taraBala;
  const nakshatra = sky.todayMoon?.todayNakshatra;

  // 판창가는 태양 황경이 있어야 나온다. 없으면 개인 카드는 타라 발라만으로 그대로 살리고
  // (기존 동작), 공개 모드만 포기한다.
  if (!tara || !nakshatra) {
    if (!sky.panchanga) return null;
    const publicCard = buildTodayVedicPublic({ panchanga: sky.panchanga, moonLon: sky.moonLon });
    if (!publicCard) return null;
    return {
      system: "vedic",
      label: "베다점",
      anchor: publicCard.anchor,
      headline: publicCard.headline,
      body: publicCard.body,
      tier: null,
      tierLabel: null,
      score: null,
      detail: "",
      personalized: false,
      highlights: publicCard.highlights,
      ...(wantDetail ? { sections: publicCard.sections } : {}),
    };
  }

  const tier = TARA_TIER_TO_DAY_TIER[tara.tier] || "auspicious";
  return withDepth({
    system: "vedic",
    label: "베다점",
    anchor: `오늘의 달자리 · ${nakshatra.nameKo || nakshatra.nameEn} (지배성 ${nakshatra.lordKo})`,
    headline: `${tara.ko} — ${DAY_TIER_LABEL[tier]}`,
    body: tara.desc,
    tier,
    tierLabel: DAY_TIER_LABEL[tier],
    score: TARA_SCORE[tara.key] || 60,
    detail: `내 본명 별자리에서 ${tara.count}번째 자리${natalSukuyoName ? ` · 본명수 ${natalSukuyoName}` : ""}`,
    personalized: true,
  }, buildTodayVedicDetail({
    panchanga: sky.panchanga,
    moonLon: sky.moonLon,
    taraBala: tara,
    natalNakshatraKo: sky.natalNakshatraKo,
  }), wantDetail);
}

// 오늘 하늘(해·달의 시데리얼 황경 + 판창가 + 타라발라).
// Swiss 가 죽어도 나머지 두 점술은 살려야 하므로 예외를 삼킨다.
async function resolveTodaySky(env, today, natalIndex, requestUrl) {
  try {
    const swiss = await getSwissVedicPlanets(
      env,
      { year: today.year, month: today.month, day: today.day, hour: 12, minute: 0, timezone: 9, lat: 37.5665, lon: 126.978 },
      { requestUrl },
    );
    const moonLon = Number(swiss?.planets?.Moon);
    const sunLon = Number(swiss?.planets?.Sun);
    if (!Number.isFinite(moonLon)) return null;
    const lunar = Solar.fromYmdHms(today.year, today.month, today.day, 12, 0, 0).getLunar();
    const lunarMonth = Number(lunar.getMonth());
    const todayMoon = assembleTodayMoon({
      moonLon,
      lunar: { month: Math.abs(lunarMonth), day: Number(lunar.getDay()), isLeap: lunarMonth < 0 },
      myMansionIndex: natalIndex,
    });
    // 판창가는 니라야나(시데리얼) 황경으로 계산한다 — swiss 가 주는 값 그대로다.
    const panchanga = Number.isFinite(sunLon)
      ? computePanchanga({ sunLon, moonLon, weekday: weekdayOf(today) })
      : null;
    return { moonLon, sunLon, todayMoon, panchanga, natalNakshatraKo: natalNakshatraNameKo(natalIndex) };
  } catch (error) {
    console.warn("[today-hub-vedic-skip]", String(error?.message || error).slice(0, 200));
    return null;
  }
}

// 세 체계가 모두 실패하면 null 을 돌려준다(호출부가 503 으로 바꾼다).
// 🔴 실패를 payload 로 돌려주면 안 된다 — 공개 모드는 이 반환값을 30분 캐시하므로 실패가 굳는다.
async function buildTodayHubPayload(request, env, input, wantDetail) {
  // 숙요 본명수별 조언 표의 CMS 오버라이드를 judgeDayFortune 호출 전에 채운다.
  // 실패해도 내부에서 삼키고 코드 기본값으로 진행한다(기본 숙요점과 같은 관례).
  await primeCmsRecords(env);

  const today = kstParts(new Date());
  const todayLunar = toLunarParts({ ...today, hour: 12, minute: 0, calendarType: "solar" });
  const natalLunar = input ? toLunarParts(input) : null;
  const natalSukuyo = natalLunar
    ? buildSukuyoFromLunar(natalLunar.month, natalLunar.day, { isLeapMonth: natalLunar.isLeap })
    : null;
  const natalIndex = Number.isInteger(Number(natalSukuyo?.index)) ? Number(natalSukuyo.index) : null;

  let saju = null;
  try {
    saju = buildSaju(input, today, wantDetail);
  } catch (error) {
    console.warn("[today-hub-saju-skip]", String(error?.message || error).slice(0, 200));
  }

  const sukuyo = buildSukuyo(natalIndex, natalSukuyo, todayLunar, wantDetail);
  const sky = await resolveTodaySky(env, today, natalIndex, request.url);
  const vedic = buildVedic(sky, natalSukuyo?.nameKo ? `${natalSukuyo.nameKo}수` : "", wantDetail);

  if (!saju && !sukuyo && !vedic) return null;

  return {
    ok: true,
    date: dateKey(today),
    personalized: Boolean(input),
    systems: { saju, sukuyo, vedic },
  };
}

function todayHubUnavailable() {
  return json({
    ok: false,
    code: "TODAY_HUB_UNAVAILABLE",
    message: "오늘의 운세를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  }, { status: 503 });
}

async function handleTodayHub(request, env) {
  const url = new URL(request.url);
  const input = parseBirthQuery(url.searchParams);
  // 형식이 틀린 birth 만 거부한다. 아예 없는 것(null)은 공개 모드다.
  if (input === false) {
    return json({
      ok: false,
      code: "INVALID_BIRTH",
      message: "생년월일 형식이 올바르지 않습니다(birth=YYYY-MM-DD).",
    }, { status: 400 });
  }
  const wantDetail = clean(url.searchParams.get("detail")) === "1";

  // 🔴 생년이 쿼리에 실린 개인화 응답은 공유 캐시에 **절대** 올리지 않는다. 올리는 순간 다음 방문자가
  //    남의 사주를 받는다. 캐시 분기는 input 이 없을 때 하나뿐이며 verify:public-api-edge-cache 가
  //    이 조건을 단언한다.
  if (input) {
    const payload = await buildTodayHubPayload(request, env, input, wantDetail);
    if (!payload) return todayHubUnavailable();
    return json(payload, { headers: { "Cache-Control": "private, max-age=1800" } });
  }

  // 공개 모드는 개인 정보가 없어 모두에게 같은 응답이다. 날짜(KST)가 키에 들어가므로 자정이 지나면
  // 자연히 새 키가 되고, 옛 키는 TTL 로 사라진다.
  let loaded = false;
  try {
    const { value, stale } = await readCmsThroughCache({
      key: `today-hub:v1:${dateKey(kstParts(new Date()))}:${wantDetail ? "detail" : "summary"}`,
      ttlSeconds: PUBLIC_HUB_CACHE_TTL_SECONDS,
      staleTtlSeconds: PUBLIC_HUB_STALE_TTL_SECONDS,
      load: async () => {
        loaded = true;
        const payload = await buildTodayHubPayload(request, env, null, wantDetail);
        // throw 해야 캐시에 안 들어간다. 직전에 성공한 값이 있으면 아래 stale 로 살아난다.
        if (!payload) throw new Error("TODAY_HUB_UNAVAILABLE");
        return payload;
      },
    });
    return json(value, {
      headers: {
        "Cache-Control": "public, max-age=1800",
        // stale 은 "계산이 실패해 옛 값을 냈다" 는 뜻이다. 안 붙이면 캐시가 장애를 정상처럼 가린다.
        "X-CD-Cache": loaded ? "miss" : stale ? "stale" : "hit",
      },
    });
  } catch (error) {
    // 위 sentinel 만 503 으로 바꾼다. 나머지 예외는 handleFortuneTodayRoutes 의 500 경로로 보낸다.
    if (String(error?.message || "") === "TODAY_HUB_UNAVAILABLE") return todayHubUnavailable();
    throw error;
  }
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

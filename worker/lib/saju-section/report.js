import { calculateNatalSaju } from "../../../lib/korean-calendar/index.js";
import {
  _applyTrueSolarTimeCorrection, analyzeJohu, applyRuntimeYongshinPolicy, calcNatalElement, calcPower, detectJong,
  resolveBirthTimezoneOffset,
} from "../../yeongnyangi/fortune/saju-runtime.mjs";
import { createSajuSectionRuntime } from "./runtime.generated.mjs";

// 사주 종합(section_summary)·대운 풀이(section_daewun)·퀀텀 명리 엔진(rpt_quantumCard)·
// 극T 관계 회로(sukuyo-extreme-t-relationship)·숙요 인연 도감(sukuyo-relationship-encyclopedia) 본문을 서버에서 만든다.
// 계산 흐름은 js/saju-engine.js 의 사주 계산(원국 → 대운 브릿지 → 종격 판정 → 용신 정책)을 그대로 따른다.
export const SAJU_SECTION_FEATURE_KEYS = Object.freeze(["section_summary", "section_daewun", "rpt_quantumCard", "sukuyo-extreme-t-relationship", "sukuyo-relationship-encyclopedia"]);
// 클라이언트 출생지 선택의 기본 옵션(index.html #birthCountry 의 대한민국 서울).
const DEFAULT_PLACE = Object.freeze({ name: "대한민국 (서울)", longitude: 127.0, latitude: 37.6, timezone: "Asia/Seoul", baseTzOffset: 9 });
const JONG_DECISIONS = new Set(["confirmed", "rejected", "unverified"]);

export class SajuSectionInputError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

const pad = (value, size) => String(value).padStart(size, "0");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const finite = (value, fallback) => (Number.isFinite(Number(value)) && value !== null && value !== "" ? Number(value) : fallback);

function normalizePlace(place) {
  const raw = place && typeof place === "object" ? place : {};
  const longitude = finite(raw.longitude, DEFAULT_PLACE.longitude);
  const latitude = finite(raw.latitude, DEFAULT_PLACE.latitude);
  const baseTzOffset = finite(raw.baseTzOffset, DEFAULT_PLACE.baseTzOffset);
  if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90 || Math.abs(baseTzOffset) > 14) {
    throw new SajuSectionInputError("출생지를 확인해 주세요.", "SAJU_INVALID_PLACE");
  }
  const timezone = typeof raw.timezone === "string" && /^[A-Za-z_/+-]{1,64}$/.test(raw.timezone) ? raw.timezone : DEFAULT_PLACE.timezone;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 80) : DEFAULT_PLACE.name;
  return { name, longitude, latitude, timezone, baseTzOffset };
}

function documentShim(neo, captured, quantum) {
  const classList = { contains: (name) => neo && name === "neo-mode" };
  return {
    cookie: "",
    body: { classList },
    documentElement: { classList },
    getElementById: (id) => (id === "summaryArea" ? captured : id === "quantumSection" ? quantum.area : id === "quantumCard" ? quantum.card : null),
  };
}

const memoryStorage = () => ({ getItem: () => null, setItem() {}, removeItem() {} });

// 숙요 인연 도감은 사주 원국을 쓰지 않는다 — 본명숙 하나로 27숙과의 관계를 펼친다.
// 본명숙은 화면이 그린 값(syBindSukuyoEncyclopedia 의 buildInput)을 그대로 받는다. 어느 숙을 넣어도
// 27숙 전체·관계 6종 풀이가 다 나오므로(순서·점수만 다르다) 본명숙을 받아도 더 열리는 본문이 없다.
function buildEncyclopediaHtml(input) {
  const raw = input.encyclopedia && typeof input.encyclopedia === "object" ? input.encyclopedia : {};
  // 화면은 syWheelNormalizeIndex 로 0~26 정수만 보낸다. null·문자열을 0번 숙으로 바꿔 그리지 않는다.
  const idx = raw.userMansionIdx;
  if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx > 26) throw new SajuSectionInputError("본명숙을 확인해 주세요.", "SAJU_INVALID_MANSION");
  const lang = input.lang || "ko";
  const window = { location: { search: "", pathname: "/", hostname: "" }, localStorage: memoryStorage(), cdGetCurrentLanguage: () => lang };
  const rt = createSajuSectionRuntime({ window, document: documentShim(false, { innerHTML: "" }, { area: { innerHTML: "" }, card: { style: {} } }), localStorage: window.localStorage, neo: false, lang, now: input.now instanceof Date ? input.now : new Date() });
  return {
    html: rt.renderSukuyoEncyclopediaPaid({
      userName: String(raw.userName || "").slice(0, 40),
      userMansionIdx: idx,
      userMansion: String(raw.userMansion || "").slice(0, 20),
    }),
  };
}

/**
 * @param {object} input
 * @param {"section_summary"|"section_daewun"|"rpt_quantumCard"|"sukuyo-extreme-t-relationship"|"sukuyo-relationship-encyclopedia"} input.featureKey
 * @param {{calendarDate:string, calType:string, hour:number, minute:number, timeKnown:boolean}} input.birth 원래 달력 날짜와 입력 시각
 * @param {"M"|"F"} input.gender
 * @param {string} [input.name] 화면 이름(HTML 이스케이프한다)
 * @param {"neo"|"pig"} [input.mode]
 * @param {string} [input.lang]
 * @param {object} [input.place] {name, longitude, latitude, timezone, baseTzOffset}
 * @param {"confirmed"|"rejected"|"unverified"} [input.jongDecision] 종격 검증 모달의 답
 * @param {{age:number, gan:string, zhi:string}} [input.daewun] section_daewun 에서 펼친 대운
 * @param {Date} [input.now] 현재 나이·퀀텀 카드의 오늘 간지 기준 시각
 * @param {{userName:string, userMansionIdx:number, userMansion:string}} [input.encyclopedia] 숙요 인연 도감의 화면 입력(출생 정보는 쓰지 않는다)
 * @returns {{html:string, sajuBaseHtml?:string, prescriptionHtml?:string}} 극T 는 관계·연애·현실 패널(html)과 사주 기반 해석·처방전 패널을 따로 돌려준다
 */
export function buildSajuSectionHtml(input) {
  const featureKey = String(input?.featureKey || "");
  if (!SAJU_SECTION_FEATURE_KEYS.includes(featureKey)) throw new SajuSectionInputError("지원하지 않는 항목입니다.", "SAJU_INVALID_FEATURE");
  if (featureKey === "sukuyo-relationship-encyclopedia") return buildEncyclopediaHtml(input);
  const birth = input.birth || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birth.calendarDate || ""))) throw new SajuSectionInputError("생년월일을 확인해 주세요.", "SAJU_INVALID_BIRTH");
  const calType = ["solar", "lunar", "lunar_leap"].includes(birth.calType) ? birth.calType : "solar";
  const timeUnknown = birth.timeKnown === false;
  const hour = timeUnknown ? 12 : Math.trunc(finite(birth.hour, NaN));
  const minute = timeUnknown ? 0 : Math.trunc(finite(birth.minute, 0));
  if (!(hour >= 0 && hour <= 23) || !(minute >= 0 && minute <= 59)) throw new SajuSectionInputError("출생 시각을 확인해 주세요.", "SAJU_INVALID_BIRTH");
  const gender = input.gender === "M" ? "M" : "F";
  const neo = input.mode === "neo";
  const place = normalizePlace(input.place);
  const jongDecision = JONG_DECISIONS.has(input.jongDecision) ? input.jongDecision : "unverified";

  let natalChart;
  try {
    natalChart = calculateNatalSaju({
      birthDate: birth.calendarDate, calendarType: calType, birthTimeUnknown: timeUnknown,
      birthTime: `${pad(hour, 2)}:${pad(minute, 2)}`,
      birthPlace: { name: place.name, longitude: place.longitude, latitude: place.latitude, timezone: place.timezone },
    });
  } catch {
    throw new SajuSectionInputError("생년월일을 확인해 주세요.", "SAJU_INVALID_BIRTH");
  }
  const meta = natalChart.calculationMeta;
  const { year, month, day } = meta.civil;
  const tzResolved = resolveBirthTimezoneOffset(year, month, day, hour, minute, place.timezone, place.baseTzOffset);
  const correction = _applyTrueSolarTimeCorrection({ year, month, day, hour, minute, longitude: place.longitude, standardMeridian: tzResolved.baseOffsetHours * 15 });
  if (!correction) throw new SajuSectionInputError("출생 시각을 확인해 주세요.", "SAJU_INVALID_BIRTH");

  const captured = { innerHTML: "" };
  const quantum = { area: { innerHTML: "" }, card: { style: {} } };
  const now = input.now instanceof Date ? input.now : new Date();
  const window = { location: { search: "", pathname: "/", hostname: "" }, localStorage: memoryStorage(), cdGetCurrentLanguage: () => input.lang || "ko" };
  const rt = createSajuSectionRuntime({ window, document: documentShim(neo, captured, quantum), localStorage: window.localStorage, neo, lang: input.lang || "ko", now });

  const zwClock = meta.corrected || { year: correction.correctedYear, month: correction.correctedMonth, day: correction.correctedDay, hour: correction.correctedHour, minute: correction.correctedMinute };
  window.__cdSajuTimeUnknown = timeUnknown;
  window._ziweiBirth = { year: zwClock.year, month: zwClock.month, day: zwClock.day, hour: zwClock.hour, minute: zwClock.minute, lat: place.latitude, lon: place.longitude, tz: tzResolved.tzOffsetHours, unknownHour: timeUnknown, timeDefault: timeUnknown };
  const birthYear = meta.civil.year;
  const currentAge = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCFullYear() - birthYear + 1;

  const pair = (key) => (natalChart.pillars[key] ? rt.parsePillar(natalChart.pillars[key]) : { g: "", j: "" });
  const [yp, mp, dp, hp] = ["year", "month", "day", "hour"].map(pair);
  const bazi = {
    getYearGan: () => yp.g, getYearZhi: () => yp.j, getMonthGan: () => mp.g, getMonthZhi: () => mp.j,
    getDayGan: () => dp.g, getDayZhi: () => dp.j, getTimeGan: () => hp.g, getTimeZhi: () => hp.j,
  };
  rt.attachKasiDaewunBridge(bazi, Object.assign({ second: 0 }, meta.termClock), meta.civil.year);
  const pillar = (x) => ({ g: x.g, j: x.j, gE: (rt.GAN[x.g] || {}).e, jE: (rt.JI[x.j] || {}).e });
  const p = { y: pillar(yp), m: pillar(mp), d: pillar(dp), h: pillar(hp) };

  const natal = calcNatalElement(p);
  const johu = analyzeJohu(p);
  let power = calcPower(p);
  let jong = detectJong(p);
  if (jong.isJong && jongDecision !== "unverified") jong = rt.applyJongDecision(jong, jongDecision === "confirmed");
  power = applyRuntimeYongshinPolicy(power, jong, johu);
  rt.seed({
    GENDER: gender, USER_NAME: escapeHtml(String(input.name || "").trim().slice(0, 40) || "사용자"),
    BIRTH_YEAR: birthYear, CURRENT_AGE: currentAge, DAY_GAN: dp.g,
    G_PILLARS: p, G_NATAL: natal, G_JOHU: johu, JOHU_TYPE: johu.type, JOHU_SCORE: johu.score,
    G_POWER: power, G_JONG: jong, G_BAZI: bazi,
  });
  const rows = timeUnknown ? [] : rt.daewunRows(bazi.getYun(gender === "M" ? 1 : 0).getDaYun());
  window.G_DAEWUN = rows;
  // 브라우저에서는 셸 전역 var 가 곧 window 속성이다. 타로 파일의 analyzeFortuneGZ 가 window.G_JONG 으로 읽는다.
  window.G_JONG = jong;

  if (featureKey === "section_summary") {
    rt.renderSummary(p, johu, natal);
    return { html: captured.innerHTML };
  }
  if (featureKey === "sukuyo-extreme-t-relationship") {
    // 화면(renderTTest)과 같은 p·natal·johu 를 넘긴다. 무료 점수·타입은 화면이 직접 그린다.
    return rt.renderExtremeTPaidPanels(p, natal, johu);
  }
  if (featureKey === "rpt_quantumCard") {
    rt.renderQuantumStrategy(p, natal, bazi);
    return { html: quantum.area.innerHTML };
  }
  const dw = input.daewun || {};
  const row = rows.find((r) => r.age === Number(dw.age) && r.g === dw.gan && r.j === dw.zhi);
  if (!row) throw new SajuSectionInputError("대운을 다시 선택해 주세요.", "SAJU_INVALID_DAEWUN");
  return { html: rt.buildDaewunDetailHtml(row.age, row.g, row.j), daewun: { age: row.age, gan: row.g, zhi: row.j } };
}

import { calculateNatalSaju } from "../../../lib/korean-calendar/index.js";
import {
  _applyTrueSolarTimeCorrection, analyzeJohu, applyRuntimeYongshinPolicy, calcNatalElement, calcPower, detectJong,
  resolveBirthTimezoneOffset,
} from "../../yeongnyangi/fortune/saju-runtime.mjs";
import { createSajuSectionRuntime } from "./runtime.generated.mjs";
import { buildSukuyoFromMoonLongitude } from "../sukuyo-coordinate.js";
import { buildSecretHouseStep } from "./secret-house.js";
import { buildAnimalDestinyReading } from "./animal-destiny.js";

// 사주 종합(section_summary)·대운 풀이(section_daewun)·퀀텀 명리 엔진(rpt_quantumCard)·
// 극T 관계 회로(sukuyo-extreme-t-relationship)·숙요 인연 도감(sukuyo-relationship-encyclopedia)·숙요 본성 심화 해석(sukuyo-nature-deep-dive)
// ·숙요 기본 궁합(compat-sukuyo-compatibility)·정밀 궁합 확장(premium-sukuyo-compat-extra)·에너지 원정 리포트(rpt_energyCoordCard)
// ·요주의 빌런 블랙리스트(rpt_villainCard)·명리 헬스 리포트(rpt_healthReportCard)·나의 매력 클래스(rpt_specialCharmCard)
// ·인생 스킬 트리(rpt_skillTreeCard)·시크릿 하우스(rpt_secretHouseEntryCard)·십이운성 동물점(animal-destiny-unlock) 본문을 서버에서 만든다.
// 계산 흐름은 js/saju-engine.js 의 사주 계산(원국 → 대운 브릿지 → 종격 판정 → 용신 정책)을 그대로 따른다.
// 숙요 기본 궁합(compat-sukuyo-compatibility)·정밀 궁합 확장(premium-sukuyo-compat-extra)은 회당 결제다 — 라우트가 이번 결제 1건을 상대 조합 1건에 묶는다.
export const SUKUYO_COMPAT_FEATURE_KEYS = Object.freeze(["compat-sukuyo-compatibility", "premium-sukuyo-compat-extra"]);
// 자미두수 명반 상세(_renderZwPanel)의 출생 해금 유료 장. 한 번에 모든 장을 계산하고 요청한 장만 돌려준다.
export const ZIWEI_SECTION_FEATURE_KEYS = Object.freeze(["ziwei_decade_luck", "ziwei_twelve_palaces", "ziwei_love_deep", "ziwei_symbolic_layer"]);
// 자미두수 궁합(회당 결제). 내 명반은 위 자미 장과 같은 명반(window._ziweiBirth·GENDER), 상대는 요청의 생년월일·시각·도시로 계산한다.
export const ZIWEI_COMPAT_FEATURE_KEYS = Object.freeze(["compat-ziwei-compatibility"]);
export const SAJU_SECTION_FEATURE_KEYS = Object.freeze(["section_summary", "section_daewun", "rpt_quantumCard", "sukuyo-extreme-t-relationship", "sukuyo-relationship-encyclopedia", "sukuyo-nature-deep-dive", ...SUKUYO_COMPAT_FEATURE_KEYS, "rpt_energyCoordCard", "rpt_villainCard", "rpt_healthReportCard", "rpt_specialCharmCard", "rpt_skillTreeCard", "rpt_secretHouseEntryCard", "animal-destiny-unlock", ...ZIWEI_SECTION_FEATURE_KEYS, ...ZIWEI_COMPAT_FEATURE_KEYS]);
// 클라이언트 출생지 선택의 기본 옵션(index.html #birthCountry 의 대한민국 서울).
const DEFAULT_PLACE = Object.freeze({ name: "대한민국 (서울)", longitude: 127.0, latitude: 37.6, timezone: "Asia/Seoul", baseTzOffset: 9 });

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

// 자미두수 궁합 상대 입력: 화면이 보낸 생년월일(YYYY-MM-DD, 양력)·시각(HH:MM)·출생 도시(선택 옵션의 값·경위도·기준 시간대·이름).
// 도시 이름은 리포트 참고 기록의 글자로 그대로 들어가므로 <·>·& 를 받지 않는다. 상대 성별은 본문 계산에 쓰이지 않는다(화면 안내 문구 전용).
function normalizeZiweiPartner(raw) {
  const partner = raw && typeof raw === "object" ? raw : {};
  const city = partner.city && typeof partner.city === "object" ? partner.city : {};
  const invalid = () => new SajuSectionInputError("상대방 생년월일, 태어난 시간, 태어난 도시를 확인해 주세요.", "SAJU_INVALID_PARTNER");
  const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : NaN);
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(partner.date || ""));
  const time = /^(\d{2}):(\d{2})$/.exec(String(partner.time || ""));
  if (!date || !time) throw invalid();
  const [year, month, day] = [Number(date[1]), Number(date[2]), Number(date[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || year > 2100 || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || Number(time[1]) > 23 || Number(time[2]) > 59) throw invalid();
  const name = typeof city.name === "string" ? city.name.trim() : "";
  const timezone = typeof city.timezone === "string" ? city.timezone : "";
  const longitude = num(city.longitude);
  const latitude = num(city.latitude);
  const baseTzOffset = num(city.baseTzOffset);
  if (!name || name.length > 80 || /[<>&]/.test(name) || !/^[A-Za-z_/+-]{1,64}$/.test(timezone)
    || !(Math.abs(longitude) <= 180) || !(Math.abs(latitude) <= 90) || !(Math.abs(baseTzOffset) <= 14)) throw invalid();
  return { bDate: date[0], bTime: time[0], city: { name, timezone, longitude, latitude, baseTzOffset } };
}

function documentShim(neo, captured, quantum, cardDom) {
  const classList = { contains: (name) => neo && name === "neo-mode" };
  return {
    cookie: "",
    body: { classList },
    documentElement: { classList },
    // 에너지 카드의 룰렛 스타일·빌런 카드의 도시에 스타일·헬스 리포트의 글꼴 선언은 <head> 에 붙는다 — 그 CSS 를 받아 응답으로 돌려준다.
    head: { appendChild: (node) => { cardDom.css = String(node?.textContent || ""); } },
    createElement: () => ({ id: "", textContent: "" }),
    getElementById: (id) => (id === "summaryArea" ? captured : id === "quantumSection" ? quantum.area : id === "quantumCard" ? quantum.card : cardDom.byId[id] || null),
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
  const rt = createSajuSectionRuntime({ window, document: documentShim(false, { innerHTML: "" }, { area: { innerHTML: "" }, card: { style: {} } }, { css: "", byId: {} }), localStorage: window.localStorage, neo: false, lang, now: input.now instanceof Date ? input.now : new Date() });
  return {
    html: rt.renderSukuyoEncyclopediaPaid({
      userName: String(raw.userName || "").slice(0, 40),
      userMansionIdx: idx,
      userMansion: String(raw.userMansion || "").slice(0, 20),
    }),
  };
}

// 숙요 본성 심화 해석의 천문 계산 입력. 생년월일·시각은 해금을 확인한 출생 정보(프로필 카드)에서,
// 출생지(경도·위도·IANA 시간대)는 요청 값에서 가져온다 — 화면이 보낸 본명숙·달 황경은 받지 않는다.
export function sukuyoNatureMoment(birth = {}, place) {
  const date = String(birth.calendarDate || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new SajuSectionInputError("생년월일을 확인해 주세요.", "SAJU_INVALID_BIRTH");
  const calendarType = ["solar", "lunar", "lunar_leap"].includes(birth.calType) ? birth.calType : "solar";
  const timeUnknown = birth.timeKnown === false;
  const hour = timeUnknown ? 12 : Math.trunc(finite(birth.hour, NaN));
  const minute = timeUnknown ? 0 : Math.trunc(finite(birth.minute, 0));
  if (!(hour >= 0 && hour <= 23) || !(minute >= 0 && minute <= 59)) throw new SajuSectionInputError("출생 시각을 확인해 주세요.", "SAJU_INVALID_BIRTH");
  const where = normalizePlace(place);
  const [year, month, day] = date.split("-").map(Number);
  return {
    calendarType, year, month, day, hour, minute, timezone: where.timezone,
    latitude: where.latitude, longitude: where.longitude, birthTimeKnown: !timeUnknown,
  };
}

// 숙요 본성 심화 해석은 서버가 출생 순간의 달 황경(input.sukuyo, calculateSukuyoForMoment 결과)으로 본명숙을 다시 정해 그린다.
function sukuyoRuntime(input) {
  const lang = input.lang || "ko";
  const window = {
    location: { search: "", pathname: "/", hostname: "" }, localStorage: memoryStorage(), cdGetCurrentLanguage: () => lang,
    __cdBuildSukuyoFromMoonLongitude: buildSukuyoFromMoonLongitude,
  };
  return createSajuSectionRuntime({ window, document: documentShim(false, { innerHTML: "" }, { area: { innerHTML: "" }, card: { style: {} } }, { css: "", byId: {} }), localStorage: window.localStorage, neo: false, lang, now: input.now instanceof Date ? input.now : new Date() });
}

function buildNatureDeepDiveHtml(input) {
  const longitude = Number(input.sukuyo?.moonEclipticLongitude);
  if (!Number.isFinite(longitude)) throw new Error("SUKUYO_NATURE_MOON_LONGITUDE_MISSING");
  const result = sukuyoRuntime(input).renderSukuyoNatureDeepDivePaid({ moonEclipticLongitude: longitude });
  if (!result || !result.html) throw new Error("SUKUYO_NATURE_RENDER_FAILED");
  return { html: result.html, mansion: result.mansion, mansionIdx: result.mansionIdx };
}

// 숙요 기본 궁합·정밀 궁합 확장(회당 결제): 두 사람의 수(宿)는 서버가 출생 순간의 달 황경(input.sukuyo.mine·partner,
// calculateSukuyoForMoment 결과)으로 다시 정한다 — 화면의 숙 번호는 받지 않는다. 한 번의 계산이 기본 보고서(html)와
// 정밀 확장(precisionHtml)을 함께 만들고, 라우트가 결제를 확인한 키의 본문만 응답에 싣는다.
function buildSukuyoCompatHtml(input) {
  const mine = Number(input.sukuyo?.mine?.moonEclipticLongitude);
  const partner = Number(input.sukuyo?.partner?.moonEclipticLongitude);
  if (!Number.isFinite(mine) || !Number.isFinite(partner)) throw new Error("SUKUYO_COMPAT_MOON_LONGITUDE_MISSING");
  const partnerGender = input.partnerGender === "M" || input.partnerGender === "F" ? input.partnerGender : "OTHER";
  const result = sukuyoRuntime(input).renderSukuyoCompatPaid({
    myMoonEclipticLongitude: mine, partnerMoonEclipticLongitude: partner, partnerGender, userGender: input.gender,
  });
  if (!result || !result.html || !result.precisionHtml) throw new Error("SUKUYO_COMPAT_RENDER_FAILED");
  return result;
}

// 에너지 원정 리포트는 브라우저 localStorage 의 두 목록을 읽고 쓴다 — 최근에 보여 준 여행지(화면 중복 방지)와
// 프로필별 룰렛 당첨 기록. 서버는 요청 본문의 목록을 그 자리에 넣고, 본문이 쓴 목록을 응답으로 돌려준다.
const ENERGY_RECENT_KEY = "energyCoordRecentDestinationsV1";
const ENERGY_ROULETTE_PREFIX = "code-destiny-energy-roulette-";
const ENERGY_ROULETTE_MODES = new Set(["domestic", "global", "monthly", "mixed"]);
const ENERGY_MAX_SPIN = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const idList = (value, max) => (Array.isArray(value) ? value.filter((id) => typeof id === "string" && id.length <= 120).slice(0, max) : []);

function energyStorage(recent, roulette) {
  const slot = (key) => (String(key).startsWith(ENERGY_ROULETTE_PREFIX) ? "roulette" : String(key));
  const values = new Map([[ENERGY_RECENT_KEY, JSON.stringify(recent)], ["roulette", JSON.stringify(roulette)]]);
  return {
    getItem: (key) => (values.has(slot(key)) ? values.get(slot(key)) : null),
    setItem: (key, value) => { values.set(slot(key), String(value)); },
    removeItem: (key) => { values.delete(slot(key)); },
    list: (key) => { try { return idList(JSON.parse(values.get(key) || "[]"), 60); } catch { return []; } },
  };
}

// 룰렛 버튼·원판·결과 칸 대역. 버튼 클릭 리스너를 받아 두었다가 요청한 회차만큼 누른다.
function energyRouletteElements() {
  const classList = { add() {}, remove() {} };
  const listeners = {};
  const buttons = [...ENERGY_ROULETTE_MODES].map((mode) => ({
    disabled: false, style: {}, getAttribute: () => mode,
    addEventListener: (type, fn) => { if (type === "click") listeners[mode] = fn; },
  }));
  return {
    listeners,
    wheel: { classList, style: {} },
    result: { innerHTML: "", querySelector: () => null },
    card: { querySelectorAll: () => buttons },
    deck: { classList },
  };
}

// 시크릿 하우스는 사주 셸을 쓰지 않는다 — 일간(게임 시작 때 고른 스타일)·일지와 선택 기록으로 에피소드를 다시 밟는다.
// 일간은 원본 페이지처럼 고른 값을 받는다(어느 일간이든 같은 대본이 열린다. 처음 고를 때 내 일간이 미리 선택된다).
// 일지는 출생 정보가 있으면(프로필 해금이면 그 카드의 출생) 그 원국의 일지를 쓰고, 출생 없이 연 옛 계정 해금만 화면 값을 받는다.
function buildSecretHouseHtml(input) {
  const house = input.house && typeof input.house === "object" ? input.house : {};
  const birth = input.birth || {};
  let natalDay = "";
  if (String(birth.calendarDate || "")) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birth.calendarDate))) throw new SajuSectionInputError("생년월일을 확인해 주세요.", "SAJU_INVALID_BIRTH");
    const timeUnknown = birth.timeKnown === false;
    const hour = timeUnknown ? 12 : Math.trunc(finite(birth.hour, NaN));
    const minute = timeUnknown ? 0 : Math.trunc(finite(birth.minute, 0));
    if (!(hour >= 0 && hour <= 23) || !(minute >= 0 && minute <= 59)) throw new SajuSectionInputError("출생 시각을 확인해 주세요.", "SAJU_INVALID_BIRTH");
    const place = normalizePlace(input.place);
    try {
      natalDay = String(calculateNatalSaju({
        birthDate: birth.calendarDate, calendarType: ["solar", "lunar", "lunar_leap"].includes(birth.calType) ? birth.calType : "solar", birthTimeUnknown: timeUnknown,
        birthTime: `${pad(hour, 2)}:${pad(minute, 2)}`,
        birthPlace: { name: place.name, longitude: place.longitude, latitude: place.latitude, timezone: place.timezone },
      }).pillars.day || "");
    } catch {
      throw new SajuSectionInputError("생년월일을 확인해 주세요.", "SAJU_INVALID_BIRTH");
    }
  }
  const fail = (message, code) => { throw new SajuSectionInputError(message, code); };
  return {
    house: buildSecretHouseStep({
      stem: house.stem || natalDay.charAt(0), branch: natalDay ? natalDay.charAt(1) : house.branch,
      history: house.history, finalCharId: house.finalCharId,
    }, fail),
  };
}

// 십이운성 동물점은 출생지 입력이 없는 화면이다 — localSajuCalculator.calculateLocalSaju 처럼 출생지 없이(서울 기본) 원국을 세운다.
// 시각을 모르면 시주 없이 계산한다(화면 parseBirthTime 이 빈 시각을 hasTime=false 로 넘기는 것과 같다).
function buildAnimalDestinyHtml(input) {
  const birth = input.birth || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birth.calendarDate || ""))) throw new SajuSectionInputError("생년월일을 확인해 주세요.", "SAJU_INVALID_BIRTH");
  const calType = ["solar", "lunar", "lunar_leap"].includes(birth.calType) ? birth.calType : "solar";
  const timeUnknown = birth.timeKnown === false;
  const hour = timeUnknown ? 0 : Math.trunc(finite(birth.hour, NaN));
  const minute = timeUnknown ? 0 : Math.trunc(finite(birth.minute, 0));
  if (!(hour >= 0 && hour <= 23) || !(minute >= 0 && minute <= 59)) throw new SajuSectionInputError("출생 시각을 확인해 주세요.", "SAJU_INVALID_BIRTH");
  let pillars;
  try {
    pillars = calculateNatalSaju({
      birthDate: birth.calendarDate, birthTime: timeUnknown ? undefined : `${pad(hour, 2)}:${pad(minute, 2)}`,
      calendarType: calType, isLeapMonth: calType === "lunar_leap", birthPlace: undefined,
    }, { allowMissingLongitude: false }).pillars;
  } catch {
    throw new SajuSectionInputError("생년월일을 확인해 주세요.", "SAJU_INVALID_BIRTH");
  }
  const animal = buildAnimalDestinyReading(pillars, timeUnknown);
  if (!animal) throw new SajuSectionInputError("생년월일을 확인해 주세요.", "SAJU_INVALID_BIRTH");
  return { animal };
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
 * input.jongDecision(옛 종격 검증 모달의 답)은 옛 클라이언트 호환으로 받기만 하고 쓰지 않는다. 종격은 원국으로만 판정한다.
 * @param {{age:number, gan:string, zhi:string}} [input.daewun] section_daewun 에서 펼친 대운
 * @param {Date} [input.now] 현재 나이·퀀텀 카드의 오늘 간지·에너지 카드의 오늘 날짜 기준 시각
 * @param {{userName:string, userMansionIdx:number, userMansion:string}} [input.encyclopedia] 숙요 인연 도감의 화면 입력(출생 정보는 쓰지 않는다)
 * @param {{moonEclipticLongitude:number}|{mine:{moonEclipticLongitude:number}, partner:{moonEclipticLongitude:number}}} [input.sukuyo]
 *   숙요 본성 심화 해석(본인)·숙요 궁합(본인·상대)의 서버 천문 계산 결과(calculateSukuyoForMoment)
 * @param {"M"|"F"|"OTHER"} [input.partnerGender] 숙요 궁합 상대 성별
 * @param {{recent?:string[], renderedAt?:string, roulette?:{mode:string, spin:number, recent?:string[]}}} [input.energy]
 *   rpt_energyCoordCard 의 브라우저 저장 목록과 룰렛 회차(mode·몇 번째 돌림·카드를 그린 시각)
 * @param {{stem?:string, branch?:string, history?:string[], finalCharId?:string}} [input.house] rpt_secretHouseEntryCard 의 고른 일간·선택 기록·최종 선택
 * @returns {{html:string, sajuBaseHtml?:string, prescriptionHtml?:string}} 극T 는 관계·연애·현실 패널(html)과 사주 기반 해석·처방전 패널을 따로 돌려준다
 */
export function buildSajuSectionHtml(input) {
  const featureKey = String(input?.featureKey || "");
  if (!SAJU_SECTION_FEATURE_KEYS.includes(featureKey)) throw new SajuSectionInputError("지원하지 않는 항목입니다.", "SAJU_INVALID_FEATURE");
  if (featureKey === "sukuyo-relationship-encyclopedia") return buildEncyclopediaHtml(input);
  if (featureKey === "sukuyo-nature-deep-dive") return buildNatureDeepDiveHtml(input);
  if (SUKUYO_COMPAT_FEATURE_KEYS.includes(featureKey)) return buildSukuyoCompatHtml(input);
  if (featureKey === "rpt_secretHouseEntryCard") return buildSecretHouseHtml(input);
  if (featureKey === "animal-destiny-unlock") return buildAnimalDestinyHtml(input);
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
  const ziweiPartner = ZIWEI_COMPAT_FEATURE_KEYS.includes(featureKey) ? normalizeZiweiPartner(input.partner) : null;

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
  const requestNow = input.now instanceof Date ? input.now : new Date();
  // 에너지 룰렛 회차 요청은 카드를 그린 시각(renderedAt)으로 다시 그린다 — 오늘 날짜·추첨 시드가 그 화면과 같아야 한다.
  const energyInput = featureKey === "rpt_energyCoordCard" && input.energy && typeof input.energy === "object" ? input.energy : {};
  const roulette = energyInput.roulette && typeof energyInput.roulette === "object" ? energyInput.roulette : null;
  if (roulette && (!ENERGY_ROULETTE_MODES.has(roulette.mode) || !Number.isInteger(roulette.spin) || roulette.spin < 1 || roulette.spin > ENERGY_MAX_SPIN)) {
    throw new SajuSectionInputError("룰렛을 다시 돌려 주세요.", "SAJU_INVALID_ROULETTE");
  }
  const renderedAt = new Date(typeof energyInput.renderedAt === "string" ? energyInput.renderedAt : NaN);
  const now = roulette && Math.abs(renderedAt.getTime() - requestNow.getTime()) <= DAY_MS ? renderedAt : requestNow;
  const storage = featureKey === "rpt_energyCoordCard" ? energyStorage(idList(energyInput.recent, 60), idList(roulette?.recent, 7)) : memoryStorage();
  const rouletteEls = roulette ? energyRouletteElements() : null;
  // 리포트 대시보드 카드가 그리는 칸. 빌런 카드의 복사·자가진단 버튼 연결과 헬스 리포트의 장 펼침 높이 맞춤은
  // 브라우저(section-client.js)가 맡는다.
  const cardDom = {
    css: "",
    byId: {
      energyCoordSection: { innerHTML: "" }, energyCoordCard: { style: {}, dataset: {} },
      villainResult: { innerHTML: "", querySelectorAll: () => [] }, villainCard: { style: {} },
      healthReportSection: { innerHTML: "", querySelectorAll: () => [] }, healthReportCard: { style: {} },
      skillTreeSection: { innerHTML: "", setAttribute() {} }, skillTreeCard: { style: {}, setAttribute() {} },
      ...(rouletteEls ? { energyRouletteCard: rouletteEls.card, energyRouletteWheel: rouletteEls.wheel, energyRouletteDeck: rouletteEls.deck, energyRouletteResult: rouletteEls.result } : {}),
    },
  };
  // 룰렛 결과는 원본에서 520ms 뒤에 그려진다. 서버는 마지막 회차의 그 단계만 바로 돌린다.
  let pendingSpin = null;
  const window = { location: { search: "", pathname: "/", hostname: "" }, localStorage: storage, cdGetCurrentLanguage: () => input.lang || "ko" };
  const doc = documentShim(neo, captured, quantum, cardDom);
  const rt = createSajuSectionRuntime({
    window, document: doc, localStorage: storage, neo, lang: input.lang || "ko", now,
    ...(roulette ? { setTimeout: (fn) => { pendingSpin = fn; } } : {}),
  });

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
  const jong = detectJong(p);
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

  if (ziweiPartner) {
    // 화면(renderZiwei 안 window._runZwCompatibilityCore)과 같은 내 명반·같은 상대 보정 시각. pair 는 라우트가 결제 1건을 묶는 두 사람의 입력이다.
    const compat = rt.renderZiweiCompatPaid(ziweiPartner);
    if (!compat || !compat.html) throw new SajuSectionInputError("상대 정보 계산 중 오류가 발생했습니다. 입력값을 확인해 주세요.", "SAJU_INVALID_PARTNER");
    return { ...compat, pair: { birth: { calendarDate: birth.calendarDate, calType, timeUnknown, hour, minute }, gender, place, partner: ziweiPartner } };
  }
  if (ZIWEI_SECTION_FEATURE_KEYS.includes(featureKey)) {
    // 화면(computeProfileForModal → renderZiwei)과 같은 명반: 진태양시 보정 시각(window._ziweiBirth)·GENDER·CURRENT_AGE.
    const bodies = rt.renderZiweiPaidSections();
    if (featureKey === "ziwei_decade_luck") return { html: bodies.ziwei_decade_luck.html, decadeHtml: bodies.ziwei_decade_luck.decadeHtml };
    return { html: bodies[featureKey] };
  }
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
  if (featureKey === "rpt_energyCoordCard") {
    // 본문을 그리면 최근 여행지 목록이 갱신된다. 룰렛 회차 요청에서는 그 갱신 전 목록(요청 값)으로 같은 화면을 다시 만든다.
    rt.renderEnergyCoord(natal);
    if (!roulette) {
      return { html: cardDom.byId.energyCoordSection.innerHTML, css: cardDom.css, energy: { recent: storage.list(ENERGY_RECENT_KEY), renderedAt: now.toISOString() } };
    }
    for (let spin = 1; spin <= roulette.spin; spin += 1) {
      pendingSpin = null;
      rouletteEls.listeners[roulette.mode]?.();
    }
    if (pendingSpin) pendingSpin();
    return { html: rouletteEls.result.innerHTML, energy: { transform: String(rouletteEls.wheel.style.transform || ""), roulette: storage.list("roulette").slice(0, 7) } };
  }
  if (featureKey === "rpt_villainCard") {
    rt.renderVillain(p, power);
    return { html: cardDom.byId.villainResult.innerHTML, css: cardDom.css };
  }
  if (featureKey === "rpt_healthReportCard") {
    // 브라우저에서는 셸 전역(G_BAZI·SHENG)과 document 가 곧 window 속성이다. 건강 블록은 w.G_BAZI·w.SHENG·w.document 로 읽는다.
    Object.assign(window, { G_BAZI: bazi, SHENG: rt.SHENG, document: doc });
    rt.renderHealthReport(p, natal, johu, power, jong);
    return { html: cardDom.byId.healthReportSection.innerHTML, css: cardDom.css };
  }
  if (featureKey === "rpt_specialCharmCard") {
    // 원본은 카드 틀(#specialCharmCard)째 HTML 을 만들어 결과 화면에 끼운다. 브라우저에는 그 틀이 무료 스텁으로 이미 있으므로
    // 틀 안쪽 본문만 보낸다(본문 칸 #specialCharmBody 에 들어간다).
    const full = rt.renderSpecialCharm(p, natal);
    const open = '<div id="specialCharmCard" style="margin-top:15px">';
    if (!full.startsWith(open) || !full.endsWith("</div>")) throw new Error("special charm card wrapper changed");
    return { html: full.slice(open.length, -"</div>".length) };
  }
  if (featureKey === "rpt_skillTreeCard") {
    // 클래스 시트만 보낸다(본문 칸 #skillTreeBody 에 들어간다). 시트 스타일은 브라우저 스텁이 먼저 깔고, 그 아래 퀘스트 칸은
    // 브라우저(js/entertain-engine.js renderSkillTree 오버라이드)가 붙인다.
    rt.renderSkillTree(p, natal);
    return { html: cardDom.byId.skillTreeSection.innerHTML, css: cardDom.css };
  }
  const dw = input.daewun || {};
  const row = rows.find((r) => r.age === Number(dw.age) && r.g === dw.gan && r.j === dw.zhi);
  if (!row) throw new SajuSectionInputError("대운을 다시 선택해 주세요.", "SAJU_INVALID_DAEWUN");
  return { html: rt.buildDaewunDetailHtml(row.age, row.g, row.j), daewun: { age: row.age, gan: row.g, zhi: row.j } };
}

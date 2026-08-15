// 오늘의 베다점 상세 — 순수 판정 레이어(I/O 비의존).
//
// 세 점술 중 베다가 가장 얇았다. assembleTodayMoon 이 내는 것은 나크샤트라 이름과
// 타라 발라 한 줄(9종 desc)뿐이라, 홈 카드의 본문이 "깊은 인연과 지원의 날" 같은 한 조각이었다.
// 여기서 **판창가(Pañcāṅga) 다섯 요소**로 채운다.
//
// 🔴 추가 천체 계산은 0회다. getSwissVedicPlanets 가 이미 Sun·Moon 시데리얼 황경을 함께
//    돌려주므로(worker/lib/swiss-ephemeris.js), 라우트가 그 둘을 넘겨주기만 하면 된다.
// 🔴 판창가는 **니라야나(시데리얼) 황경**으로 계산한다. 티티·카라나는 (달−해)라 아야남사가
//    상쇄되지만 요가는 (해+달)이라 상쇄되지 않는다 — 그래서 트로피컬로 환산하면 틀린다.
// 🔴 빔쇼타리 다샤는 여기서 절대 내보내지 않는다(유료: unlock.nakshatra_dasha_map ·
//    nakshatra-lord-report). 여러 날 랭킹·목적별 적합도도 금지(유료: nakshatra-muhurta).

import { GRAHA_KO, nakshatraInfo, signKoName, SIGN_LORDS } from "./vedic-derived-calculations.js";
import { getNakshatraAttributes, getPadaDetail } from "../../constants/nakshatra-attributes.js";

// ── 판창가 표 ──────────────────────────────────────────────────────────────

// 바라(vāra) — 요일 지배성. 일=0 … 토=6.
const VARA = Object.freeze([
  { ko: "일요일", lord: "Sun", theme: "중심을 세우고 나서는" },
  { ko: "월요일", lord: "Moon", theme: "마음을 돌보고 다독이는" },
  { ko: "화요일", lord: "Mars", theme: "결단하고 밀어붙이는" },
  { ko: "수요일", lord: "Mercury", theme: "말하고 배우고 연결하는" },
  { ko: "목요일", lord: "Jupiter", theme: "넓히고 가르치고 베푸는" },
  { ko: "금요일", lord: "Venus", theme: "어울리고 누리고 가꾸는" },
  { ko: "토요일", lord: "Saturn", theme: "견디고 정리하고 매듭짓는" },
]);

// 티티 1~15(파크샤 안에서의 순번). 15번째는 파크샤에 따라 이름이 갈린다.
const TITHI_NAMES = Object.freeze([
  "프라티파다", "드위티야", "트리티야", "차투르티", "판차미",
  "샤슈티", "삽타미", "아슈타미", "나바미", "다샤미",
  "에카다시", "드와다시", "트라요다시", "차투르다시", "",
]);

// 티티 5군(nanda/bhadra/jaya/rikta/purna) — 어떤 일에 어울리는 날인지의 전통 분류.
const TITHI_GROUP = Object.freeze([
  { key: "난다", line: "기쁨의 날. 시작하고 축하하는 일에 어울립니다." },
  { key: "바드라", line: "결실의 날. 살림과 일을 챙기기 좋습니다." },
  { key: "자야", line: "승리의 날. 겨루고 담판하는 일에 힘이 붙습니다." },
  { key: "릭타", line: "비는 날. 새로 시작하기보다 비우고 정리하세요." },
  { key: "푸르나", line: "가득 찬 날. 마무리하고 매듭짓기에 좋습니다." },
]);

// 요가 27종(니티야 요가). 통상 흉으로 보는 것만 표시하고 나머지는 중립으로 둔다.
const YOGA_NAMES = Object.freeze([
  "비슈캄바", "프리티", "아유슈만", "사우바갸", "쇼바나", "아티간다", "수카르마", "드리티", "슐라",
  "간다", "브리디", "드루바", "뱌가타", "하르샤나", "바즈라", "싯디", "뱌티파타", "바리야나",
  "파리가", "시바", "싯다", "사디야", "슈바", "슈클라", "브라흐마", "인드라", "바이드리티",
]);
// 전통적으로 피하는 요가(인덱스 0-base). 아티간다·슐라·간다·뱌가타·바즈라·뱌티파타·파리가·바이드리티.
const YOGA_CAUTION = Object.freeze(new Set([5, 8, 9, 12, 14, 16, 18, 26]));

// 카라나 11종. 한 티티는 카라나 둘로 쪼개져 한 달에 60개가 온다.
const MOVABLE_KARANA = Object.freeze(["바바", "발라바", "카울라바", "타이틸라", "가라", "바니자", "비슈티"]);
const KARANA_LINE = Object.freeze({
  바바: "이어 가기 좋은 카라나입니다. 하던 일을 그대로 밀고 나가세요.",
  발라바: "배우고 익히기 좋은 카라나입니다.",
  카울라바: "사람과 맺기 좋은 카라나입니다.",
  타이틸라: "쌓고 저장하기 좋은 카라나입니다.",
  가라: "심고 기르기 좋은 카라나입니다.",
  바니자: "주고받고 거래하기 좋은 카라나입니다.",
  비슈티: "전통적으로 피하는 카라나(바드라)입니다. 중요한 시작은 이 구간을 넘겨 잡으세요.",
  샤쿠니: "마무리와 약을 다루는 데 쓰는 카라나입니다.",
  차투슈파다: "가축과 재물을 살피는 카라나입니다.",
  나가: "조심스레 지키는 카라나입니다.",
  킴스투그나: "선한 일을 시작하기 좋은 카라나입니다.",
});

// 라후칼람 — 낮(일출~일몰)을 여덟로 나눈 한 구간. 요일마다 자리가 다르다.
// 일출 06:00 · 일몰 18:00 의 표준 기준표이며, 실제 일출·일몰과는 계절에 따라 차이가 난다.
const RAHU_KALAM = Object.freeze([
  "16:30~18:00", "07:30~09:00", "15:00~16:30", "12:00~13:30", "13:30~15:00", "10:30~12:00", "09:00~10:30",
]);
// 아비지트 무후르타 — 낮의 여덟 번째 무후르타(정오 전후). 수요일에는 쓰지 않는 것이 관례다.
const ABHIJIT = "11:36~12:24";

// ── 계산 ──────────────────────────────────────────────────────────────────

function norm360(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return ((n % 360) + 360) % 360;
}

/**
 * 판창가 다섯 요소. 입력은 **니라야나(시데리얼) 황경**이다.
 *
 * @param {{sunLon:number, moonLon:number, weekday:number}} input weekday: 0=일 … 6=토
 */
export function computePanchanga({ sunLon, moonLon, weekday }) {
  const sun = norm360(sunLon);
  const moon = norm360(moonLon);
  if (!Number.isFinite(sun) || !Number.isFinite(moon)) return null;
  const dow = Number.isInteger(weekday) ? ((weekday % 7) + 7) % 7 : null;

  // 티티 — (달−해)를 12°로 나눈다. 1~30.
  const elongation = norm360(moon - sun);
  const tithiIndex = Math.min(29, Math.floor(elongation / 12)); // 0-base
  const tithiNumber = tithiIndex + 1;
  const paksha = tithiNumber <= 15 ? "슈클라(밝아지는 보름)" : "크리슈나(어두워지는 보름)";
  const inPaksha = ((tithiNumber - 1) % 15) + 1;
  const tithiName = inPaksha === 15
    ? (tithiNumber === 15 ? "푸르니마(보름)" : "아마바스야(그믐)")
    : TITHI_NAMES[inPaksha - 1];
  const tithiGroup = TITHI_GROUP[(inPaksha - 1) % 5];

  // 카라나 — 반(半)티티. 한 달 60개 중 1번은 킴스투그나, 58~60번은 샤쿠니·차투슈파다·나가로 고정.
  const karanaIndex = Math.min(59, Math.floor(elongation / 6)); // 0-base, 0..59
  let karanaName;
  if (karanaIndex === 0) karanaName = "킴스투그나";
  else if (karanaIndex === 57) karanaName = "샤쿠니";
  else if (karanaIndex === 58) karanaName = "차투슈파다";
  else if (karanaIndex === 59) karanaName = "나가";
  else karanaName = MOVABLE_KARANA[(karanaIndex - 1) % 7];

  // 요가 — (해+달)을 13°20' 로 나눈다. 1~27.
  const yogaIndex = Math.min(26, Math.floor(norm360(sun + moon) / (360 / 27)));

  const nak = nakshatraInfo(moon);
  const vara = dow == null ? null : VARA[dow];

  return {
    vara: vara ? { ...vara, lordKo: GRAHA_KO[vara.lord] || vara.lord } : null,
    tithi: { number: tithiNumber, inPaksha, name: tithiName, paksha, group: tithiGroup.key, groupLine: tithiGroup.line },
    nakshatra: { index: nak.index, pada: nak.pada, lord: nak.lord, lordKo: GRAHA_KO[nak.lord] || nak.lord },
    yoga: { number: yogaIndex + 1, name: YOGA_NAMES[yogaIndex], caution: YOGA_CAUTION.has(yogaIndex) },
    karana: { number: karanaIndex + 1, name: karanaName, line: KARANA_LINE[karanaName] || "" },
    rahuKalam: dow == null ? "" : RAHU_KALAM[dow],
    abhijit: dow === 3 ? "" : ABHIJIT, // 수요일은 아비지트를 쓰지 않는다
  };
}

function panchangaSections(panchanga, moonLon) {
  const sections = [];
  const attrs = getNakshatraAttributes(panchanga.nakshatra.index);
  const pada = getPadaDetail(panchanga.nakshatra.index, panchanga.nakshatra.pada);

  // 1) 판창가 다섯 요소
  const items = [];
  if (panchanga.vara) {
    items.push({ label: "바라(요일)", value: `${panchanga.vara.ko} · 지배성 ${panchanga.vara.lordKo}`, note: `${panchanga.vara.theme} 결이 하루에 깔립니다.` });
  }
  items.push({
    label: "티티(음력 일)",
    value: `${panchanga.tithi.paksha} ${panchanga.tithi.name}`,
    note: `${panchanga.tithi.group}군 — ${panchanga.tithi.groupLine}`,
  });
  if (attrs) {
    items.push({
      label: "나크샤트라(달자리)",
      value: `${attrs.nameKo}(${attrs.nameEn}) ${panchanga.nakshatra.pada}파다`,
      note: `지배성 ${panchanga.nakshatra.lordKo}${pada ? ` · 나바암샤 ${pada.navamsaSignKo}` : ""}`,
    });
  }
  items.push({
    label: "요가",
    value: `${panchanga.yoga.name}(제${panchanga.yoga.number})`,
    note: panchanga.yoga.caution ? "전통적으로 큰 시작을 피하는 요가입니다." : "무난한 요가입니다.",
  });
  items.push({ label: "카라나", value: `${panchanga.karana.name}(제${panchanga.karana.number})`, note: panchanga.karana.line });
  sections.push({ key: "panchanga", title: "판창가 — 오늘의 다섯 요소", items });

  // 2) 달자리 속성
  if (attrs) {
    sections.push({
      key: "nakshatra",
      title: "오늘 달이 머무는 별자리",
      items: [
        { label: "상징", value: attrs.symbol || "", note: attrs.shakti ? `고유한 힘 — ${attrs.shakti}` : "" },
        { label: "신격", value: attrs.deity || "", note: attrs.deityRole || "" },
        { label: "기질", value: `${attrs.ganaKo} · ${attrs.nadiKo}` },
        { label: "삶의 동기", value: attrs.motiveKo || "" },
      ].filter((item) => item.value),
    });
  }

  // 3) 찬드라 라시
  const rashiKo = signKoName(moonLon);
  const rashiLord = SIGN_LORDS[Math.floor(norm360(moonLon) / 30)];
  if (rashiKo) {
    sections.push({
      key: "rashi",
      title: "찬드라 라시 — 오늘 달이 든 자리",
      lines: [`오늘 달은 ${rashiKo}에 머뭅니다. 이 자리의 지배성은 ${GRAHA_KO[rashiLord] || rashiLord}입니다.`,
        "베다 점성술은 태양궁이 아니라 달이 든 자리(찬드라 라시)를 하루 기분과 마음의 기준으로 봅니다."],
    });
  }

  // 4) 시간
  const timeItems = [];
  if (panchanga.rahuKalam) {
    timeItems.push({ label: "라후 칼람", value: panchanga.rahuKalam, note: "새로 시작하거나 계약하는 일을 피하는 구간입니다." });
  }
  timeItems.push(
    panchanga.abhijit
      ? { label: "아비지트 무후르타", value: panchanga.abhijit, note: "낮의 여덟 번째 무후르타로, 시작에 두루 좋다고 봅니다." }
      : { label: "아비지트 무후르타", value: "오늘은 쓰지 않습니다", note: "수요일의 아비지트는 쓰지 않는 것이 관례입니다." },
  );
  timeItems.push({ label: "기준", value: "일출 06:00 · 일몰 18:00", note: "표준 기준표라 실제 일출·일몰과는 계절에 따라 차이가 납니다." });
  sections.push({ key: "muhurta", title: "오늘의 시간", items: timeItems });

  return sections;
}

/**
 * 오늘의 베다 상세(본명 자리 있음).
 *
 * @param {object} params
 * @param {object} params.panchanga computePanchanga() 결과
 * @param {number} params.moonLon   달 시데리얼 황경
 * @param {object|null} params.taraBala judgeTaraBala() 결과
 * @param {string} params.natalNakshatraKo 본명 나크샤트라 한글명
 */
export function buildTodayVedicDetail({ panchanga, moonLon, taraBala, natalNakshatraKo }) {
  if (!panchanga) return { highlights: [], sections: [] };
  const sections = panchangaSections(panchanga, moonLon);
  const highlights = [];

  if (taraBala) {
    sections.splice(1, 0, {
      key: "tara",
      title: "타라 발라 — 내 본명 자리에서 본 오늘",
      items: [
        { label: "오늘의 타라", value: taraBala.ko, note: taraBala.desc },
        { label: "본명에서의 거리", value: `${taraBala.count}번째 자리`, note: natalNakshatraKo ? `내 본명 나크샤트라는 ${natalNakshatraKo}입니다.` : "" },
      ].filter((item) => item.value),
    });
    highlights.push(`타라 발라 ${taraBala.ko} — ${taraBala.desc}`);
  }

  highlights.push(`티티 ${panchanga.tithi.name} · ${panchanga.tithi.group}군`);
  if (panchanga.rahuKalam) highlights.push(`라후 칼람 ${panchanga.rahuKalam} 은 피하세요`);

  return { highlights: highlights.slice(0, 3), sections };
}

/** 본명 자리 없이도 참인 오늘의 판창가. */
export function buildTodayVedicPublic({ panchanga, moonLon }) {
  if (!panchanga) return null;
  const attrs = getNakshatraAttributes(panchanga.nakshatra.index);
  return {
    anchor: attrs
      ? `오늘의 달자리 · ${attrs.nameKo} (지배성 ${panchanga.nakshatra.lordKo})`
      : "오늘의 달자리",
    headline: panchanga.vara ? `${panchanga.vara.theme} 하루 — ${panchanga.vara.lordKo}의 날` : "오늘의 판창가",
    body: `${panchanga.tithi.paksha} ${panchanga.tithi.name}입니다. ${panchanga.tithi.groupLine}`,
    highlights: [
      `티티 ${panchanga.tithi.name} · ${panchanga.tithi.group}군`,
      panchanga.rahuKalam ? `라후 칼람 ${panchanga.rahuKalam}` : "",
    ].filter(Boolean),
    sections: panchangaSections(panchanga, moonLon),
  };
}

export { VARA, TITHI_NAMES, YOGA_NAMES, MOVABLE_KARANA, RAHU_KALAM, ABHIJIT };

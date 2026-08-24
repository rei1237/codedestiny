/**
 * 사인 히어로 부제 `{기간표기} · {원소} · {지배성}` 24종 생성.
 *
 * 이 줄은 원래 텍스트 노드 셋으로 갈려 있었고, 원소는 `불`·`물` 처럼 **한 글자**라
 * 역인덱스(2자 미만 제외)로는 애초에 손댈 수 없었다. 노드를 하나로 합친 뒤
 * 조합 결과 24개를 통째로 넣는다.
 *
 * 값은 lib/fortune/sign-profiles.ts 에서 읽어 온다 — 여기에 베껴 두면 갈라진다.
 */
import { readFileSync, writeFileSync } from "node:fs";

const LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"];

const src = readFileSync("lib/fortune/sign-profiles.ts", "utf8");
const re = /nameKo:\s*"([^"]+)",[\s\S]*?rangeLabel:\s*"([^"]+)",[\s\S]*?element:\s*"([^"]+)",[\s\S]*?ruler:\s*"([^"]+)"/g;
const PROFILES = [];
for (let m = re.exec(src); m; m = re.exec(src)) {
  PROFILES.push({ nameKo: m[1], rangeLabel: m[2], element: m[3], ruler: m[4] });
}
if (PROFILES.length !== 24) throw new Error(`프로필 24개가 아니라 ${PROFILES.length}개입니다`);

// ── 어휘표 ────────────────────────────────────────────────────────────────────
const MONTH = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  vi: ["thg 1", "thg 2", "thg 3", "thg 4", "thg 5", "thg 6", "thg 7", "thg 8", "thg 9", "thg 10", "thg 11", "thg 12"],
  hi: ["जन", "फ़र", "मार्च", "अप्रैल", "मई", "जून", "जुल", "अग", "सित", "अक्तू", "नव", "दिस"],
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  de: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."],
  nl: ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
  ms: ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"],
};

const ELEMENT4 = {
  ko: { 불: "불", 흙: "흙", 공기: "공기", 물: "물" },
  en: { 불: "Fire", 흙: "Earth", 공기: "Air", 물: "Water" },
  ja: { 불: "火", 흙: "地", 공기: "風", 물: "水" },
  "zh-CN": { 불: "火", 흙: "土", 공기: "风", 물: "水" },
  "zh-TW": { 불: "火", 흙: "土", 공기: "風", 물: "水" },
  vi: { 불: "Hỏa", 흙: "Thổ", 공기: "Phong", 물: "Thủy" },
  hi: { 불: "अग्नि", 흙: "पृथ्वी", 공기: "वायु", 물: "जल" },
  es: { 불: "Fuego", 흙: "Tierra", 공기: "Aire", 물: "Agua" },
  fr: { 불: "Feu", 흙: "Terre", 공기: "Air", 물: "Eau" },
  de: { 불: "Feuer", 흙: "Erde", 공기: "Luft", 물: "Wasser" },
  nl: { 불: "Vuur", 흙: "Aarde", 공기: "Lucht", 물: "Water" },
  ms: { 불: "Api", 흙: "Tanah", 공기: "Udara", 물: "Air" },
};

const PLANET = {
  ko: { 화성: "화성", 금성: "금성", 수성: "수성", 달: "달", 태양: "태양", 명왕성: "명왕성", 목성: "목성", 토성: "토성", 천왕성: "천왕성", 해왕성: "해왕성" },
  en: { 화성: "Mars", 금성: "Venus", 수성: "Mercury", 달: "Moon", 태양: "Sun", 명왕성: "Pluto", 목성: "Jupiter", 토성: "Saturn", 천왕성: "Uranus", 해왕성: "Neptune" },
  ja: { 화성: "火星", 금성: "金星", 수성: "水星", 달: "月", 태양: "太陽", 명왕성: "冥王星", 목성: "木星", 토성: "土星", 천왕성: "天王星", 해왕성: "海王星" },
  "zh-CN": { 화성: "火星", 금성: "金星", 수성: "水星", 달: "月亮", 태양: "太阳", 명왕성: "冥王星", 목성: "木星", 토성: "土星", 천왕성: "天王星", 해왕성: "海王星" },
  "zh-TW": { 화성: "火星", 금성: "金星", 수성: "水星", 달: "月亮", 태양: "太陽", 명왕성: "冥王星", 목성: "木星", 토성: "土星", 천왕성: "天王星", 해왕성: "海王星" },
  vi: { 화성: "Sao Hỏa", 금성: "Sao Kim", 수성: "Sao Thủy", 달: "Mặt Trăng", 태양: "Mặt Trời", 명왕성: "Sao Diêm Vương", 목성: "Sao Mộc", 토성: "Sao Thổ", 천왕성: "Sao Thiên Vương", 해왕성: "Sao Hải Vương" },
  hi: { 화성: "मंगल", 금성: "शुक्र", 수성: "बुध", 달: "चंद्रमा", 태양: "सूर्य", 명왕성: "प्लूटो", 목성: "बृहस्पति", 토성: "शनि", 천왕성: "यूरेनस", 해왕성: "नेपच्यून" },
  es: { 화성: "Marte", 금성: "Venus", 수성: "Mercurio", 달: "Luna", 태양: "Sol", 명왕성: "Plutón", 목성: "Júpiter", 토성: "Saturno", 천왕성: "Urano", 해왕성: "Neptuno" },
  fr: { 화성: "Mars", 금성: "Vénus", 수성: "Mercure", 달: "Lune", 태양: "Soleil", 명왕성: "Pluton", 목성: "Jupiter", 토성: "Saturne", 천왕성: "Uranus", 해왕성: "Neptune" },
  de: { 화성: "Mars", 금성: "Venus", 수성: "Merkur", 달: "Mond", 태양: "Sonne", 명왕성: "Pluto", 목성: "Jupiter", 토성: "Saturn", 천왕성: "Uranus", 해왕성: "Neptun" },
  nl: { 화성: "Mars", 금성: "Venus", 수성: "Mercurius", 달: "Maan", 태양: "Zon", 명왕성: "Pluto", 목성: "Jupiter", 토성: "Saturnus", 천왕성: "Uranus", 해왕성: "Neptunus" },
  ms: { 화성: "Marikh", 금성: "Zuhrah", 수성: "Utarid", 달: "Bulan", 태양: "Matahari", 명왕성: "Pluto", 목성: "Musytari", 토성: "Zuhal", 천왕성: "Uranus", 해왕성: "Neptun" },
};

/** 오행. 한자는 이 도메인의 식별 표기라 라틴 문자권에서도 괄호로 남긴다. */
const WUXING = {
  ko: { "수(水)": "수(水)", "토(土)": "토(土)", "목(木)": "목(木)", "화(火)": "화(火)", "금(金)": "금(金)" },
  en: { "수(水)": "Water (水)", "토(土)": "Earth (土)", "목(木)": "Wood (木)", "화(火)": "Fire (火)", "금(金)": "Metal (金)" },
  ja: { "수(水)": "水", "토(土)": "土", "목(木)": "木", "화(火)": "火", "금(金)": "金" },
  "zh-CN": { "수(水)": "水", "토(土)": "土", "목(木)": "木", "화(火)": "火", "금(金)": "金" },
  "zh-TW": { "수(水)": "水", "토(土)": "土", "목(木)": "木", "화(火)": "火", "금(金)": "金" },
  vi: { "수(水)": "Thủy (水)", "토(土)": "Thổ (土)", "목(木)": "Mộc (木)", "화(火)": "Hỏa (火)", "금(金)": "Kim (金)" },
  hi: { "수(水)": "जल (水)", "토(土)": "पृथ्वी (土)", "목(木)": "काष्ठ (木)", "화(火)": "अग्नि (火)", "금(金)": "धातु (金)" },
  es: { "수(水)": "Agua (水)", "토(土)": "Tierra (土)", "목(木)": "Madera (木)", "화(火)": "Fuego (火)", "금(金)": "Metal (金)" },
  fr: { "수(水)": "Eau (水)", "토(土)": "Terre (土)", "목(木)": "Bois (木)", "화(火)": "Feu (火)", "금(金)": "Métal (金)" },
  de: { "수(水)": "Wasser (水)", "토(土)": "Erde (土)", "목(木)": "Holz (木)", "화(火)": "Feuer (火)", "금(金)": "Metall (金)" },
  nl: { "수(水)": "Water (水)", "토(土)": "Aarde (土)", "목(木)": "Hout (木)", "화(火)": "Vuur (火)", "금(金)": "Metaal (金)" },
  ms: { "수(水)": "Air (水)", "토(土)": "Tanah (土)", "목(木)": "Kayu (木)", "화(火)": "Api (火)", "금(金)": "Logam (金)" },
};

/** 삼합국 4종. 앞의 세 글자는 지지 조합이라 한자로 고정한다. */
const TRINE = {
  ko: { "신자진 수국(水局)": "신자진 수국(水局)", "사유축 금국(金局)": "사유축 금국(金局)", "인오술 화국(火局)": "인오술 화국(火局)", "해묘미 목국(木局)": "해묘미 목국(木局)" },
  en: { "신자진 수국(水局)": "Water trine (申子辰)", "사유축 금국(金局)": "Metal trine (巳酉丑)", "인오술 화국(火局)": "Fire trine (寅午戌)", "해묘미 목국(木局)": "Wood trine (亥卯未)" },
  ja: { "신자진 수국(水局)": "申子辰 水局", "사유축 금국(金局)": "巳酉丑 金局", "인오술 화국(火局)": "寅午戌 火局", "해묘미 목국(木局)": "亥卯未 木局" },
  "zh-CN": { "신자진 수국(水局)": "申子辰水局", "사유축 금국(金局)": "巳酉丑金局", "인오술 화국(火局)": "寅午戌火局", "해묘미 목국(木局)": "亥卯未木局" },
  "zh-TW": { "신자진 수국(水局)": "申子辰水局", "사유축 금국(金局)": "巳酉丑金局", "인오술 화국(火局)": "寅午戌火局", "해묘미 목국(木局)": "亥卯未木局" },
  vi: { "신자진 수국(水局)": "Tam hợp Thủy (申子辰)", "사유축 금국(金局)": "Tam hợp Kim (巳酉丑)", "인오술 화국(火局)": "Tam hợp Hỏa (寅午戌)", "해묘미 목국(木局)": "Tam hợp Mộc (亥卯未)" },
  hi: { "신자진 수국(水局)": "जल त्रिकोण (申子辰)", "사유축 금국(金局)": "धातु त्रिकोण (巳酉丑)", "인오술 화국(火局)": "अग्नि त्रिकोण (寅午戌)", "해묘미 목국(木局)": "काष्ठ त्रिकोण (亥卯未)" },
  es: { "신자진 수국(水局)": "Trígono de Agua (申子辰)", "사유축 금국(金局)": "Trígono de Metal (巳酉丑)", "인오술 화국(火局)": "Trígono de Fuego (寅午戌)", "해묘미 목국(木局)": "Trígono de Madera (亥卯未)" },
  fr: { "신자진 수국(水局)": "Trigone d'Eau (申子辰)", "사유축 금국(金局)": "Trigone de Métal (巳酉丑)", "인오술 화국(火局)": "Trigone de Feu (寅午戌)", "해묘미 목국(木局)": "Trigone de Bois (亥卯未)" },
  de: { "신자진 수국(水局)": "Wasser-Trigon (申子辰)", "사유축 금국(金局)": "Metall-Trigon (巳酉丑)", "인오술 화국(火局)": "Feuer-Trigon (寅午戌)", "해묘미 목국(木局)": "Holz-Trigon (亥卯未)" },
  nl: { "신자진 수국(水局)": "Water-trigoon (申子辰)", "사유축 금국(金局)": "Metaal-trigoon (巳酉丑)", "인오술 화국(火局)": "Vuur-trigoon (寅午戌)", "해묘미 목국(木局)": "Hout-trigoon (亥卯未)" },
  ms: { "신자진 수국(水局)": "Trigon Air (申子辰)", "사유축 금국(金局)": "Trigon Logam (巳酉丑)", "인오술 화국(火局)": "Trigon Api (寅午戌)", "해묘미 목국(木局)": "Trigon Kayu (亥卯未)" },
};

// ── 값 변환 ───────────────────────────────────────────────────────────────────
/** "3월 21일 ~ 4월 19일" → 로케일 표기 */
function dateRange(ko, locale) {
  if (locale === "ko") return ko;
  const m = ko.match(/^(\d+)월 (\d+)일 ~ (\d+)월 (\d+)일$/);
  if (!m) throw new Error(`날짜 구간 형식이 다릅니다: ${ko}`);
  const [, m1, d1, m2, d2] = m.map(Number.isNaN ? String : String);
  if (locale === "ja") return `${m1}月${d1}日 ~ ${m2}月${d2}日`;
  if (locale === "zh-CN" || locale === "zh-TW") return `${m1}月${d1}日 ~ ${m2}月${d2}日`;
  const mm = MONTH[locale];
  if (locale === "de") return `${d1}. ${mm[Number(m1) - 1]} – ${d2}. ${mm[Number(m2) - 1]}`;
  return `${d1} ${mm[Number(m1) - 1]} – ${d2} ${mm[Number(m2) - 1]}`;
}

/** "1948 · 1960 · … · 2020년생" → 로케일 표기 */
function birthYears(ko, locale) {
  if (locale === "ko") return ko;
  const years = ko.replace(/년생$/, "").trim();
  const T = {
    en: `born ${years}`,
    ja: `${years} 年生まれ`,
    "zh-CN": `${years} 年生`,
    "zh-TW": `${years} 年生`,
    vi: `sinh năm ${years}`,
    hi: `${years} में जन्मे`,
    es: `nacidos en ${years}`,
    fr: `nés en ${years}`,
    de: `geboren ${years}`,
    nl: `geboren in ${years}`,
    ms: `lahir pada ${years}`,
  };
  return T[locale];
}

const out = {
  _comment: "사인 히어로 부제 `{기간표기} · {원소} · {지배성}` 24종. scripts/i18n-gen-sign-meta.mjs 가 lib/fortune/sign-profiles.ts 의 값을 읽어 생성한다. 원소가 한 글자(`불`·`물`)라 노드가 갈린 채로는 역인덱스가 손댈 수 없었고, 그래서 SignFortuneView 에서 노드를 하나로 합친 뒤 조합 결과를 통째로 넣는다.",
};

let index = 700;
for (const p of PROFILES) {
  const isAnimal = p.nameKo.endsWith("띠");
  const values = {};
  for (const l of LOCALES) {
    const range = isAnimal ? birthYears(p.rangeLabel, l) : dateRange(p.rangeLabel, l);
    const element = isAnimal ? WUXING[l][p.element] : ELEMENT4[l][p.element];
    const ruler = isAnimal
      ? TRINE[l][p.ruler]
      : p.ruler.split("·").map((one) => PLANET[l][one.trim()]).join("·");
    if (!range || !element || !ruler) throw new Error(`${p.nameKo} / ${l} 에 빠진 값이 있습니다`);
    values[l] = `${range} · ${element} · ${ruler}`;
  }
  out[`shellRuntime.f${index}`] = values;
  index += 1;
}

writeFileSync("i18n/authored/shellRuntime-24.json", `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(`[gen-signmeta] ${index - 700}개 항목 기록 (f700~f${index - 1})`);

// Expert consultations read chart JSON with English keys and names, and the model echoed them as
// "금성(Venus)", "자기 라시(own sign)" and "Ashwini 나크샤트라" despite the Korean-label rule
// (R7·R8 live re-call 2026-10-11). The body keeps the Korean term and drops the gloss.
const NAKSHATRA_KO = Object.freeze({
  Ashwini: "아슈위니", Bharani: "바라니", Krittika: "크리티카", Rohini: "로히니", Mrigashira: "므리가시라",
  Ardra: "아르드라", Punarvasu: "푸나르바수", Pushya: "푸샤", Ashlesha: "아슐레샤", Magha: "마가",
  "Purva Phalguni": "푸르바 팔구니", "Uttara Phalguni": "웃타라 팔구니", Hasta: "하스타", Chitra: "치트라",
  Swati: "스와티", Vishakha: "비샤카", Anuradha: "아누라다", Jyeshtha: "제슈타", Mula: "물라",
  "Purva Ashadha": "푸르바 아샤다", "Uttara Ashadha": "웃타라 아샤다", Shravana: "슈라바나", Dhanishta: "다니슈타",
  Shatabhisha: "샤타비샤", "Purva Bhadrapada": "푸르바 바드라파다", "Uttara Bhadrapada": "웃타라 바드라파다", Revati: "레바티",
});
const NAKSHATRA_PATTERN = new RegExp(`\\b(${Object.keys(NAKSHATRA_KO).sort((a, b) => b.length - a.length).join("|")})\\b`, "g");
// Two leading letters keep chart codes such as "나바암샤(D9)"; "(House 1)" is still a gloss.
const LATIN = "[A-Za-z]{2}[A-Za-z0-9 '’-]{0,40}";
// Only a gloss directly after Hangul (optionally closing bold) is dropped; "IT 업무(정보기술)" stays.
const GLOSS = new RegExp(`([가-힣])(\\*\\*)?\\s?\\(${LATIN}\\)`, "gu");
const LEADING_GLOSS = new RegExp(`([가-힣])(\\*\\*)?\\s?\\(${LATIN},\\s*`, "gu");

export function nakshatraKo(name) {
  return NAKSHATRA_KO[name] || name;
}

export function koreanizeExpertTerms(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(GLOSS, "$1$2")
    .replace(LEADING_GLOSS, "$1$2(")
    .replace(/\(orb\s/giu, "(오브 ")
    .replace(NAKSHATRA_PATTERN, (name) => NAKSHATRA_KO[name]);
}

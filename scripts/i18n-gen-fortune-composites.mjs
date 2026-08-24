/**
 * /fortune/[period]/[sign] 의 "변수 조합 문장" 저작본 생성.
 *
 * 이 페이지는 서버 컴포넌트여야 하고(AdSense 게이트가 서버 렌더 텍스트만 센다)
 * 마커 없는 노드는 런타임 역인덱스가 **원문 전체 일치**로만 치환한다. 보간이 없으므로
 * 조합 결과를 전부 미리 펼쳐 사전에 넣는다. 손으로 쓰면 390개라 오타가 나므로 생성한다.
 *
 * 사인 이름은 이미 사전에 있는 값을 그대로 읽어 온다 — 여기서 다시 번역하면 같은 별자리가
 * 화면마다 다른 이름으로 나온다.
 */
import { readFileSync, writeFileSync } from "node:fs";

const LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"];
const FILE_BY_LOCALE = { ko: "ko", en: "en", ja: "ja", "zh-CN": "zh-cn", "zh-TW": "zh-tw",
  vi: "vi", hi: "hi", es: "es", fr: "fr", de: "de", nl: "nl", ms: "ms" };

// ── 사인 이름을 사전에서 읽는다 ───────────────────────────────────────────────
const flat = (o, p, out) => {
  for (const k of Object.keys(o)) {
    const v = o[k]; const n = p ? `${p}.${k}` : k;
    if (v && typeof v === "object") flat(v, n, out); else out[n] = v;
  }
  return out;
};
const dict = {};
for (const l of LOCALES) {
  const base = FILE_BY_LOCALE[l];
  dict[l] = Object.assign(
    flat(JSON.parse(readFileSync(`public/i18n/${base}.json`, "utf8")), "", {}),
    flat(JSON.parse(readFileSync(`public/i18n/${base}/shellRuntime.json`, "utf8")), "", {}),
  );
}
/** ko 원문 → 키. 사인 이름이 어느 키에 있는지 찾는 데만 쓴다. */
const koIndex = {};
for (const [k, v] of Object.entries(dict.ko)) {
  if (typeof v !== "string") continue;
  const t = v.replace(/\s+/g, " ").trim();
  if (t.length >= 2 && !(t in koIndex)) koIndex[t] = k;
}

const SIGN_KO = [
  "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
  "천칭자리", "전갈자리", "궁수자리", "염소자리", "물병자리", "물고기자리",
  "쥐띠", "소띠", "범띠", "토끼띠", "용띠", "뱀띠",
  "말띠", "양띠", "원숭이띠", "닭띠", "개띠", "돼지띠",
];
const SIGNS = SIGN_KO.map((ko) => {
  const key = koIndex[ko];
  if (!key) throw new Error(`사인 이름이 사전에 없습니다: ${ko}`);
  const names = {};
  for (const l of LOCALES) {
    const v = dict[l][key];
    if (typeof v !== "string" || !v) throw new Error(`${key} 의 ${l} 값이 없습니다`);
    names[l] = v;
  }
  return { ko, key, names, kind: ko.endsWith("띠") ? "animal" : "zodiac" };
});

// ── 기간·종류 어휘 ────────────────────────────────────────────────────────────
const PERIODS = ["today", "tomorrow", "weekly", "monthly"];
/** ko 는 소스(lib/fortune/periods.ts)와 글자 그대로 같아야 한다. */
const KO_LABEL = { today: "오늘", tomorrow: "내일", weekly: "이번 주", monthly: "이번 달" };
const KO_TITLE = { today: "오늘의", tomorrow: "내일의", weekly: "이번 주", monthly: "이번 달" };

/** 로케일별 기간 표현. poss = 명사 앞 수식형, plain = 단독형. */
const P = {
  en: { poss: { today: "Today's", tomorrow: "Tomorrow's", weekly: "This week's", monthly: "This month's" },
        plain: { today: "today", tomorrow: "tomorrow", weekly: "this week", monthly: "this month" } },
  ja: { w: { today: "今日", tomorrow: "明日", weekly: "今週", monthly: "今月" } },
  "zh-CN": { w: { today: "今日", tomorrow: "明日", weekly: "本周", monthly: "本月" } },
  "zh-TW": { w: { today: "今日", tomorrow: "明日", weekly: "本週", monthly: "本月" } },
  vi: { w: { today: "hôm nay", tomorrow: "ngày mai", weekly: "tuần này", monthly: "tháng này" } },
  hi: { w: { today: "आज", tomorrow: "कल", weekly: "इस सप्ताह", monthly: "इस माह" } },
  es: { w: { today: "hoy", tomorrow: "mañana", weekly: "esta semana", monthly: "este mes" } },
  fr: { de: { today: "d'aujourd'hui", tomorrow: "de demain", weekly: "de cette semaine", monthly: "de ce mois" },
        w: { today: "aujourd'hui", tomorrow: "demain", weekly: "cette semaine", monthly: "ce mois" } },
  de: { w: { today: "heute", tomorrow: "morgen", weekly: "diese Woche", monthly: "diesen Monat" },
        attr: { today: "Heutige", tomorrow: "Morgige", weekly: "Wöchentliche", monthly: "Monatliche" } },
  nl: { w: { today: "vandaag", tomorrow: "morgen", weekly: "deze week", monthly: "deze maand" } },
  ms: { w: { today: "hari ini", tomorrow: "esok", weekly: "minggu ini", monthly: "bulan ini" } },
};

/**
 * 종류 명사는 슬롯마다 **형태가 다르다** — 관사·격·복수가 언어마다 붙는다.
 * 한 형태만 두고 템플릿에서 붙이면 `du animal`(fr) · `otros signo del zodiacos`(es) ·
 * `chinesisches Tierkreiszeichen-Deutung`(de) 같은 비문이 나온다. 슬롯별로 나눠 둔다.
 *   bare  단독형        │ of   "~의" 소유·전치사구 형태
 *   this  "이 ~" 지시형 │ pl   복수형(앞에 "다른"이 붙는 자리)
 */
const KIND = {
  ko: { zodiac: { bare: "별자리" }, animal: { bare: "띠" } },
  en: {
    zodiac: { bare: "zodiac sign", of: "zodiac sign", this: "this zodiac sign", pl: "zodiac signs" },
    animal: { bare: "Chinese zodiac animal", of: "Chinese zodiac", this: "this Chinese zodiac animal", pl: "Chinese zodiac animals" },
  },
  ja: { zodiac: { bare: "星座" }, animal: { bare: "干支" } },
  "zh-CN": { zodiac: { bare: "星座" }, animal: { bare: "生肖" } },
  "zh-TW": { zodiac: { bare: "星座" }, animal: { bare: "生肖" } },
  vi: {
    zodiac: { bare: "cung hoàng đạo", this: "cung hoàng đạo này", pl: "cung hoàng đạo" },
    animal: { bare: "con giáp", this: "con giáp này", pl: "con giáp" },
  },
  hi: {
    zodiac: { bare: "राशि", this: "इस राशि", pl: "राशियाँ" },
    animal: { bare: "पशु राशि", this: "इस पशु राशि", pl: "पशु राशियाँ" },
  },
  es: {
    zodiac: { bare: "signo del zodiaco", of: "del signo del zodiaco", this: "este signo del zodiaco", pl: "signos del zodiaco" },
    animal: { bare: "animal del zodiaco chino", of: "del animal del zodiaco chino", this: "este animal del zodiaco chino", pl: "animales del zodiaco chino" },
  },
  fr: {
    zodiac: { bare: "signe du zodiaque", of: "du signe du zodiaque", this: "ce signe du zodiaque", pl: "signes du zodiaque" },
    animal: { bare: "animal du zodiaque chinois", of: "de l'animal du zodiaque chinois", this: "cet animal du zodiaque chinois", pl: "animaux du zodiaque chinois" },
  },
  de: {
    // 격이 갈린다: weekNote 는 "zu diesem …"(여격), toneNote 는 주격이다.
    zodiac: { bare: "Sternzeichen", def: "das Sternzeichen", thisNom: "dieses Sternzeichen", thisDat: "diesem Sternzeichen", pl: "Sternzeichen" },
    animal: { bare: "chinesisches Tierkreiszeichen", def: "das chinesische Tierkreiszeichen", thisNom: "dieses chinesische Tierkreiszeichen", thisDat: "diesem chinesischen Tierkreiszeichen", pl: "chinesische Tierkreiszeichen" },
  },
  nl: {
    zodiac: { bare: "sterrenbeeld", def: "het sterrenbeeld", this: "dit sterrenbeeld", pl: "sterrenbeelden" },
    animal: { bare: "Chinees dierenteken", def: "het Chinese dierenteken", this: "dit Chinese dierenteken", pl: "Chinese dierentekens" },
  },
  ms: {
    zodiac: { bare: "bintang zodiak", this: "bintang zodiak ini", pl: "bintang zodiak" },
    animal: { bare: "haiwan zodiak Cina", this: "haiwan zodiak Cina ini", pl: "haiwan zodiak Cina" },
  },
};

// ── 문장 템플릿 ───────────────────────────────────────────────────────────────
// 각 함수는 (locale, ctx) → 문자열. ctx: { p, s, k } (기간 id, 사인 names, kind)
const S = {
  /** `{기간} {종류} 운세` — 브레드크럼 */
  breadcrumb: {
    ko: (c) => `${KO_LABEL[c.p]} ${KIND.ko[c.k].bare} 운세`,
    en: (c) => `${P.en.poss[c.p]} ${KIND.en[c.k].of} fortune`,
    ja: (c) => `${P.ja.w[c.p]}の${KIND.ja[c.k].bare}占い`,
    "zh-CN": (c) => `${P["zh-CN"].w[c.p]}${KIND["zh-CN"][c.k].bare}运势`,
    "zh-TW": (c) => `${P["zh-TW"].w[c.p]}${KIND["zh-TW"][c.k].bare}運勢`,
    vi: (c) => `Vận trình ${KIND.vi[c.k].bare} ${P.vi.w[c.p]}`,
    hi: (c) => `${P.hi.w[c.p]} का ${KIND.hi[c.k].bare} भविष्यफल`,
    es: (c) => `Fortuna ${KIND.es[c.k].of} de ${P.es.w[c.p]}`,
    fr: (c) => `Fortune ${KIND.fr[c.k].of} ${P.fr.de[c.p]}`,
    de: (c) => `Deutung für ${KIND.de[c.k].def} ${P.de.w[c.p]}`,
    nl: (c) => `Fortuin van ${KIND.nl[c.k].def} voor ${P.nl.w[c.p]}`,
    ms: (c) => `Nasib ${KIND.ms[c.k].bare} ${P.ms.w[c.p]}`,
  },
  /** `{사인} {기간}의 운세` — h1 */
  heroTitle: {
    ko: (c) => `${c.s.ko} ${KO_TITLE[c.p]} 운세`,
    en: (c) => `${c.s.en} — ${P.en.poss[c.p].toLowerCase()} fortune`,
    ja: (c) => `${c.s.ja} ${P.ja.w[c.p]}の運勢`,
    "zh-CN": (c) => `${c.s["zh-CN"]} ${P["zh-CN"].w[c.p]}运势`,
    "zh-TW": (c) => `${c.s["zh-TW"]} ${P["zh-TW"].w[c.p]}運勢`,
    vi: (c) => `${c.s.vi} — vận trình ${P.vi.w[c.p]}`,
    hi: (c) => `${c.s.hi} — ${P.hi.w[c.p]} का भविष्यफल`,
    es: (c) => `${c.s.es}: fortuna de ${P.es.w[c.p]}`,
    fr: (c) => `${c.s.fr} : fortune ${P.fr.de[c.p]}`,
    de: (c) => `${c.s.de} — Deutung für ${P.de.w[c.p]}`,
    nl: (c) => `${c.s.nl} — fortuin voor ${P.nl.w[c.p]}`,
    ms: (c) => `${c.s.ms} — nasib ${P.ms.w[c.p]}`,
  },
  /** `{기간}의 기준 값` */
  facts: {
    ko: (c) => `${KO_LABEL[c.p]}의 기준 값`,
    en: (c) => `${P.en.poss[c.p]} reference values`,
    ja: (c) => `${P.ja.w[c.p]}の基準値`,
    "zh-CN": (c) => `${P["zh-CN"].w[c.p]}的基准值`,
    "zh-TW": (c) => `${P["zh-TW"].w[c.p]}的基準值`,
    vi: (c) => `Giá trị cơ sở ${P.vi.w[c.p]}`,
    hi: (c) => `${P.hi.w[c.p]} के आधार मान`,
    es: (c) => `Valores de referencia de ${P.es.w[c.p]}`,
    fr: (c) => `Valeurs de référence ${P.fr.de[c.p]}`,
    de: (c) => `Referenzwerte für ${P.de.w[c.p]}`,
    nl: (c) => `Referentiewaarden voor ${P.nl.w[c.p]}`,
    ms: (c) => `Nilai rujukan ${P.ms.w[c.p]}`,
  },
  /** `{사인}와 {기간} 기운의 관계` */
  relation: {
    ko: (c) => `${c.s.ko}와 ${KO_LABEL[c.p]} 기운의 관계`,
    en: (c) => `${c.s.en} — how it relates to ${P.en.plain[c.p]}'s energy`,
    ja: (c) => `${c.s.ja}と${P.ja.w[c.p]}の気の関係`,
    "zh-CN": (c) => `${c.s["zh-CN"]}与${P["zh-CN"].w[c.p]}气场的关系`,
    "zh-TW": (c) => `${c.s["zh-TW"]}與${P["zh-TW"].w[c.p]}氣場的關係`,
    vi: (c) => `Quan hệ giữa ${c.s.vi} và khí ${P.vi.w[c.p]}`,
    hi: (c) => `${c.s.hi} और ${P.hi.w[c.p]} की ऊर्जा का संबंध`,
    es: (c) => `${c.s.es} — relación con la energía de ${P.es.w[c.p]}`,
    fr: (c) => `${c.s.fr} — relation avec l'énergie ${P.fr.de[c.p]}`,
    de: (c) => `${c.s.de} — Beziehung zur Energie von ${P.de.w[c.p]}`,
    nl: (c) => `${c.s.nl} — verhouding tot de energie van ${P.nl.w[c.p]}`,
    ms: (c) => `Hubungan antara ${c.s.ms} dan tenaga ${P.ms.w[c.p]}`,
  },
  /** `{기간}의 운세 점수` */
  score: {
    ko: (c) => `${KO_LABEL[c.p]}의 운세 점수`,
    en: (c) => `${P.en.poss[c.p]} fortune score`,
    ja: (c) => `${P.ja.w[c.p]}の運勢スコア`,
    "zh-CN": (c) => `${P["zh-CN"].w[c.p]}的运势分数`,
    "zh-TW": (c) => `${P["zh-TW"].w[c.p]}的運勢分數`,
    vi: (c) => `Điểm vận trình ${P.vi.w[c.p]}`,
    hi: (c) => `${P.hi.w[c.p]} का भविष्यफल स्कोर`,
    es: (c) => `Puntuación de fortuna de ${P.es.w[c.p]}`,
    fr: (c) => `Score de fortune ${P.fr.de[c.p]}`,
    de: (c) => `Deutungswert für ${P.de.w[c.p]}`,
    nl: (c) => `Fortuinscore voor ${P.nl.w[c.p]}`,
    ms: (c) => `Skor nasib ${P.ms.w[c.p]}`,
  },
  /** `{기간} 짚어 둘 것` */
  highlights: {
    ko: (c) => `${KO_LABEL[c.p]} 짚어 둘 것`,
    en: (c) => `Worth noting ${P.en.plain[c.p]}`,
    ja: (c) => `${P.ja.w[c.p]}押さえておくこと`,
    "zh-CN": (c) => `${P["zh-CN"].w[c.p]}值得留意的地方`,
    "zh-TW": (c) => `${P["zh-TW"].w[c.p]}值得留意的地方`,
    vi: (c) => `Điều đáng lưu ý ${P.vi.w[c.p]}`,
    hi: (c) => `${P.hi.w[c.p]} ध्यान देने योग्य बातें`,
    es: (c) => `Para tener en cuenta ${P.es.w[c.p]}`,
    fr: (c) => `À retenir pour ${P.fr.w[c.p]}`,
    de: (c) => `Bemerkenswert für ${P.de.w[c.p]}`,
    nl: (c) => `Het opmerken waard voor ${P.nl.w[c.p]}`,
    ms: (c) => `Perkara penting ${P.ms.w[c.p]}`,
  },
  /** `{기간}의 행운 포인트` */
  lucky: {
    ko: (c) => `${KO_LABEL[c.p]}의 행운 포인트`,
    en: (c) => `${P.en.poss[c.p]} lucky points`,
    ja: (c) => `${P.ja.w[c.p]}のラッキーポイント`,
    "zh-CN": (c) => `${P["zh-CN"].w[c.p]}的幸运要点`,
    "zh-TW": (c) => `${P["zh-TW"].w[c.p]}的幸運要點`,
    vi: (c) => `Điểm may mắn ${P.vi.w[c.p]}`,
    hi: (c) => `${P.hi.w[c.p]} के भाग्यशाली बिंदु`,
    es: (c) => `Puntos de suerte de ${P.es.w[c.p]}`,
    fr: (c) => `Points de chance ${P.fr.de[c.p]}`,
    de: (c) => `Glückspunkte für ${P.de.w[c.p]}`,
    nl: (c) => `Gelukspunten voor ${P.nl.w[c.p]}`,
    ms: (c) => `Titik bertuah ${P.ms.w[c.p]}`,
  },
  /** `{사인}의 기본 결` */
  baseline: {
    ko: (c) => `${c.s.ko}의 기본 결`,
    en: (c) => `${c.s.en} — core grain`,
    ja: (c) => `${c.s.ja}の基本の質`,
    "zh-CN": (c) => `${c.s["zh-CN"]}的基本气质`,
    "zh-TW": (c) => `${c.s["zh-TW"]}的基本氣質`,
    vi: (c) => `Chất nền của ${c.s.vi}`,
    hi: (c) => `${c.s.hi} की मूल प्रकृति`,
    es: (c) => `${c.s.es} — textura básica`,
    fr: (c) => `${c.s.fr} — grain de base`,
    de: (c) => `${c.s.de} — Grundstruktur`,
    nl: (c) => `${c.s.nl} — grondtoon`,
    ms: (c) => `Sifat asas ${c.s.ms}`,
  },
  /** `{사인}는 어떤 기질인가` */
  temperament: {
    ko: (c) => `${c.s.ko}는 어떤 기질인가`,
    en: (c) => `${c.s.en} — what this nature is like`,
    ja: (c) => `${c.s.ja}はどんな気質か`,
    "zh-CN": (c) => `${c.s["zh-CN"]}是怎样的气质`,
    "zh-TW": (c) => `${c.s["zh-TW"]}是怎樣的氣質`,
    vi: (c) => `${c.s.vi} có khí chất thế nào`,
    hi: (c) => `${c.s.hi} की प्रकृति कैसी है`,
    es: (c) => `${c.s.es} — qué carácter tiene`,
    fr: (c) => `${c.s.fr} — quel tempérament`,
    de: (c) => `${c.s.de} — welches Wesen`,
    nl: (c) => `${c.s.nl} — wat voor aard`,
    ms: (c) => `Bagaimana perwatakan ${c.s.ms}`,
  },
  /** `{사인}와 잘 맞는 상대` */
  match: {
    ko: (c) => `${c.s.ko}와 잘 맞는 상대`,
    en: (c) => `${c.s.en} — a good match`,
    ja: (c) => `${c.s.ja}と相性の良い相手`,
    "zh-CN": (c) => `与${c.s["zh-CN"]}相合的对象`,
    "zh-TW": (c) => `與${c.s["zh-TW"]}相合的對象`,
    vi: (c) => `Đối tượng hợp với ${c.s.vi}`,
    hi: (c) => `${c.s.hi} के लिए अच्छा साथी`,
    es: (c) => `${c.s.es} — buena pareja`,
    fr: (c) => `${c.s.fr} — un bon accord`,
    de: (c) => `${c.s.de} — eine gute Entsprechung`,
    nl: (c) => `${c.s.nl} — een goede match`,
    ms: (c) => `Pasangan yang serasi untuk ${c.s.ms}`,
  },
  /** `{사인} {기간} 운세 →` */
  otherPeriod: {
    ko: (c) => `${c.s.ko} ${KO_LABEL[c.p]} 운세 →`,
    en: (c) => `${c.s.en} — ${P.en.plain[c.p]}'s fortune →`,
    ja: (c) => `${c.s.ja} ${P.ja.w[c.p]}の運勢 →`,
    "zh-CN": (c) => `${c.s["zh-CN"]} ${P["zh-CN"].w[c.p]}运势 →`,
    "zh-TW": (c) => `${c.s["zh-TW"]} ${P["zh-TW"].w[c.p]}運勢 →`,
    vi: (c) => `${c.s.vi} — vận trình ${P.vi.w[c.p]} →`,
    hi: (c) => `${c.s.hi} — ${P.hi.w[c.p]} का भविष्यफल →`,
    es: (c) => `${c.s.es}: fortuna de ${P.es.w[c.p]} →`,
    fr: (c) => `${c.s.fr} : fortune ${P.fr.de[c.p]} →`,
    de: (c) => `${c.s.de} — Deutung für ${P.de.w[c.p]} →`,
    nl: (c) => `${c.s.nl} — fortuin voor ${P.nl.w[c.p]} →`,
    ms: (c) => `${c.s.ms} — nasib ${P.ms.w[c.p]} →`,
  },
  /** 주간 표 안내문 */
  weekNote: {
    ko: (c) => `같은 주라도 띠와 별자리마다 이 배치가 전부 다릅니다. 일진의 지지가 이 ${KIND.ko[c.k].bare}와 어떤 관계를 맺는지로 판정합니다.`,
    en: (c) => `Even within the same week this layout differs for every animal and sign. It is judged by how the day pillar's earthly branch relates to ${KIND.en[c.k].this}.`,
    ja: (c) => `同じ週でも干支と星座ごとにこの配置はすべて異なります。日辰の地支がこの${KIND.ja[c.k].bare}とどんな関係を結ぶかで判定します。`,
    "zh-CN": (c) => `即便是同一周，每个生肖与星座的这个排布也各不相同。判定依据是日辰的地支与这个${KIND["zh-CN"][c.k].bare}结成什么关系。`,
    "zh-TW": (c) => `即便是同一週，每個生肖與星座的這個排布也各不相同。判定依據是日辰的地支與這個${KIND["zh-TW"][c.k].bare}結成什麼關係。`,
    vi: (c) => `Cùng một tuần nhưng cách bố trí này khác nhau ở từng con giáp và từng cung. Việc phán đoán dựa trên quan hệ giữa địa chi của nhật thần và ${KIND.vi[c.k].this}.`,
    hi: (c) => `एक ही सप्ताह में भी हर पशु चिह्न और हर राशि के लिए यह विन्यास अलग होता है। निर्णय इस बात से होता है कि दिन स्तंभ की पार्थिव शाखा ${KIND.hi[c.k].this} से क्या संबंध बनाती है।`,
    es: (c) => `Aun dentro de la misma semana, esta disposición cambia para cada animal y cada signo. Se determina por la relación que la rama terrestre del pilar del día establece con ${KIND.es[c.k].this}.`,
    fr: (c) => `Même au sein d'une même semaine, cette disposition diffère pour chaque animal et chaque signe. Elle se détermine par la relation que la branche terrestre du pilier du jour noue avec ${KIND.fr[c.k].this}.`,
    de: (c) => `Selbst innerhalb derselben Woche fällt diese Anordnung für jedes Tier und jedes Zeichen anders aus. Entschieden wird danach, welche Beziehung der Erdzweig der Tagessäule zu ${KIND.de[c.k].thisDat} eingeht.`,
    nl: (c) => `Zelfs binnen dezelfde week verschilt deze indeling per dier en per teken. Bepalend is welke relatie de aardse tak van de dagpijler aangaat met ${KIND.nl[c.k].this}.`,
    ms: (c) => `Walaupun dalam minggu yang sama, susunan ini berbeza bagi setiap haiwan dan setiap bintang. Ia ditentukan oleh hubungan yang dibentuk cabang bumi tiang hari dengan ${KIND.ms[c.k].this}.`,
  },
  /** 상시 톤 안내문 */
  toneNote: {
    ko: (c) => `아래는 날짜와 무관하게 이 ${KIND.ko[c.k].bare}가 늘 지니는 성향입니다. 위의 점수·관계가 그날그날 달라지는 부분이고, 이 문단은 그 위에 깔리는 바탕입니다.`,
    en: (c) => `Below are the traits ${KIND.en[c.k].this} always carries, regardless of the date. The scores and relations above are what change day to day; this passage is the ground they rest on.`,
    ja: (c) => `以下は日付に関係なく、この${KIND.ja[c.k].bare}が常に持っている傾向です。上のスコアや関係が日ごとに変わる部分で、この段落はその下に敷かれた土台です。`,
    "zh-CN": (c) => `以下是与日期无关、这个${KIND["zh-CN"][c.k].bare}始终具备的性情。上面的分数与关系是逐日变化的部分，这一段则是铺在其下的底色。`,
    "zh-TW": (c) => `以下是與日期無關、這個${KIND["zh-TW"][c.k].bare}始終具備的性情。上面的分數與關係是逐日變化的部分，這一段則是鋪在其下的底色。`,
    vi: (c) => `Dưới đây là những nét mà ${KIND.vi[c.k].this} luôn mang theo, không phụ thuộc vào ngày tháng. Điểm số và quan hệ ở trên là phần thay đổi mỗi ngày; đoạn này là nền nằm bên dưới chúng.`,
    hi: (c) => `नीचे वे लक्षण हैं जो ${KIND.hi[c.k].this} तारीख़ से परे हमेशा साथ रखती है। ऊपर के अंक और संबंध रोज़ बदलने वाला हिस्सा हैं; यह अनुच्छेद उनके नीचे बिछी हुई ज़मीन है।`,
    es: (c) => `A continuación están los rasgos que ${KIND.es[c.k].this} lleva siempre, con independencia de la fecha. Las puntuaciones y relaciones de arriba son lo que cambia cada día; este párrafo es el suelo sobre el que se apoyan.`,
    fr: (c) => `Voici les traits que ${KIND.fr[c.k].this} porte toujours, quelle que soit la date. Les scores et les relations ci-dessus sont ce qui change au jour le jour ; ce paragraphe est le sol sur lequel ils reposent.`,
    de: (c) => `Nachfolgend die Züge, die ${KIND.de[c.k].thisNom} unabhängig vom Datum immer trägt. Die Werte und Beziehungen oben sind das, was sich täglich ändert; dieser Absatz ist der Grund darunter.`,
    nl: (c) => `Hieronder staan de trekken die ${KIND.nl[c.k].this} altijd draagt, ongeacht de datum. De scores en verhoudingen hierboven zijn wat per dag verandert; deze alinea is de bodem daaronder.`,
    ms: (c) => `Di bawah ialah sifat yang sentiasa dibawa oleh ${KIND.ms[c.k].this}, tanpa mengira tarikh. Skor dan hubungan di atas ialah bahagian yang berubah setiap hari; perenggan ini ialah dasar di bawahnya.`,
  },
  /** `다른 기간과 다른 {종류}` */
  otherHeading: {
    ko: (c) => `다른 기간과 다른 ${KIND.ko[c.k].bare}`,
    en: (c) => `Other periods and other ${KIND.en[c.k].pl}`,
    ja: (c) => `他の期間と他の${KIND.ja[c.k].bare}`,
    "zh-CN": (c) => `其他期间与其他${KIND["zh-CN"][c.k].bare}`,
    "zh-TW": (c) => `其他期間與其他${KIND["zh-TW"][c.k].bare}`,
    vi: (c) => `Khoảng thời gian khác và ${KIND.vi[c.k].pl} khác`,
    hi: (c) => `अन्य अवधियाँ और अन्य ${KIND.hi[c.k].pl}`,
    es: (c) => `Otros periodos y otros ${KIND.es[c.k].pl}`,
    fr: (c) => `Autres périodes et autres ${KIND.fr[c.k].pl}`,
    de: (c) => `Andere Zeiträume und andere ${KIND.de[c.k].pl}`,
    nl: (c) => `Andere periodes en andere ${KIND.nl[c.k].pl}`,
    ms: (c) => `Tempoh lain dan ${KIND.ms[c.k].pl} lain`,
  },
};

// ── 조합 펼치기 ───────────────────────────────────────────────────────────────
const out = {
  _comment: "/fortune/[period]/[sign] 의 변수 조합 문장. scripts/i18n-gen-fortune-composites.mjs 가 (사인 24 × 기간 4 × 종류 2) 를 펼쳐 생성한다. 사인 이름은 사전에 있는 값을 그대로 읽어 오므로 여기서 이름이 새로 번역되지 않는다. 손으로 고치지 말고 생성기를 고칠 것.",
};

let index = 300;
const seen = new Set();
const put = (values) => {
  if (seen.has(values.ko)) return;      // 같은 ko 원문이 두 번 나오면 뒤엣것은 죽은 키가 된다
  seen.add(values.ko);
  out[`shellRuntime.f${index}`] = values;
  index += 1;
};
const render = (tpl, ctx) => Object.fromEntries(LOCALES.map((l) => [l, tpl[l](ctx)]));

for (const kind of ["zodiac", "animal"]) {
  for (const p of PERIODS) put(render(S.breadcrumb, { p, k: kind }));
  put(render(S.weekNote, { k: kind }));
  put(render(S.toneNote, { k: kind }));
  put(render(S.otherHeading, { k: kind }));
}
for (const p of PERIODS) {
  put(render(S.facts, { p }));
  put(render(S.score, { p }));
  put(render(S.highlights, { p }));
  put(render(S.lucky, { p }));
}
for (const sign of SIGNS) {
  const s = sign.names;
  put(render(S.baseline, { s }));
  put(render(S.temperament, { s }));
  put(render(S.match, { s }));
  for (const p of PERIODS) {
    put(render(S.heroTitle, { s, p }));
    put(render(S.relation, { s, p }));
    put(render(S.otherPeriod, { s, p }));
  }
}

writeFileSync("i18n/authored/shellRuntime-23.json", `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(`[gen-fortune] ${index - 300}개 항목 기록 (f300~f${index - 1})`);

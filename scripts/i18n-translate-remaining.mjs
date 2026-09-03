#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootDir = process.cwd();
const i18nDir = resolve(rootDir, "public", "i18n");

const targets = [
  ["ja", "ja"],
  ["zh-cn", "zh-CN"],
  ["zh-tw", "zh-TW"],
  ["de", "de"],
  ["es", "es"],
  ["fr", "fr"],
  ["hi", "hi"],
  ["ms", "ms"],
  ["nl", "nl"],
  ["vi", "vi"],
];

const unchangedValues = new Set([
  "1.0.0",
  "Code Destiny",
  "DEST1NOVA",
  "Neo",
  "Yeoni",
  "Luna Bloom",
  "Kakao",
  "Google",
  "Naver",
  "PortOne",
  "KG Inicis",
  "PDF",
  "FAQ",
  "VVIP",
  "AI",
  "MBTI",
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
]);

const unchangedKeyPatterns = [
  /^_/,
  /^pricing\.currencies\.[A-Z]+\.symbol$/,
  /^pricing\.currencies\.[A-Z]+\.format$/,
];

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function flatten(value, prefix = "", out = {}) {
  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out[prefix] = value;
  return out;
}

function setValue(root, path, value) {
  const parts = path.split(".");
  let cursor = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    cursor = cursor[parts[index]];
  }
  cursor[parts.at(-1)] = value;
}

function getValue(root, path) {
  return path.split(".").reduce((cursor, part) => (cursor == null ? undefined : cursor[part]), root);
}

async function readJson(fileName) {
  return JSON.parse(await readFile(resolve(i18nDir, fileName), "utf8"));
}

function repairEnglishValue(key, value) {
  if (typeof value !== "string") return value;

  const exact = {
    "home.music.hint": "♪ 123 moonlit tracks",
    "home.startCards.freeBadge": "Collection No. {index} · Free",
    "home.tiles.animalFacePrice": "Free · Compatibility KRW 5,000",
    "home.tiles.palmMapMeta": "AI palm reading · Eastern palmistry · Destiny map",
    "home.tiles.cosmicSoulPrice": "30 min KRW 10,000 · 60 min KRW 20,000",
    "home.passMini.standardPrice": "30 days · KRW 9,900",
    "home.passMini.premiumPrice": "30 days · KRW 29,900",
    "home.passMini.vvipPrice": "30 days · KRW 59,000",
    "home.passMini.familyPrice": "30 days · KRW 149,000",
    "home.themeToggle.pigMode": "🐷 Yeoni flower-pig mode",
    "home.themeToggle.neoMode": "🦁 Neo white-lion mode",
    "famousSaju.detail.birthSummary": "{year}.{month}.{day} (solar calendar) · The hour pillar is closed, and the reading follows the three pillars of year, month, and day.",
    "famousSaju.detail.chartTitle": "📜 Saju chart (year, month, day pillars)",
    "famousSaju.detail.masterTitle": "🔮 Saju master summary",
    "famousSaju.detail.fiveTitle": "🌿 Five-element analysis",
    "famousSaju.detail.careerTitle": "💼 Temperament & career fit",
    "famousSaju.detail.flowTitle": "🌊 Fortune flow",
    "famousSaju.detail.adviceTitle": "✨ Today's alignment",
    "famousSaju.detail.calculating": "⏳ Calculating the saju chart...",
  };

  if (exact[key]) return exact[key];

  let next = value;
  next = next.replace(/([A-Za-z])\?s\b/g, "$1's");
  next = next.replace(/\?\{([^}]+)\}\?/g, "“{$1}”");
  next = next.replace(/\?([^?{}\n]{1,80})\?/g, "“$1”");

  if (key.endsWith(".growthCycle") || key.includes("Cycle")) {
    next = next.replace(/\s\?\s/g, " → ");
  } else {
    next = next.replace(/\s\?\s/g, " · ");
  }

  return next;
}

function shouldStayUnchanged(key, value) {
  if (unchangedKeyPatterns.some((pattern) => pattern.test(key))) return true;
  if (unchangedValues.has(value)) return true;
  if (/^[\d\s.,:+/%()\-–—]+$/.test(value)) return true;
  if (/^[A-Z0-9_./:-]+$/.test(value) && value.length <= 24) return true;
  return false;
}

function protectText(value) {
  const protectedValues = [];
  let text = value.replace(/\{[^}]+\}|<br\s*\/?>|<\/?[a-z][^>]*>/gi, (match) => {
    const token = `__CDPH${protectedValues.length}__`;
    protectedValues.push([token, match]);
    return token;
  });
  return { text, protectedValues };
}

function restoreText(value, protectedValues) {
  let text = value;
  for (const [token, original] of protectedValues) {
    const pattern = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    text = text.replace(pattern, original);
  }
  return text
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+([）」』】])/g, "$1")
    .replace(/([「『【])\s+/g, "$1")
    .trim();
}

function splitTranslatedBatch(raw, expectedCount) {
  const marker = "__CDITEM_";
  const chunks = [];
  const markerRe = /__CDITEM_(\d+)__/g;
  const matches = [...raw.matchAll(markerRe)];
  if (matches.length !== expectedCount || !raw.includes(marker)) return null;

  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : raw.length;
    chunks.push(raw.slice(start, end).trim());
  }

  return chunks.length === expectedCount ? chunks : null;
}

async function translateTextBatch(items, targetLang) {
  const body = items.map((item, index) => `__CDITEM_${index}__ ${item.text}`).join("\n");
  const query = new URLSearchParams({
    client: "gtx",
    sl: "en",
    tl: targetLang,
    dt: "t",
    q: body,
  });
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query.toString()}`, {
    headers: { "User-Agent": "CodeDestinyI18n/1.0" },
  });
  if (!response.ok) throw new Error(`translate ${targetLang} failed: ${response.status}`);
  const payload = await response.json();
  const translated = (payload?.[0] || []).map((part) => part?.[0] || "").join("");
  const chunks = splitTranslatedBatch(translated, items.length);
  if (!chunks) {
    if (items.length === 1) return [translated.trim()];
    const results = [];
    for (const item of items) {
      results.push((await translateTextBatch([item], targetLang))[0]);
    }
    return results;
  }
  return chunks;
}

function makeBatches(entries) {
  const batches = [];
  let batch = [];
  let length = 0;
  for (const entry of entries) {
    const itemLength = entry.text.length + 24;
    if (batch.length >= 35 || (batch.length && length + itemLength > 4200)) {
      batches.push(batch);
      batch = [];
      length = 0;
    }
    batch.push(entry);
    length += itemLength;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

const destinyFlowerCopy = {
  ja: {
    defaultScenario: "{dayMasterBadge}の環境で運命花が開く流れ",
    flowerTitle: (name) => `${name}、いまの運命に開く花`,
    flowerDescription: (name) =>
      `${name}は、いま集まりつつある気配が静かなタイミングと感情の明晰さをもって形になる様子を映します。`,
    scenarioTitle: (stem, theme) => `${stem}${theme ? `が${theme}を帯びて` : ""}運命花が開く流れ`,
    stems: {
      "Jia Wood": "甲木",
      "Yi Wood": "乙木",
      "Bing Fire": "丙火",
      "Ding Fire": "丁火",
      "Wu Earth": "戊土",
      "Ji Earth": "己土",
      "Geng Metal": "庚金",
      "Xin Metal": "辛金",
      "Ren Water": "壬水",
      "Gui Water": "癸水",
    },
    themes: {
      "upright-leading": "まっすぐ導く力",
      "metal-tempering": "金の鍛錬",
      "dry-heat endurance": "乾いた熱を越える粘り",
      "metal-water harmony": "金水の調和",
      "dry-soil survival": "乾いた土に根を張る強さ",
      "autumn refinement": "秋の洗練",
      "moist-spring expansion": "潤う春の広がり",
      "spring ignition": "春の点火",
      "summer expansion": "夏の拡張",
      "water-control": "水を制する感覚",
      "cold-damp warmth": "冷湿を温める火",
      "metal-refining": "金を磨く火",
      "resonance blooming": "響き合って咲く気配",
      "fire-earth achievement": "火土が成果を結ぶ力",
      "winter foundation": "冬に土台を築く力",
      "center-building": "中心を整える力",
      "cultivation expansion": "育てて広げる力",
      "precision-design": "精密に設計する感覚",
      "balance-tuning": "均衡を調律する力",
      "principle-through": "筋を通す力",
      "fire-tempering": "火で鍛えられる強さ",
      "decisive-judgment": "決断を下す鋭さ",
      "metal-water refinement": "金水の洗練",
      "wood-tuning": "木の気を整える感覚",
      completion: "完成へ向かう気配",
      "summer-cooling": "夏を冷ます清流",
      "winter-condensing": "冬に凝縮する力",
      "night-intuition": "夜に冴える直感",
      "cold-damp purification": "冷湿を澄ませる力",
      "summer-empathy": "夏に広がる共感",
      "subtle-signal": "かすかな兆しを読む感覚",
    },
  },
  "zh-cn": {
    defaultScenario: "{dayMasterBadge}的环境中，命运之花正在绽放",
    flowerTitle: (name) => `${name}，此刻命运中绽放的花`,
    flowerDescription: (name) => `${name}映照出你此刻的能量，如何在安静的时机与清晰的情绪中慢慢成形。`,
    scenarioTitle: (stem, theme) => `${stem}${theme ? `带着${theme}` : ""}绽放命运之花的走势`,
    stems: {
      "Jia Wood": "甲木",
      "Yi Wood": "乙木",
      "Bing Fire": "丙火",
      "Ding Fire": "丁火",
      "Wu Earth": "戊土",
      "Ji Earth": "己土",
      "Geng Metal": "庚金",
      "Xin Metal": "辛金",
      "Ren Water": "壬水",
      "Gui Water": "癸水",
    },
    themes: {
      "upright-leading": "笔直引领的力量",
      "metal-tempering": "金气锻炼",
      "dry-heat endurance": "承受燥热的韧性",
      "metal-water harmony": "金水相和",
      "dry-soil survival": "在燥土中扎根的力量",
      "autumn refinement": "秋日淬炼",
      "moist-spring expansion": "润春扩展",
      "spring ignition": "春火点燃",
      "summer expansion": "夏日舒展",
      "water-control": "调御水势",
      "cold-damp warmth": "温化寒湿",
      "metal-refining": "炼金成器",
      "resonance blooming": "共鸣开花",
      "fire-earth achievement": "火土成就",
      "winter foundation": "冬日筑基",
      "center-building": "建立中心",
      "cultivation expansion": "培育扩展",
      "precision-design": "精密设计",
      "balance-tuning": "调和均衡",
      "principle-through": "贯通原则",
      "fire-tempering": "火炼成锋",
      "decisive-judgment": "果断判断",
      "metal-water refinement": "金水洗炼",
      "wood-tuning": "调木成势",
      completion: "趋向完成",
      "summer-cooling": "夏日清凉",
      "winter-condensing": "冬日凝聚",
      "night-intuition": "夜间直觉",
      "cold-damp purification": "净化寒湿",
      "summer-empathy": "夏日共感",
      "subtle-signal": "细微信号",
    },
  },
  "zh-tw": {
    defaultScenario: "{dayMasterBadge}的環境中，命運之花正在綻放",
    flowerTitle: (name) => `${name}，此刻命運中綻放的花`,
    flowerDescription: (name) => `${name}映照出你此刻的能量，如何在安靜的時機與清晰的情緒中慢慢成形。`,
    scenarioTitle: (stem, theme) => `${stem}${theme ? `帶著${theme}` : ""}綻放命運之花的走勢`,
    stems: {
      "Jia Wood": "甲木",
      "Yi Wood": "乙木",
      "Bing Fire": "丙火",
      "Ding Fire": "丁火",
      "Wu Earth": "戊土",
      "Ji Earth": "己土",
      "Geng Metal": "庚金",
      "Xin Metal": "辛金",
      "Ren Water": "壬水",
      "Gui Water": "癸水",
    },
    themes: {
      "upright-leading": "筆直引領的力量",
      "metal-tempering": "金氣鍛鍊",
      "dry-heat endurance": "承受燥熱的韌性",
      "metal-water harmony": "金水相和",
      "dry-soil survival": "在燥土中扎根的力量",
      "autumn refinement": "秋日淬鍊",
      "moist-spring expansion": "潤春擴展",
      "spring ignition": "春火點燃",
      "summer expansion": "夏日舒展",
      "water-control": "調御水勢",
      "cold-damp warmth": "溫化寒濕",
      "metal-refining": "煉金成器",
      "resonance blooming": "共鳴開花",
      "fire-earth achievement": "火土成就",
      "winter foundation": "冬日築基",
      "center-building": "建立中心",
      "cultivation expansion": "培育擴展",
      "precision-design": "精密設計",
      "balance-tuning": "調和均衡",
      "principle-through": "貫通原則",
      "fire-tempering": "火煉成鋒",
      "decisive-judgment": "果斷判斷",
      "metal-water refinement": "金水洗鍊",
      "wood-tuning": "調木成勢",
      completion: "趨向完成",
      "summer-cooling": "夏日清涼",
      "winter-condensing": "冬日凝聚",
      "night-intuition": "夜間直覺",
      "cold-damp purification": "淨化寒濕",
      "summer-empathy": "夏日共感",
      "subtle-signal": "細微信號",
    },
  },
};

function cleanupTranslatedValue(key, value) {
  if (typeof value !== "string") return value;
  let next = value.replace(/([A-Za-z])\?s\b/g, "$1's");
  next = next.replace(/,\?\{([^}]+)\},\?/g, ", {$1},");
  next = next.replace(/\?\{([^}]+)\}\.\?/g, "{$1}.");
  next = next.replace(/\?\{([^}]+)\},\?/g, "{$1},");
  next = next.replace(/\?\{([^}]+)\}\?/g, "{$1}");
  next = next.replace(/\?\{([^}]+)\}/g, "{$1}");
  next = next.replace(/\{([^}]+)\}\?/g, "{$1}");
  if (key === "home.music.hint") next = next.replace(/^\?\s*/, "♪ ");
  if (key === "home.startCards.freeBadge") next = next.replace(/\s\?\s/g, " · ");
  return next;
}

function resolveScenarioTitle(locale, sourceValue) {
  const copy = destinyFlowerCopy[locale];
  if (!copy || typeof sourceValue !== "string") return null;
  if (sourceValue.startsWith("{dayMasterBadge} environment")) return copy.defaultScenario;
  const base = sourceValue.replace(/\s*blooming scenario$/i, "").trim();
  const stemSource = Object.keys(copy.stems).find((stem) => base.startsWith(stem));
  if (!stemSource) return copy.scenarioTitle(base, "");
  const themeSource = base.slice(stemSource.length).trim();
  return copy.scenarioTitle(copy.stems[stemSource], copy.themes[themeSource] || themeSource);
}

function applyDeterministicCleanup(locale, localeJson, repairedEnFlat) {
  const copy = destinyFlowerCopy[locale];
  const localeFlat = flatten(localeJson);
  let changed = 0;

  for (const [key, value] of Object.entries(localeFlat)) {
    if (typeof value !== "string") continue;
    const cleaned = cleanupTranslatedValue(key, value);
    if (cleaned !== value) {
      setValue(localeJson, key, cleaned);
      changed += 1;
    }
  }

  if (!copy) return changed;

  for (const key of Object.keys(repairedEnFlat)) {
    if (/^fortune\.destinyFlower\.saju\.scenarios\..+\.title$/.test(key)) {
      const title = resolveScenarioTitle(locale, repairedEnFlat[key]);
      if (title && getValue(localeJson, key) !== title) {
        setValue(localeJson, key, title);
        changed += 1;
      }
    }

    const flowerMatch = key.match(/^fortune\.destinyFlower\.flowers\.([^.]+)\.(title|description)$/);
    if (!flowerMatch) continue;
    const [, flowerKey, field] = flowerMatch;
    const namePath = `fortune.destinyFlower.flowers.${flowerKey}.name`;
    const name = cleanupTranslatedValue(namePath, getValue(localeJson, namePath) || getValue(localeJson, key) || "Flower");
    const next = field === "title" ? copy.flowerTitle(name) : copy.flowerDescription(name);
    if (getValue(localeJson, key) !== next) {
      setValue(localeJson, key, next);
      changed += 1;
    }
  }

  return changed;
}

const originalEn = await readJson("en.json");
const originalEnFlat = flatten(originalEn);
const repairedEn = structuredClone(originalEn);
const repairedEnFlat = {};

for (const [key, value] of Object.entries(originalEnFlat)) {
  const repaired = cleanupTranslatedValue(key, repairEnglishValue(key, value));
  repairedEnFlat[key] = repaired;
  if (repaired !== value) setValue(repairedEn, key, repaired);
}

await writeFile(resolve(i18nDir, "en.json"), `${JSON.stringify(repairedEn, null, 2)}\n`, "utf8");

for (const [locale, targetLang] of targets) {
  const localeJson = await readJson(`${locale}.json`);
  const localeFlat = flatten(localeJson);
  const valuesToTranslate = new Map();

  for (const [key, localeValue] of Object.entries(localeFlat)) {
    const oldEnglishValue = originalEnFlat[key];
    const repairedEnglishValue = repairedEnFlat[key];
    if (typeof localeValue !== "string" || typeof repairedEnglishValue !== "string") continue;
    if (shouldStayUnchanged(key, repairedEnglishValue)) continue;
    const sameAsOld = localeValue === oldEnglishValue;
    const sameAsRepaired = localeValue === repairedEnglishValue;
    if (!sameAsOld && !sameAsRepaired) continue;
    if (!valuesToTranslate.has(repairedEnglishValue)) {
      valuesToTranslate.set(repairedEnglishValue, protectText(repairedEnglishValue));
    }
  }

  const prepared = [...valuesToTranslate.entries()].map(([source, protectedEntry]) => ({
    source,
    ...protectedEntry,
  }));
  const batches = makeBatches(prepared);
  const translatedMap = new Map();
  let completed = 0;

  for (const batch of batches) {
    const translated = await translateTextBatch(batch, targetLang);
    translated.forEach((value, index) => {
      const item = batch[index];
      translatedMap.set(item.source, restoreText(value, item.protectedValues));
    });
    completed += batch.length;
    process.stdout.write(`[i18n:translate] ${locale} ${completed}/${prepared.length}\r`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 120));
  }
  if (prepared.length) process.stdout.write("\n");

  let changed = 0;
  for (const [key, localeValue] of Object.entries(localeFlat)) {
    const oldEnglishValue = originalEnFlat[key];
    const repairedEnglishValue = repairedEnFlat[key];
    if (typeof localeValue !== "string" || typeof repairedEnglishValue !== "string") continue;

    if (localeValue === oldEnglishValue && repairedEnglishValue !== oldEnglishValue && shouldStayUnchanged(key, repairedEnglishValue)) {
      setValue(localeJson, key, repairedEnglishValue);
      changed += 1;
      continue;
    }

    const translated = translatedMap.get(repairedEnglishValue);
    if (!translated) continue;
    if (localeValue === oldEnglishValue || localeValue === repairedEnglishValue) {
      setValue(localeJson, key, translated);
      changed += 1;
    }
  }

  changed += applyDeterministicCleanup(locale, localeJson, repairedEnFlat);

  await writeFile(resolve(i18nDir, `${locale}.json`), `${JSON.stringify(localeJson, null, 2)}\n`, "utf8");
  console.log(`[i18n:translate] ${locale} changed=${changed}, unique=${prepared.length}`);
}

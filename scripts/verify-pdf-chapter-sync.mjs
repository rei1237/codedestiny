import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LIFE_BOOK_CHAPTERS } from "../worker/lib/saju/life-book/chapterConfig.js";
import { SAJU_NEW_YEAR_CHAPTERS, LOVE_SECRET_MODE_CONFIG } from "../worker/lib/saju-premium-chapters.js";
import { SUKUYO_PERSONAL_CHAPTER_META, SUKUYO_COMPAT_CHAPTER_META } from "../worker/lib/sukuyo-premium.js";
import { VEDIC_PERSONAL_CHAPTER_META } from "../worker/lib/vedic-premium-chapters.js";
import { ZIWEI_PREMIUM_12_CHAPTERS } from "../worker/lib/ziwei-premium-book-structure.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function findBalancedBlock(source, marker, openChar, closeChar) {
  const markerIdx = source.indexOf(marker);
  if (markerIdx < 0) throw new Error(`Marker not found: ${marker}`);
  const start = source.indexOf(openChar, markerIdx);
  if (start < 0) throw new Error(`Open char not found for marker: ${marker}`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === openChar) depth += 1;
    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`Unclosed block for marker: ${marker}`);
}

function evalLiteral(literal) {
  return Function(`"use strict"; return (${literal});`)();
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleSubtitlePair(list = []) {
  const titles = [];
  const subtitles = [];
  for (const row of Array.isArray(list) ? list : []) {
    titles.push(normalizeText(row?.title || row));
    subtitles.push(normalizeText(row?.subtitle || ""));
  }
  return { titles, subtitles };
}

function compareOrderedText(frontList = [], workerList = []) {
  const maxLen = Math.max(frontList.length, workerList.length);
  const mismatch = [];
  for (let i = 0; i < maxLen; i += 1) {
    const front = normalizeText(frontList[i] || "");
    const worker = normalizeText(workerList[i] || "");
    if (front !== worker) {
      mismatch.push({ idx: i + 1, front, worker });
    }
  }
  return mismatch;
}

function hasCanonicalMetaHook(sourceText = "") {
  const markerA = /_syncChapterMetaFromResponse\s*\(/.test(sourceText);
  const markerB = /chapterMeta\s*[:=]/.test(sourceText) || /data\.chapterMeta/.test(sourceText);
  const markerC = /row\.title\s*\|\|\s*CHAPTER_DEFINITIONS/.test(sourceText)
    && /row\.subtitle\s*\|\|\s*CHAPTER_DEFINITIONS/.test(sourceText);
  return (markerA && markerB) || markerC;
}

function countFrontend() {
  const ziwei = readText("js/ziwei-book.js");
  const astro = readText("js/astro-book.js");
  const vedic = readText("js/vedic-book.js");
  const lifebook = readText("js/life-book.js");
  const sukuyo = readText("js/sukuyo-book.js");
  const loveSecret = readText("js/love-secret-v2.js");
  const newYear = readText("js/saju-new-year.js");

  const ziweiTitles = evalLiteral(findBalancedBlock(ziwei, "var CHAPTER_TITLES", "[", "]"));
  const ziweiSubtitles = evalLiteral(findBalancedBlock(ziwei, "var CHAPTER_SUBTITLES", "[", "]"));
  const astroTitles = evalLiteral(findBalancedBlock(astro, "var CHAPTER_TITLES", "[", "]"));
  const astroSubtitles = evalLiteral(findBalancedBlock(astro, "var CHAPTER_SUBTITLES", "[", "]"));
  const vedicTitles = evalLiteral(findBalancedBlock(vedic, "var CHAPTER_TITLES", "[", "]"));
  const vedicSubtitles = evalLiteral(findBalancedBlock(vedic, "var CHAPTER_SUBTITLES", "[", "]"));
  const lifebookTitles = evalLiteral(findBalancedBlock(lifebook, "var CHAPTER_TITLES", "[", "]"));
  const lifebookSubtitles = evalLiteral(findBalancedBlock(lifebook, "var CHAPTER_SUBTITLES", "[", "]"));
  const sukuyoModes = evalLiteral(findBalancedBlock(sukuyo, "var SK_MODE_CHAPTERS", "{", "}"));
  const loveSecretMeta = evalLiteral(findBalancedBlock(loveSecret, "var LOVE_SECRET_CHAPTER_META", "{", "}"));
  const newYearDefs = evalLiteral(findBalancedBlock(newYear, "var CHAPTER_DEFINITIONS", "[", "]"));

  const totalChapterMatch = newYear.match(/var\s+TOTAL_CHAPTERS\s*=\s*(\d+)\s*;/);
  if (!totalChapterMatch) throw new Error("Unable to parse TOTAL_CHAPTERS in js/saju-new-year.js");
  const sajuNewYearTotal = Number(totalChapterMatch[1]);

  const sukuyoPersonal = {
    titles: Array.isArray(sukuyoModes?.personal?.titles) ? sukuyoModes.personal.titles.map(normalizeText) : [],
    subtitles: Array.isArray(sukuyoModes?.personal?.subtitles) ? sukuyoModes.personal.subtitles.map(normalizeText) : [],
  };
  const sukuyoCompatibility = {
    titles: Array.isArray(sukuyoModes?.compatibility?.titles) ? sukuyoModes.compatibility.titles.map(normalizeText) : [],
    subtitles: Array.isArray(sukuyoModes?.compatibility?.subtitles) ? sukuyoModes.compatibility.subtitles.map(normalizeText) : [],
  };

  const loveSecretSolo = {
    titles: Array.isArray(loveSecretMeta?.solo?.titles) ? loveSecretMeta.solo.titles.map(normalizeText) : [],
    subtitles: Array.isArray(loveSecretMeta?.solo?.subtitles) ? loveSecretMeta.solo.subtitles.map(normalizeText) : [],
  };
  const loveSecretCompatibility = {
    titles: Array.isArray(loveSecretMeta?.compatibility?.titles) ? loveSecretMeta.compatibility.titles.map(normalizeText) : [],
    subtitles: Array.isArray(loveSecretMeta?.compatibility?.subtitles) ? loveSecretMeta.compatibility.subtitles.map(normalizeText) : [],
  };

  const newYearPair = toTitleSubtitlePair(newYearDefs);

  return {
    ziwei: {
      count: Array.isArray(ziweiTitles) ? ziweiTitles.length : 0,
      titles: (Array.isArray(ziweiTitles) ? ziweiTitles : []).map(normalizeText),
      subtitles: (Array.isArray(ziweiSubtitles) ? ziweiSubtitles : []).map(normalizeText),
      hasCanonicalHook: hasCanonicalMetaHook(ziwei),
    },
    astro: {
      count: Array.isArray(astroTitles) ? astroTitles.length : 0,
      titles: (Array.isArray(astroTitles) ? astroTitles : []).map(normalizeText),
      subtitles: (Array.isArray(astroSubtitles) ? astroSubtitles : []).map(normalizeText),
      hasCanonicalHook: hasCanonicalMetaHook(astro),
    },
    vedic: {
      count: Array.isArray(vedicTitles) ? vedicTitles.length : 0,
      titles: (Array.isArray(vedicTitles) ? vedicTitles : []).map(normalizeText),
      subtitles: (Array.isArray(vedicSubtitles) ? vedicSubtitles : []).map(normalizeText),
      hasCanonicalHook: hasCanonicalMetaHook(vedic),
    },
    lifeBook: {
      count: Array.isArray(lifebookTitles) ? lifebookTitles.length : 0,
      titles: (Array.isArray(lifebookTitles) ? lifebookTitles : []).map(normalizeText),
      subtitles: (Array.isArray(lifebookSubtitles) ? lifebookSubtitles : []).map(normalizeText),
      hasCanonicalHook: hasCanonicalMetaHook(lifebook),
    },
    sukuyoPersonal: {
      count: sukuyoPersonal.titles.length,
      titles: sukuyoPersonal.titles,
      subtitles: sukuyoPersonal.subtitles,
      hasCanonicalHook: hasCanonicalMetaHook(sukuyo),
    },
    sukuyoCompatibility: {
      count: sukuyoCompatibility.titles.length,
      titles: sukuyoCompatibility.titles,
      subtitles: sukuyoCompatibility.subtitles,
      hasCanonicalHook: hasCanonicalMetaHook(sukuyo),
    },
    loveSecretSolo: {
      count: loveSecretSolo.titles.length,
      titles: loveSecretSolo.titles,
      subtitles: loveSecretSolo.subtitles,
      hasCanonicalHook: hasCanonicalMetaHook(loveSecret),
    },
    loveSecretCompatibility: {
      count: loveSecretCompatibility.titles.length,
      titles: loveSecretCompatibility.titles,
      subtitles: loveSecretCompatibility.subtitles,
      hasCanonicalHook: hasCanonicalMetaHook(loveSecret),
    },
    sajuNewYear: {
      count: sajuNewYearTotal,
      titles: newYearPair.titles,
      subtitles: newYearPair.subtitles,
      hasCanonicalHook: hasCanonicalMetaHook(newYear),
    },
  };
}

function countWorker() {
  const premiumRoutes = readText("worker/routes/premium.js");
  const astroMeta = evalLiteral(findBalancedBlock(premiumRoutes, "const ASTRO_PERSONAL_CHAPTER_META", "[", "]"));

  const ziweiTitles = ZIWEI_PREMIUM_12_CHAPTERS.map((row) => normalizeText(row?.title || ""));
  const ziweiSubtitles = ZIWEI_PREMIUM_12_CHAPTERS.map((row) => normalizeText(row?.subtitle || ""));
  const vedicTitles = VEDIC_PERSONAL_CHAPTER_META.map((row) => normalizeText(row?.title || ""));
  const vedicSubtitles = VEDIC_PERSONAL_CHAPTER_META.map((row) => normalizeText(row?.subtitle || ""));
  const lifeBookTitles = LIFE_BOOK_CHAPTERS.map((row) => normalizeText(row?.title || ""));
  const lifeBookSubtitles = LIFE_BOOK_CHAPTERS.map((row) => normalizeText(row?.subtitle || ""));
  const sukuyoPersonalTitles = SUKUYO_PERSONAL_CHAPTER_META.map((row) => normalizeText(row?.title || ""));
  const sukuyoPersonalSubtitles = SUKUYO_PERSONAL_CHAPTER_META.map((row) => normalizeText(row?.subtitle || ""));
  const sukuyoCompatibilityTitles = SUKUYO_COMPAT_CHAPTER_META.map((row) => normalizeText(row?.title || ""));
  const sukuyoCompatibilitySubtitles = SUKUYO_COMPAT_CHAPTER_META.map((row) => normalizeText(row?.subtitle || ""));
  const loveSecretSoloTitles = (LOVE_SECRET_MODE_CONFIG?.solo?.chapters || []).map((row) => normalizeText(row?.title || ""));
  const loveSecretSoloSubtitles = (LOVE_SECRET_MODE_CONFIG?.solo?.chapters || []).map((row) => normalizeText(row?.subtitle || ""));
  const loveSecretCompatibilityTitles = (LOVE_SECRET_MODE_CONFIG?.couple?.chapters || []).map((row) => normalizeText(row?.title || ""));
  const loveSecretCompatibilitySubtitles = (LOVE_SECRET_MODE_CONFIG?.couple?.chapters || []).map((row) => normalizeText(row?.subtitle || ""));
  const sajuNewYearTitles = SAJU_NEW_YEAR_CHAPTERS.map((row) => normalizeText(row?.title || ""));
  const sajuNewYearSubtitles = SAJU_NEW_YEAR_CHAPTERS.map((row) => normalizeText(row?.subtitle || ""));
  const astroTitles = (Array.isArray(astroMeta) ? astroMeta : []).map((row) => normalizeText(row?.title || ""));
  const astroSubtitles = (Array.isArray(astroMeta) ? astroMeta : []).map((row) => normalizeText(row?.subtitle || ""));

  return {
    ziwei: { count: ziweiTitles.length, titles: ziweiTitles, subtitles: ziweiSubtitles },
    astro: { count: astroTitles.length, titles: astroTitles, subtitles: astroSubtitles },
    vedic: { count: vedicTitles.length, titles: vedicTitles, subtitles: vedicSubtitles },
    lifeBook: { count: lifeBookTitles.length, titles: lifeBookTitles, subtitles: lifeBookSubtitles },
    sukuyoPersonal: {
      count: sukuyoPersonalTitles.length,
      titles: sukuyoPersonalTitles,
      subtitles: sukuyoPersonalSubtitles,
    },
    sukuyoCompatibility: {
      count: sukuyoCompatibilityTitles.length,
      titles: sukuyoCompatibilityTitles,
      subtitles: sukuyoCompatibilitySubtitles,
    },
    loveSecretSolo: {
      count: loveSecretSoloTitles.length,
      titles: loveSecretSoloTitles,
      subtitles: loveSecretSoloSubtitles,
    },
    loveSecretCompatibility: {
      count: loveSecretCompatibilityTitles.length,
      titles: loveSecretCompatibilityTitles,
      subtitles: loveSecretCompatibilitySubtitles,
    },
    sajuNewYear: {
      count: sajuNewYearTitles.length,
      titles: sajuNewYearTitles,
      subtitles: sajuNewYearSubtitles,
    },
  };
}

function main() {
  const front = countFrontend();
  const worker = countWorker();

  const keys = [
    ["ziwei", "Ziwei PDF"],
    ["astro", "Astro PDF"],
    ["vedic", "Vedic PDF"],
    ["sukuyoPersonal", "Sukuyo Personal"],
    ["sukuyoCompatibility", "Sukuyo Compatibility"],
    ["lifeBook", "LifeBook"],
    ["loveSecretSolo", "LoveSecret Solo"],
    ["loveSecretCompatibility", "LoveSecret Compatibility"],
    ["sajuNewYear", "Saju New Year"],
  ];

  let mismatch = 0;
  let warning = 0;
  const rows = keys.map(([key, label]) => {
    const frontRow = front[key] || {};
    const workerRow = worker[key] || {};
    const fCount = Number(frontRow.count || 0);
    const wCount = Number(workerRow.count || 0);
    const countOk = fCount === wCount;
    const titleMismatch = compareOrderedText(frontRow.titles || [], workerRow.titles || []);
    const subtitleMismatch = compareOrderedText(frontRow.subtitles || [], workerRow.subtitles || []);
    const hasCanonicalHook = Boolean(frontRow.hasCanonicalHook);

    if (!countOk) mismatch += 1;
    const hasSemanticMismatch = titleMismatch.length > 0 || subtitleMismatch.length > 0;
    if (hasSemanticMismatch && !hasCanonicalHook) mismatch += 1;
    if (hasSemanticMismatch && hasCanonicalHook) warning += 1;

    return {
      label,
      front: fCount,
      worker: wCount,
      countOk,
      hasCanonicalHook,
      titleMismatch,
      subtitleMismatch,
      status: (!countOk || (hasSemanticMismatch && !hasCanonicalHook)) ? "MISMATCH" : "OK",
    };
  });

  console.info("[verify-pdf-chapter-sync] Chapter count contract report");
  for (const row of rows) {
    const titleMismatchCount = row.titleMismatch.length;
    const subtitleMismatchCount = row.subtitleMismatch.length;
    console.info(
      `- ${row.status} | ${row.label}: front=${row.front}, worker=${row.worker}, canonicalHook=${row.hasCanonicalHook ? "yes" : "no"}, titleMismatch=${titleMismatchCount}, subtitleMismatch=${subtitleMismatchCount}`,
    );

    if ((titleMismatchCount > 0 || subtitleMismatchCount > 0) && row.hasCanonicalHook) {
      const sample = row.titleMismatch[0] || row.subtitleMismatch[0] || null;
      if (sample) {
        console.info(`  warn> canonical runtime override active; sample diff ch${sample.idx}: front='${sample.front}' | worker='${sample.worker}'`);
      }
    }
  }

  if (mismatch > 0) {
    console.error(`[verify-pdf-chapter-sync] ${mismatch} mismatch(es) detected.`);
    process.exit(1);
  }

  if (warning > 0) {
    console.warn(`[verify-pdf-chapter-sync] warning: ${warning} service(s) rely on runtime chapterMeta override for title/subtitle canonical sync.`);
  }

  console.info("[verify-pdf-chapter-sync] OK: all PDF chapter counts are synced.");
}

main();

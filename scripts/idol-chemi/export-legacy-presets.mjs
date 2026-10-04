#!/usr/bin/env node
// 기존 295 프리셋(app/saju/destiny-bias/lib/celebrityProfiles.ts)을 워커·Next 공용 .js 로 내보낸다.
// 원본 TS 는 편집하지 않는다(정치 용어 정적 테스트가 count 를 고정). 시간 필드는 버린다(최애 생시 미사용 원칙).
// 사용: node scripts/idol-chemi/export-legacy-presets.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = path.join(ROOT, "app/saju/destiny-bias/lib/celebrityProfiles.ts");
const TARGET = path.join(ROOT, "lib/idol-chemi/data/legacyPresets.generated.js");
export const LEGACY_PRESET_VERSION = "legacy-presets-2026.10-v1";

const IDOL_CATEGORIES = new Set(["걸그룹", "보이그룹"]);

function parseGroupKoAlias(text) {
  const block = text.match(/const GROUP_KO_ALIAS[^=]*=\s*\{([\s\S]*?)\n\};/);
  const out = {};
  if (!block) return out;
  const rowRe = /^\s*([^\s:]+):\s*\[([^\]]*)\]/gm;
  let m;
  while ((m = rowRe.exec(block[1]))) {
    const key = m[1].replace(/^"|"$/g, "");
    out[key] = [...m[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
  }
  return out;
}

function parseRawPresets(text) {
  const start = text.indexOf("const rawCelebrityPresets");
  const end = text.indexOf("\n];", start);
  if (start < 0 || end < 0) throw new Error("rawCelebrityPresets block not found");
  const body = text.slice(start, end);
  const rows = [];
  const rowRe = /\{\s*category:\s*"([^"]+)",\s*fullName:\s*"([^"]+)",\s*birth:\s*"([^"]+)"([^}]*)\}/g;
  let m;
  while ((m = rowRe.exec(body))) {
    const rest = m[4];
    const artist = rest.match(/artist:\s*"([^"]*)"/);
    const aliases = rest.match(/aliases:\s*\[([^\]]*)\]/);
    rows.push({
      category: m[1],
      fullName: m[2],
      birth: m[3],
      artist: artist ? artist[1] : "",
      aliases: aliases ? [...aliases[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]) : [],
    });
  }
  return rows;
}

function splitName(fullName, category) {
  if (IDOL_CATEGORIES.has(category)) {
    const sep = fullName.lastIndexOf(" ");
    if (sep > 0) return { artist: fullName.slice(0, sep).trim(), name: fullName.slice(sep + 1).trim() };
  }
  return { artist: "", name: fullName.trim() };
}

function toIsoDate(birth) {
  const digits = String(birth).replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) throw new Error("birth not 8 digits: " + birth);
  return digits.slice(0, 4) + "-" + digits.slice(4, 6) + "-" + digits.slice(6, 8);
}

export function buildLegacyPresets() {
  const text = fs.readFileSync(SOURCE, "utf8");
  const aliasMap = parseGroupKoAlias(text);
  return parseRawPresets(text).map((item, index) => {
    const parts = splitName(item.fullName, item.category);
    const artist = String(item.artist || parts.artist || "").trim();
    const name = String(parts.name || item.fullName).trim();
    const search = [item.fullName, name, artist, item.category, ...item.aliases, ...(aliasMap[artist] || [])];
    return {
      id: "bias-celeb-" + (index + 1),
      category: item.category,
      name,
      artist,
      birthDate: toIsoDate(item.birth),
      birthTimeKnown: false,
      searchText: Array.from(new Set(search.map((s) => s.toLowerCase()).filter(Boolean))).join(" "),
    };
  });
}

export function renderModule(presets) {
  const lines = presets.map((p) => "  " + JSON.stringify(p) + ",");
  return [
    "// 생성 파일 — 편집 금지. node scripts/idol-chemi/export-legacy-presets.mjs 로 재생성.",
    "// 원본: app/saju/destiny-bias/lib/celebrityProfiles.ts (295 프리셋). 시간 필드는 의도적으로 제거했다.",
    'export const LEGACY_PRESET_VERSION = "' + LEGACY_PRESET_VERSION + '";',
    "export const LEGACY_PRESETS = Object.freeze([",
    ...lines,
    "]);",
    "",
  ].join("\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const presets = buildLegacyPresets();
  const rendered = renderModule(presets);
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, "utf8") : "";
    if (current !== rendered) {
      console.error("legacyPresets.generated.js is stale — run: node scripts/idol-chemi/export-legacy-presets.mjs");
      process.exit(1);
    }
    console.log("legacyPresets.generated.js up to date (" + presets.length + " presets)");
  } else {
    fs.mkdirSync(path.dirname(TARGET), { recursive: true });
    fs.writeFileSync(TARGET, rendered, "utf8");
    console.log("wrote " + path.relative(ROOT, TARGET) + " (" + presets.length + " presets)");
  }
}

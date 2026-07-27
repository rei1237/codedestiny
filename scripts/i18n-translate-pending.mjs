#!/usr/bin/env node
/**
 * i18n/pending/<namespace>.ko.json 을 11개 로케일로 번역해 public/i18n/*.json 에 병합한다.
 *
 * 대상은 "코드가 요구하는데 사전엔 없던" 키들이다. 지금 이 키들은 비한국어 사용자에게
 * 문자열 "Translation pending" 으로 그대로 노출된다(cd-lang-native.js 의 MISSING_TEXT).
 * 즉 이 스크립트는 기능 추가가 아니라 **가시적 결함 복구**다.
 *
 * 설계 메모
 *  - Gemini 2.5 는 긴 JSON 출력에서 thinking 이 켜져 있으면 응답이 잘린다.
 *    thinkingBudget 0 고정. (프로젝트 기존 사고: gemini25_thinking_json_truncation)
 *  - 청크·로케일 단위로 캐시해 중단 후 재개가 가능하다. API 비용이 반복 청구되지 않는다.
 *  - 반환값은 검증한다: 키 집합 동일 / 보간 자리표시자 보존 / 한글 잔존 없음.
 *    하나라도 어기면 그 청크는 버리고 재시도한다. 검증 실패분은 사전에 쓰지 않는다.
 *
 * 사용법:
 *   GEMINIF_API_KEY=... node scripts/i18n-translate-pending.mjs [--locales ja,en] [--dry-run] [--limit 2]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const rootDir = process.cwd();
const i18nDir = resolve(rootDir, "public", "i18n");
const pendingDir = resolve(rootDir, "i18n", "pending");
const cacheDir = resolve(rootDir, "i18n", ".translate-cache");
const glossary = JSON.parse(readFileSync(resolve(rootDir, "i18n", "glossary.json"), "utf8"));

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const CHUNK_SIZE = 50;
const MAX_ATTEMPTS = 3;

/** 사전 파일명 → Gemini 에 지시할 언어 이름. */
const TARGETS = {
  "en.json": { code: "en", name: "English" },
  "ja.json": { code: "ja", name: "Japanese (日本語)" },
  "zh-cn.json": { code: "zh-CN", name: "Simplified Chinese (简体中文)" },
  "zh-tw.json": { code: "zh-TW", name: "Traditional Chinese (繁體中文)" },
  "vi.json": { code: "vi", name: "Vietnamese (Tiếng Việt)" },
  "hi.json": { code: "hi", name: "Hindi (हिन्दी)" },
  "es.json": { code: "es", name: "Spanish (Español)" },
  "fr.json": { code: "fr", name: "French (Français)" },
  "de.json": { code: "de", name: "German (Deutsch)" },
  "nl.json": { code: "nl", name: "Dutch (Nederlands)" },
  "ms.json": { code: "ms", name: "Malay (Bahasa Melayu)" },
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const localeFilter = (() => {
  const i = args.indexOf("--locales");
  return i >= 0 && args[i + 1] ? new Set(args[i + 1].split(",")) : null;
})();
const chunkLimit = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : Infinity;
})();

const apiKey = process.env.GEMINIF_API_KEY;
if (!apiKey && !dryRun) {
  console.error("[translate] GEMINIF_API_KEY 가 없습니다. --dry-run 으로 프롬프트만 확인할 수 있습니다.");
  process.exit(1);
}

const chunkHash = (chunk) => createHash("sha1").update(JSON.stringify(chunk)).digest("hex").slice(0, 12);

const placeholdersOf = (value) =>
  [...String(value).matchAll(/\{\{?\s*[A-Za-z0-9_.-]+\s*\}?\}/g)].map((m) => m[0]).sort().join(" ");

function setDeep(target, dottedKey, value) {
  const parts = dottedKey.split(".");
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (typeof node[key] !== "object" || node[key] === null || Array.isArray(node[key])) node[key] = {};
    node = node[key];
  }
  node[parts[parts.length - 1]] = value;
}

function buildPrompt(entries, target) {
  const glossaryLines = Object.entries(glossary.terms)
    .map(([ko, t]) => `  ${ko} → ${t[target.code] || t.en}${t.note ? `   (${t.note})` : ""}`)
    .join("\n");

  return [
    `You are localizing the UI of "Code Destiny", a Korean fortune-telling service (saju, tarot, Zi Wei Dou Shu, Vedic astrology).`,
    `Translate each Korean value into ${target.name}.`,
    "",
    "HARD REQUIREMENTS",
    "1. Return ONLY a JSON object mapping every input key to its translated string. Same keys, same count.",
    "2. Preserve every interpolation placeholder exactly as-is: {name}, {{count}}, etc. Do not translate or reorder placeholder names.",
    "3. Never leave Korean characters in the output.",
    "4. These are UI labels. Keep them short — roughly the visual length of the source. Do not add explanations.",
    "5. Never translate these brand names: " + glossary.doNotTranslate.join(", ") + ".",
    "",
    "DOMAIN GLOSSARY (use these exact renderings)",
    glossaryLines,
    "",
    "TONE",
    glossary.voice.rules.map((r, i) => `${i + 1}. ${r}`).join("\n"),
    "",
    "INPUT (JSON: key → Korean source)",
    JSON.stringify(entries, null, 2),
  ].join("\n");
}

async function callGemini(prompt) {
  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
        // 긴 JSON 출력에서 thinking 이 켜져 있으면 응답이 잘린다 — 반드시 0.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!text.trim()) throw new Error(`빈 응답 (finishReason=${json?.candidates?.[0]?.finishReason})`);
  return JSON.parse(text);
}

/** 번역 결과가 쓸 수 있는지 검사. 실패 사유를 문자열로, 통과면 null. */
function validate(entries, translated) {
  const inputKeys = Object.keys(entries);
  const missing = inputKeys.filter((k) => typeof translated[k] !== "string" || !translated[k].trim());
  if (missing.length) return `키 누락 ${missing.length}개 (${missing.slice(0, 3).join(", ")})`;
  const korean = inputKeys.filter((k) => /[가-힣]/.test(translated[k]));
  if (korean.length) return `한글 잔존 ${korean.length}개 (${korean.slice(0, 3).join(", ")})`;
  const broken = inputKeys.filter((k) => placeholdersOf(entries[k]) !== placeholdersOf(translated[k]));
  if (broken.length) return `자리표시자 불일치 ${broken.length}개 (${broken.slice(0, 3).join(", ")})`;
  return null;
}

/**
 * 한 청크를 번역한다. 세 번 실패하면 **반으로 쪼개 각각 재시도**한다.
 * 50키 묶음에서 모델이 키를 하나씩 흘리는 일이 실제로 발생했는데(hi 로케일),
 * 같은 크기로 재시도해 봐야 같은 확률로 또 흘린다. 작게 쪼개면 통과한다.
 */
async function translateChunk(chunk, target, label, depth = 0) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const candidate = await callGemini(buildPrompt(chunk, target));
      const problem = validate(chunk, candidate);
      if (problem) throw new Error(problem);
      return candidate;
    } catch (error) {
      const last = attempt === MAX_ATTEMPTS;
      console.warn(`[translate] ${label} 시도 ${attempt} 실패: ${error.message}${last ? "" : " — 재시도"}`);
      if (!last) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }

  const keys = Object.keys(chunk);
  if (keys.length <= 1 || depth >= 4) {
    console.warn(`[translate] ${label} 포기 (${keys.length}키)`);
    return null;
  }
  const mid = Math.ceil(keys.length / 2);
  console.warn(`[translate] ${label} → ${keys.length}키를 ${mid}/${keys.length - mid} 로 쪼개 재시도`);
  const halves = await Promise.all([keys.slice(0, mid), keys.slice(mid)].map((part, i) =>
    translateChunk(
      Object.fromEntries(part.map((k) => [k, chunk[k]])),
      target,
      `${label}.${i}`,
      depth + 1,
    )));
  if (halves.some((half) => !half)) return null;
  return Object.assign({}, ...halves);
}

// ── 입력 수집 ─────────────────────────────────────────────────────────────
if (!existsSync(pendingDir)) {
  console.error("[translate] i18n/pending 이 없습니다. `npm run i18n:extract-ko` 를 먼저 실행하세요.");
  process.exit(1);
}
const pending = {};
for (const file of readdirSync(pendingDir).filter((f) => f.endsWith(".ko.json"))) {
  Object.assign(pending, JSON.parse(readFileSync(join(pendingDir, file), "utf8")));
}
const allKeys = Object.keys(pending).sort();

/** 로케일 사전에서 점 경로로 값 읽기. */
function getDeep(source, dottedKey) {
  return dottedKey.split(".").reduce((acc, k) => (acc && typeof acc === "object" ? acc[k] : undefined), source);
}

/**
 * 로케일별로 **아직 없는 키만** 번역한다. 이미 채워진 키를 다시 부르면 돈과 시간이
 * 그대로 낭비되고, 청크 구성이 흔들려 캐시도 무의미해진다. 이 필터 덕분에 스크립트를
 * 몇 번을 돌려도 남은 결손만 정확히 메운다(hi 로케일의 실패분 50개처럼).
 */
function missingKeysFor(fileName) {
  const json = JSON.parse(readFileSync(join(i18nDir, fileName), "utf8"));
  return allKeys.filter((key) => typeof getDeep(json, key) !== "string");
}

function chunkify(keys) {
  const out = [];
  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    out.push(Object.fromEntries(keys.slice(i, i + CHUNK_SIZE).map((k) => [k, pending[k]])));
  }
  return out;
}

console.log(`[translate] pending 키 ${allKeys.length}개, 로케일별 결손만 처리`);
for (const [fileName, target] of Object.entries(TARGETS)) {
  if (localeFilter && !localeFilter.has(target.code)) continue;
  const n = missingKeysFor(fileName).length;
  if (n) console.log(`[translate]   ${target.code.padEnd(6)} 결손 ${n}`);
}

if (dryRun) {
  const sample = chunkify(allKeys)[0];
  console.log("\n──── 첫 청크 프롬프트 미리보기 (ja) ────\n");
  console.log(buildPrompt(sample, TARGETS["ja.json"]).slice(0, 2400));
  console.log("\n[translate] --dry-run: API 를 호출하지 않았습니다.");
  process.exit(0);
}

// 286회 배치를 돌리기 전에 한 청크만 실제 번역해 품질을 눈으로 확인하는 모드.
// 사전 파일은 건드리지 않는다.
if (args.includes("--sample")) {
  for (const [fileName, target] of Object.entries(TARGETS)) {
    if (localeFilter && !localeFilter.has(target.code)) continue;
    const sample = Object.fromEntries(Object.entries(chunkify(allKeys)[0]).slice(0, 12));
    const translated = await callGemini(buildPrompt(sample, target));
    const problem = validate(sample, translated);
    console.log(`\n──── ${target.code} ${problem ? `❌ ${problem}` : "✅ 검증 통과"} ────`);
    for (const [key, ko] of Object.entries(sample)) {
      console.log(`  ${key}\n    ko: ${ko}\n    ${target.code}: ${translated[key]}`);
    }
  }
  console.log("\n[translate] --sample: 사전 파일을 수정하지 않았습니다.");
  process.exit(0);
}

mkdirSync(cacheDir, { recursive: true });

// ── ko.json 은 원문 그대로 병합 ───────────────────────────────────────────
const koPath = join(i18nDir, "ko.json");
const koJson = JSON.parse(readFileSync(koPath, "utf8"));
for (const [key, value] of Object.entries(pending)) setDeep(koJson, key, value);
writeFileSync(koPath, `${JSON.stringify(koJson, null, 2)}\n`, "utf8");
console.log(`[translate] ko.json 병합 완료 (+${allKeys.length}키)`);

// ── 로케일별 번역 ─────────────────────────────────────────────────────────
const summary = [];
for (const [fileName, target] of Object.entries(TARGETS)) {
  if (localeFilter && !localeFilter.has(target.code)) continue;
  const filePath = join(i18nDir, fileName);
  const json = JSON.parse(readFileSync(filePath, "utf8"));
  const chunks = chunkify(missingKeysFor(fileName));
  if (!chunks.length) { console.log(`[translate] ${target.code}: 결손 없음 — 건너뜀`); continue; }
  const pendingCount = chunks.reduce((n, c) => n + Object.keys(c).length, 0);
  let applied = 0;
  let failed = 0;

  for (const [index, chunk] of chunks.entries()) {
    if (index >= chunkLimit) break;
    // 🔴 캐시 키는 청크 **내용** 해시여야 한다. 인덱스로 잡으면 pending 에 키가
    // 추가되는 순간 청크 구성이 밀리면서 엉뚱한 번역이 재사용된다.
    const cachePath = join(cacheDir, `${target.code}.${chunkHash(chunk)}.json`);
    let translated = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : null;
    if (!translated) {
      translated = await translateChunk(chunk, target, `${target.code} 청크 ${index}`);
      if (translated) writeFileSync(cachePath, `${JSON.stringify(translated, null, 2)}\n`, "utf8");
    }

    if (!translated) { failed += Object.keys(chunk).length; continue; }
    for (const [key, value] of Object.entries(translated)) { setDeep(json, key, value); applied += 1; }
    process.stdout.write(`\r[translate] ${target.code}: ${applied}/${pendingCount}   `);
  }

  writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  console.log(`\r[translate] ${target.code}: 적용 ${applied} / 실패 ${failed}                `);
  summary.push({ locale: target.code, applied, failed });
}

console.log("");
console.log("[translate] 요약");
summary.forEach((s) => console.log(`[translate]   ${s.locale.padEnd(6)} 적용 ${String(s.applied).padStart(5)}  실패 ${s.failed}`));
const totalFailed = summary.reduce((sum, s) => sum + s.failed, 0);
if (totalFailed) {
  console.log(`[translate] 실패분이 남아 있습니다. 같은 명령을 다시 실행하면 캐시된 성공분은 건너뛰고 실패분만 재시도합니다.`);
  process.exit(1);
}

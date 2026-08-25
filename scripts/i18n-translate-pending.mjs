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
 *
 * 백엔드는 두 가지다.
 *   --provider gemini      (기본) Gemini 2.5 Flash. GEMINIF_API_KEY 필요.
 *   --provider workers-ai  Cloudflare Workers AI REST. 자격증명은 .env/.dev.vars 에서 읽는다.
 *
 * 🔴 Workers AI 는 **하루 10,000 Neuron 무료**이고 넘기면 요청이 에러로 실패한다. 그리고 그
 * 할당량은 프로덕션의 Workers AI 폴백(lib/llm-client.ts)과 **같은 계정에서 공유**된다. 그래서
 * 이 스크립트는 응답의 usage 로 실제 소비량을 세어 i18n/.translate-cache/neuron-ledger.json 에
 * UTC 날짜별로 누적하고, --neuron-budget 에 닿으면 그 자리에서 멈춘다. 남은 결손은 다음 날
 * 같은 명령으로 이어서 하면 된다(missingKeysFor 가 이미 채운 키를 건너뛴다).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

import {
  createWorkersAiRunner,
  loadLocalEnvFiles,
  neuronsFor,
  WORKERS_AI_DAILY_FREE_NEURONS,
} from "./lib/workers-ai-rest.mjs";

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
/**
 * 네임스페이스 모드. 지정하면 코어 사전이 아니라
 * public/i18n/<file>/<ns>.json 에 쓴다.
 * 코어 사전은 홈 첫 페인트 경로에서 바로 받으므로 무한정 키울 수 없다 —
 * 런타임 생성 UI 문구(수천 개)는 이쪽으로 분리한다.
 */
const namespaceArg = (() => {
  const i = args.indexOf("--namespace");
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
})();

const flagValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const provider = flagValue("--provider", "gemini");
if (provider !== "gemini" && provider !== "workers-ai") {
  console.error(`[translate] --provider 는 gemini 또는 workers-ai 만 받습니다 (받은 값: ${provider})`);
  process.exit(1);
}
const workersAiModel = flagValue("--model", "@cf/zai-org/glm-4.7-flash");
/**
 * 번역이 끝난 뒤 **en 값을 그대로 복사할** 로케일. API 를 부르지 않는다.
 *
 * 🔴 사용자 지시(2026-08-25): 손으로 저작하는 것은 en·ja·zh-CN·zh-TW 넷뿐이고
 * vi·hi·es·fr·de·nl·ms 는 영어를 그대로 채운다. 기계 번역도 같은 정책을 따른다 —
 * 11개 전부를 부르면 토큰이 2.75배가 되는데 결과물은 정책상 쓰지도 않는다.
 */
const mirrorEnLocales = (() => {
  const raw = flagValue("--mirror-en", "");
  return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
})();
/**
 * 하루 예산. 🔴 기본값이 무료 할당(10,000)이 **아니라** 그보다 낮다.
 *
 * 두 가지 이유다.
 *  1. 예산 검사는 호출 **전에** 한다. 아래 reserve 로직이 다음 호출 몫을 미리 빼 두지만,
 *     관측값이 없는 첫 호출은 추정치라 여유가 필요하다.
 *  2. 🔴 원장은 **이 스크립트가 쓴 것만** 센다. 같은 계정의 프로덕션 폴백
 *     (lib/llm-client.ts → env.AI.run)이 쓴 양은 안 잡힌다. Gemini 가 실패해 폴백이 도는
 *     날에는 계정 총량이 원장보다 크고, 그 차이가 그대로 초과분이 된다.
 *
 * 계정의 **실제** 소비량은 `node scripts/check-workers-ai-quota.mjs` 로 확인한다(조회 전용).
 */
const neuronBudget = Number(flagValue("--neuron-budget", String(WORKERS_AI_DAILY_FREE_NEURONS - 500)));

const apiKey = process.env.GEMINIF_API_KEY;
if (provider === "gemini" && !apiKey && !dryRun) {
  console.error("[translate] GEMINIF_API_KEY 가 없습니다. --dry-run 으로 프롬프트만 확인할 수 있습니다.");
  process.exit(1);
}

let workersAi = null;
if (provider === "workers-ai" && !dryRun) {
  loadLocalEnvFiles();
  workersAi = createWorkersAiRunner(process.env);
  if (!workersAi) {
    console.error("[translate] Workers AI 자격증명을 찾지 못했습니다 — 계정 ID 와 토큰이 .env/.dev.vars 에 있어야 합니다.");
    process.exit(1);
  }
}

/**
 * 🔴 캐시 키에 provider·model 이 들어간다. 청크 내용만 해싱하면 Gemini 로 만든 캐시를
 * Workers AI 실행이 그대로 주워 써서, 백엔드를 바꾼 의미가 사라지고 품질 비교도 못 한다.
 */
const chunkHash = (chunk) =>
  createHash("sha1")
    .update(JSON.stringify({ provider, model: provider === "workers-ai" ? workersAiModel : "gemini-2.5-flash", chunk }))
    .digest("hex")
    .slice(0, 12);

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

/** 예산 소진은 재시도 대상이 아니다 — translateChunk 가 이 클래스를 보고 즉시 손을 뗀다. */
class NeuronBudgetExhausted extends Error {}

const ledgerPath = () => join(cacheDir, "neuron-ledger.json");
/** 🔴 Cloudflare 의 리셋 기준은 00:00 **UTC** 다. 로컬 날짜로 세면 한국시간 오전 9시에 어긋난다. */
const utcDay = () => new Date().toISOString().slice(0, 10);

function readLedger() {
  try {
    return JSON.parse(readFileSync(ledgerPath(), "utf8"));
  } catch {
    return {};
  }
}

function spentToday() {
  return Number(readLedger()[utcDay()] || 0);
}

function recordNeurons(amount) {
  mkdirSync(cacheDir, { recursive: true });
  const ledger = readLedger();
  ledger[utcDay()] = Number(ledger[utcDay()] || 0) + amount;
  writeFileSync(ledgerPath(), `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  return ledger[utcDay()];
}

/**
 * 관측된 호출 1회 최대 비용. 🔴 평균이 아니라 **최대**를 예약분으로 쓴다 — 평균으로 잡으면
 * 평균보다 비싼 호출 하나가 그대로 한도를 넘긴다.
 * 관측 전 첫 호출은 실측 상한(2026-08-25: 50키 청크 약 210)에 여유를 붙인 값을 쓴다.
 */
let maxObservedNeurons = 0;
const FIRST_CALL_RESERVE = 400;

async function callWorkersAi(prompt) {
  const spent = spentToday();
  const reserve = maxObservedNeurons || FIRST_CALL_RESERVE;
  // 🔴 "다 썼는가" 가 아니라 "이번 호출까지 하면 넘는가" 로 판단한다. 호출 전 검사라 그렇게
  //    해야 마지막 한 번이 한도를 넘지 않는다 — Paid 플랜에서 초과분은 그대로 청구된다.
  if (spent + reserve > neuronBudget) {
    throw new NeuronBudgetExhausted(
      `오늘(UTC ${utcDay()}) 예산 ${neuronBudget} Neuron 에 도달했습니다 (사용 ${spent.toFixed(0)} + 다음 호출 예약 ${reserve.toFixed(0)})`,
    );
  }

  // 요청 모양은 lib/llm-client.ts 의 buildWorkersAiInput 과 같다.
  // response_format 은 @cf/meta/* 가 아닐 때만 붙는다(meta 계열은 json_schema 를 요구한다).
  const input = {
    messages: [{ role: "user", content: prompt }],
    max_tokens: 16384,
    temperature: 0.3,
  };
  if (!workersAiModel.startsWith("@cf/meta/")) input.response_format = { type: "json_object" };

  const result = await workersAi.run(workersAiModel, input);
  const used = neuronsFor(workersAiModel, result?.usage);
  if (used > maxObservedNeurons) maxObservedNeurons = used;
  const total = recordNeurons(used);
  lastUsage = { ...result?.usage, neurons: used, todayTotal: total };

  // 응답 파싱은 lib/llm-client.ts 의 extractWorkersAiText 와 같은 후보 순서다.
  const choice = result?.choices?.[0];
  const text = String(result?.response || choice?.message?.content || choice?.text || result?.text || "").trim();
  if (!text) throw new Error(`빈 응답 (finish_reason=${choice?.finish_reason || result?.finish_reason})`);
  return JSON.parse(text);
}

let lastUsage = null;

/** provider 분기. 이 함수 밖에서는 어느 백엔드인지 몰라도 된다. */
async function callModel(prompt) {
  return provider === "workers-ai" ? callWorkersAi(prompt) : callGemini(prompt);
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateChunk(chunk, target, label, depth = 0) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const candidate = await callModel(buildPrompt(chunk, target));
      const problem = validate(chunk, candidate);
      if (problem) throw new Error(problem);
      return candidate;
    } catch (error) {
      // 🔴 예산 소진은 내용 문제가 아니다. 재시도하면 실패한 호출을 예산 없이 반복할 뿐이다.
      if (error instanceof NeuronBudgetExhausted) throw error;
      const last = attempt === MAX_ATTEMPTS;
      // 429 는 내용 문제가 아니라 속도 문제다. 쪼개 봐야 요청 수만 늘어 악화되므로
      // 훨씬 길게 쉬고 같은 크기로 다시 친다.
      const rateLimited = /\b429\b/.test(error.message);
      console.warn(`[translate] ${label} 시도 ${attempt} 실패: ${error.message.slice(0, 90)}${last ? "" : " — 재시도"}`);
      if (!last) await sleep(rateLimited ? 20_000 * attempt : 1500 * attempt);
      else if (rateLimited) {
        // 마지막 시도까지 429 면 쿼터가 식을 때까지 기다린 뒤 한 번 더.
        console.warn(`[translate] ${label} 레이트리밋 지속 — 60초 대기 후 최종 재시도`);
        await sleep(60_000);
        try {
          const candidate = await callModel(buildPrompt(chunk, target));
          if (!validate(chunk, candidate)) return candidate;
        } catch (retryError) {
          if (retryError instanceof NeuronBudgetExhausted) throw retryError;
        }
      }
    }
  }

  const keys = Object.keys(chunk);
  if (keys.length <= 1 || depth >= 4) {
    console.warn(`[translate] ${label} 포기 (${keys.length}키)`);
    return null;
  }
  const mid = Math.ceil(keys.length / 2);
  console.warn(`[translate] ${label} → ${keys.length}키를 ${mid}/${keys.length - mid} 로 쪼개 재시도`);
  // 🔴 순차 실행. 병렬로 쪼개면 실패한 청크 하나가 요청 수를 배로 늘려
  // 레이트리밋을 스스로 유발한다(실제로 es 에서 429 연쇄가 났다).
  const results = [];
  for (const [i, part] of [keys.slice(0, mid), keys.slice(mid)].entries()) {
    const half = await translateChunk(
      Object.fromEntries(part.map((k) => [k, chunk[k]])),
      target,
      `${label}.${i}`,
      depth + 1,
    );
    if (!half) return null;
    results.push(half);
  }
  return Object.assign({}, ...results);
}

// ── 입력 수집 ─────────────────────────────────────────────────────────────
if (!existsSync(pendingDir)) {
  console.error("[translate] i18n/pending 이 없습니다. `npm run i18n:extract-ko` 를 먼저 실행하세요.");
  process.exit(1);
}
const pending = {};
/**
 * 코어 사전이 아니라 전용 네임스페이스 파일로만 가야 하는 pending.
 * 코어는 홈 첫 페인트에서 바로 받으므로 수천 개짜리 런타임 UI 문구를 얹으면 안 된다.
 * 여기 등록해 두면 --namespace 없이 돌려도 코어를 오염시키지 않는다.
 */
const NAMESPACE_ONLY = new Set(["shellRuntime"]);

const pendingFiles = readdirSync(pendingDir)
  .filter((f) => f.endsWith(".ko.json"))
  .filter((f) => {
    const ns = f.replace(/\.ko\.json$/, "");
    return namespaceArg ? ns === namespaceArg : !NAMESPACE_ONLY.has(ns);
  });
for (const file of pendingFiles) {
  Object.assign(pending, JSON.parse(readFileSync(join(pendingDir, file), "utf8")));
}

/** 로케일 파일 경로. 네임스페이스 모드면 public/i18n/<basename>/<ns>.json */
function localePath(fileName) {
  if (!namespaceArg) return join(i18nDir, fileName);
  const dir = join(i18nDir, fileName.replace(/\.json$/, ""));
  mkdirSync(dir, { recursive: true });
  return join(dir, `${namespaceArg}.json`);
}

function readLocale(fileName) {
  const path = localePath(fileName);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
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
  const json = readLocale(fileName);
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
    const translated = await callModel(buildPrompt(sample, target));
    const problem = validate(sample, translated);
    console.log(`\n──── ${target.code} ${problem ? `❌ ${problem}` : "✅ 검증 통과"} ────`);
    if (lastUsage) {
      const koChars = Object.values(sample).join("").replace(/[^가-힣]/g, "").length;
      console.log(
        `  usage: prompt ${lastUsage.prompt_tokens} / completion ${lastUsage.completion_tokens}` +
          ` → ${lastUsage.neurons.toFixed(1)} Neuron (오늘 누적 ${lastUsage.todayTotal.toFixed(0)}/${neuronBudget})`,
      );
      console.log(`  한글 ${koChars}자 → 입력 ${(lastUsage.prompt_tokens / Math.max(koChars, 1)).toFixed(2)} 토큰/자`);
    }
    for (const [key, ko] of Object.entries(sample)) {
      console.log(`  ${key}\n    ko: ${ko}\n    ${target.code}: ${translated[key]}`);
    }
  }
  console.log("\n[translate] --sample: 사전 파일을 수정하지 않았습니다.");
  process.exit(0);
}

mkdirSync(cacheDir, { recursive: true });

// ── ko.json 은 원문 그대로 병합 ───────────────────────────────────────────
const koPath = localePath("ko.json");
const koJson = readLocale("ko.json");
for (const [key, value] of Object.entries(pending)) setDeep(koJson, key, value);
writeFileSync(koPath, `${JSON.stringify(koJson, null, 2)}\n`, "utf8");
console.log(`[translate] ko.json 병합 완료 (+${allKeys.length}키)`);

// ── 로케일별 번역 ─────────────────────────────────────────────────────────
const summary = [];
/** 예산이 끊긴 사유. 채워지면 남은 로케일도 돌지 않고 요약으로 넘어간다. */
let budgetStop = "";
for (const [fileName, target] of Object.entries(TARGETS)) {
  if (localeFilter && !localeFilter.has(target.code)) continue;
  if (budgetStop) break;
  const filePath = localePath(fileName);
  const json = readLocale(fileName);
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
      try {
        translated = await translateChunk(chunk, target, `${target.code} 청크 ${index}`);
      } catch (error) {
        if (!(error instanceof NeuronBudgetExhausted)) throw error;
        budgetStop = error.message;
        break;
      }
      if (translated) writeFileSync(cachePath, `${JSON.stringify(translated, null, 2)}\n`, "utf8");
      await sleep(400); // 쿼터 여유. 캐시 적중 시에는 쉬지 않는다.
    }

    if (!translated) { failed += Object.keys(chunk).length; continue; }
    // 🔴 **요청한 키만** 쓴다. validate 는 요청 키가 다 왔는지만 보고 모델이 덤으로 만들어낸
    //    키는 거르지 않는다 — 그대로 순회하면 환각 키가 setDeep 으로 사전에 박힌다.
    for (const key of Object.keys(chunk)) { setDeep(json, key, translated[key]); applied += 1; }
    process.stdout.write(`\r[translate] ${target.code}: ${applied}/${pendingCount}   `);
  }

  writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  console.log(`\r[translate] ${target.code}: 적용 ${applied} / 실패 ${failed}                `);
  summary.push({ locale: target.code, applied, failed });
}

// ── en 을 미저작 로케일로 복사 (API 호출 없음) ─────────────────────────────
if (mirrorEnLocales.length) {
  const enJson = readLocale("en.json");
  const sourceKeys = allKeys.filter((key) => typeof getDeep(enJson, key) === "string");
  for (const code of mirrorEnLocales) {
    const entry = Object.entries(TARGETS).find(([, t]) => t.code === code);
    if (!entry) {
      console.warn(`[translate] --mirror-en: 모르는 로케일 ${code} — 건너뜁니다`);
      continue;
    }
    const [fileName] = entry;
    const json = readLocale(fileName);
    let copied = 0;
    for (const key of sourceKeys) {
      if (typeof getDeep(json, key) === "string") continue;
      setDeep(json, key, getDeep(enJson, key));
      copied += 1;
    }
    writeFileSync(localePath(fileName), `${JSON.stringify(json, null, 2)}\n`, "utf8");
    console.log(`[translate] ${code}: en 복사 ${copied}키 (en 보유 ${sourceKeys.length})`);
  }
}

console.log("");
console.log("[translate] 요약");
summary.forEach((s) => console.log(`[translate]   ${s.locale.padEnd(6)} 적용 ${String(s.applied).padStart(5)}  실패 ${s.failed}`));

if (provider === "workers-ai") {
  const spent = spentToday();
  console.log(`[translate] Neuron: 오늘(UTC ${utcDay()}) ${spent.toFixed(0)} / 예산 ${neuronBudget} (무료 할당 ${WORKERS_AI_DAILY_FREE_NEURONS})`);
  const remaining = Object.entries(TARGETS)
    .filter(([, t]) => !localeFilter || localeFilter.has(t.code))
    .map(([f, t]) => `${t.code} ${missingKeysFor(f).length}`)
    .join(" · ");
  console.log(`[translate] 남은 결손: ${remaining}`);
  console.log("[translate] 🔴 원장은 이 스크립트가 쓴 것만 셉니다 — 계정 실제 소비량은 node scripts/check-workers-ai-quota.mjs 로 확인하세요.");
}

if (budgetStop) {
  console.log(`[translate] ⏸ ${budgetStop}`);
  console.log("[translate] 00:00 UTC(한국 09:00) 이후에 같은 명령을 다시 실행하면 남은 결손만 이어서 처리합니다.");
  process.exit(0);
}

const totalFailed = summary.reduce((sum, s) => sum + s.failed, 0);
if (totalFailed) {
  console.log(`[translate] 실패분이 남아 있습니다. 같은 명령을 다시 실행하면 캐시된 성공분은 건너뛰고 실패분만 재시도합니다.`);
  process.exit(1);
}

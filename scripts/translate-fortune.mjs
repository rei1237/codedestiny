#!/usr/bin/env node
/**
 * 운세 상시 프로필 번역 초안 생성기.
 *
 * 이 파일은 자동 번역을 정본으로 취급하지 않는다. 번역 원본은
 * content/fortune/translations/<locale>.json 에 남기고, 언어별 에디터가 검수한 뒤
 * 커밋한다. 계산 로직과 한국어 프로필 소스는 건드리지 않는다.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import ts from "typescript";
import vm from "node:vm";

const root = process.cwd();
const localRequire = createRequire(import.meta.url);
const locales = ["en", "ja", "zh-CN", "zh-TW"];
const locale = process.argv.find((arg) => arg.startsWith("--locale="))?.slice(9) || "en";
if (!locales.includes(locale)) throw new Error(`unsupported locale: ${locale}`);

const sourcePath = resolve(root, "lib", "fortune", "sign-profiles.ts");
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports, require: localRequire, console });
const profiles = module.exports.SIGN_PROFILES;
if (!Array.isArray(profiles) || profiles.length !== 24) throw new Error("SIGN_PROFILES must contain 24 profiles");

const fields = ["rangeLabel", "element", "ruler", "essence", "strength", "caution", "luckyHabit", "reading"];
const items = [];
for (const profile of profiles) {
  for (const field of fields) items.push({ id: `${profile.id}:${field}`, text: String(profile[field] || "") });
  items.push({ id: `${profile.id}:keywords`, text: profile.keywords.join(" · ") });
  for (let index = 0; index < profile.faqs.length; index += 1) {
    items.push({ id: `${profile.id}:faq:${index}:question`, text: profile.faqs[index].question });
    items.push({ id: `${profile.id}:faq:${index}:answer`, text: profile.faqs[index].answer });
  }
}

const endpoint = "https://translate.googleapis.com/translate_a/single";
const marker = (index) => `__CD_FORTUNE_${index}__`;
async function translateBatch(batch) {
  const q = batch.map((item, index) => `${marker(index)} ${item.text}`).join("\n");
  const url = `${endpoint}?client=gtx&sl=ko&tl=${encodeURIComponent(locale)}&dt=t&q=${encodeURIComponent(q)}`;
  let response;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (response.ok || (response.status !== 429 && response.status < 500) || attempt === 3) break;
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
  if (!response.ok) throw new Error(`translation HTTP ${response.status}`);
  const data = await response.json();
  const text = Array.isArray(data?.[0]) ? data[0].map((row) => row?.[0] || "").join("") : "";
  const result = new Map();
  for (let index = 0; index < batch.length; index += 1) {
    const current = marker(index);
    const next = marker(index + 1);
    const start = text.indexOf(current);
    if (start < 0) throw new Error(`missing marker ${batch[index].id}`);
    const end = text.indexOf(next, start + current.length);
    const value = text.slice(start + current.length, end < 0 ? undefined : end).trim();
    if (!value || /[가-힣]/.test(value)) throw new Error(`incomplete ${batch[index].id}`);
    result.set(batch[index].id, value);
  }
  return result;
}

const outDir = resolve(root, "content", "fortune", "translations");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${locale}.json`);
let existing = {};
try { existing = JSON.parse(readFileSync(outPath, "utf8")); } catch {}
const sourceHash = createHash("sha256").update(source).digest("hex");
const translated = new Map(Object.entries(existing.sourceHash === sourceHash ? existing.translations || {} : {}));
const pending = items.filter((item) => !translated.get(item.id)?.trim() || /[가-힣]|__CD_FORTUNE_/.test(translated.get(item.id)));
console.log(`[translate-fortune] ${locale}: ${pending.length}/${items.length}개 문장 시작`);
for (let offset = 0; offset < pending.length; offset += 20) {
  const batch = pending.slice(offset, offset + 20);
  const result = await translateBatch(batch);
  for (const [id, value] of result) translated.set(id, value);
  writeFileSync(outPath, `${JSON.stringify({
    schemaVersion: 1,
    locale,
    sourceHash,
    translations: Object.fromEntries(translated),
  }, null, 2)}\n`);
  console.log(`[translate-fortune] ${locale}: ${Math.min(offset + batch.length, pending.length)}/${pending.length}`);
}
console.log(`[translate-fortune] ${locale}: ${outPath}`);

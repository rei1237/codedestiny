#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { loadTsModule } from "./lib/load-ts-module.mjs";

const root = process.cwd();
const dir = resolve(root, "fortune", "data");
if (!existsSync(dir)) throw new Error("fortune/data missing; run node scripts/gen-daily.mjs first");
const files = readdirSync(dir).filter((file) => /^daily-\d{4}-\d{2}-\d{2}\.json$/.test(file));
const errors = [];
if (!files.length) errors.push("No daily fortune artifacts to verify");
const sourceHash = createHash("sha256").update(readFileSync(resolve(root, "lib/fortune/sign-profiles.ts"), "utf8")).digest("hex");
const { SIGN_PROFILES } = loadTsModule("lib/fortune/sign-profiles.ts");
for (const locale of ["en", "ja", "zh-CN", "zh-TW"]) {
  const file = resolve(root, "content/fortune/translations", `${locale}.json`);
  if (!existsSync(file)) { errors.push(`${locale}: missing profile translations`); continue; }
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (data.schemaVersion !== 1 || data.locale !== locale || data.sourceHash !== sourceHash) errors.push(`${locale}: profile schema/source hash mismatch`);
  for (const profile of SIGN_PROFILES) {
    const fields = ["rangeLabel", "element", "ruler", "essence", "strength", "caution", "luckyHabit", "reading", "keywords",
      ...profile.faqs.flatMap((_, index) => [`faq:${index}:question`, `faq:${index}:answer`])];
    for (const field of fields) {
      const key = `${profile.id}:${field}`; const text = data.translations?.[key];
      if (typeof text !== "string" || !text.trim() || /[가-힣]|__CD_FORTUNE_/.test(text)) errors.push(`${locale}: ${key} incomplete`);
    }
  }
}
function walk(value, path) {
  if (Array.isArray(value)) return value.forEach((child, index) => walk(child, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  if (typeof value.kr === "string") {
    for (const key of ["en", "ja", "zh-CN", "zh-TW"]) {
      if (typeof value[key] !== "string" || !value[key].trim()) errors.push(`${path}: ${key} missing`);
      else if (/[가-힣]/.test(value[key])) errors.push(`${path}: ${key} Korean residue`);
    }
  }
  Object.entries(value).forEach(([key, child]) => walk(child, `${path}.${key}`));
}
for (const file of files) walk(JSON.parse(readFileSync(resolve(dir, file), "utf8")), file);
if (errors.length) { console.error(`[verify:fortune-locales] FAILED ${errors.length}`); errors.slice(0, 30).forEach((item) => console.error(`- ${item}`)); process.exit(1); }
console.log(`[verify:fortune-locales] OK — ${files.length}개 발행 JSON의 canonical locale fields complete`);

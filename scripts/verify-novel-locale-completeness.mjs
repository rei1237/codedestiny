#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { isCompleteNovelTranslation } from "./lib/novel-translation-contract.mjs";

const root = process.cwd();
const sourceRaw = readFileSync(resolve(root, "content/novel/episodes.source.json"), "utf8");
const source = JSON.parse(sourceRaw);
const sourceHash = createHash("sha256").update(sourceRaw).digest("hex");
const invalidText = (text) => !isCompleteNovelTranslation(text);
const locales = ["en", "ja", "zh-CN", "zh-TW"];
const errors = [];
for (const locale of locales) {
  const file = resolve(root, "content/novel/translations", `${locale}.json`);
  if (!existsSync(file)) { errors.push(`${locale}: missing translation source`); continue; }
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (data.schemaVersion !== 1 || data.locale !== locale) errors.push(`${locale}: invalid schema`);
  if (data.sourceHash !== sourceHash) errors.push(`${locale}: stale source hash`);
  if (!Array.isArray(data.episodes) || data.episodes.length !== source.episodes.length) errors.push(`${locale}: episode count`);
  for (let index = 0; index < source.episodes.length; index += 1) {
    const src = source.episodes[index]; const tr = data.episodes?.[index]; const id = src.no === "PROLOGUE" ? "prologue" : src.no.toLowerCase().replace(".", "-");
    if (!tr || tr.id !== id || tr.no !== src.no || tr.beats?.length !== src.beats.length || !tr.tag || !tr.title) { errors.push(`${locale}: ${id} episode shape`); continue; }
    if (invalidText(tr.tag) || invalidText(tr.title)) errors.push(`${locale}: ${id} tag/title incomplete`);
    for (let beat = 0; beat < src.beats.length; beat += 1) {
      const item = tr.beats[beat];
      if (!item || item.id !== `${id}:${beat + 1}` || invalidText(item.t)) errors.push(`${locale}: ${id}:${beat + 1} missing/Korean/marker`);
    }
  }
}
if (errors.length) { console.error(`[verify:novel-i18n] FAILED ${errors.length}`); errors.slice(0, 30).forEach((item) => console.error(`- ${item}`)); process.exit(1); }
console.log(`[verify:novel-i18n] OK — 44화 × ${locales.length}개 언어의 에피소드/비트 ID와 번역이 완전합니다.`);

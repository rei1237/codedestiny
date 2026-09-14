#!/usr/bin/env node

/**
 * 라이트 노벨 번역 초안 생성기.
 *
 * 번역은 발행 시점에 실행하지 않는다. 이 도구는 한국어 정본을 안정적인 비트 ID로
 * 묶어 언어별 소스 파일을 한 번 생성하고, 이후 빌드는 커밋된 JSON만 읽는다.
 * 외부 번역 서비스는 초안 생성에만 사용하며, API 키를 요구하지 않는 Google Translate
 * endpoint를 사용한다. 서비스 장애·누락·마커 훼손은 조용히 한국어로 폴백하지 않고 실패한다.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isCompleteNovelTranslation } from "./lib/novel-translation-contract.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE_PATH = resolve(ROOT, "content/novel/episodes.source.json");
const OUTPUT_DIR = resolve(ROOT, "content/novel/translations");
const LOCALES = new Map([
  ["en", "en"],
  ["ja", "ja"],
  ["zh-CN", "zh-CN"],
  ["zh-TW", "zh-TW"],
]);

const requested = process.argv.find((arg) => arg.startsWith("--locale="))?.split("=")[1];
const targets = requested ? [requested] : [...LOCALES.keys()];
for (const locale of targets) {
  if (!LOCALES.has(locale)) throw new Error(`지원하지 않는 라이트 노벨 로케일: ${locale}`);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function splitTranslatedBatch(raw, expectedCount) {
  const matches = [...raw.matchAll(/(?:ZXQCDITEM(\d+)QXZ|__\s*CDITEM\s*(\d+)\s*__)/g)].map((match) => ({ raw: match[0], index: match.index, indexNumber: Number(match[1] ?? match[2]) }));
  if (matches.length !== expectedCount) return null;
  return matches.map((match, index) => {
    const start = match.index + match.raw.length;
    const end = index + 1 < matches.length ? matches[index + 1].index : raw.length;
    return raw.slice(start, end).trim().replace(/^(?:ZXQCDITEM\d+QXZ|__\s*CDITEM\s*\d+\s*__)\s*/i, "");
  });
}

async function translateBatch(items, target) {
  const query = new URLSearchParams({
    client: "gtx",
    sl: "ko",
    tl: target,
    dt: "t",
    q: items.map((item, index) => `ZXQCDITEM${index}QXZ ${item}`).join("\n"),
  });
  let response;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`, {
      headers: { "User-Agent": "CodeDestinyNovelDraft/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) break;
    if (response.status === 429) throw new Error(`번역 서비스 ${target} HTTP 429; 추가 요청을 중단합니다.`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, Math.min(30000, 2500 * (attempt + 1))));
  }
  if (!response.ok) {
    // Quota and provider failures must not fan out into recursive requests.
    if (response.status === 429 || response.status >= 500) {
      throw new Error(`번역 서비스 ${target} 응답 실패: HTTP ${response.status}; 저장된 진행에서 재개하세요.`);
    }
    if (items.length > 1) {
      const middle = Math.ceil(items.length / 2);
      return [...await translateBatch(items.slice(0, middle), target), ...await translateBatch(items.slice(middle), target)];
    }
    throw new Error(`번역 서비스 ${target} 응답 실패: HTTP ${response.status}`);
  }
  const payload = await response.json();
  const translated = (payload?.[0] || []).map((part) => part?.[0] || "").join("");
  const result = splitTranslatedBatch(translated, items.length);
  if (!result) {
    if (items.length === 1) return [translated.trim().replace(/^(?:ZXQCDITEM\d+QXZ|__\s*CDITEM\s*\d+\s*__)\s*/i, "")];
    const singles = [];
    for (const item of items) singles.push(...(await translateBatch([item], target)));
    return singles;
  }
  return result;
}

function batches(items) {
  const result = [];
  let current = [];
  let length = 0;
  for (const item of items) {
    const nextLength = length + item.text.length + 32;
    if (current.length >= 12 || (current.length && nextLength > 2400)) {
      result.push(current);
      current = [];
      length = 0;
    }
    current.push(item);
    length += item.text.length + 32;
  }
  if (current.length) result.push(current);
  return result;
}

function collectItems(source) {
  const items = [];
  for (const episode of source.episodes) {
    const id = episode.no === "PROLOGUE" ? "prologue" : episode.no.toLowerCase().replace(".", "-");
    items.push({ id: `${id}:tag`, text: episode.tag });
    items.push({ id: `${id}:title`, text: episode.title });
    episode.beats.forEach((beat, index) => {
      items.push({ id: `${id}:${index + 1}`, text: beat.t });
    });
  }
  return items;
}

function setById(output, id, value) {
  const [episodeId, field, beatIndex] = id.split(":");
  const episode = output.episodes.find((item) => item.id === episodeId);
  if (!episode) throw new Error(`번역 대상 에피소드를 찾지 못했습니다: ${episodeId}`);
  if (field === "tag" || field === "title") {
    episode[field] = value;
    return;
  }
  const beat = episode.beats[Number(field) - 1];
  if (!beat) throw new Error(`번역 대상 비트를 찾지 못했습니다: ${id}`);
  beat.t = value;
}

function makeSkeleton(source, locale, sourceHash) {
  return {
    schemaVersion: 1,
    locale,
    sourceHash,
    episodes: source.episodes.map((episode) => {
      const id = episode.no === "PROLOGUE" ? "prologue" : episode.no.toLowerCase().replace(".", "-");
      return {
        id,
        no: episode.no,
        tag: "",
        title: "",
        beats: episode.beats.map((beat, index) => ({ id: `${id}:${index + 1}`, t: "" })),
      };
    }),
  };
}

const sourceRaw = await readFile(SOURCE_PATH, "utf8");
const source = JSON.parse(sourceRaw);
if (source.schemaVersion !== 1 || !Array.isArray(source.episodes) || source.episodes.length !== 44) {
  throw new Error("라이트 노벨 정본 스키마 또는 44화 계약이 맞지 않습니다.");
}

await mkdir(OUTPUT_DIR, { recursive: true });
const items = collectItems(source);
for (const locale of targets) {
  const outputPath = resolve(OUTPUT_DIR, `${locale}.json`);
  let output = makeSkeleton(source, locale, hash(sourceRaw));
  try {
    const previous = JSON.parse(await readFile(outputPath, "utf8"));
    if (previous?.schemaVersion === 1 && previous.locale === locale && previous.sourceHash === hash(sourceRaw)) output = previous;
  } catch {}
  const done = new Set();
  output.episodes.forEach((episode) => {
    if (isCompleteNovelTranslation(episode.tag)) done.add(`${episode.id}:tag`);
    if (isCompleteNovelTranslation(episode.title)) done.add(`${episode.id}:title`);
    episode.beats.forEach((beat) => { if (isCompleteNovelTranslation(beat.t)) done.add(beat.id); });
  });
  const pending = items.filter((item) => !done.has(item.id));
  console.log(`[translate-novel] ${locale}: ${pending.length.toLocaleString()}/${items.length.toLocaleString()}개 문장 시작`);
  let completed = 0;
  for (const batch of batches(pending)) {
    const translated = await translateBatch(batch.map((item) => item.text), LOCALES.get(locale));
    if (translated.length !== batch.length || translated.some((value) => !isCompleteNovelTranslation(value))) {
      throw new Error(`${locale}: 번역 결과 개수가 맞지 않습니다.`);
    }
    batch.forEach((item, index) => setById(output, item.id, translated[index]));
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    completed += batch.length;
    if (completed % 240 < batch.length || completed === items.length) {
      console.log(`[translate-novel] ${locale}: ${completed}/${items.length}`);
    }
  }
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`[translate-novel] ${locale}: ${outputPath}`);
}

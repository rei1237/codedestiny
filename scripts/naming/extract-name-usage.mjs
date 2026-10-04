#!/usr/bin/env node
// 이름 사용 빈도 원천 — Wikidata(CC0) 대한민국 국적 인물의 한국어 이름표·한자 이름표에서 집계 수치만 뽑는다.
//
//   node scripts/naming/extract-name-usage.mjs --ko <ko-labels.tsv> --han <han-labels.tsv> --fetched YYYY-MM-DD
//
// 입력 TSV 는 아래 QUERIES 를 query.wikidata.org 에 그대로 보내 받은 결과다(Accept: text/tab-separated-values).
// 출력: data/naming/raw/wikidata-name-usage.json — 자리별 음절 수, 자리별 (한자, 음) 수. 인물 식별자·성명 원문은 남기지 않는다.
// 한자 정렬: 한국어 이름표와 글자 수가 같은 한자 이름표에서 성의 한자가 KOSIS 성씨표와 맞을 때만 이름 글자를 (한자, 음) 짝으로 센다.
// 음이 실제 그 한자의 인명용 음인지는 빌드(build-naming-data.mjs)가 풀과 대조해 거른다.
// 2026-10-04 대법원 출생신고 이름 통계의 대체 원천(대법원 통계는 조회당 상위 20개·robots Disallow — 정보공개청구 전까지).
// manifest.json 은 extract-raw.mjs 가 통째로 다시 쓰므로, 출처·질의·sha256 은 출력 파일 안에도 넣는다.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseCsvLine, sha256File, stableJson, writeText } from "./lib/naming-data-utils.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const RAW = join(ROOT, "data/naming/raw");
const { values: args } = parseArgs({ options: { ko: { type: "string" }, han: { type: "string" }, fetched: { type: "string" } } });
if (!args.ko || !args.han || !/^\d{4}-\d{2}-\d{2}$/.test(args.fetched || "")) {
  throw new Error("usage: --ko <ko-labels.tsv> --han <han-labels.tsv> --fetched YYYY-MM-DD");
}

const QUERIES = {
  ko: 'SELECT ?p ?ko (MIN(YEAR(?b)) AS ?y) WHERE { ?p wdt:P27 wd:Q884; wdt:P31 wd:Q5; rdfs:label ?ko. FILTER(LANG(?ko)="ko") OPTIONAL { ?p wdt:P569 ?b } } GROUP BY ?p ?ko',
  han: 'SELECT ?p ?zh ?lang WHERE { ?p wdt:P27 wd:Q884; wdt:P31 wd:Q5. { ?p rdfs:label ?zh } UNION { ?p skos:altLabel ?zh } BIND(LANG(?zh) AS ?lang) FILTER(?lang IN ("zh","zh-hant","zh-tw","zh-hk","zh-hans","zh-cn","ko","ko-kore","ja")) FILTER(REGEX(STR(?zh), "^[\\u4e00-\\u9fff\\uf900-\\ufaff]{2,4}$")) }',
};
/** 1940년 이전 출생자는 뺀다(현대 작명 관행에 가깝게). 출생일 미상은 넣는다 — P27=Q884 라 1948년 이후 생존자다. */
const MIN_BIRTH_YEAR = 1940;

// KOSIS 성씨표: 한글 → 한자 집합. 두 음절 한글은 복성.
const surnameHanja = new Map();
const kosis = readFileSync(join(RAW, "kosis-surnames-2015.csv"), "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
const kHead = parseCsvLine(kosis[0]);
for (const line of kosis.slice(1)) {
  const row = parseCsvLine(line);
  const hangul = row[kHead.indexOf("hangul")];
  const hanja = row[kHead.indexOf("hanja_nfc")];
  if (!hangul || !hanja) continue;
  if (!surnameHanja.has(hangul)) surnameHanja.set(hangul, new Set());
  surnameHanja.get(hangul).add(hanja);
}
const compounds = [...surnameHanja.keys()].filter((h) => h.length === 2).sort();

const tsvRows = (path) => readFileSync(path, "utf8").split(/\r?\n/).slice(1).filter((l) => l.trim()).map((l) => l.split("\t"));
const literal = (cell) => cell.replace(/^"/, "").replace(/"(@[\w-]+)?$/, "");
const qid = (cell) => cell.replace(/^<http:\/\/www\.wikidata\.org\/entity\/(Q\d+)>$/, "$1");

const persons = new Map(); // Q → { labels:Set, year }
for (const [p, label, year] of tsvRows(args.ko)) {
  const text = literal(label);
  if (!/^[가-힣]{2,4}$/.test(text)) continue;
  const q = qid(p);
  const y = year ? parseInt(literal(year), 10) : null;
  const prev = persons.get(q);
  if (!prev) persons.set(q, { labels: new Set([text]), year: y });
  else {
    prev.labels.add(text);
    if (y !== null && (prev.year === null || y < prev.year)) prev.year = y;
  }
}
const hanLabels = new Map(); // Q → Set
for (const [p, label] of tsvRows(args.han)) {
  const q = qid(p);
  if (!hanLabels.has(q)) hanLabels.set(q, new Set());
  hanLabels.get(q).add(literal(label).normalize("NFC"));
}

/** 한국어 이름표 → [성, 이름]. 이름은 1~2음절. 복성이 먼저. */
function splitName(label) {
  for (const c of compounds) if (label.startsWith(c) && label.length - 2 >= 1 && label.length - 2 <= 2) return [c, label.slice(2)];
  const s = label[0];
  return surnameHanja.has(s) && label.length - 1 >= 1 && label.length - 1 <= 2 ? [s, label.slice(1)] : null;
}

const syllables = new Map(); // 음절 → [first, second]
const hanja = new Map(); // `${한자}\t${음}` → [first, second, single]
const bump = (map, key, size, index, weight) => {
  if (!map.has(key)) map.set(key, new Array(size).fill(0));
  map.get(key)[index] += weight;
};
const stats = { persons: 0, excludedBefore1940: 0, givenTwoSyllable: 0, alignedTwo: 0, alignedOne: 0 };

for (const [q, { labels, year }] of [...persons].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  if (year !== null && year < MIN_BIRTH_YEAR) { stats.excludedBefore1940++; continue; }
  stats.persons++;
  for (const label of [...labels].sort()) {
    const parts = splitName(label);
    if (!parts) continue;
    const [surname, given] = parts;
    // 두 음절 이름표가 "성+외자"인지 예명인지 한글만으로는 모른다 — 음절 집계는 두 음절 이름만.
    if (given.length === 2) {
      stats.givenTwoSyllable++;
      bump(syllables, given[0], 2, 0, 1);
      bump(syllables, given[1], 2, 1, 1);
    }
    const aligned = new Set();
    for (const text of [...(hanLabels.get(q) || [])].sort()) {
      const chars = Array.from(text);
      if (chars.length !== label.length) continue;
      if (!surnameHanja.get(surname)?.has(chars.slice(0, surname.length).join(""))) continue;
      aligned.add(chars.slice(surname.length).join("\t"));
    }
    // 이름표가 여럿이고 서로 다르면 한 사람이 1 만큼만 세지도록 나눈다.
    const weight = aligned.size ? 1 / aligned.size : 0;
    for (const key of aligned) {
      const chars = key.split("\t");
      if (chars.length === 2) {
        stats.alignedTwo++;
        chars.forEach((ch, k) => bump(hanja, `${ch}\t${given[k]}`, 3, k, weight));
      } else {
        stats.alignedOne++;
        bump(hanja, `${chars[0]}\t${given[0]}`, 3, 2, weight);
      }
    }
  }
}

const round1 = (n) => Math.round(n * 10) / 10;
const byCodepoint = (a, b) => {
  const x = Array.from(a[0]).map((c) => c.codePointAt(0));
  const y = Array.from(b[0]).map((c) => c.codePointAt(0));
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
};
const syllableRows = [...syllables].map(([s, counts]) => [s, ...counts]).sort(byCodepoint);
const hanjaRows = [...hanja]
  .map(([key, counts]) => [...key.split("\t"), ...counts.map(round1)])
  .sort((a, b) => byCodepoint(a, b) || byCodepoint([a[1]], [b[1]]));

const head = {
  generatedBy: "scripts/naming/extract-name-usage.mjs",
  source: "Wikidata Query Service (https://query.wikidata.org/sparql)",
  license: "CC0 1.0 — Wikidata 구조화 데이터(https://www.wikidata.org/wiki/Wikidata:Licensing)",
  fetchedAt: args.fetched,
  queries: QUERIES,
  upstreamSha256: { "ko-labels.tsv": sha256File(args.ko), "han-labels.tsv": sha256File(args.han) },
  filter: `출생연도 ${MIN_BIRTH_YEAR} 이상 또는 미상, 성은 KOSIS 2015 성씨표(복성 우선), 이름 1~2음절`,
  stats,
  syllableFields: ["hangul", "first", "second"],
  hanjaFields: ["ch", "hangul", "first", "second", "single"],
};
const lines = (rows) => rows.map((r) => stableJson(r)).join(",\n");
writeText(join(RAW, "wikidata-name-usage.json"),
  `${stableJson(head).slice(0, -1)},"syllables":[\n${lines(syllableRows)}\n],"hanja":[\n${lines(hanjaRows)}\n]}\n`);
console.log(JSON.stringify({ ...stats, syllables: syllableRows.length, hanja: hanjaRows.length }));

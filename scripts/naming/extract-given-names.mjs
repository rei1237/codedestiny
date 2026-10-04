#!/usr/bin/env node
// 성별 이름 사용 원천 — Wikidata(CC0) 대한민국 국적 인물의 한국어 이름표에서 "이름(성 제외) × 성별" 집계 수치만 뽑는다.
//
//   node scripts/naming/extract-given-names.mjs --ko <ko-gender.tsv> --fetched YYYY-MM-DD
//
// 입력 TSV 는 아래 QUERY 를 query.wikidata.org 에 그대로 보내 받은 결과다(Accept: text/tab-separated-values).
// 출력: data/naming/raw/wikidata-given-names.json — [이름, 남, 여, 남(최근), 여(최근)]. 인물 식별자·성명 원문은 남기지 않는다.
// 엔진은 이 표로 "그 성별에서 실제로 쓰이는 이름"만 추천한다(2026-10-04 Phase 6.5). 음절·한자 집계(wikidata-name-usage.json)와는 별개다.
// 성 분리는 extract-name-usage.mjs 와 같은 규칙(KOSIS 2015 성씨표, 복성 먼저, 이름 1~2음절)이다.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseCsvLine, sha256File, stableJson, writeText } from "./lib/naming-data-utils.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const RAW = join(ROOT, "data/naming/raw");
const { values: args } = parseArgs({ options: { ko: { type: "string" }, fetched: { type: "string" } } });
if (!args.ko || !/^\d{4}-\d{2}-\d{2}$/.test(args.fetched || "")) {
  throw new Error("usage: --ko <ko-gender.tsv> --fetched YYYY-MM-DD");
}

const QUERY = 'SELECT ?p ?ko (MIN(YEAR(?b)) AS ?y) (GROUP_CONCAT(DISTINCT ?g; separator=" ") AS ?gs) WHERE { ?p wdt:P27 wd:Q884; wdt:P31 wd:Q5; rdfs:label ?ko. FILTER(LANG(?ko)="ko") OPTIONAL { ?p wdt:P569 ?b } OPTIONAL { ?p wdt:P21 ?g } } GROUP BY ?p ?ko';
const MIN_BIRTH_YEAR = 1940;
/** 이 해 이후 출생자는 "최근" 열에도 센다 — 요즘 부모가 고르는 이름에 가까운지 보는 보조 지표. */
const RECENT_BIRTH_YEAR = 1990;
const MALE = "http://www.wikidata.org/entity/Q6581097";
const FEMALE = "http://www.wikidata.org/entity/Q6581072";

const surnames = new Set();
const kosis = readFileSync(join(RAW, "kosis-surnames-2015.csv"), "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
const kHead = parseCsvLine(kosis[0]);
for (const line of kosis.slice(1)) {
  const row = parseCsvLine(line);
  const hangul = row[kHead.indexOf("hangul")];
  if (hangul && row[kHead.indexOf("hanja_nfc")]) surnames.add(hangul);
}
const compounds = [...surnames].filter((h) => h.length === 2).sort();

/** 한국어 이름표 → 이름(1~2음절). 복성이 먼저. */
function givenOf(label) {
  for (const c of compounds) if (label.startsWith(c) && label.length - 2 >= 1 && label.length - 2 <= 2) return label.slice(2);
  return surnames.has(label[0]) && label.length - 1 >= 1 && label.length - 1 <= 2 ? label.slice(1) : null;
}

const literal = (cell) => cell.replace(/^"/, "").replace(/"(@[\w-]+)?$/, "");
const qid = (cell) => cell.replace(/^<http:\/\/www\.wikidata\.org\/entity\/(Q\d+)>$/, "$1");
const tsv = readFileSync(args.ko, "utf8").split(/\r?\n/).slice(1).filter((l) => l.trim()).map((l) => l.split("\t"));

const persons = new Map(); // Q → { labels:Set, year, genders:Set }
for (const [p, label, year, genders] of tsv) {
  const text = literal(label);
  if (!/^[가-힣]{2,4}$/.test(text)) continue;
  const q = qid(p);
  const y = year ? parseInt(literal(year), 10) : null;
  const prev = persons.get(q) || { labels: new Set(), year: null, genders: new Set() };
  prev.labels.add(text);
  if (y !== null && (prev.year === null || y < prev.year)) prev.year = y;
  for (const g of literal(genders || "").split(" ").filter(Boolean)) prev.genders.add(g);
  persons.set(q, prev);
}

const given = new Map(); // 이름 → [M, F, Mrecent, Frecent]
const stats = { persons: 0, excludedBefore1940: 0, excludedGender: 0, counted: 0 };
for (const [, { labels, year, genders }] of [...persons].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  if (year !== null && year < MIN_BIRTH_YEAR) { stats.excludedBefore1940++; continue; }
  stats.persons++;
  // 성별이 하나(남 또는 여)로 적힌 사람만 센다.
  const male = genders.has(MALE);
  const female = genders.has(FEMALE);
  if (male === female || genders.size !== 1) { stats.excludedGender++; continue; }
  const column = male ? 0 : 1;
  const recent = year !== null && year >= RECENT_BIRTH_YEAR;
  // 한 사람의 이름표가 여럿이어도 같은 이름은 한 번만 센다.
  const names = new Set([...labels].map(givenOf).filter(Boolean));
  for (const name of [...names].sort()) {
    if (!given.has(name)) given.set(name, [0, 0, 0, 0]);
    const row = given.get(name);
    row[column]++;
    if (recent) row[column + 2]++;
    stats.counted++;
  }
}

const byCodepoint = (a, b) => {
  const x = Array.from(a[0]).map((c) => c.codePointAt(0));
  const y = Array.from(b[0]).map((c) => c.codePointAt(0));
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
};
const rows = [...given].map(([name, counts]) => [name, ...counts]).sort(byCodepoint);

const head = {
  generatedBy: "scripts/naming/extract-given-names.mjs",
  source: "Wikidata Query Service (https://query.wikidata.org/sparql)",
  license: "CC0 1.0 — Wikidata 구조화 데이터(https://www.wikidata.org/wiki/Wikidata:Licensing)",
  fetchedAt: args.fetched,
  query: QUERY,
  upstreamSha256: { "ko-gender.tsv": sha256File(args.ko) },
  filter: `출생연도 ${MIN_BIRTH_YEAR} 이상 또는 미상, 성별(P21) 남·여 하나, 성은 KOSIS 2015 성씨표(복성 우선), 이름 1~2음절. 최근 = ${RECENT_BIRTH_YEAR}년 이후 출생`,
  stats,
  fields: ["given", "male", "female", "maleRecent", "femaleRecent"],
};
writeText(join(RAW, "wikidata-given-names.json"),
  `${stableJson(head).slice(0, -1)},"rows":[\n${rows.map((r) => stableJson(r)).join(",\n")}\n]}\n`);
console.log(JSON.stringify({ ...stats, names: rows.length }));

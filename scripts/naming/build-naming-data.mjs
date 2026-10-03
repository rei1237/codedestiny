#!/usr/bin/env node
// 작명 데이터 빌드 — data/naming/raw(원천 발췌) + data/naming/rules(규칙) + 검수 CSV → 생성물 5종 + 검수 CSV.
//
//   node scripts/naming/build-naming-data.mjs [--check]
//
// 생성물: worker/naming-engine/data/{hanja-pool,surnames,suri-81,samjae-125,sound-blacklist}.v1.json
// 검수:   data/naming/review/*.csv (자문가가 review_* 열을 채워 돌려주면 rules/ 아래 판정 파일로 반영)
// 결정론: 시각·난수 없음, dataVersion = 입력 파일·빌드 스크립트 내용 해시. --check 는 쓰지 않고 현재 파일과 비교만 한다.
// 런타임(worker)은 이 스크립트를 import 하지 않는다. 과금 LLM 호출 없음.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { sha256, readCsv, writeCsv, writeText, stableJson, parseCsvLine, radicalStrokes, radicalChar } from "./lib/naming-data-utils.mjs";
import { buildPool, computeStrokes } from "./lib/build-pool.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const RAW = join(ROOT, "data/naming/raw");
const RULES = join(ROOT, "data/naming/rules");
const REVIEW_FORMS = join(ROOT, "docs/design/naming-engine-v2");
const OUT = join(ROOT, "worker/naming-engine/data");
const REVIEW_OUT = join(ROOT, "data/naming/review");
const GZIP_BUDGET = 600 * 1024;
const CHECK = process.argv.includes("--check");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const rel = (path) => relative(ROOT, path).replace(/\\/g, "/");
const fail = (msg) => {
  throw new Error(`[naming-build] ${msg}`);
};

// ── 입력 목록(이 목록이 dataVersion 의 근거) ──
const optional = (path) => (existsSync(path) ? path : null);
const inputs = {
  unihan: join(RAW, "unihan-extract.tsv"),
  libhangul: join(RAW, "libhangul-hanja-single.txt"),
  gov: join(RAW, "rutopio-data-gov.csv"),
  efamily: optional(join(RAW, "efamily-recrawl.csv")),
  suriSources: join(RAW, "suri-81-sources.json"),
  samjaeSources: join(RAW, "samjae-125-sources.json"),
  buryongSources: join(RAW, "buryong-sources.json"),
  surnames: join(RAW, "kosis-surnames-2015.csv"),
  suriRules: join(RULES, "suri-81.json"),
  samjaeRules: join(RULES, "samjae-125.json"),
  buryongRules: join(RULES, "buryong.json"),
  blacklistRules: join(RULES, "sound-blacklist.json"),
  jawonSources: join(RAW, "jawon-sources.json"),
  jawonRules: join(RULES, "jawon.json"),
  adjudication: join(RULES, "pool-adjudication.json"),
  poolDecisions: optional(join(RULES, "hanja-review-decisions.csv")),
  suriForm: join(REVIEW_FORMS, "suri-81.csv"),
  samjaeForm: join(REVIEW_FORMS, "samjae-125.csv"),
  radicalForm: join(REVIEW_FORMS, "radical-variants.csv"),
};
for (const [key, path] of Object.entries(inputs)) {
  if (path === null) continue;
  if (!existsSync(path)) fail(`missing input ${key}: ${rel(path)}`);
}
const scriptFiles = [
  join(ROOT, "scripts/naming/build-naming-data.mjs"),
  ...readdirSync(join(ROOT, "scripts/naming/lib")).sort().map((f) => join(ROOT, "scripts/naming/lib", f)),
];
const fingerprint = [...Object.values(inputs).filter(Boolean), ...scriptFiles]
  .map((p) => `${rel(p)}:${sha256(readFileSync(p).toString("utf8").replace(/\r\n/g, "\n"))}`)
  .sort()
  .join("\n");
const DATA_VERSION = `naming-data-v1-${sha256(fingerprint).slice(0, 12)}`;

// 라벨 비교용: 전각 공백·emsp 등을 공백 하나로 접는다.
const normLabel = (s) => String(s ?? "").replace(/\s+/gu, " ").trim();
const gradeMapOf = (labelMap) => {
  const m = new Map();
  for (const [grade, labels] of Object.entries(labelMap)) for (const l of labels) m.set(normLabel(l), grade);
  return m;
};
const GRADES = new Set(["good", "half", "bad"]);

// ═══ 1. 수리 81 ═══════════════════════════════════════════════════════════════
function buildSuri() {
  const rules = readJson(inputs.suriRules);
  const src = readJson(inputs.suriSources);
  const form = new Map(readCsv(inputs.suriForm).map((r) => [Number(r.n), r]));
  const labelGrade = gradeMapOf(rules.labelMap);

  const base = new Map();
  for (const g of ["good", "half", "bad"]) for (const n of rules.base[g]) {
    if (base.has(n)) fail(`suri base duplicate ${n}`);
    base.set(n, g);
  }
  if (base.size !== 81) fail(`suri base has ${base.size} numbers`);

  // 출처별 등급(중복·제외 출처는 뺀다)
  const perSource = [];
  for (const s of src.sources) {
    if (rules.duplicateOf[s.id] || rules.excluded[s.id]) continue;
    const school = rules.schools[s.id];
    if (!school) fail(`suri source without school mapping: ${s.id}`);
    const grades = new Map();
    for (const [n, raw] of Object.entries(s.grades)) {
      const label = normLabel(raw);
      if (!label) continue;
      const g = labelGrade.get(label);
      if (!g) fail(`unknown suri label "${raw}" (${s.id} ${n})`);
      grades.set(Number(n), g);
    }
    perSource.push({ id: s.id, school, grades, inconsistent: s.inconsistent || {} });
  }

  const applied = new Map(rules.applied.map((a) => [a.n, a]));
  const rows = [];
  const review = [];
  for (let n = 1; n <= 81; n += 1) {
    const f = form.get(n);
    if (!f) fail(`suri form missing ${n}`);
    let grade = base.get(n);
    let basis = "v1";
    if (applied.has(n)) { grade = applied.get(n).grade; basis = "verified-change"; }
    const reviewGrade = f.review_grade.trim();
    if (reviewGrade) {
      if (!GRADES.has(reviewGrade)) fail(`suri review_grade "${reviewGrade}" at ${n}`);
      grade = reviewGrade;
      basis = "reviewer";
    }
    const labeled = perSource.filter((s) => s.grades.has(n));
    const kr = labeled.filter((s) => s.school.startsWith("kr-"));
    const krDiffer = kr.filter((s) => s.grades.get(n) !== grade).length;
    const disputed = kr.length > 0 && krDiffer * 3 >= kr.length;
    const alternatives = labeled.filter((s) => s.grades.get(n) !== grade).map((s) => ({ school: s.school, grade: s.grades.get(n) }));
    if (base.get(n) !== grade) alternatives.push({ school: "kr-v1", grade: base.get(n) });
    alternatives.sort((a, b) => a.school.localeCompare(b.school));
    const genderNote = f.gender_note.trim();
    if (!["", "common", "some"].includes(genderNote)) fail(`suri gender_note "${genderNote}" at ${n}`);
    rows.push([n, grade, disputed ? "disputed" : "", genderNote, alternatives.map((a) => [a.school, a.grade]), labeled.map((s) => s.school).sort()]);
    review.push([
      n, grade, base.get(n), basis, disputed ? "disputed" : "",
      ...perSource.map((s) => s.grades.get(n) || ""),
      perSource.filter((s) => s.inconsistent[n]).map((s) => `${s.id}:${s.inconsistent[n].join("/")}`).join(" "),
      f.review_grade, f.review_note,
    ]);
  }
  const reviewHeader = ["n", "grade", "grade_v1", "basis", "flag", ...perSource.map((s) => s.school), "inconsistent_labels", "review_grade", "review_note"];
  return {
    json: { schema: "naming-suri-81/1", fields: ["n", "grade", "flag", "genderNote", "alternatives", "sources"], rows },
    review: { header: reviewHeader, rows: review },
    stats: { disputed: rows.filter((r) => r[2]).map((r) => r[0]), changed: rows.filter((r) => r[1] !== base.get(r[0])).map((r) => `${r[0]}:${base.get(r[0])}→${r[1]}`) },
  };
}

// ═══ 2. 삼재 125 ══════════════════════════════════════════════════════════════
const ELEMENTS_HAN = ["木", "火", "土", "金", "水"];
const ELEMENT_KEY = { 木: "wood", 火: "fire", 土: "earth", 金: "metal", 水: "water" };

function buildSamjae() {
  const rules = readJson(inputs.samjaeRules);
  const src = readJson(inputs.samjaeSources);
  const labelGrade = gradeMapOf(rules.labelMap);
  const form = new Map(readCsv(inputs.samjaeForm).map((r) => [`${r.heaven}${r.human}${r.earth}`, r]));
  const bySource = new Map();
  for (const s of src.sources) {
    if (s.status !== "ok") continue;
    const m = new Map();
    for (const e of s.entries) {
      const key = `${e.heaven}${e.human}${e.earth}`;
      if (![...key].every((c) => ELEMENTS_HAN.includes(c)) || key.length !== 3) fail(`samjae bad combo ${key} (${s.id})`);
      const g = labelGrade.get(normLabel(e.gradeRaw));
      if (!g) fail(`unknown samjae label "${e.gradeRaw}" (${s.id} ${key})`);
      if (!m.has(key)) m.set(key, []);
      m.get(key).push({ g, raw: normLabel(e.gradeRaw) });
    }
    bySource.set(s.id, m);
  }
  const baseMap = bySource.get(rules.base);
  if (!baseMap || baseMap.size !== 125) fail(`samjae base ${rules.base} has ${baseMap?.size} combos`);

  const rows = [];
  const review = [];
  for (const h of ELEMENTS_HAN) for (const m of ELEMENTS_HAN) for (const e of ELEMENTS_HAN) {
    const key = `${h}${m}${e}`;
    const baseEntries = baseMap.get(key);
    if (baseEntries.length !== 1) fail(`samjae base ${key} has ${baseEntries.length} entries`);
    let grade = baseEntries[0].g;
    let basis = rules.base;
    const f = form.get(key);
    if (!f) fail(`samjae form missing ${key}`);
    if (f.review_grade.trim()) {
      if (!GRADES.has(f.review_grade.trim())) fail(`samjae review_grade "${f.review_grade}" at ${key}`);
      grade = f.review_grade.trim();
      basis = "reviewer";
    }
    // 같은 출처가 한 조합을 두 번 실으면(kr_hongjung 金火水) 등급이 같을 때만 하나로 본다.
    const indep = [];
    for (const id of rules.independent) {
      const list = bySource.get(id)?.get(key);
      if (!list) continue;
      const gs = new Set(list.map((x) => x.g));
      if (gs.size !== 1) fail(`samjae ${id} ${key} self-inconsistent`);
      indep.push({ id, g: list[0].g, raw: list.map((x) => x.raw).join("/") });
    }
    const differ = indep.filter((x) => x.g !== grade);
    const disputed = indep.length > 0 && differ.length * 3 >= indep.length;
    const alternatives = differ.map((x) => [rules.schools[x.id], x.g]).sort((a, b) => a[0].localeCompare(b[0]));
    if (basis === "reviewer" && grade !== baseEntries[0].g) alternatives.push([rules.schools[rules.base], baseEntries[0].g]);
    const sources = [rules.base, ...rules.corroborating.filter((id) => bySource.get(id)?.has(key)), ...indep.map((x) => x.id)].map((id) => rules.schools[id]);
    rows.push([ELEMENT_KEY[h], ELEMENT_KEY[m], ELEMENT_KEY[e], grade, baseEntries[0].raw, disputed ? "disputed" : "", alternatives, sources]);
    review.push([h, m, e, grade, baseEntries[0].raw, basis, disputed ? "disputed" : "", ...rules.independent.map((id) => (bySource.get(id)?.get(key) || []).map((x) => x.raw).join("/")), f.review_grade, f.review_note]);
  }
  return {
    json: { schema: "naming-samjae-125/1", fields: ["heaven", "human", "earth", "grade", "gradeRaw", "flag", "alternatives", "sources"], rows },
    review: { header: ["heaven", "human", "earth", "grade", "grade_raw_zhouyi", "basis", "flag", ...rules.independent, "review_grade", "review_note"], rows: review },
    stats: {
      grades: Object.fromEntries(["good", "half", "bad"].map((g) => [g, rows.filter((r) => r[3] === g).length])),
      disputed: rows.filter((r) => r[5]).length,
    },
  };
}

// ═══ 3. 동음 블랙리스트 ═══════════════════════════════════════════════════════
function buildBlacklist() {
  const rules = readJson(inputs.blacklistRules);
  const seen = new Set();
  const rows = [];
  for (const e of rules.entries) {
    if (!/^[가-힣]{2,}$/.test(e.text)) fail(`blacklist text must be 2+ hangul syllables: ${e.text}`);
    if (!rules.grades[e.grade]) fail(`blacklist grade ${e.grade}`);
    if (!rules.categories[e.category]) fail(`blacklist category ${e.category}`);
    if (seen.has(e.text)) fail(`blacklist duplicate ${e.text}`);
    seen.add(e.text);
    rows.push([e.text, e.grade, e.category]);
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return { json: { schema: "naming-sound-blacklist/1", reviewed: rules.reviewed, grades: Object.keys(rules.grades), fields: ["text", "grade", "category"], rows } };
}

// ═══ 4. 한자 풀 ═══════════════════════════════════════════════════════════════
function loadUnihan() {
  const lines = readFileSync(inputs.unihan, "utf8").split("\n").filter((l) => l && !l.startsWith("#"));
  const header = lines[0].split("\t");
  const map = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split("\t");
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
    map.set(parseInt(row.cp.slice(2), 16), row);
  }
  return map;
}

/** libhangul "음:漢:뜻" → cp → (음 → 뜻). 같은 음·글자가 여러 줄이면 서로 다른 뜻을 "; " 로 잇는다. */
function loadHun() {
  const map = new Map();
  for (const line of readFileSync(inputs.libhangul, "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [reading, ch, ...rest] = line.split(":");
    const meaning = rest.join(":").trim();
    if (!reading || !ch || !meaning) continue;
    const cp = ch.codePointAt(0);
    if (!map.has(cp)) map.set(cp, new Map());
    const m = map.get(cp);
    const prev = m.get(reading);
    if (!prev) m.set(reading, meaning);
    else if (!prev.split("; ").includes(meaning)) m.set(reading, `${prev}; ${meaning}`);
  }
  return map;
}

/** radical-variants.csv: 부수 행은 강희 부수 원형 획수와 맞는지 자체 검사, 숫자 행은 수의 획수 표. */
function loadRadicalForm() {
  const numerals = new Map();
  for (const r of readCsv(inputs.radicalForm)) {
    const strokes = Number((r.review_strokes || r.won_strokes).trim());
    if (!Number.isInteger(strokes)) fail(`radical-variants strokes ${r.variant}`);
    if (r.kind === "radical") {
      let no = 0;
      for (let i = 1; i <= 214; i += 1) if (radicalChar(i) === r.original) no = i;
      if (!no) fail(`radical-variants original is not a Kangxi radical: ${r.original}`);
      if (radicalStrokes(no) !== strokes) fail(`radical-variants ${r.variant}→${r.original}: form ${strokes} ≠ Kangxi ${radicalStrokes(no)}`);
    } else if (r.kind === "numeral") {
      numerals.set(r.variant, { won: strokes, note: r.note });
    } else fail(`radical-variants kind ${r.kind}`);
  }
  if (numerals.size !== 10) fail(`numerals ${numerals.size}`);
  return numerals;
}

function loadEfamily() {
  if (!inputs.efamily) return null;
  const map = new Map();
  for (const r of readCsv(inputs.efamily)) {
    if (r.kind !== "unicode") continue; // 내부 코드(A)·사설 영역(F) 글자는 유니코드로 쓸 수 없다 — 보고서에서 수만 센다
    const cp = parseInt(r.codepoint_hex.replace(/^U\+/i, ""), 16);
    if (!Number.isFinite(cp)) fail(`efamily codepoint ${r.codepoint_hex}`);
    if (String.fromCodePoint(cp) !== r.char.normalize("NFC") && String.fromCodePoint(cp) !== r.char) fail(`efamily char mismatch ${r.codepoint_hex} ${r.char}`);
    if (!map.has(cp)) map.set(cp, []);
    if (!map.get(cp).includes(r.reading)) map.get(cp).push(r.reading);
  }
  return map;
}

/**
 * 자원오행: raw 출처 투표 → 강희 부수 번호마다 {element, confidence, tier}, 자의 규칙 글자 → {element, confidence}.
 * 규칙은 rules/jawon.json. 분류되지 않은 출처가 raw 에 있으면 실패(fail-closed).
 */
function deriveJawon() {
  const rules = readJson(inputs.jawonRules);
  const raw = readJson(inputs.jawonSources);
  const srcById = new Map(raw.sources.map((s) => [s.id, s]));
  const voting = rules.voting.sources;
  const reference = rules.referenceOnly.sources;
  for (const id of [...voting, ...reference, ...rules.voting.tieBreak]) if (!srcById.has(id)) fail(`jawon source unknown: ${id}`);
  const unclassified = raw.sources.map((s) => s.id).filter((id) => !voting.includes(id) && !reference.includes(id));
  if (unclassified.length) fail(`jawon sources not classified in rules/jawon.json: ${unclassified.join(", ")}`);
  const rowsOf = (id) => {
    const s = srcById.get(id);
    return s.rules.map((r) => {
      const o = Object.fromEntries(s.fields.map((f, i) => [f, r[i]]));
      if (!ELEMENT_KEY[o.element]) fail(`jawon element ${o.element} (${id})`);
      if (o.radical !== null && !(o.radical >= 1 && o.radical <= 214)) fail(`jawon radical ${o.radical} (${id})`);
      return o;
    });
  };

  // 출처 → 부수 → 단일값 집합 / 참고 출처 → 부수 → 값 집합
  const singles = new Map();
  for (const id of voting) {
    const m = new Map();
    for (const r of rowsOf(id)) {
      if (r.radical === null || r.multi || !rules.voting.bases.includes(r.basis)) continue;
      if (!m.has(r.radical)) m.set(r.radical, new Set());
      m.get(r.radical).add(r.element);
    }
    singles.set(id, m);
  }
  const refs = new Map(reference.map((id) => {
    const m = new Map();
    for (const r of rowsOf(id)) if (r.radical !== null) (m.get(r.radical) || m.set(r.radical, new Set()).get(r.radical)).add(r.element);
    return [id, m];
  }));

  const conf = rules.confidence;
  const byRadical = new Map();
  for (let no = 1; no <= 214; no += 1) {
    const votes = voting.filter((id) => singles.get(id).get(no)?.size === 1).map((id) => ({ id, el: [...singles.get(id).get(no)][0] }));
    const refList = reference.flatMap((id) => (refs.get(id).get(no) ? [`${id}=${[...refs.get(id).get(no)].sort().join("")}`] : []));
    const info = { votes: votes.map((v) => `${v.id}=${v.el}`), reference: refList };
    const override = rules.radicalOverrides[String(no)];
    if (override) {
      if (!ELEMENT_KEY[override]) fail(`jawon override ${no} ${override}`);
      byRadical.set(no, { element: override, confidence: 1, tier: "reviewer", ...info });
      continue;
    }
    if (!votes.length) { byRadical.set(no, { element: null, confidence: 0, tier: "none", ...info }); continue; }
    const count = new Map();
    for (const v of votes) count.set(v.el, (count.get(v.el) || 0) + 1);
    const top = Math.max(...count.values());
    const leaders = [...count.keys()].filter((el) => count.get(el) === top);
    let element = leaders.length === 1 ? leaders[0] : null;
    if (!element) element = rules.voting.tieBreak.map((id) => votes.find((v) => v.id === id)?.el).find((el) => el && leaders.includes(el)) || null;
    if (!element) { byRadical.set(no, { element: null, confidence: 0, tier: "tie", ...info }); continue; }
    const n = votes.length;
    const a = count.get(element);
    const tier = a === n ? (n >= 3 ? "consensus" : n === 2 ? "agree" : "single") : n >= 4 && a * 4 >= n * 3 ? "majority" : "contested";
    byRadical.set(no, { element, confidence: conf[tier].value, tier, ...info });
  }

  // 자의 규칙: 글자마다 raw 출처의 글자 단위 규칙이 같은 오행을 하나 이상 뒷받침해야 한다.
  const allRows = raw.sources.flatMap((s) => rowsOf(s.id).map((r) => ({ ...r, id: s.id })));
  const meaning = new Map();
  for (const g of rules.meaning.groups) for (const [ch, el] of Object.entries(g.chars)) {
    if (!ELEMENT_KEY[el]) fail(`jawon meaning element ${ch} ${el}`);
    if (meaning.has(ch)) fail(`jawon meaning duplicate ${ch}`);
    const backing = allRows.filter((r) => r.form === ch && r.element === el).map((r) => r.id);
    if (!backing.length) fail(`jawon meaning ${ch}=${el} has no raw source backing`);
    meaning.set(ch, { element: el, confidence: g.confidence, group: g.id, backing: [...new Set(backing)].sort() });
  }
  return { version: rules.version, byRadical, meaning };
}

function loadPoolDecisions() {
  const won = new Map();
  const jawon = new Map();
  if (!inputs.poolDecisions) return { won, jawon };
  for (const r of readCsv(inputs.poolDecisions)) {
    if (r.review_won) won.set(r.ch, Number(r.review_won));
    if (r.review_jawon) {
      if (!Object.values(ELEMENT_KEY).includes(r.review_jawon)) fail(`review_jawon ${r.ch} ${r.review_jawon}`);
      jawon.set(r.ch, r.review_jawon);
    }
  }
  return { won, jawon };
}

function buildHanjaPool() {
  const unihan = loadUnihan();
  const govLines = readFileSync(inputs.gov, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean).slice(1).map(parseCsvLine);
  const numerals = loadRadicalForm();
  const efamily = loadEfamily();
  const adjudication = readJson(inputs.adjudication);
  const { entries, review, diff } = buildPool({ govRows: govLines, unihan, hun: loadHun(), numerals, adjudication, efamily });

  // 자원오행
  const jawonRules = deriveJawon();
  const decisions = loadPoolDecisions();
  // 불용 관행
  const buryong = readJson(inputs.buryongSources);
  const buryongRules = readJson(inputs.buryongRules);
  const cautionSources = buryong.sources.filter((s) => s.status === "ok").map((s) => ({ id: s.id, lineage: buryongRules.lineage[s.id] || s.id }));
  const cautionIdx = new Map(cautionSources.map((s, i) => [s.id, i]));

  const reviewByCh = new Map(review.map((r) => [r.ch, r]));
  const rows = [];
  const jawonStats = { radical: 0, meaning: 0, reviewer: 0, none: 0, low: 0, contested: 0 };
  const radicalUse = new Map();
  for (const e of entries) {
    radicalUse.set(e.radical, (radicalUse.get(e.radical) || 0) + 1);
    let won = e.won;
    let reviewed = false;
    if (decisions.won.has(e.ch)) { won = decisions.won.get(e.ch); reviewed = true; }
    const disputes = [...e.disputes];
    let jawon = null;
    let jawonBasis = null;
    let confidence = 0;
    const byMeaning = jawonRules.meaning.get(e.ch);
    const byRadical = jawonRules.byRadical.get(e.radical);
    if (byMeaning) { jawon = ELEMENT_KEY[byMeaning.element]; jawonBasis = "meaning"; confidence = byMeaning.confidence; }
    else if (byRadical?.element) {
      jawon = ELEMENT_KEY[byRadical.element];
      jawonBasis = byRadical.tier === "reviewer" ? "reviewer" : "radical";
      confidence = byRadical.confidence;
      if (byRadical.tier === "contested") { disputes.push("jawon-sources-differ"); jawonStats.contested += 1; }
    }
    if (decisions.jawon.has(e.ch)) { jawon = decisions.jawon.get(e.ch); jawonBasis = "reviewer"; confidence = 1; reviewed = true; }
    jawonStats[jawonBasis || "none"] += 1;
    if (jawon && confidence < 0.7) jawonStats.low += 1;

    const cautions = [];
    const bur = buryong.chars[e.ch];
    if (bur) cautions.push(["buryong", bur.map((id) => cautionIdx.get(id)).filter((i) => i !== undefined).sort((a, b) => a - b)]);

    const reasons = [];
    if (!jawon) reasons.push("jawon-unclassified");
    else if (confidence < 0.7) reasons.push("jawon-low-confidence");
    if (reasons.length || reviewByCh.has(e.ch)) {
      const r = reviewByCh.get(e.ch) || {
        cp: `U+${e.ch.codePointAt(0).toString(16).toUpperCase()}`, ch: e.ch,
        readings: e.readings.map((x) => `${x[0]}${x[1] === "dueum" ? "(두음)" : ""}`).join(" "),
        hun: e.readings.map((x) => x[2]).filter(Boolean)[0] || "",
        radical: `${e.radical}${radicalChar(e.radical)}`, rs: unihan.get(e.ch.codePointAt(0))?.kRSUnicode || "", total: e.pil, formula: "", won: e.won, reasons: "",
      };
      r.jawon = jawon || "";
      r.confidence = jawon ? confidence : "";
      r.reasons = [r.reasons, ...reasons].filter(Boolean).join(" ");
      reviewByCh.set(e.ch, r);
    }
    rows.push([e.ch, e.readings, e.radical, won, e.pil, jawon, jawonBasis, confidence, reviewed, disputes, cautions, e.tags, e.basis]);
  }

  const radicalReview = [...jawonRules.byRadical.entries()].map(([no, r]) => [
    no, radicalChar(no), radicalUse.get(no) || 0, r.element || "", r.element ? r.confidence : "", r.tier, r.votes.join(" "), r.reference.join(" "), "", "",
  ]);

  const reviewRows = [...reviewByCh.values()]
    .sort((a, b) => a.ch.codePointAt(0) - b.ch.codePointAt(0))
    .map((r) => [r.cp, r.ch, r.readings, r.hun, r.radical, r.rs, r.total, r.formula, r.won, r.jawon ?? "", r.confidence ?? "", r.reasons, "", "", ""]);
  const diffRows = diff
    .map((d) => [d.cp, d.ch, d.crawl, d.uE, d.uN, d.ef, d.decision, d.reason, d.detail, "", ""])
    .sort((a, b) => (a[0] === b[0] ? (a[6] < b[6] ? -1 : 1) : a[0] < b[0] ? -1 : 1));

  return {
    json: {
      schema: "naming-hanja-pool/1",
      hunSource: "libhangul",
      jawonRules: jawonRules.version,
      cautionSources,
      fields: ["ch", "readings", "radical", "won", "pil", "jawon", "jawonBasis", "confidence", "reviewed", "disputes", "cautions", "tags", "basis"],
      readingFields: ["hangul", "kind", "hun"],
      rows,
    },
    review: { header: ["cp", "ch", "readings", "hun", "radical", "rs", "total", "formula", "won", "jawon", "confidence", "reasons", "review_won", "review_jawon", "review_note"], rows: reviewRows },
    diff: { header: ["cp", "ch", "crawl", "unihan_E", "unihan_N", "efamily", "decision", "reason", "detail", "review_decision", "review_note"], rows: diffRows },
    radicalReview: { header: ["radical", "form", "pool_chars", "element", "confidence", "tier", "votes", "reference_only", "review_element", "review_note"], rows: radicalReview },
    entries,
    unihan,
    numerals,
    stats: {
      size: rows.length,
      basicEdu: rows.filter((r) => r[11].includes("basic-edu")).length,
      basis: Object.fromEntries([...new Set(rows.map((r) => r[12]))].sort().map((b) => [b, rows.filter((r) => r[12] === b).length])),
      disputes: Object.fromEntries(["won-total-exceeds-formula", "simplified-radical", "multiple-radical-values", "jawon-sources-differ"].map((k) => [k, rows.filter((r) => r[9].includes(k)).length])),
      noHun: rows.filter((r) => !r[1].some((x) => x[2])).length,
      jawon: jawonStats,
      cautions: rows.filter((r) => r[10].length).length,
      excluded: diff.filter((d) => d.decision === "exclude").length,
      readingNotAdded: diff.filter((d) => d.decision === "reading-not-added").length,
    },
  };
}

// ═══ 5. 성씨 ══════════════════════════════════════════════════════════════════
function buildSurnames(pool) {
  const poolByCh = new Map(pool.entries.map((e) => [e.ch, e]));
  const rows = [];
  const review = [];
  for (const r of readCsv(inputs.surnames)) {
    const hanja = r.hanja_nfc;
    const chars = [...hanja];
    const pop = Number(r.population_2015);
    let reason = "";
    if (!chars.every((c) => /\p{Script=Han}/u.test(c))) reason = "non-hanja-label";
    else {
      // 정자 판정: 인명용 풀에 있거나 Unihan 한국 독음(kHangul)이 있는 글자만 성씨 한자로 싣는다(간체 罗·宫 등 제외).
      const odd = chars.filter((c) => !poolByCh.has(c) && !pool.unihan.get(c.codePointAt(0))?.kHangul);
      if (odd.length) reason = `nonstandard-form:${odd.join("")}`;
    }
    if (!/^[가-힣]+$/.test(r.hangul) || [...r.hangul].length !== chars.length) reason ||= "hangul-length-mismatch";
    if (reason) {
      review.push([r.itm_id, r.hangul, r.hanja, hanja, pop, "exclude", reason]);
      continue;
    }
    const won = [];
    const pil = [];
    for (const c of chars) {
      const e = poolByCh.get(c);
      if (e) { won.push(e.won); pil.push(e.pil); continue; }
      const f = pool.unihan.get(c.codePointAt(0));
      const s = f && computeStrokes(f.kRSUnicode, f.kTotalStrokes);
      if (!s) fail(`surname char without strokes ${c}`);
      won.push(pool.numerals.get(c)?.won ?? s.won);
      pil.push(s.pil);
      review.push([r.itm_id, r.hangul, r.hanja, hanja, pop, "include", `char-outside-pool:${c} won=${s.won}`]);
    }
    rows.push([r.hangul, hanja, pop, won, pil, chars.length > 1]);
  }
  rows.sort((a, b) => b[2] - a[2] || (a[1] + a[0] < b[1] + b[0] ? -1 : 1));
  return {
    json: {
      schema: "naming-surnames/1",
      source: "국가데이터처, 「인구총조사」, 2015, 성씨ㆍ본관별 인구(5인 이상) - 전국 (KOSIS DT_1IN15SD), 2026.10.03 참조",
      note: "5인 이상 성씨만 수록. 같은 한자의 두음 표기(이/리 李)는 KOSIS 처럼 별도 행. 목록 밖 성씨는 엔진이 Unihan 획수로 직접 받는다(Phase 3).",
      fields: ["hangul", "hanja", "population", "won", "pil", "compound"],
      rows,
    },
    review: { header: ["itm_id", "hangul", "label_hanja", "hanja_nfc", "population", "decision", "reason"], rows: review },
    stats: { surnames: rows.length, compound: rows.filter((r) => r[5]).length, excluded: review.filter((r) => r[5] === "exclude").length },
  };
}

// ═══ 출력 ═════════════════════════════════════════════════════════════════════
/** 머리 필드는 stableJson, rows 는 한 줄에 한 행(diff 가 읽히도록). */
function serialize(doc) {
  const { rows, ...head } = doc;
  const headJson = stableJson({ dataVersion: DATA_VERSION, generatedBy: "scripts/naming/build-naming-data.mjs", ...head });
  return `${headJson.slice(0, -1)},"rows":[\n${rows.map((r) => stableJson(r)).join(",\n")}\n]}\n`;
}

const suri = buildSuri();
const samjae = buildSamjae();
const blacklist = buildBlacklist();
const pool = buildHanjaPool();
const surnames = buildSurnames(pool);

const outputs = {
  [join(OUT, "hanja-pool.v1.json")]: serialize(pool.json),
  [join(OUT, "surnames.v1.json")]: serialize(surnames.json),
  [join(OUT, "suri-81.v1.json")]: serialize(suri.json),
  [join(OUT, "samjae-125.v1.json")]: serialize(samjae.json),
  [join(OUT, "sound-blacklist.v1.json")]: serialize(blacklist.json),
};
const csvOutputs = [
  [join(REVIEW_OUT, "hanja-pool-diff.csv"), pool.diff],
  [join(REVIEW_OUT, "hanja-pool-review.csv"), pool.review],
  [join(REVIEW_OUT, "jawon-radicals-review.csv"), pool.radicalReview],
  [join(REVIEW_OUT, "suri-81-review.csv"), suri.review],
  [join(REVIEW_OUT, "samjae-125-review.csv"), samjae.review],
  [join(REVIEW_OUT, "surnames-review.csv"), surnames.review],
];

let gzTotal = 0;
const sizes = {};
for (const [path, text] of Object.entries(outputs)) {
  JSON.parse(text); // 형식 자체 검사
  const gz = gzipSync(Buffer.from(text, "utf8"), { level: 9 }).length;
  gzTotal += gz;
  sizes[rel(path)] = { bytes: Buffer.byteLength(text), gzip: gz };
}
if (gzTotal > GZIP_BUDGET) fail(`gzip total ${gzTotal} > budget ${GZIP_BUDGET}`);

if (CHECK) {
  const stale = Object.entries(outputs).filter(([p, t]) => !existsSync(p) || readFileSync(p, "utf8") !== t).map(([p]) => rel(p));
  if (stale.length) fail(`stale outputs (run without --check): ${stale.join(", ")}`);
} else {
  for (const [path, text] of Object.entries(outputs)) writeText(path, text);
  for (const [path, { header, rows }] of csvOutputs) writeCsv(path, header, rows);
}

console.log(JSON.stringify({
  dataVersion: DATA_VERSION,
  gzipTotal: gzTotal,
  sizes,
  pool: pool.stats,
  surnames: surnames.stats,
  suri: suri.stats,
  samjae: samjae.stats,
  blacklist: blacklist.json.rows.length,
}, null, 1));

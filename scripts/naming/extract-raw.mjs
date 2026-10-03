#!/usr/bin/env node
// 작명 데이터 원천 발췌기 — 상류 원본 전체(커밋하지 않음)에서 필요한 글자·필드만 data/naming/raw/ 로 뽑는다.
//
//   node scripts/naming/extract-raw.mjs --unihan-dir <Unihan 18.0 압축 해제 폴더> \
//     --libhangul <libhangul data/hanja/hanja.txt> --gov-csv <rutopio data-gov.csv> \
//     [--efamily-csv <자체 재수집 CSV>] [--efamily-date <수집일>] [--extra-chars <추가 글자 txt>] \
//     [--suri-json <81수리 전사>] [--samjae-json <삼재 전사>] [--buryong-json <불용 목록>] [--surnames-csv <KOSIS 성씨 정리본>] [--jawon-json <자원오행 조사>]
//
// 대상 글자 = 크롤 명단(유니코드 값) ∪ 재수집 명단 ∪ Unihan kHangul 에 교육용(E)·인명용(N) 표지가 있는 글자 ∪ 성씨 한자 ∪ 추가 글자.
// 상류 원본의 sha256 을 manifest.json 에 남겨, 같은 원본이면 같은 발췌가 나오게 한다.

import { readFileSync, copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseCsvLine, sha256, sha256File, writeText, stableJson } from "./lib/naming-data-utils.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const RAW = join(ROOT, "data/naming/raw");

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
for (const k of ["unihan-dir", "libhangul", "gov-csv"]) if (!args[k]) throw new Error(`--${k} is required`);

const UNIHAN_FIELDS = ["kRSUnicode", "kTotalStrokes", "kHangul", "kKoreanName", "kDefinition"];
const UNIHAN_FILES = ["Unihan_IRGSources.txt", "Unihan_Readings.txt", "Unihan_OtherMappings.txt"];

const cpOfChar = (ch) => ch.codePointAt(0);
const isUnicodeHan = (cp) => cp < 0xa0000;
const parseHex = (v) => parseInt(String(v || "").replace(/^U\+/i, ""), 16);
const readCsvRows = (path) => {
  const lines = readFileSync(path, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean).map(parseCsvLine);
  return lines.slice(1).map((cells) => Object.fromEntries(lines[0].map((h, i) => [h, cells[i] ?? ""])));
};

// ── 대상 글자 ──
const target = new Set();
const govRows = readFileSync(args["gov-csv"], "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean).slice(1).map(parseCsvLine);
for (const [, , hex] of govRows) {
  const cp = parseInt(hex, 16);
  if (isUnicodeHan(cp)) target.add(cp);
}
if (args["efamily-csv"]) {
  for (const row of readCsvRows(args["efamily-csv"])) {
    const cp = parseHex(row.codepoint_hex);
    if (Number.isFinite(cp) && isUnicodeHan(cp)) target.add(cp);
  }
}
// KOSIS 성씨: 한자 표기(NFC)를 이루는 CJK 글자를 모두 대상에 넣는다(간체·오기 판정은 빌드가 한다).
let surnameRows = null;
if (args["surnames-csv"]) {
  surnameRows = readCsvRows(args["surnames-csv"]).filter((r) => r.hanja_nfc && r.itm_id !== "0000");
  for (const r of surnameRows) for (const ch of r.hanja_nfc) if (/\p{Script=Han}/u.test(ch)) target.add(cpOfChar(ch));
}
if (args["extra-chars"]) {
  for (const ch of readFileSync(args["extra-chars"], "utf8").replace(/\s+/g, "")) target.add(cpOfChar(ch));
}

// ── Unihan ──
const unihan = new Map(); // cp → {field: value}
for (const file of UNIHAN_FILES) {
  for (const line of readFileSync(join(args["unihan-dir"], file), "utf8").split("\n")) {
    if (!line.startsWith("U+")) continue;
    const [code, field, value] = line.split("\t");
    if (!UNIHAN_FIELDS.includes(field)) continue;
    const cp = parseInt(code.slice(2), 16);
    if (!unihan.has(cp)) unihan.set(cp, {});
    unihan.get(cp)[field] = value.trim();
  }
}
for (const [cp, f] of unihan) {
  if (f.kHangul && /:[0-9]*[EN]/.test(f.kHangul)) target.add(cp);
}

const sorted = [...target].sort((a, b) => a - b);
const tsv = [
  "# Unihan 18.0.0 발췌 — Unicode License v3 (data/naming/NOTICE.md). 대상: 인명용 후보 글자. 원본 sha256 은 manifest.json.",
  ["cp", "char", ...UNIHAN_FIELDS].join("\t"),
  ...sorted.map((cp) => {
    const f = unihan.get(cp) || {};
    return [`U+${cp.toString(16).toUpperCase()}`, String.fromCodePoint(cp), ...UNIHAN_FIELDS.map((k) => (f[k] || "").replace(/\t/g, " "))].join("\t");
  }),
].join("\n") + "\n";
writeText(join(RAW, "unihan-extract.tsv"), tsv);

// ── libhangul: 한 글자 표제만(머리말 라이선스 유지) ──
const libLines = readFileSync(args.libhangul, "utf8").split("\n");
const header = libLines.filter((l) => l.startsWith("#"));
const singles = libLines.filter((l) => {
  if (l.startsWith("#") || !l.includes(":")) return false;
  const hanja = l.split(":")[1];
  return [...hanja].length === 1 && target.has(cpOfChar(hanja));
});
writeText(join(RAW, "libhangul-hanja-single.txt"), [...header, "# 발췌: 한 글자 표제 중 대상 글자만 (scripts/naming/extract-raw.mjs)", ...singles].join("\n") + "\n");

// ── 크롤 명단·재수집 명단 ──
const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
mkdirSync(RAW, { recursive: true });
copyFileSync(args["gov-csv"], join(RAW, "rutopio-data-gov.csv"));
// efamily 재수집: 조회 음·코드·종류만 남긴다(글리프 스프라이트 URL·조회 메타 열은 뺀다).
if (args["efamily-csv"]) {
  const rows = readCsvRows(args["efamily-csv"]).map((r) => {
    const x = JSON.parse(r.extra || "{}");
    return [r.reading, r.codepoint_hex, r.char, r.raw_code, x.type ?? "", x.kind ?? ""];
  });
  writeText(join(RAW, "efamily-recrawl.csv"), [["reading", "codepoint_hex", "char", "raw_code", "type", "kind"], ...rows].map((r) => r.map(esc).join(",")).join("\n") + "\n");
}

// ── KOSIS 성씨: 사실 열만(한글·한자·로마자·인구). 원본 xlsx 는 커밋하지 않는다 ──
const SURNAME_FIELDS = ["itm_id", "hangul", "hanja", "hanja_nfc", "romanization_kosis", "flags", "population_2015"];
let surnamesCsv = null;
if (surnameRows) {
  surnamesCsv = [SURNAME_FIELDS.join(","), ...surnameRows.map((r) => SURNAME_FIELDS.map((f) => esc(r[f] ?? "")).join(","))].join("\n") + "\n";
  writeText(join(RAW, "kosis-surnames-2015.csv"), surnamesCsv);
}

// ── 불용 관행 목록: 글자 → 출처 id 만(사유 문장은 저작물이라 싣지 않는다). 호환 한자는 NFC 로 합친다 ──
let buryongOut = null;
if (args["buryong-json"]) {
  const src = JSON.parse(readFileSync(args["buryong-json"], "utf8"));
  const chars = {};
  const sources = [];
  for (const s of src.sources) {
    sources.push({ id: s.id, url: s.url, title: s.title, status: s.status, count: (s.chars || []).length });
    for (const { ch } of s.chars || []) {
      const nfc = ch.normalize("NFC");
      if ([...nfc].length !== 1) throw new Error(`buryong entry is not one char: ${ch} (${s.id})`);
      (chars[nfc] ||= new Set()).add(s.id);
    }
  }
  const sorted = Object.fromEntries(Object.keys(chars).sort().map((ch) => [ch, [...chars[ch]].sort()]));
  buryongOut = stableJson({ sources, chars: sorted });
  writeText(join(RAW, "buryong-sources.json"), JSON.stringify(JSON.parse(buryongOut), null, 1) + "\n");
}

// ── 삼재 125 전사: 출처별 조합 등급 라벨만(해설 문장 snippet 은 싣지 않는다) ──
let samjaeOut = null;
if (args["samjae-json"]) {
  const src = JSON.parse(readFileSync(args["samjae-json"], "utf8"));
  const sources = src.sources.map((s) => ({
    id: s.id, url: s.url, status: s.status, role: s.role || null, note: s.note || null,
    entries: (s.entries || []).map((e) => ({ heaven: e.heaven, human: e.human, earth: e.earth, gradeRaw: e.gradeRaw, note: e.note || null })),
  }));
  samjaeOut = stableJson({ method: src.method, elementOrder: src.elementOrder, sources });
  writeText(join(RAW, "samjae-125-sources.json"), JSON.stringify(JSON.parse(samjaeOut), null, 1) + "\n");
}

// ── 81수리 원문 전사: 출처별 원문 등급 라벨만 남긴다(해설 문장·격 이름 본문은 싣지 않는다) ──
let suriOut = null;
if (args["suri-json"]) {
  const src = JSON.parse(readFileSync(args["suri-json"], "utf8"));
  const sources = src.sources.map((s) => {
    const grades = {};
    const inconsistent = {};
    for (const [n, e] of Object.entries(s.entries)) {
      grades[n] = e.gradeRaw ?? null;
      const others = [e.gradeRawDetail, e.tableGradeRaw, e.detailGradeRaw].filter((g) => g != null && g !== e.gradeRaw);
      if (others.length) inconsistent[n] = [e.gradeRaw, ...others];
    }
    return { id: s.id, url: s.url, fetchedAt: s.fetchedAt, status: s.status, format: s.format || null, note: s.note || null, grades, inconsistent };
  });
  suriOut = stableJson({ method: src.method, sources });
  writeText(join(RAW, "suri-81-sources.json"), JSON.stringify(JSON.parse(suriOut), null, 1) + "\n");
}

// ── 자원오행 부수 규칙 조사: 출처별 (표기, 강희 부수 번호, 오행, 근거 종류) 사실만(원문 snippet·해설 미수록) ──
let jawonOut = null;
if (args["jawon-json"]) {
  const src = JSON.parse(readFileSync(args["jawon-json"], "utf8"));
  const sources = src.sources.map((s) => ({
    id: s.id, url: s.url, scheme: s.scheme, lang: s.lang, author: s.author,
    fields: ["form", "radical", "element", "basis", "multi", "example"],
    rules: s.rules.map((r) => [r.radical.normalize("NFC"), r.kangxiNo ?? null, r.element, r.basis, Boolean(r.multiValued), r.example ? r.example.normalize("NFC") : null]),
  }));
  jawonOut = stableJson({ kangxiNumbering: src.kangxiNumbering, sources });
  writeText(join(RAW, "jawon-sources.json"), `${stableJson({ kangxiNumbering: src.kangxiNumbering })
    .slice(0, -1)},"sources":[\n${sources.map((s) => { const { rules, ...h } = s; return `${stableJson(h).slice(0, -1)},"rules":[\n${rules.map((r) => stableJson(r)).join(",\n")}\n]}`; }).join(",\n")}\n]}\n`);
}

const manifest = {
  generatedBy: "scripts/naming/extract-raw.mjs",
  targetChars: sorted.length,
  files: {
    "unihan-extract.tsv": {
      source: "https://www.unicode.org/Public/18.0.0/ucd/Unihan.zip",
      upstreamSha256: { "Unihan.zip": args["unihan-zip-sha256"] || null, ...Object.fromEntries(UNIHAN_FILES.map((f) => [f, sha256File(join(args["unihan-dir"], f))])) },
      license: "Unicode License v3",
      fields: UNIHAN_FIELDS,
    },
    "libhangul-hanja-single.txt": {
      source: "https://github.com/libhangul/libhangul/blob/717409ce61524bb3d8426060a384822f21354c62/data/hanja/hanja.txt",
      upstreamSha256: { "hanja.txt": sha256File(args.libhangul) },
      license: "BSD-3-Clause (Copyright (c) 2005,2006 Choe Hwanjin)",
      lines: singles.length,
    },
    "rutopio-data-gov.csv": {
      source: "https://github.com/rutopio/Korean-Name-Hanja-Charset/blob/12df1ba1b4dfaa095813e4ddfba424e816f94c53/data-gov.csv",
      upstreamSha256: { "data-gov.csv": sha256File(args["gov-csv"]) },
      license: "MIT (Copyright (c) 2024 ChingRu) — efamily.scourt.go.kr 인명용 한자 조회 크롤(2024)",
      rows: govRows.length,
    },
    ...(args["efamily-csv"] ? {
      "efamily-recrawl.csv": {
        source: "https://efamily.scourt.go.kr 인명용 한자 조회 — 자체 재수집",
        upstreamSha256: { "efamily-recrawl.csv": sha256File(args["efamily-csv"]) },
        license: "공공 조회 결과(사실 정보)",
        crawledAt: args["efamily-date"] || null,
      },
    } : {}),
    ...(suriOut ? {
      "suri-81-sources.json": {
        source: "성명학 81수리 길흉표 10곳(각 URL 은 파일 안) — curl 원본 HTML 파싱, 요약기 미사용",
        upstreamSha256: { "suri-transcribed.json": sha256File(args["suri-json"]) },
        license: "사실 정보(수별 길흉 라벨)만 발췌 — 해설 본문 미수록",
      },
    } : {}),
    ...(surnamesCsv ? {
      "kosis-surnames-2015.csv": {
        source: "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1IN15SD",
        citation: "국가데이터처, 「인구총조사」, 2015, 성씨ㆍ본관별 인구(5인 이상) - 전국, 2026.10.03 참조",
        upstreamSha256: { "surnames.csv": sha256File(args["surnames-csv"]) },
        license: "KOSIS 통계정보 이용지침 — 상업적 이용·재배포 허용, 출처 명시·임의 변경 금지(https://kosis.kr/serviceInfo/useGuide.do)",
        note: "xlsx(유니코드) 내려받기 정리본. CSV 내려받기는 CP949 라 KS X 1001 밖 한자가 ? 로 깨진다",
        rows: surnameRows.length,
      },
    } : {}),
    ...(buryongOut ? {
      "buryong-sources.json": {
        source: "작명 실무 불용한자 목록 7곳(각 URL 은 파일 안)",
        upstreamSha256: { "buryong-lists.json": sha256File(args["buryong-json"]) },
        license: "글자 목록(사실)과 출처 id 만 — 사유 문장 미수록",
      },
    } : {}),
    ...(samjaeOut ? {
      "samjae-125-sources.json": {
        source: "삼재(三才) 125조합 길흉표(각 URL 은 파일 안) — curl 원본 HTML 파싱, 요약기 미사용",
        upstreamSha256: { "samjae-transcribed.json": sha256File(args["samjae-json"]) },
        license: "사실 정보(조합별 길흉 라벨)만 발췌 — 해설 본문 미수록",
      },
    } : {}),
    ...(jawonOut ? {
      "jawon-sources.json": {
        source: "자원오행 부수·자의 규칙 16곳(각 URL 은 파일 안) — curl 원본 HTML 파싱, 요약기 미사용",
        upstreamSha256: { "jawon-radicals.json": sha256File(args["jawon-json"]) },
        license: "사실 정보(부수→오행 배속)만 발췌 — 원문 문장 미수록",
      },
    } : {}),
  },
  outputSha256: {
    "unihan-extract.tsv": sha256(tsv),
  },
};
writeText(join(RAW, "manifest.json"), JSON.stringify(JSON.parse(stableJson(manifest)), null, 2) + "\n");
console.log(`[extract-raw] target=${sorted.length} libhangul=${singles.length} gov=${govRows.length}`);

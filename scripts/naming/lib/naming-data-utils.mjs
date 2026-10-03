// 작명 데이터 빌드 공용 도구 — CSV·해시·한글 두음·강희 부수 획수.
// 빌드 스크립트(scripts/naming/*)만 쓴다. 런타임(worker) 코드는 이 파일을 import 하지 않는다.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const sha256 = (bufOrText) => createHash("sha256").update(bufOrText).digest("hex");
export const sha256File = (path) => sha256(readFileSync(path));

/** 따옴표를 지원하는 CSV 한 줄 파서. 크롤 CSV 는 `"가,하",,0560f,嘏` 처럼 필드 안에 쉼표가 있다. */
export function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 1; } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** 머리행이 있는 CSV → 객체 배열. BOM 과 CRLF 를 허용한다. */
export function readCsv(path) {
  const lines = readFileSync(path, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 검수용 CSV 쓰기. BOM 을 붙여 엑셀에서 한글·한자가 깨지지 않게 한다. */
export function writeCsv(path, header, rows) {
  const body = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
  writeText(path, "﻿" + body);
}

export function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
}

/** 키 순서를 고정한 JSON(생성물 결정론). 배열 순서는 호출자가 정렬해서 넘긴다. */
export function stableJson(value) {
  return JSON.stringify(value, (key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
    }
    return v;
  });
}

// ── 한글 ──────────────────────────────────────────────────────────────────────

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const MEDIALS = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];

export function decompose(syllable) {
  const code = String(syllable).codePointAt(0);
  if (!(code >= HANGUL_BASE && code <= HANGUL_LAST)) return null;
  const idx = code - HANGUL_BASE;
  return { initial: Math.floor(idx / 588), medial: Math.floor((idx % 588) / 28), final: idx % 28 };
}

const compose = ({ initial, medial, final }) => String.fromCodePoint(HANGUL_BASE + initial * 588 + medial * 28 + final);

export const initialOf = (syllable) => {
  const d = decompose(syllable);
  return d ? INITIALS[d.initial] : "";
};

// 한글 맞춤법 제10~12항(두음 법칙). 'ㅣ' 계열 모음 = ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ.
const IOTIZED = new Set(["ㅑ", "ㅕ", "ㅖ", "ㅛ", "ㅠ", "ㅣ"].map((m) => MEDIALS.indexOf(m)));
const NIEUN = INITIALS.indexOf("ㄴ");
const RIEUL = INITIALS.indexOf("ㄹ");
const IEUNG = INITIALS.indexOf("ㅇ");

/**
 * 인명용 한자표 주석: "첫소리가 'ㄴ' 또는 'ㄹ'인 한자는 각각 소리 나는 바에 따라 'ㅇ' 또는 'ㄴ'으로 사용할 수 있다."
 * 소리 나는 바 = 두음 법칙. ㄴ+ㅣ계 → ㅇ, ㄹ+ㅣ계 → ㅇ, ㄹ+그 밖 → ㄴ. 해당 없으면 null.
 */
export function dueumOf(syllable) {
  const d = decompose(syllable);
  if (!d) return null;
  if (d.initial === NIEUN && IOTIZED.has(d.medial)) return compose({ ...d, initial: IEUNG });
  if (d.initial === RIEUL) return compose({ ...d, initial: IOTIZED.has(d.medial) ? IEUNG : NIEUN });
  return null;
}

// ── 강희 부수 ─────────────────────────────────────────────────────────────────

// 강희 부수 214개의 원형 획수(부수 번호 구간). 1획 1–6, 2획 7–29, 3획 30–60, 4획 61–94, 5획 95–117,
// 6획 118–146, 7획 147–166, 8획 167–175, 9획 176–186, 10획 187–194, 11획 195–200, 12획 201–204,
// 13획 205–208, 14획 209–210, 15획 211, 16획 212–213, 17획 214.
const RADICAL_STROKE_STARTS = [
  [1, 1], [7, 2], [30, 3], [61, 4], [95, 5], [118, 6], [147, 7], [167, 8], [176, 9],
  [187, 10], [195, 11], [201, 12], [205, 13], [209, 14], [211, 15], [212, 16], [214, 17],
];

export function radicalStrokes(radicalNo) {
  if (!(radicalNo >= 1 && radicalNo <= 214)) throw new Error(`bad radical number ${radicalNo}`);
  let strokes = 0;
  for (const [start, s] of RADICAL_STROKE_STARTS) if (radicalNo >= start) strokes = s;
  return strokes;
}

/** 강희 부수 번호 → 부수 원형 글자(U+2F00 강희 부수 블록을 NFKC 정규화). */
export const radicalChar = (radicalNo) => String.fromCodePoint(0x2f00 + radicalNo - 1).normalize("NFKC");

/** kRSUnicode 첫 값 "85.5" / "120'.3" / "96.-1" → { radical, simplified, residual }. */
export function parseRs(value) {
  const first = String(value || "").trim().split(/\s+/)[0];
  const m = /^(\d+)('{0,3})\.(-?\d+)$/.exec(first);
  if (!m) return null;
  return { radical: Number(m[1]), simplified: m[2].length > 0, residual: Number(m[3]) };
}

// 인명용 한자 풀 빌드 — 명단 원천 대조, 읽기(지정·두음), 원획·필획, 훈(libhangul), 검수·차이 행.
// 판정은 fail-closed: 근거가 없는 글자·읽기는 넣지 않고 차이 CSV 로 보낸다.

import { dueumOf, parseRs, radicalStrokes, radicalChar } from "./naming-data-utils.mjs";

const NON_UNICODE_START = 0xa0000;

/** 유니코드 블록 태그. URO 는 태그 없음. 확장 B 이후는 웹폰트 커버리지가 거의 없다(README §14). */
export function blockTag(cp) {
  if (cp >= 0x4e00 && cp <= 0x9fff) return null;
  if (cp >= 0x3400 && cp <= 0x4dbf) return "ext-a";
  if (cp >= 0x20000 && cp <= 0x2a6df) return "ext-b";
  if ((cp >= 0x2a700 && cp <= 0x2ee5f) || (cp >= 0x30000 && cp <= 0x3347f)) return "ext-c-plus";
  throw new Error(`unexpected block U+${cp.toString(16)}`);
}

/** kHangul "낙:0 락:0E 악:0N" → [{ hangul, flags }]. E=교육용 기초한자, N=인명용(2015·2018 반영분). */
export function parseKHangul(value) {
  return String(value || "").split(/\s+/).filter(Boolean).map((tok) => {
    const [hangul, flags = ""] = tok.split(":");
    return { hangul, flags };
  });
}

/** 크롤 한 행의 음 묶음("리,이")을 지정 음과 두음 파생 음으로 나눈다. */
function splitGroup(group) {
  const designated = [];
  const dueum = [];
  for (const h of group) {
    if (group.some((other) => other !== h && dueumOf(other) === h)) dueum.push(h);
    else designated.push(h);
  }
  return { designated, dueum };
}

/**
 * 원획. 기본은 kRSUnicode 강희 부수 원형 획수 + 잔여획(부수 변형 氵→水 등을 원형으로 환산).
 * 부수가 원형보다 길게 쓰인 글자(泰·求의 氺)는 kTotalStrokes 가 더 크므로 큰 값을 쓰고 분쟁으로 표시한다.
 * 잔여획 0 이하(부수 글자 자체: 王 96.-1, 玉 96.0)는 자형 실획.
 */
export function computeStrokes(rsValue, totalValue) {
  const rs = parseRs(rsValue);
  const total = Number(String(totalValue || "").trim().split(/\s+/)[0]);
  if (!rs || !Number.isInteger(total) || total <= 0) return null;
  const formula = radicalStrokes(rs.radical) + rs.residual;
  const disputes = [];
  let won;
  if (rs.residual <= 0) won = total;
  else {
    won = Math.max(total, formula);
    if (total > formula) disputes.push("won-total-exceeds-formula");
  }
  if (rs.simplified) disputes.push("simplified-radical");
  if (String(rsValue).trim().split(/\s+/).length > 1) disputes.push("multiple-radical-values");
  return { radical: rs.radical, residual: rs.residual, won, pil: total, formula, disputes };
}

/**
 * @param {object} p
 * @param {string[][]} p.govRows      크롤 CSV 행 [hangul, consonant, unicode, hanja]
 * @param {Map<number, object>} p.unihan  cp → { kRSUnicode, kTotalStrokes, kHangul, ... }
 * @param {Map<number, Map<string,string>>} p.hun  cp → (읽기 → libhangul 뜻 문자열)
 * @param {Map<string, {won:number, note:string}>} p.numerals  숫자 한자 수의 획수
 * @param {{include: Record<string,string>, exclude: Record<string,string>}} p.adjudication 사람 판정
 * @param {Map<number, string[]>|null} p.efamily  cp → 지정 음(재수집 명단, 없으면 null)
 */
export function buildPool({ govRows, unihan, hun, numerals, adjudication, efamily }) {
  const crawl = new Map(); // cp → [{designated, dueum}]
  const diff = [];
  for (const [hangul, , hex, ch] of govRows) {
    const cp = parseInt(hex, 16);
    const group = hangul.split(",").map((s) => s.trim()).filter(Boolean);
    if (!Number.isFinite(cp)) throw new Error(`bad crawl code ${hex}`);
    if (cp >= NON_UNICODE_START) {
      diff.push({ cp: hex, ch, crawl: 1, uE: 0, uN: 0, ef: "", decision: "exclude", reason: "non-unicode-code", detail: `crawl reading ${group.join("/")}` });
      continue;
    }
    if (String.fromCodePoint(cp) !== ch) throw new Error(`crawl code/char mismatch ${hex} ${ch}`);
    if (!crawl.has(cp)) crawl.set(cp, []);
    crawl.get(cp).push(splitGroup(group));
  }

  const unihanEN = new Map();
  for (const [cp, f] of unihan) {
    const rd = parseKHangul(f.kHangul).filter((r) => /[EN]/.test(r.flags));
    if (rd.length) unihanEN.set(cp, rd);
  }

  const candidates = new Set([...crawl.keys(), ...unihanEN.keys(), ...(efamily ? efamily.keys() : [])]);
  const entries = [];
  const review = [];
  const anomalies = [];

  for (const cp of [...candidates].sort((a, b) => a - b)) {
    const ch = String.fromCodePoint(cp);
    const inCrawl = crawl.has(cp);
    const en = unihanEN.get(cp) || [];
    const inE = en.some((r) => r.flags.includes("E"));
    const inN = en.some((r) => r.flags.includes("N"));
    const efReadings = efamily ? efamily.get(cp) || null : null;
    const base = { cp: `U+${cp.toString(16).toUpperCase()}`, ch, crawl: inCrawl ? 1 : 0, uE: inE ? 1 : 0, uN: inN ? 1 : 0, ef: efamily ? (efReadings ? 1 : 0) : "" };

    let basis;
    if (adjudication.exclude[ch]) {
      diff.push({ ...base, decision: "exclude", reason: "adjudicated", detail: adjudication.exclude[ch] });
      continue;
    }
    if (inCrawl) basis = "crawl";
    else if (efReadings) basis = "efamily";
    else if (inE) basis = "law-basic-edu";
    else if (adjudication.include[ch]) basis = "adjudicated";
    else {
      diff.push({ ...base, decision: "exclude", reason: efamily ? "unihan-N-only-absent-in-efamily" : "unihan-N-only-pending", detail: en.map((r) => `${r.hangul}:${r.flags}`).join(" ") });
      continue;
    }
    if (basis !== "crawl") diff.push({ ...base, decision: "include", reason: basis, detail: (adjudication.include[ch] || en.map((r) => `${r.hangul}:${r.flags}`).join(" ")) });

    // ── 읽기 ──
    const designated = [];
    const dueum = [];
    const addUnique = (arr, h) => { if (!arr.includes(h)) arr.push(h); };
    if (inCrawl) {
      for (const g of crawl.get(cp)) {
        // 크롤 음 칸이 빈 행(𥡴)은 efamily 재수집 음으로 채운다. 그것도 없으면 이상치.
        if (g.designated.length === 0) {
          if (efReadings) diff.push({ ...base, decision: "include", reason: "crawl-reading-empty-efamily-reading", detail: efReadings.join("/") });
          else anomalies.push(`${ch}: crawl group without designated reading`);
        }
        g.designated.forEach((h) => addUnique(designated, h));
        g.dueum.forEach((h) => addUnique(dueum, h));
      }
    }
    if (efReadings) efReadings.forEach((h) => addUnique(designated, h));
    if (!inCrawl && !efReadings) en.forEach((r) => addUnique(designated, r.hangul));
    for (const h of designated) {
      const d = dueumOf(h);
      if (d && !designated.includes(d)) addUnique(dueum, d);
    }
    const dueumOnly = dueum.filter((h) => !designated.includes(h));
    if (inCrawl) {
      const known = new Set([...designated, ...dueumOnly]);
      const missingFromCrawl = en.filter((r) => !known.has(r.hangul)).map((r) => `${r.hangul}:${r.flags}`);
      if (missingFromCrawl.length) diff.push({ ...base, decision: "reading-not-added", reason: "unihan-EN-reading-not-in-crawl", detail: missingFromCrawl.join(" ") });
    }

    // ── 획수 ──
    const f = unihan.get(cp) || {};
    const strokes = computeStrokes(f.kRSUnicode, f.kTotalStrokes);
    if (!strokes) throw new Error(`no radical/stroke data for ${ch} ${base.cp}`);
    const tags = [];
    const block = blockTag(cp);
    if (block) tags.push(block);
    if (inE) tags.push("basic-edu");
    let won = strokes.won;
    const num = numerals.get(ch);
    if (num) {
      won = num.won;
      tags.push("numeral-suui");
    }

    // ── 훈 ──
    const hunMap = hun.get(cp) || new Map();
    const readings = [
      ...designated.map((h) => [h, "designated", hunMap.get(h) ?? null]),
      ...dueumOnly.map((h) => [h, "dueum", hunMap.get(h) ?? null]),
    ];
    const hasHun = readings.some((r) => r[2]);

    const disputes = [...strokes.disputes];
    entries.push({ ch, readings, radical: strokes.radical, won, pil: strokes.pil, disputes, tags, basis });

    if (disputes.length || !hasHun || num) {
      review.push({
        cp: base.cp, ch,
        readings: readings.map((r) => `${r[0]}${r[1] === "dueum" ? "(두음)" : ""}`).join(" "),
        hun: readings.map((r) => r[2]).filter(Boolean)[0] || "",
        radical: `${strokes.radical}${radicalChar(strokes.radical)}`,
        rs: f.kRSUnicode, total: strokes.pil, formula: strokes.formula, won,
        reasons: [...disputes, ...(hasHun ? [] : ["hun-missing"]), ...(num ? ["numeral-suui"] : [])].join(" "),
      });
    }
  }
  if (anomalies.length) throw new Error(`crawl anomalies:\n${anomalies.join("\n")}`);
  return { entries, review, diff };
}

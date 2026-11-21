/**
 * 심화 자미두수(/ziwei/chart) 유년 리딩·무성 화자·상담 문장 중복 가드.
 * - 기본 셸(js/saju-engine.js)의 유년 이론·표와 심화 TS 이식본이 같은 값을 내는지(드리프트) 고정한다.
 * - 과금 LLM 없음 — 전부 결정적 템플릿이다.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { musungRegisterDrift } from "../../worker/lib/expert-character-persona-text.js";
import { loadTsModule } from "../../scripts/lib/load-ts-module.mjs";

const require = createRequire(import.meta.url);
const harness = require("../../scripts/lib/ziwei-engine-harness.cjs");
harness.loadEngine(); // 셸 전역(ZW_FLOW_* 표·zwYearFlowTheory)은 엔진을 평가해야 생긴다
const eng = loadTsModule("app/_lib/ziwei-engine.ts");
const { normalizeZiweiInput } = loadTsModule("app/_lib/normalize-ziwei-input.ts");
const yf = loadTsModule("app/_lib/ziwei-year-flow.ts");
const data = loadTsModule("app/_lib/ziwei-flow-data.ts");
const say = loadTsModule("app/_lib/ziwei-musung-say.ts");
const { buildQuestionReading, CONSULTATION_QUESTIONS } = loadTsModule("app/_lib/ziwei-consultation-narrative.ts");

const TYPES = ["화록", "화권", "화과", "화기"];
const plain = (v) => JSON.parse(JSON.stringify(v));

function rng(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}
const rnd = rng(12345);
const BIRTHS = Array.from({ length: 40 }, () => ({
  gender: rnd() < 0.5 ? "M" : "F",
  year: 1950 + Math.floor(rnd() * 56),
  month: 1 + Math.floor(rnd() * 12),
  day: 1 + Math.floor(rnd() * 28),
  hour: Math.floor(rnd() * 24),
  minute: Math.floor(rnd() * 60),
}));

// 심화 엔진은 Asia/Seoul 에서만 출생 시계 보정을 하므로 셸과 같은 입력을 만들려면 Asia/Tokyo 로 계산한다.
function tsChart(b) {
  return eng.calculateZiweiChart({ name: "t", birthYear: b.year, birthMonth: b.month, birthDay: b.day, birthHour: b.hour, birthMinute: b.minute, unknownHour: false, gender: b.gender, calendarType: "solar", isLeapMonth: false, timezone: "Asia/Tokyo" });
}
function seoulChart(b) {
  const n = normalizeZiweiInput({ name: "x", birthYear: b.year, birthMonth: b.month, birthDay: b.day, birthHour: b.hour, birthMinute: b.minute, gender: b.gender, calendarType: "solar", isLeapMonth: false, unknownHour: false, timezone: "Asia/Seoul" });
  return eng.normalizeZiweiForAdvancedReport(eng.calculateZiweiChart(n.input));
}

// 심화 표는 화면에 쓰지 않는 필드(예: tone)를 뺄 수 있다 — TS 쪽 필드가 셸과 같은지, 최상위 키 집합이 같은지를 본다.
function assertSubset(ts, shell, label) {
  const t = plain(ts);
  const s = plain(shell);
  assert.deepEqual(Object.keys(t).sort(), Object.keys(s).sort(), `${label}: 키 집합`);
  for (const k of Object.keys(t)) {
    if (t[k] && typeof t[k] === "object") {
      for (const f of Object.keys(t[k])) assert.deepEqual(t[k][f], s[k][f], `${label}.${k}.${f}`);
    } else assert.equal(t[k], s[k], `${label}.${k}`);
  }
}

test("표 드리프트: 심화 ziwei-flow-data 는 셸 표와 같다", () => {
  assertSubset(data.FLOW_MATRIX, global.ZW_FLOW_MATRIX, "MATRIX");
  assertSubset(data.FLOW_ROLE, global.ZW_FLOW_ROLE, "ROLE");
  assertSubset(data.FLOW_OLYMPUS_BY_STAR, global.ZW_FLOW_OLYMPUS_BY_STAR, "BY_STAR");
  assertSubset(data.FLOW_OLYMPUS_BY_PALACE, global.ZW_FLOW_OLYMPUS_BY_PALACE, "BY_PALACE");
  assertSubset(data.FLOW_GOD_META, global.ZW_FLOW_OLYMPUS_GOD_META, "GOD_META");
  assertSubset(data.FLOW_SIHUA_SEAL, global.ZW_FLOW_SIHUA_SEAL, "SIHUA_SEAL");
});

test("이론 드리프트: TS yearFlowTheory 는 셸 zwYearFlowTheory 와 같은 값을 낸다", () => {
  let compared = 0;
  const pick = (X) => ({
    ming: X.mingIdx, mp: X.mingPalace, tone: X.tone, score: X.score, rel: X.decadeRel, crossed: X.crossed,
    stack: X.stack.map((s) => s.type + s.with).join(","),
    dec: X.decade ? `${X.decade.idx}:${X.decade.palace}` : "",
    marks: TYPES.map((t) => [X.marks[t].star, X.marks[t].idx, X.marks[t].palace, X.marks[t].flowPalace, X.marks[t].chongPalace, X.marks[t].inTriad].join("/")).join("|"),
  });
  for (const b of BIRTHS) {
    const pd = harness.calcChart(b);
    const chart = tsChart(b);
    for (const y of [2025, 2026, 2027, 2030]) {
      assert.deepEqual(pick(yf.yearFlowTheory(chart, y)), pick(global.zwYearFlowTheory(pd, y, { birthYear: b.year })), `${JSON.stringify(b)} ${y}`);
      compared += 1;
    }
  }
  assert.equal(compared, BIRTHS.length * 4);
});

test("유년 이론: 명궁=태세 지지궁, 오호둔, 간지 60년 주기", () => {
  assert.equal(yf.yearGanjiOf(2026).ganji, "丙午");
  assert.equal(yf.yearGanjiOf(1984).ganji, "甲子");
  for (let y = 1950; y <= 2040; y += 1) assert.equal(yf.yearGanjiOf(y).ganji, yf.yearGanjiOf(y + 60).ganji);
  // 병(丙)년 정월(인월) = 庚寅 → 천간 인덱스 6
  assert.equal(yf.monthStemIdx(2, 1), 6);
  assert.equal(yf.branchStemIdx(2, 2), 6);
});

test("무성 3개년 리딩: 금기어 없음·첫 문장 판결·문장 중복 없음", () => {
  let lines = 0;
  for (const b of BIRTHS.slice(0, 24)) {
    const chart = seoulChart(b);
    for (const sy of [2026, 2027, 2031]) {
      const r = say.buildZiweiYearFlowReading(chart, sy);
      assert.equal(r.cards.length, 3);
      assert.equal(r.bridges.length, 2);
      const all = [r.opening, ...r.cards.map((c) => c.say), ...r.bridges, r.closing];
      for (const l of all) {
        assert.deepEqual(musungRegisterDrift(`${l.verdict} ${l.detail}`), [], `${JSON.stringify(b)} ${sy}: ${l.verdict}`);
        lines += 1;
      }
      const seen = new Map();
      const texts = all.map((l) => `${l.verdict} ${l.detail}`).concat(r.cards.flatMap((c) => [...c.marks.map((m) => m.sentence + m.chong), ...c.stack, c.action, c.olympus ? c.olympus.oracle : ""]));
      for (const t of texts) for (const s of t.split(/(?<=[.요다])\s+/)) { if (s.length >= 14) seen.set(s, (seen.get(s) || 0) + 1); }
      assert.deepEqual([...seen].filter(([, n]) => n > 1).map(([s]) => s), [], `${JSON.stringify(b)} ${sy}: 중복 문장`);
    }
  }
  assert.ok(lines > 100);
});

test("무성 3개년 리딩: 제우스·헤르메스 상징이 서사에 들어가고 같은 신이 연속하지 않는다", () => {
  let zeus = false;
  let hermes = false;
  for (const b of BIRTHS) {
    const r = say.buildZiweiYearFlowReading(seoulChart(b), 2026);
    const gods = r.cards.map((c) => c.olympus && c.olympus.god).filter(Boolean);
    gods.forEach((g, i) => { if (i > 0) assert.notEqual(g, gods[i - 1], `${JSON.stringify(b)} 같은 신 연속`); });
    for (const g of gods) { zeus = zeus || g === "제우스"; hermes = hermes || g.startsWith("헤르메스"); }
  }
  assert.ok(zeus && hermes, `제우스=${zeus} 헤르메스=${hermes}`);
});

test("섹션 말풍선(히어로·바탕·질문·오늘): 금기어 없음", () => {
  const chart = seoulChart(BIRTHS[0]);
  for (const id of Object.keys(CONSULTATION_QUESTIONS)) {
    const r = buildQuestionReading(chart, id);
    for (const l of [say.musungHeroSay({ id, keywords: r.keywords }), say.musungQuestionSay({ id, keywords: r.keywords, palaceName: r.evidence[0]?.palaceName })]) {
      assert.deepEqual(musungRegisterDrift(`${l.verdict} ${l.detail}`), [], `${id}: ${l.verdict}`);
    }
  }
  for (const l of [say.MUSUNG_FOUNDATION_SAY, say.MUSUNG_TODAY_SAY]) assert.deepEqual(musungRegisterDrift(`${l.verdict} ${l.detail}`), []);
});

test("상담 문장: 8개 주제 사이에 같은 문장이 되풀이되지 않는다", () => {
  for (const b of BIRTHS.slice(0, 30)) {
    const chart = seoulChart(b);
    const map = new Map();
    for (const id of Object.keys(CONSULTATION_QUESTIONS)) {
      const r = buildQuestionReading(chart, id);
      for (const t of [r.conclusion, r.heroNote, ...r.scenes, ...r.actions, r.today]) {
        for (const s of String(t).split(/(?<=[.요다])\s+/)) {
          if (s.length < 14) continue;
          if (!map.has(s)) map.set(s, new Set());
          map.get(s).add(id);
        }
      }
    }
    const dup = [...map].filter(([, v]) => v.size > 1).map(([s, v]) => `${[...v].join(",")} | ${s.slice(0, 50)}`);
    assert.deepEqual(dup, [], `${JSON.stringify(b)}`);
  }
});

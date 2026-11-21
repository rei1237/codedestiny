/**
 * 기본 자미두수 3개년 유년 리딩·월별 운기의 중복·화자·이론 가드.
 * 엔진은 정적 셸(js/saju-engine.js)이라 하네스로 vm 에 올려 전역 함수를 직접 부른다.
 * 과금 LLM 없음 — 전부 결정적 템플릿이다.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { musungRegisterDrift } from "../../worker/lib/expert-character-persona-text.js";

const require = createRequire(import.meta.url);
const harness = require("../../scripts/lib/ziwei-engine-harness.cjs");

const BIRTHS = [
  { gender: "F", year: 1990, month: 5, day: 17, hour: 14, minute: 30 },
  { gender: "M", year: 1984, month: 11, day: 3, hour: 7, minute: 10 },
  { gender: "F", year: 1975, month: 2, day: 28, hour: 23, minute: 40 },
  { gender: "M", year: 2001, month: 8, day: 9, hour: 2, minute: 5 },
];
// 천간 10종이 한 번씩 연 첫해가 되도록 10년 구간을 돈다.
const YEARS = Array.from({ length: 10 }, (_, i) => 2024 + i);

const charts = BIRTHS.map((b) => ({ b, pd: harness.calcChart(b) }));

function textOf(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<img[^>]*>/g, "")
    .replace(/<\/(div|p|article|summary|li|h\d)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&");
}
function sentences(text) {
  return text.split(/[\n.!?。]|(?<=[요다])\s/).map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length >= 18);
}
function grams(s, n = 6) {
  const t = s.replace(/\s+/g, "");
  const out = new Set();
  for (let i = 0; i + n <= t.length; i += 1) out.add(t.slice(i, i + n));
  return out;
}

test("3개년 리딩: 같은 문장이 한 번 이상 나오지 않는다", () => {
  for (const { b, pd } of charts) {
    for (const y of YEARS) {
      const text = textOf(global.buildZwYearlyFlowDeepHtml(pd, y));
      const seen = new Map();
      for (const s of sentences(text)) seen.set(s, (seen.get(s) || 0) + 1);
      const dup = [...seen].filter(([, n]) => n > 1).map(([s]) => s);
      assert.deepEqual(dup, [], `${JSON.stringify(b)} ${y}: 중복 문장`);
    }
  }
});

test("3개년 리딩: 카드 사이 n-gram 겹침이 한도 이하", () => {
  for (const { b, pd } of charts) {
    for (const y of YEARS) {
      const html = global.buildZwYearlyFlowDeepHtml(pd, y);
      const cards = html.split("이 해의 한 줄:").slice(0, 3).map(textOf);
      assert.equal(cards.length, 3, `${JSON.stringify(b)} ${y}: 연도 카드 3장`);
      for (let i = 0; i < cards.length; i += 1) {
        for (let j = i + 1; j < cards.length; j += 1) {
          const a = grams(cards[i]);
          const c = grams(cards[j]);
          let inter = 0;
          for (const g of a) if (c.has(g)) inter += 1;
          const ratio = inter / Math.max(1, Math.min(a.size, c.size));
          assert.ok(ratio < 0.35, `${JSON.stringify(b)} ${y} 카드${i}-${j} 겹침 ${ratio.toFixed(2)}`);
        }
      }
    }
  }
});

test("무성 화자: 말풍선 첫 문장은 80자 이하 판결(니다.), 금기어 없음", () => {
  for (const { b, pd } of charts) {
    for (const y of YEARS) {
      const html = global.buildZwYearlyFlowDeepHtml(pd, y) + global.buildZwMonthlyFlowHtml(pd, y).bodyHtml;
      const bubbles = [...html.matchAll(/<p class="zw-musung-say__text">([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]).trim());
      assert.ok(bubbles.length >= 3, `${JSON.stringify(b)} ${y}: 무성 말풍선 수`);
      for (const t of bubbles) {
        const drift = musungRegisterDrift(t);
        assert.deepEqual(drift, [], `${JSON.stringify(b)} ${y}: "${t.slice(0, 60)}"`);
      }
    }
  }
});

test("유년 간지: 기준 연도와 60년 주기", () => {
  const g = (y) => { const r = global.zwFlowYearGanji(y); return r.gan + r.zhi; };
  assert.equal(g(1984), "甲子");
  assert.equal(g(2000), "庚辰");
  assert.equal(g(2026), "丙午");
  for (let y = 1950; y <= 2040; y += 1) assert.equal(g(y), g(y + 60), `${y}`);
});

test("유년·유월 이론: 명궁=태세 지지궁, 12개월 연속 순행, 월간 오호둔", () => {
  const { pd } = charts[0];
  const th = global.zwYearFlowTheory(pd, 2026);
  assert.equal(th.ganji, "丙午");
  assert.equal(th.mingIdx, 6);
  assert.equal(th.marks["화록"].star, "천동");
  const dj = global.zwDoujunMonths(pd, 2026);
  assert.equal(dj.months.length, 12);
  dj.months.forEach((m, i) => assert.equal(m.idx, (dj.firstIdx + i) % 12));
  // 병(丙)년 정월 = 庚寅 (오호둔)
  assert.equal(dj.months[0].gan, "庚");
});

test("월별 운기: 제우스·헤르메스 상징이 서사로 들어간다", () => {
  let zeus = false;
  let hermes = false;
  for (const { pd } of charts) {
    for (const y of YEARS) {
      const t = textOf(global.buildZwMonthlyFlowHtml(pd, y).bodyHtml);
      zeus = zeus || t.includes("제우스");
      hermes = hermes || t.includes("헤르메스");
    }
  }
  assert.ok(zeus && hermes, `제우스=${zeus} 헤르메스=${hermes}`);
});

test("결제 게이트 호출문은 그대로, HTML 은 이스케이프 안전", () => {
  const src = readFileSync(new URL("../../js/saju-engine.js", import.meta.url), "utf8");
  assert.match(src, /zwBasicPaidGateHtml\('ziwei_life_yearly_flow', 50,/);
  const html = global.buildZwYearlyFlowDeepHtml(charts[0].pd, 2026);
  assert.ok(!/undefined|NaN|\[object/.test(textOf(html)));
  assert.match(html, /data-cd-marker="ziwei-yearly-flow-deep-v20261121"/);
});

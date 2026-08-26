#!/usr/bin/env node
/**
 * 자정 경계 위험 등기부 가드.
 *
 *   node scripts/verify-korean-calendar-midnight-register.mjs [--report] [--update]
 *
 * 🔴 LLM 실호출 없음.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * 이 코어의 모든 판정은 **KST 민용일**이라는 정수 위에서 이뤄진다. 천체력 오차(실측 최대 1.04분)가
 * 그 정수를 뒤집을 수 있는 곳은 **삭·절기가 KST 자정 가까이에 있는 항목뿐**이다.
 * 그 밖의 4,800여 항목은 자정에서 5분 넘게 떨어져 있어 안전하다.
 *
 * 그래서 자정 ±5분 항목을 **표에서 전수 발견**해 체크인된 등기부와 대조한다. 항목이 늘거나
 * 줄거나 시각이 30초 넘게 움직이면 실패한다 — 그건 "누군가의 음력일·세차·월주가 바뀌었다" 는 뜻이고
 * astronomy-engine 업그레이드가 사용자 결과를 바꾸는 **유일한 통로**다. 리뷰어가 봐야 할 사건이다.
 *
 * ── 왜 fail-closed 인가 (CLAUDE.md 원칙 10) ─────────────────────────────────
 * 등기부를 손으로 적지 않는다. 표에서 조건으로 전수 발견하고, 발견 집합과 픽스처가
 * **정확히 일치**해야 통과한다. 한쪽에만 있는 항목이 하나라도 있으면 실패다.
 *
 * `--update` 는 픽스처를 다시 쓴다. 🔴 그 diff 를 눈으로 확인하고 PR 에 근거를 적을 것.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MIDNIGHT_RISKS, TABLE_META } from "../lib/korean-calendar/core.js";
import { TERM_NAME_KO } from "../lib/korean-calendar/labels.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = "__tests__/fixtures/korean-calendar/midnight-register.json";
const REPORT = process.argv.includes("--report");
const UPDATE = process.argv.includes("--update");
const TOLERANCE_SECONDS = 30;

const failures = [];
let checks = 0;
const ok = (label, condition, detail = "") => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
};

const label = (entry) => (entry.kind === "term" ? `${TERM_NAME_KO[entry.termIndex]}(절기)` : "삭");
const keyOf = (entry) => `${entry.kind}:${entry.kst}`;

const discovered = MIDNIGHT_RISKS.map((entry) => ({
  kind: entry.kind,
  termIndex: entry.termIndex,
  name: label(entry),
  kst: entry.kst,
  secondsFromMidnight: entry.secondsFromMidnight,
})).sort((a, b) => (a.kst < b.kst ? -1 : a.kst > b.kst ? 1 : 0));

if (UPDATE) {
  const abs = join(REPO_ROOT, FIXTURE);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `${JSON.stringify({
      note: "KST 자정 ±5분 안에 든 삭·절기. scripts/verify-korean-calendar-midnight-register.mjs --update 로 갱신한다.",
      windowSeconds: TABLE_META.midnightRiskSeconds,
      blockYears: [TABLE_META.firstBlockYear, TABLE_META.lastBlockYear],
      astronomyEngine: TABLE_META.astronomyEngine,
      entries: discovered,
    }, null, 2)}\n`,
  );
  console.log(`[verify:korean-calendar-midnight-register] 픽스처 갱신 — ${discovered.length}건 → ${FIXTURE}`);
  process.exit(0);
}

let fixture = null;
try { fixture = JSON.parse(readFileSync(join(REPO_ROOT, FIXTURE), "utf8")); } catch { fixture = null; }

ok("① 등기부 픽스처가 존재한다", fixture !== null, `${FIXTURE} 이 없다 — --update 로 만들 것`);
if (fixture) {
  const expected = Array.isArray(fixture.entries) ? fixture.entries : [];
  // 🔴 대상이 0이면 통과하는 가드는 가드가 아니다. 실측 51건(절기 34 + 삭 17).
  ok("② 등기부가 비어 있지 않다", expected.length >= 40 && discovered.length >= 40, `fixture=${expected.length} discovered=${discovered.length}`);
  ok("② 창 크기가 픽스처와 같다", fixture.windowSeconds === TABLE_META.midnightRiskSeconds, `${fixture.windowSeconds} vs ${TABLE_META.midnightRiskSeconds}`);

  const expectedByKey = new Map(expected.map((e) => [keyOf(e), e]));
  const discoveredByKey = new Map(discovered.map((e) => [keyOf(e), e]));

  const added = discovered.filter((e) => !expectedByKey.has(keyOf(e)));
  const removed = expected.filter((e) => !discoveredByKey.has(keyOf(e)));
  ok("③ 등기부에 새로 들어온 항목이 없다", added.length === 0, added.map((e) => `${e.kst} ${e.name}`).join("\n      "));
  ok("③ 등기부에서 사라진 항목이 없다", removed.length === 0, removed.map((e) => `${e.kst} ${e.name}`).join("\n      "));

  const moved = [];
  for (const entry of discovered) {
    const before = expectedByKey.get(keyOf(entry));
    if (!before) continue;
    if (Math.abs(before.secondsFromMidnight - entry.secondsFromMidnight) > TOLERANCE_SECONDS) {
      moved.push(`${entry.kst} ${entry.name} ${before.secondsFromMidnight}s → ${entry.secondsFromMidnight}s`);
    }
  }
  ok(`④ 자정과의 거리가 ${TOLERANCE_SECONDS}초 넘게 움직인 항목이 없다`, moved.length === 0, moved.join("\n      "));
}

// 등기부 밖 항목은 자정에서 충분히 떨어져 있어야 한다 — 창 정의가 실제로 지켜지는지 본다.
ok(
  "⑤ 등기부 항목이 전부 창 안에 있다",
  discovered.every((e) => e.secondsFromMidnight <= TABLE_META.midnightRiskSeconds),
  discovered.filter((e) => e.secondsFromMidnight > TABLE_META.midnightRiskSeconds).map((e) => e.kst).join(", "),
);

if (failures.length) {
  console.error(`[verify:korean-calendar-midnight-register] 실패 ${failures.length}건 / 검사 ${checks}건`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
const terms = discovered.filter((e) => e.kind === "term").length;
console.log(
  `[verify:korean-calendar-midnight-register] 통과 — 검사 ${checks}건 · 등기부 ${discovered.length}건 (절기 ${terms} · 삭 ${discovered.length - terms}) · 창 ±${TABLE_META.midnightRiskSeconds}초`,
);

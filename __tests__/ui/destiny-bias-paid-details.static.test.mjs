// 최애운명 결제 경계(2026-11-08 사용자 결정 "결과 카드만 무료"):
// 결과 카드·포토카드·공유는 결제 없이 나오고, 상세 케미 리포트(details)만 destiny-bias-analyze 결제 뒤에 그린다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const client = readFileSync(new URL("../../app/saju/destiny-bias/DestinyBiasClient.tsx", import.meta.url), "utf8").replace(/\r/g, "");

const slice = (from, to) => {
  const start = client.indexOf(from);
  const end = client.indexOf(to, start + from.length);
  assert.ok(start >= 0 && end > start, `${from} … ${to} 구간이 있어야 한다`);
  return client.slice(start, end);
};

test("결과 계산(computeCore)·compute 에는 결제 게이트가 없다", () => {
  const core = slice("const computeCore = useCallback(", "const compute = computeCore;");
  assert.doesNotMatch(core, /ensurePaidAccess|DESTINY_BIAS_ANALYZE_PRICING/);
  assert.match(client, /const compute = computeCore;/);
});

test("결제 게이트는 details 진입(openDetails) 한 곳에서만 부른다", () => {
  assert.equal(client.match(/await ensurePaidAccess\(/g)?.length, 1);
  const details = slice("const openDetails = useCallback(", "/** 무드를 바꾸면");
  assert.match(details, /await ensurePaidAccess\(/);
  assert.match(details, /featureKey: DESTINY_BIAS_ANALYZE_FEATURE_KEY/);
  assert.match(details, /unlockDetails\(target, info\)/);
});

test("상세 리포트 컴포넌트는 해금 뒤에만 그리고, 무료 화면은 공유 바·포토카드를 그린다", () => {
  const view = slice("{step === \"result\" && outcome && !revealing ? (", "{step === \"hook\" && recentResults.length > 0");
  const gateAt = view.indexOf("{detailsUnlocked ? (");
  assert.ok(gateAt > 0);
  for (const marker of ["<ChemiSections", "<ChemiReportTabs", "<ChemiEvidencePanel"]) {
    assert.equal(view.split(marker).length - 1, 1, `${marker} 는 한 번만`);
    assert.ok(view.indexOf(marker) > gateAt, `${marker} 는 해금 분기 안`);
  }
  for (const marker of ["<ChemiCoreCard", "<ChemiShareBar", "<ViralShareBar", "<ChemiShareCard"]) {
    assert.ok(view.indexOf(marker) >= 0 && view.indexOf(marker) < gateAt, `${marker} 는 무료 구간`);
  }
});

test("공유 바는 해제 조건과 묶이지 않는다", () => {
  const bar = slice("<ViralShareBar", "/>");
  assert.doesNotMatch(bar, /unlock|Unlocked/i);
});

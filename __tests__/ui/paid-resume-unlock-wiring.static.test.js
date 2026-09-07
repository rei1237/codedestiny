const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

/* 잠금 해제형 유료 기능 4종의 "결제 후 자동 재개" 배선을 소스에 고정한다.

   🔴 배선이 빠지면 증상이 조용하다 — 결제는 정상으로 끝나고, 돌아온 사용자만 홈 화면에서
   '지금 열기' 카드를 한 번 더 눌러야 한다(모바일 PortOne 은 상위 프레임을 리다이렉트하므로
   게이트의 await 가 페이지와 함께 죽어 onGranted 가 실행되지 않는다).
   계약 정본: js/core/checkout-entry.js 의 runPaidResume. */

const ROOT = path.join(__dirname, "..", "..");
const SUKUYO = fs.readFileSync(path.join(ROOT, "js", "saju-engine-tarot-sukuyo-quantum.js"), "utf8");
const ENTERTAIN = fs.readFileSync(path.join(ROOT, "js", "entertain-engine.js"), "utf8");

const CASES = [
  {
    label: "극T 관계 회로",
    source: SUKUYO,
    kind: "sukuyo-extreme-t",
    core: "_syRenderTTestCore",
    gate: "syBuildUnlockResumeDescriptor(SY_EXTREME_T_RESUME_KIND, 'cdSajuTabEntry')",
  },
  {
    label: "본성 심화 해석",
    source: SUKUYO,
    kind: "sukuyo-nature-deep-dive",
    core: "_syRevealNatureDeepDiveCore",
    gate: "syBuildUnlockResumeDescriptor(SY_NATURE_DEEP_DIVE_RESUME_KIND, 'openSukuyoModal')",
  },
  {
    label: "숙요 인연 도감",
    source: SUKUYO,
    kind: "sukuyo-encyclopedia",
    core: "_syRevealEncyclopediaCore",
    gate: "syBuildUnlockResumeDescriptor(SY_ENCYCLOPEDIA_RESUME_KIND, 'openSukuyoModal')",
  },
  {
    label: "테토에겐 상세 리포트",
    source: ENTERTAIN,
    kind: "tetogen-deep-report",
    core: "_cdRevealTetogenDeepReportCore",
    gate: "resume: { kind: TETOGEN_DEEP_REPORT_RESUME_KIND, action: 'cdSajuTabEntry', args: {} }",
  },
];

for (const item of CASES) {
  test(item.label + ": 재개 kind '" + item.kind + "' 가 등록된다", () => {
    assert.ok(item.source.includes("'" + item.kind + "'"), "kind 상수 '" + item.kind + "' 가 사라졌다");
    assert.match(item.source, /registerPaidResumeHandler\(/, "재개 핸들러 등록이 사라졌다");
  });

  test(item.label + ": 여는 코어가 전역으로 노출되고 재개가 그것을 참조한다", () => {
    // 재개 핸들러는 렌더 클로저 안의 코어를 이 전역 이름으로만 찾는다 — 이름이 어긋나면 상한까지 기다리다 조용히 실패한다.
    const hits = item.source.split(item.core).length - 1;
    assert.ok(hits >= 2, "코어 전역 " + item.core + " 의 대입 또는 참조가 사라졌다 (발견 " + hits + "회)");
  });

  test(item.label + ": 결제 게이트가 재개 서술자를 넘긴다", () => {
    // 🔴 여기가 빠지면 복귀 티켓에 resume 이 안 실려 결제 후 홈 화면에서 끝난다.
    assert.ok(item.source.includes(item.gate), "게이트 호출부의 재개 서술자가 사라졌다: " + item.gate);
  });
}

/* 서버 왕복이 있는 3종 — 위 4종과 달리 "로컬 해금 표식"만으로는 안 열린다.
   결제 증빙을 정상 경로와 같은 조립기에 먹여 같은 코어를 태우는지까지 본다. */
const SIBYL = fs.readFileSync(path.join(ROOT, "js", "sibyl-system.js"), "utf8");

const SERVER_CASES = [
  {
    label: "숙요 1년운",
    source: SUKUYO,
    kind: "sukuyo-yearly-fortune",
    gate: "resume: {\n        kind: SY_YEARLY_RESUME_KIND,",
    // 정상 경로와 재개 경로가 같은 코어를 쓴다(원칙 6 — 두 벌로 갈라지면 한쪽만 낡는다).
    sharedCore: "syCompleteSukuyoYearlyUnlock",
  },
  {
    label: "시빌라 도미네이터 리포트",
    source: SIBYL,
    kind: "sibyl-dominator-report",
    gate: "resume: { kind: SIBYL_RESUME_KIND, action: 'openSibylModal', args: {} }",
    sharedCore: "_generateDominatorReport",
  },
  {
    label: "숙요 AI 상담",
    source: SUKUYO,
    kind: "sukuyo-ai-prompt",
    gate: "resume: {\n          kind: SY_AI_PROMPT_RESUME_KIND,",
    sharedCore: "_syRunSukuyoPromptResumeCore",
  },
];

for (const item of SERVER_CASES) {
  test(item.label + ": 재개 kind '" + item.kind + "' 가 등록되고 게이트가 서술자를 넘긴다", () => {
    assert.ok(item.source.includes("'" + item.kind + "'"), "kind 상수 '" + item.kind + "' 가 사라졌다");
    assert.match(item.source, /registerPaidResumeHandler\(/, "재개 핸들러 등록이 사라졌다");
    // 🔴 여기가 빠지면 복귀 티켓에 resume 이 안 실려 결제 후 홈 화면에서 끝난다.
    assert.ok(item.source.includes(item.gate), "게이트 호출부의 재개 서술자가 사라졌다: " + item.kind);
  });

  test(item.label + ": 정상 경로와 재개가 같은 코어를 탄다", () => {
    const hits = item.source.split(item.sharedCore).length - 1;
    assert.ok(hits >= 3, "공유 코어 " + item.sharedCore + " 의 정의 또는 호출부가 갈라졌다 (발견 " + hits + "회)");
  });
}

test("시빌라 재개 실패는 환불 경로를 태우지 않는다", () => {
  // 🔴 환불을 걸면 결제는 돌려주고 리포트도 없는 상태가 된다 — 재개 실패는 조용히 false 여야 한다.
  const start = SIBYL.indexOf("function _sibylRunDominatorResume");
  const end = SIBYL.indexOf("async function _runSibylCoinGate");
  assert.ok(start > 0 && end > start, "시빌라 재개 핸들러를 찾지 못했다");
  const block = SIBYL.slice(start, end);
  // 주석은 이 함수를 이름으로 언급하므로 '호출'만 본다(여는 괄호까지 매칭).
  assert.ok(!/_requestSibylRefund\(/.test(block), "재개 핸들러가 환불을 호출하고 있다");
  assert.match(block, /return false;/, "실패 시 false 반환이 사라졌다");
});

test("숙요 AI 상담 재개 코어는 결제 게이트를 다시 열지 않는다", () => {
  const start = SUKUYO.indexOf("window._syRunSukuyoPromptResumeCore = function");
  assert.ok(start > 0, "AI 상담 재개 코어를 찾지 못했다");
  const block = SUKUYO.slice(start, start + 2000);
  assert.ok(!/syPromptGate\(/.test(block), "재개 코어가 결제 게이트를 다시 열고 있다");
  // 기존 '재결제 없는 재시도' 저장소를 그대로 재사용해야 게이트를 건너뛴다.
  assert.match(block, /paidEvidenceStore\.set\(/, "복귀 증빙 보관이 사라졌다 — 게이트를 다시 타게 된다");
});

test("숙요 재개 핸들러는 표면을 스스로 열지 않는다 (여는 책임은 runPaidResume 하나)", () => {
  // 핸들러가 모달을 또 열면 이중 오버레이가 되고 재개가 자기 화면을 덮는다.
  const start = SUKUYO.indexOf("function syRunUnlockResume");
  const end = SUKUYO.indexOf("})();", SUKUYO.indexOf("function syRegisterUnlockResumeHandlers"));
  assert.ok(start > 0 && end > start, "재개 블록을 찾지 못했다");
  const block = SUKUYO.slice(start, end);
  assert.ok(!/\bopenSukuyoModal\(|\bcdSajuTabEntry\(/.test(block), "핸들러가 표면을 직접 열고 있다");
});

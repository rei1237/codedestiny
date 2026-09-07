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

test("숙요 재개 핸들러는 표면을 스스로 열지 않는다 (여는 책임은 runPaidResume 하나)", () => {
  // 핸들러가 모달을 또 열면 이중 오버레이가 되고 재개가 자기 화면을 덮는다.
  const start = SUKUYO.indexOf("function syRunUnlockResume");
  const end = SUKUYO.indexOf("})();", SUKUYO.indexOf("function syRegisterUnlockResumeHandlers"));
  assert.ok(start > 0 && end > start, "재개 블록을 찾지 못했다");
  const block = SUKUYO.slice(start, end);
  assert.ok(!/\bopenSukuyoModal\(|\bcdSajuTabEntry\(/.test(block), "핸들러가 표면을 직접 열고 있다");
});

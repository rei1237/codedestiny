/**
 * @jest-environment node
 *
 * 결제 V2 컷오버를 우회하는 레거시 별칭이 되살아나는 것을 막는 가드.
 *
 * 경위: `/api/payment/*` 와 `/api/checkout/*` 는 경로를 `/api/payments/*` 로 재작성한 뒤
 * handlePaymentRoutes 를 **직접** 불렀다. 그런데 V2 컷오버 훅은 `/api/payments` 블록 안에
 * 있어서, 이 두 별칭으로 들어온 prepare·confirm·webhook 은 훅을 건너뛰고 구 핸들러가 답했다.
 * 구 핸들러에는 컷오버가 없애려던 결함(reprice 없는 하드 409 · CAS 패배 503)이 그대로 남아 있다.
 * 같은 종류의 사고를 웹훅 별칭에서 이미 한 번 겪었고, 그 자국이 worker/index.js 의
 * `/api/webhooks/portone` 블록 주석이다("아래 /api/payments 블록에만 컷오버 훅을 두면
 * 웹훅 트래픽 전부가 훅을 우회해 구 핸들러로 간다").
 *
 * 두 별칭은 호출자가 0 이라 삭제했다(웹·정적 셸·js 번들·Capacitor 앱 전수 확인).
 * 되살리려면 별칭이 아니라 V2 훅 뒤로 배선해야 한다 — 그래서 이 가드는 "경로가 없어야 한다"가
 * 아니라 "구 핸들러로 직행하면 안 된다"를 검사한다.
 */

import fs from "node:fs";
import path from "node:path";

const workerIndexSource = fs.readFileSync(
  path.join(process.cwd(), "worker/index.js"),
  "utf8",
);

// 🔴 주석을 걷어내지 않고 원문에 그대로 건다. 이 라우터는 URL 패턴과 정규식이 빽빽해
// `/* … */` 스트리퍼가 엉뚱한 지점부터 삼켜 살아 있는 블록을 지워버린다(실제로 웹훅 블록이
// 통째로 사라져 단언이 오탐했다). 대신 아래 패턴을 **코드 형태 그대로** 좁게 잡아, 경로를
// 산문으로 언급하는 주석과는 매칭되지 않게 한다.
const routerCode = workerIndexSource;

describe("레거시 결제 별칭이 V2 컷오버를 우회하지 않는다", () => {
  test("단수 /api/payment 네임스페이스 분기가 없다", () => {
    expect(routerCode).not.toMatch(/url\.pathname\.startsWith\("\/api\/payment\/"\)/);
    expect(routerCode).not.toMatch(/replace\("\/api\/payment",\s*"\/api\/payments"\)/);
  });

  test("/api/checkout 네임스페이스 분기가 없다", () => {
    expect(routerCode).not.toMatch(/url\.pathname\.startsWith\("\/api\/checkout\/"\)/);
    expect(routerCode).not.toMatch(/replace\("\/api\/checkout",\s*"\/api\/payments"\)/);
  });

  test("컷오버된 진입점은 그대로 살아 있다", () => {
    // 삭제 범위가 번져 실제 트래픽 경로까지 지우면 안 된다.
    expect(routerCode).toMatch(/url\.pathname === "\/api\/webhooks\/portone"/);
    expect(routerCode).toMatch(/url\.pathname\.startsWith\("\/api\/payments\/"\)/);
    expect(routerCode).toMatch(/url\.pathname\.startsWith\("\/api\/billing\/"\)/);
  });

  // /api/payments/confirm 은 2026-09-06 에 V2 로 넘어갔다. 훅이 구 핸들러 폴스루보다 **뒤**로 밀리면
  // 조건은 그대로인데 트래픽만 조용히 구 handleConfirm 으로 돌아간다 — 그래서 순서까지 고정한다.
  test("/api/payments/confirm 은 구 핸들러 폴스루보다 먼저 V2 로 간다", () => {
    const hookAt = routerCode.indexOf(String.raw`url.pathname === "/api/payments/confirm"`);
    const fallthroughAt = routerCode.indexOf("await handlePaymentRoutes(request, env, ctx)");
    expect(hookAt).toBeGreaterThan(-1);
    expect(fallthroughAt).toBeGreaterThan(-1);
    expect(hookAt).toBeLessThan(fallthroughAt);
  });
});

/**
 * 영냥이 결제창(app/checkout/CheckoutClient.tsx)의 SoulCat 모드 계약을 고정한다.
 *
 * 실사고(2026-09-16, 커밋 3fb6ab057): 이 파일에 `requestId` 렌더 게이트가 추가되면서 SoulCat
 * (featureKey+returnTo만, requestId 없음)에서 오는 모든 결제 세션이 결제 폼 자체를 못 보게 됐다 —
 * "결제가 안 된" 게 아니라 버튼조차 뜨지 않았다. 옛 가드 문구가 되돌아오면 같은 회귀가 재발한다.
 *
 * 이 저장소 Jest 는 TS/JSX 프리셋이 없어 이 파일을 실제로 렌더할 수 없다(jest.config.cjs 참고) —
 * 그래서 이름 grep 이 아니라 함수 본문을 중괄호 균형으로 잘라 내 정규식으로 검증한다(원칙 6).
 *
 * CheckoutClient.tsx 는 CRLF 로 저장돼 있다(.gitattributes 가 *.tsx 를 다루지 않는다) — 마커 비교
 * 전에 LF 로 정규화해 이 파일 자체의 줄바꿈 문자와 무관하게 비교한다.
 */
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const SOURCE = path.join(__dirname, "..", "..", "app", "checkout", "CheckoutClient.tsx");

async function slicer() {
  const { sliceFunction } = await import("../../scripts/lib/js-source-slice.mjs");
  return sliceFunction;
}

function readSource() {
  return fs.readFileSync(SOURCE, "utf8").replace(/\r\n/g, "\n");
}

test("isSoulCatMode 파생값이 requestId 부재로 정의된다", () => {
  const source = readSource();
  assert.match(
    source,
    /const isSoulCatMode\s*=\s*!params\.requestId;/,
    "isSoulCatMode 정의가 없다 — SoulCat/CD 내부 분기의 기준값이 사라졌다.",
  );
});

test("🔴 렌더 게이트가 requestId 를 다시 요구하지 않는다", () => {
  const source = readSource();
  assert.ok(
    !/\{!pricing\s*\|\|\s*!product\s*\|\|\s*!params\.requestId/.test(source),
    "렌더 게이트가 requestId 를 다시 요구한다 — SoulCat 결제 폼이 다시 숨는다(2026-09-16 회귀 재발).",
  );
  assert.match(
    source,
    /\{!pricing\s*\|\|\s*!product\s*\?\s*\(/,
    "렌더 게이트가 pricing/product 기준으로 분기하는 형태 자체가 사라졌다.",
  );
});

test("🔴 startPayment 진입 가드가 requestId 를 다시 요구하지 않는다", () => {
  const source = readSource();
  assert.ok(
    !/!pricing\s*\|\|\s*!available\s*\|\|\s*!params\.requestId/.test(source),
    "startPayment 가드가 requestId 를 다시 요구한다 — SoulCat 결제 시작이 다시 막힌다.",
  );
});

test("available/checked effect: SoulCat 모드가 fortuneApi 호출보다 먼저 판정된다", async () => {
  const sliceFunction = await slicer();
  const source = readSource();
  const body = sliceFunction(source, "  useEffect(()=>{", "available/checked effect");
  const modeIndex = body.indexOf("isSoulCatMode");
  // fortuneApi<{...}>(...) — 제네릭 타입 인자가 이름과 여는 괄호 사이에 끼어 있어 "fortuneApi(" 는
  // 리터럴로 안 나온다. 이름만으로 첫 호출 지점을 찾는다.
  const apiIndex = body.indexOf("fortuneApi");
  assert.ok(modeIndex >= 0, "available/checked effect 본문에 isSoulCatMode 분기가 없다.");
  assert.ok(apiIndex >= 0, "available/checked effect 본문에서 fortuneApi 호출을 찾지 못했다(마커/본문 확인 필요).");
  assert.ok(
    modeIndex < apiIndex,
    "isSoulCatMode 판정이 fortuneApi 호출보다 뒤에 있다 — SoulCat 세션이 존재하지 않는 CD 상담 레코드를 조회하게 된다.",
  );
});

test("startPayment: SoulCat 모드는 웹훅 선확인(activate)을 스킵하고 requestId 를 다르게 채번한다", async () => {
  const sliceFunction = await slicer();
  const source = readSource();
  const body = sliceFunction(source, "  const startPayment = useCallback(async () => {", "startPayment");
  assert.match(
    body,
    /if\s*\(!isSoulCatMode\)\s*\{/,
    "startPayment 본문에 SoulCat 모드 스킵 분기가 없다 — 웹훅 선확인이 존재하지 않는 레코드를 조회해 결제가 깨진다.",
  );
  assert.match(
    body,
    /requestId\s*=\s*isSoulCatMode/,
    "requestId 채번이 isSoulCatMode 로 분기하지 않는다.",
  );
});

test("🔴 모바일 PG 복귀 effect 는 requestId 를 요구하지 않는다", async () => {
  const sliceFunction = await slicer();
  const source = readSource();
  const body = sliceFunction(
    source,
    "  useEffect(() => {\n    const query = new URLSearchParams(window.location.search);",
    "모바일 PG 복귀 eager-warm effect",
  );
  assert.ok(
    !/params\.requestId/.test(body),
    "모바일 PG 복귀 effect 가 requestId 를 요구한다 — SoulCat 결제 후 모바일 복귀가 멈춘다(7ab9c152b 류 재발).",
  );
});

test("🔴 결제 이탈 링크: CD 내부 모드는 결제 성공 뒤 주소를 쓰지 않고 SoulCat 모드는 직전 화면(returnTo)을 쓴다", () => {
  const source = readSource();
  // CD 내부 모드의 returnTo 는 결제 "성공" 뒤 이동 주소(미결제면 "0 / N개 챕터 저장됨" 결과 화면)다.
  // 이탈 링크가 그걸 쓰면 결제를 그만둔 사용자가 미결제 결과 화면으로 떨어진다(2026-09-26 사용자 제보).
  assert.match(
    source,
    /const leaveHref\s*=\s*isSoulCatMode\s*\?\s*params\.returnTo\s*:\s*DEFAULT_RETURN_TO;/,
    "← 영냥이 방 링크가 CD 내부 모드에서 params.returnTo(미결제 결과 화면)로 다시 연결됐다.",
  );
  assert.match(
    source,
    /const chooseHref\s*=\s*isSoulCatMode\s*\?\s*params\.returnTo\s*:\s*FISH_CHOOSER_PATH;/,
    "생선 다시 고르기 링크가 CD 내부 모드에서 params.returnTo 로 다시 연결됐다.",
  );
  assert.match(source, /<a href=\{leaveHref\}/, "← 영냥이 방 링크가 leaveHref 를 쓰지 않는다.");
  assert.match(source, /<a href=\{chooseHref\}/, "생선 다시 고르기 링크가 chooseHref 를 쓰지 않는다.");
  assert.ok(!/<a href=\{params\.returnTo\}/.test(source), "이탈 링크가 params.returnTo 를 직접 쓴다.");
});

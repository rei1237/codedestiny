// 인생의 책 UX 계약 — 소스 정적 검사.
//
// 여기서 지키는 것은 "돈이 새거나 사용자가 dead-end 에 갇히는" 계약 4가지다.
// 런타임 테스트로 잡기 어렵거나(문구·aria), 잡혔을 땐 이미 늦은 것(이중 결제)들이라 소스에 핀을 박는다.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
// 주석에 든 설명 문구가 단언을 오탐시키지 않게 걷어낸다.
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** JSX 여는 태그를 뽑는다. 화살표 함수(=>)의 '>' 에서 잘리지 않도록 직접 스캔한다. */
function openingTags(source, tagName) {
  const tags = [];
  let cursor = source.indexOf(`<${tagName}`);
  while (cursor >= 0) {
    let depth = 0;
    let index = cursor;
    for (; index < source.length; index += 1) {
      const char = source[index];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      else if (char === ">" && depth === 0 && source[index - 1] !== "=") break;
    }
    tags.push(source.slice(cursor, index + 1));
    cursor = source.indexOf(`<${tagName}`, index + 1);
  }
  return tags;
}

const client = read("app/life-book-ai/LifeBookAiClient.tsx");
const api = read("app/life-book-ai/lifeBookApi.ts");
const copy = read("app/life-book-ai/lifeBookCopy.ts");
const resultClient = read("app/life-book-ai/result/LifeBookAiResultClient.tsx");
const typewriter = read("app/life-book-ai/result/useTypewriter.ts");
const dock = read("app/life-book-ai/result/_components/ResultActionDock.tsx");
const cover = read("app/life-book-ai/result/_components/BookOpenCover.tsx");

test("재시도 멱등키 계약은 실제 생성 루프로 검증한다", () => {
  const { spawnSync } = require("node:child_process");
  const run = spawnSync(process.execPath, ["--test", "--test-name-pattern=실제 클라이언트", "__tests__/ui/life-book-paid-delivery.behavior.test.js"], { cwd: root, encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});

test("확정 실패는 재시도 대상에서 제외된다", () => {
  for (const reason of ["GENERATION_ALREADY_FAILED", "LLM_ERROR", "PAYMENT_VERIFY_FAILED", "LOGIN_REQUIRED", "INVALID_INPUT"]) {
    assert.ok(api.includes(`"${reason}"`), `${reason} 이 확정 실패 목록에 있어야 한다`);
  }
});

test("결과 폴링의 확정 실패 화이트리스트는 3개뿐이고 일시 장애를 포함하지 않는다", () => {
  const start = resultClient.indexOf("const TERMINAL_RESULT_REASONS");
  const end = resultClient.indexOf("]);", start);
  assert.ok(start >= 0 && end > start, "TERMINAL_RESULT_REASONS 를 찾지 못했다");
  const block = resultClient.slice(start, end);
  for (const reason of ["GENERATION_STALLED", "LLM_ERROR", "GENERATION_ALREADY_FAILED"]) {
    assert.ok(block.includes(reason), `${reason} 은 확정 실패여야 한다`);
  }
  // 🔴 자가 복구 가능한 일시 장애를 여기 넣으면 블립 한 번이 하드 실패로 굳는다.
  for (const transient of ["DB_DEGRADED", "AUTH_REFRESH_TEMPORARY_FAILURE", "ACCESS_CHECK_DEGRADED", "PASS_CHECK_BUDGET_EXCEEDED"]) {
    assert.ok(!block.includes(transient), `${transient} 는 일시 장애이므로 확정 실패에 넣으면 안 된다`);
  }
});

test("타이프라이터는 잘린 텍스트를 aria-live 에 넣지 않는다", () => {
  // 잘린 텍스트를 aria-live 에 두면 스크린리더가 같은 문장을 수십 번 반복해 사용이 불가능해진다.
  assert.ok(!stripComments(typewriter).includes("aria-live"), "훅에는 aria-live 가 없어야 한다");
  const proseStart = resultClient.indexOf("function ChapterProse");
  const proseEnd = resultClient.indexOf("function LifeBookResultContent");
  const prose = resultClient.slice(proseStart, proseEnd);
  assert.ok(proseStart >= 0 && proseEnd > proseStart, "ChapterProse 를 찾지 못했다");
  assert.ok(!stripComments(prose).includes("aria-live"), "타이프라이터 출력에 aria-live 를 걸면 안 된다");
  assert.ok(prose.includes('aria-hidden="true"'), "시각 연출은 aria-hidden 이어야 한다");
  assert.ok(prose.includes('className="sr-only"'), "스크린리더에는 전문을 한 번만 줘야 한다");
});

test("집필 대기 화면은 공용 GenerationProgress 로 실제 웨이브 진행만 보여 준다", () => {
  // 막대·aria-live·경과 시간 규칙은 공용 컴포넌트가 지킨다(generation-progress.behavior 테스트).
  const start = client.indexOf("<GenerationProgress");
  assert.ok(start >= 0, "GenerationProgress 를 찾지 못했다");
  const block = client.slice(start, client.indexOf("/>", start));
  assert.match(block, /completed=\{status === "generating" \? waveProgress\?\.completed : null\}/, "완성 수는 서버 progress 로만");
  assert.match(block, /total=\{status === "generating" \? waveProgress\?\.total : null\}/, "전체 수는 서버 progress 로만");
  assert.match(block, /timing=\{status === "generating"\}/, "경과 시간은 집필 중에만 센다");
  assert.ok(!client.includes('role="progressbar"'), "자체 진행 막대를 다시 그리면 안 된다");
  assert.doesNotMatch(stripComments(client), /elapsedMs|Math\.exp\(|\{progress\}%/, "경과 시간으로 만든 가짜 진행률이 없어야 한다");
});

test("아이콘 전용 버튼에는 aria-label 이 있다", () => {
  for (const [label, source] of [["액션독", dock], ["표지", cover]]) {
    const buttons = openingTags(source, "button");
    assert.ok(buttons.length > 0, `${label}: 버튼을 찾지 못했다`);
    for (const button of buttons) {
      assert.ok(button.includes("aria-label"), `${label}: aria-label 없는 버튼이 있다 — ${button.slice(0, 80)}`);
    }
  }
});

test("사용자에게 보이는 문구에 개발자 문자열이 없다", () => {
  // 세계관 문구 정본에 Error/Failed 류가 섞이면 그대로 화면에 뜬다.
  assert.ok(!/["'][^"']*\b(Error|Failed|undefined|null)\b[^"']*["']/.test(
    copy.replace(/^\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""),
  ), "문구 정본에 개발자 문자열이 섞였다");
  assert.ok(copy.includes("잠시 운명의 잉크가 번졌습니다."), "실패 문구는 세계관 문구여야 한다");
  assert.ok(copy.includes("다시 한 번 이야기를 이어가겠습니다."), "재시도 문구는 세계관 문구여야 한다");
});

test("결과는 새 창이 아니라 같은 탭에서 연다", () => {
  // 새 문서는 게이트 오버레이·세션 캐시를 인계받지 못하고, 팝업이 막히면 결제만 되고 화면이 비었다.
  assert.ok(!client.includes("window.open("), "life-book 클라는 팝업을 열지 않는다");
  assert.ok(client.includes("router.push("), "같은 탭 라우팅을 써야 한다");
});

test("공유 카드에는 생년월일을 넣지 않는다", () => {
  const shareEditor = read("components/fortune/PremiumResultShare.tsx");
  const cardStart = shareEditor.indexOf('<div ref={card}');
  const cardEnd = shareEditor.indexOf("</figure>", cardStart);
  assert.ok(cardStart >= 0, "공유 카드를 찾지 못했다");
  const card = shareEditor.slice(cardStart, cardEnd);
  assert.ok(!card.includes("birth.birthDate"), "공유 이미지에 생년월일이 들어가면 안 된다");
  assert.ok(!card.includes("birthTime"), "공유 이미지에 출생시간이 들어가면 안 된다");
  assert.ok(shareEditor.includes('useState(false)'), "이름 표시의 기본값은 숨김이어야 한다");
});

// 2026-11-19 다시 시도 우선(R3): 확정 실패에 서버가 무료 다시 시도를 열면 새 결제·새 책 대신 같은 결제 건 이어쓰기와 환불 요청만 보인다.
test("다시 시도 가능한 실패는 추가 결제 없는 다시 시도와 환불 요청을 보여 주고 새 책(새 결제)으로 보내지 않는다", () => {
  const copySource = read("app/life-book-ai/lifeBookCopy.ts");
  assert.match(copySource, /retryFreeLabel: "[^"]*추가 결제·차감 없음[^"]*"/);
  assert.doesNotMatch(copySource, /retry\w*: "[^"]*\d+\s*일/, "다시 시도 문구가 환불 기한 일수를 약속하면 안 된다");
  const api = stripComments(read("app/life-book-ai/lifeBookApi.ts"));
  assert.ok(api.includes('"/api/life-book-ai/retry"') && api.includes('"/api/life-book-ai/refund-request"'));
  assert.ok(api.includes("retry.available !== true"), "retry.available 이 true 일 때만 다시 시도를 연다");
  for (const file of ["app/life-book-ai/LifeBookAiClient.tsx", "app/life-book-ai/result/LifeBookAiResultClient.tsx"]) {
    const source = stripComments(read(file));
    assert.ok(source.includes("FAILURE_COPY.retryFreeLabel") && source.includes("FAILURE_COPY.refundRequestLabel"), file);
    assert.ok(source.includes("requestLifeBookRetry(offer.sessionId)") && source.includes("requestLifeBookRefund(offer.sessionId)"), file);
  }
  const result = stripComments(read("app/life-book-ai/result/LifeBookAiResultClient.tsx"));
  const offerAt = result.indexOf("{retryOffer ? (");
  assert.ok(offerAt >= 0 && result.indexOf('<Link href="/life-book-ai"', offerAt) > result.indexOf(") : (", offerAt), "새 책 링크는 다시 시도가 없을 때만 보인다");
});

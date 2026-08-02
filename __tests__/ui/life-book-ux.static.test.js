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

test("재시도가 idempotencyKey 를 새로 만들지 않는다 (이중 결제 차단)", () => {
  // 🔴 워커의 unique index 와 웨이브 락이 중복 생성·중복 차감을 막는 근거가 이 키다.
  //    웨이브 루프 안에서 키를 새로 만들면 매 재시도가 새 결제가 된다.
  const loopStart = client.indexOf("const runGeneration = useCallback(");
  const loopEnd = client.indexOf("const submit = useCallback(");
  assert.ok(loopStart >= 0 && loopEnd > loopStart, "runGeneration 을 찾지 못했다");
  const loopBody = client.slice(loopStart, loopEnd);
  assert.ok(!loopBody.includes("createIdempotencyKey("), "웨이브 루프 안에서 새 멱등키를 만들면 안 된다");
  assert.ok(loopBody.includes("runGenerateWave(payload, idempotencyKey, access"), "웨이브는 넘겨받은 키를 그대로 써야 한다");

  const waveStart = api.indexOf("export async function runGenerateWave");
  assert.ok(waveStart >= 0, "runGenerateWave 를 찾지 못했다");
  const waveBody = api.slice(waveStart);
  assert.ok(!/randomUUID|Date\.now\(\)\s*\+/.test(waveBody), "재시도 경로에서 키를 새로 만들면 안 된다");
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

test("진행률 숫자는 aria-live 로 읽히지 않는다", () => {
  const barStart = client.indexOf('role="progressbar"');
  assert.ok(barStart >= 0, "progressbar 를 찾지 못했다");
  const bar = client.slice(barStart, barStart + 900);
  assert.ok(bar.includes("aria-valuenow"), "aria-valuenow 가 있어야 한다");
  assert.ok(bar.includes("aria-valuetext"), "aria-valuetext 로 단계 문구를 줘야 한다");
  assert.ok(/\{progress\}%[\s\S]{0,40}<\/span>/.test(bar) === false || bar.includes('aria-hidden="true"'),
    "퍼센트 숫자는 aria-hidden 이어야 한다");
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
  const cardStart = resultClient.indexOf('id="life-book-share-card"');
  const cardEnd = resultClient.indexOf("</div>", resultClient.indexOf("shareOwner"));
  assert.ok(cardStart >= 0, "공유 카드를 찾지 못했다");
  const card = resultClient.slice(cardStart, cardEnd);
  assert.ok(!card.includes("birth.birthDate"), "공유 이미지에 생년월일이 들어가면 안 된다");
  assert.ok(!card.includes("birthTime"), "공유 이미지에 출생시간이 들어가면 안 된다");
});

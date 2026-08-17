const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Yeoni chat keeps a unified character choice and neutral usage label", () => {
  const client = read("app/fortune-chat/FortuneChatClient.tsx");

  assert.doesNotMatch(client, /매일 초기화되지/);
  assert.doesNotMatch(client, /계정당 총 3회/);
  assert.match(client, /type Character = "yeoni" \| "neo"/);
  assert.doesNotMatch(client, /\["flower_pig", "yeoni", "neo"\]/);
  assert.match(client, /usage\.dailyFreeRemaining/);
  assert.match(client, /무료 상담/);
});

test("suggested questions are offered, never typed into the box for the user", () => {
  // 주제 칩이 입력창을 곧바로 덮어써서, 고른 적 없는 문장이 질문으로 나갔다.
  // 이제 주제 칩은 주제만 고르고, 추천 질문은 사용자가 누른 것만 들어간다.
  const client = read("app/fortune-chat/FortuneChatClient.tsx");

  assert.match(client, /const SUGGESTED_QUESTIONS: Record<string, string\[\]>/);
  const selectTopic = client.slice(client.indexOf("const selectTopic"), client.indexOf("const editBirth"));
  assert.doesNotMatch(selectTopic, /setQuestion/);
  assert.match(client, /suggestions\.items\.map/);
});

test("a failed send rolls its own bubble back and keeps the question typed", () => {
  // 실패해도 말풍선이 남고 입력창도 안 비워져, 재시도할 때마다 같은 질문이 하나씩 쌓였다.
  const client = read("app/fortune-chat/FortuneChatClient.tsx");

  assert.match(client, /let delivered = false/);
  assert.match(client, /if \(!delivered\) setMessages/);
  assert.match(client, /item\.id !== userMessageId/);
  // 서버가 흘리는 영문 원문(공용 DB 핸들러의 503)을 그대로 렌더하지 않는다.
  assert.match(client, /function friendlyError/);
  assert.doesNotMatch(client, /attempt\.payload\?\.message \|\| "/);
});

test("both personas render from their own expression sheet", () => {
  // 아바타는 장식이 아니라 누가 답하는지를 알려주는 신호다. 두 시트가 모두 걸려 있어야
  // 네오로 바꿔도 꽃돼지가 남아 있는 사고가 나지 않는다.
  const sprite = read("app/fortune-chat/personaSprite.ts");
  const builder = read("scripts/build-persona-avatar-assets.mjs");

  // 🔴 CSS 스프라이트를 그만뒀다. 꽃돼지 시트는 셀이 264×372(세로형)인데 아바타는 정사각이라
  //    `background-size: 400% 400%` 가 캐릭터를 세로 71% 로 눌렀다. 이제 미리 잘라 쓴다.
  assert.doesNotMatch(sprite, /backgroundSize|personaSpriteStyle/);
  assert.match(sprite, /\/images\/fortune-chat\/persona\//);
  // 백사자 좌표는 정확한 4등분이 아니라 손으로 맞춘 값이라 크롭 스크립트가 정본이다.
  assert.match(builder, /2\.306, 97\.065/);
  // 원본 시트는 public 에 있어야 한다. R2 직결은 핫링크 보호로 로컬에서 403 이 난다.
  for (const sheet of ["public/images/novel/pig-expressions.webp", "public/images/novel/neo-strategy-sheet.webp"]) {
    assert.ok(fs.existsSync(path.join(root, sheet)), `missing sprite sheet: ${sheet}`);
  }
  // 잘라 둔 표정 10컷이 실제로 있어야 한다(빌드 산출물을 커밋한다).
  for (const persona of ["yeoni", "neo"]) {
    for (const mood of ["greet", "listen", "read", "think", "cheer"]) {
      const cut = `public/images/fortune-chat/persona/${persona}-${mood}.webp`;
      assert.ok(fs.existsSync(path.join(root, cut)), `missing persona cut: ${cut}`);
    }
  }

  const client = read("app/fortune-chat/FortuneChatClient.tsx");
  assert.match(client, /PersonaAvatar/);
  assert.match(client, /persona=\{character\}/);
});

test("the chat surface themes from design tokens, not a private palette", () => {
  const css = read("app/fortune-chat/fortune-chat.module.css");

  // 색은 styles/theme-tokens.css 에서 온다. 여기서 팔레트를 다시 정의하면 드리프트다.
  assert.match(css, /--ink: var\(--cd-text/);
  assert.match(css, /--rose: var\(--cd-accent/);
  // 네오는 표면·텍스트·강조색을 한 세트로 바꾼다(반쪽 오버라이드 금지).
  assert.match(css, /\.room\[data-character="neo"\]/);
  // grid 열을 못 박지 않으면 암묵 열이 max-content 라 모바일에서 가로로 밀린다.
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  // 한국어 제목은 어절 중간에서 끊으면 안 된다.
  assert.match(css, /word-break: keep-all/);
});

test("flower pig chat hands an existing session to the real Fusion Fortune route", () => {
  const client = read("app/fortune-chat/FortuneChatClient.tsx");
  const home = read("index.html");

  assert.match(client, /\/fusion-fortune\?fortuneChatSession=/);
  assert.match(client, /초융합 심층 리딩 이어가기/);
  assert.match(home, /fortune-gateway__door--fusion"(?: style="[^"]*")? href="\/fusion-fortune\/"/);
});

test("Yeoni chat sends everything the server requires to build a reading", () => {
  // 이 화면은 birthDate·category 를 빼고 보내서 매 요청이 400 INVALID_INPUT 으로 죽어 있었다.
  // 서버는 둘 다 필수로 검증한다(worker/lib/guardian-fortune-context.js).
  const client = read("app/fortune-chat/FortuneChatClient.tsx");

  assert.match(client, /birthDate: birth\.birthDate/);
  assert.match(client, /category: activeCategory/);
  assert.match(client, /calendarType: birth\.calendarType/);
  assert.match(client, /gender: birth\.gender/);
  // 고민 원문은 서버가 120자로 자른다. 넘겨 보내면 400 이다.
  assert.match(client, /CONCERN_MAX_LENGTH = 120/);
  // 생년 정보는 공용 훅으로만 채운다 — 조회 로직을 새로 만들지 않는다.
  assert.match(client, /useAiProfileSeed/);
});

test("Yeoni chat charges through the shared coin gate with a matching request id", () => {
  const client = read("app/fortune-chat/FortuneChatClient.tsx");

  assert.match(client, /useCoinGate/);
  assert.match(client, /featureKey: PAID_FEATURE_KEY/);
  assert.match(client, /PAID_FEATURE_KEY = "fortune-chat-consultation"/);
  // 결제 게이트와 생성 요청이 같은 requestId 를 써야 서버가 증빙을 찾는다.
  assert.match(client, /openPaymentGate\(requestId\)/);
  assert.match(client, /requestReading\(requestId, concern\)/);
  // 폐지된 전용 재화로 되돌아가지 않는다.
  assert.doesNotMatch(client, /대화권/);
  assert.doesNotMatch(client, /conversationCreditsRemaining/);
  // 결제창은 공용 게이트가 연다 — /points 로 보내면 이용권 카드를 잃는다.
  assert.doesNotMatch(client, /"\/points/);
});

test("dev refresh keeps shared UMD billing boundaries out of ESM-only HMR output", () => {
  const nextConfig = read("next.config.mjs");

  assert.match(nextConfig, /LEGACY_SHARED_BROWSER_MODULE/);
  assert.match(nextConfig, /checkout-entry\|pass-verdict\|payment-service/);
  assert.match(nextConfig, /name\.includes\("react-refresh"\)/);
  assert.match(nextConfig, /visitWebpackRules\(config\.module\?\.rules\)/);
});

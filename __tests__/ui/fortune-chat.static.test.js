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

test("both personas render from their own expression sheet", () => {
  // 아바타는 장식이 아니라 누가 답하는지를 알려주는 신호다. 두 시트가 모두 걸려 있어야
  // 네오로 바꿔도 꽃돼지가 남아 있는 사고가 나지 않는다.
  const sprite = read("app/fortune-chat/personaSprite.ts");

  assert.match(sprite, /pig-expressions\.webp/);
  assert.match(sprite, /neo-strategy-sheet\.webp/);
  // 두 시트 모두 public 에 있어야 한다. R2 직결은 핫링크 보호로 로컬에서 403 이 난다.
  for (const sheet of ["public/images/novel/pig-expressions.webp", "public/images/novel/neo-strategy-sheet.webp"]) {
    assert.ok(fs.existsSync(path.join(root, sheet)), `missing sprite sheet: ${sheet}`);
  }
  // 백사자 시트는 정확한 4등분이 아니라 손으로 맞춘 좌표다. 등분 계산으로 대체하면 얼굴이 잘린다.
  assert.match(sprite, /2\.306% 97\.065%/);
  assert.match(sprite, /PERSONA_SPRITE_SIZE = "400% 400%"/);

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
  assert.match(home, /href="\/fusion-fortune">초융합 심층 리딩 알아보기/);
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

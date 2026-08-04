const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("fusion fortune renders the first-come premium flow and optimized hero asset", () => {
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  assert.match(client, /선착순! 하루 100명/);
  assert.match(client, /성공 결과가 완성된 순서대로 자리가 확정돼요/);
  assert.match(client, /fusion-guardian-celestial-hero\.webp/);
  assert.match(client, /priority/);
  assert.ok(fs.existsSync(path.join(root, "public/images/fusion-fortune/fusion-guardian-celestial-hero.webp")));
});

test("fusion fortune keeps ticket purchase PG-only in the client flow", () => {
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  assert.match(client, /fusion_fortune_ticket_1/);
  assert.match(client, /paymentMethod: "pg"/);
  assert.match(client, /단건 결제로 구매하기/);
  assert.match(client, /일반 이용권·family 이용권·대화권과 별도/);
  assert.doesNotMatch(client, /paymentMethod:\s*"(?:pass|credit|family_pass)"/);
});

test("points shop fusion ticket waits for an explicit preview and never falls back to a client price", () => {
  const points = read("app/points/PointsClient.tsx");
  const start = points.indexOf("function FusionFortuneTicketShop");
  const end = points.indexOf("function MoonlightOrderHistory");
  const shop = points.slice(start, end);
  assert.match(shop, /api\/payments\/fusion-fortune\/shop-preview/);
  assert.doesNotMatch(shop, /api\/payments\/fusion-fortune\/(?:catalog|balance)/);
  assert.match(shop, /상담권 조회하기/);
  assert.doesNotMatch(shop, /useEffect\(\(\) => \{\s*void load\(\);/);
  assert.doesNotMatch(shop, /priceKRW\s*\|\|\s*10000/);
  assert.match(shop, /isFusionFortuneTicketProduct/);
  assert.match(shop, /tryAcquireShopTicketPreview\("fusion"\)/);
  assert.match(shop, /activeScopeRef\.current = authScope/);
  assert.match(shop, /activeScopeRef\.current !== requestScope/);
  assert.match(shop, /AbortController/);
  assert.match(shop, /signal: requestController\.signal/);
  assert.match(shop, /error\.name === "AbortError"/);
  assert.match(shop, /setIsEnabled\(null\);[\s\S]*setHasLoaded\(false\);[\s\S]*setRemaining\(null\);/);
  assert.match(shop, /isFusionFortuneTicketProduct\(payload\.product\)[\s\S]*setProduct\(payload\.product\)[\s\S]*setRemaining\(payload\.balance\.remaining\)/);
});

test("fusion fortune mobile UI covers compact widths and reduced motion", () => {
  const css = read("app/fusion-fortune/fusion-fortune.module.css");
  assert.match(css, /max-width:\s*760px/);
  assert.match(css, /max-width:\s*390px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*50px/);
  assert.match(css, /\.form fieldset label[\s\S]*?min-height:\s*44px/);
  assert.match(css, /content-visibility:\s*auto/);
});

test("fusion fortune consumes server-sent completion stages without changing its PG-only ticket flow", () => {
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  const css = read("app/fusion-fortune/fusion-fortune.module.css");
  assert.match(client, /fusion-fortune\/generate\/stream/);
  assert.match(client, /consumeFusionStream/);
  assert.match(client, /FUSION_STAGES/);
  assert.match(client, /Fusion Core 진행 방식 보기/);
  assert.match(client, /<dialog/);
  assert.match(client, /aria-expanded/);
  assert.match(client, /useAiProfileSeed/);
  assert.match(css, /stageActive/);
  assert.match(css, /content-visibility:\s*auto/);
});

test("fusion fortune production switches enable the approved live flow and keep mock off", () => {
  const wrangler = read("worker/wrangler.toml");
  for (const flag of [
    "ENABLE_FUSION_FORTUNE_UI",
    "ENABLE_FUSION_FORTUNE_API",
    "ENABLE_FUSION_FORTUNE_TICKET_SALES",
    "ENABLE_FUSION_FORTUNE_REAL_LLM",
    "ALLOW_FUSION_FORTUNE_REAL_LLM",
  ]) {
    assert.match(wrangler, new RegExp(`${flag}\\s*=\\s*"true"`));
  }
  assert.match(wrangler, /ENABLE_FUSION_FORTUNE_MOCK_FLOW\s*=\s*"false"/);
});

test("family shop copy explicitly excludes the dedicated fusion ticket", () => {
  const points = read("app/points/PointsClient.tsx");
  const html = read("index.html");
  assert.match(points, /초융합 제외 · 3만원 미만 무제한/);
  assert.match(points, /초융합 운세는 별도 상담권 필요/);
  assert.match(points, /Family도 초융합 운세는 별도 상담권이 필요/);
  assert.doesNotMatch(points, /모든 유료 서비스(?:를)? 이용/);
  assert.match(html, /초융합 제외 3만원 미만 기능 무제한/);
  assert.doesNotMatch(html, /모든 유료 서비스(?:를)? 이용/);
});

test("guardian free copy describes a maximum rather than a guaranteed grant", () => {
  const html = read("index.html");
  const home = read("js/guardian-fortune-home.js");
  assert.match(html, /로그인하면 하루 최대 3회까지/);
  assert.match(home, /로그인하고 하루 최대 3회 보기/);
  assert.doesNotMatch(home, /로그인하고 하루 3회 받기/);
  assert.doesNotMatch(home, /생시는 몰라도 괜찮아/);
});

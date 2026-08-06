const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Yeoni chat keeps a unified character choice and neutral usage label", () => {
  const client = read("app/fortune-chat/FortuneChatClient.tsx");

  assert.match(client, /DestinyCafe\/nobackground\/flower-pig-cutout\.webp/);
  assert.match(client, /flower-pig-honey-hug\.webp/);
  assert.doesNotMatch(client, /매일 초기화되지/);
  assert.doesNotMatch(client, /계정당 총 3회/);
  assert.match(client, /type Character = "yeoni" \| "neo"/);
  assert.doesNotMatch(client, /\["flower_pig", "yeoni", "neo"\]/);
  assert.match(client, /usage\.dailyFreeRemaining/);
  assert.match(client, /무료 상담/);
});

test("flower pig chat hands an existing session to the real Fusion Fortune route", () => {
  const client = read("app/fortune-chat/FortuneChatClient.tsx");
  const home = read("index.html");

  assert.match(client, /\/fusion-fortune\?fortuneChatSession=/);
  assert.match(client, /초융합 심층 리딩 이어가기/);
  assert.match(home, /href="\/fusion-fortune">초융합 심층 리딩 알아보기/);
});

test("dev refresh keeps shared UMD billing boundaries out of ESM-only HMR output", () => {
  const nextConfig = read("next.config.mjs");

  assert.match(nextConfig, /LEGACY_SHARED_BROWSER_MODULE/);
  assert.match(nextConfig, /checkout-entry\|pass-verdict\|payment-service/);
  assert.match(nextConfig, /name\.includes\("react-refresh"\)/);
  assert.match(nextConfig, /visitWebpackRules\(config\.module\?\.rules\)/);
});

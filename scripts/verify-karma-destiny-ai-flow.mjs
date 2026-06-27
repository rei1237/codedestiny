import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");

const indexSource = read("index.html");
const pageSource = read("app/karma-destiny-ai/page.tsx");
const workerIndexSource = read("worker/index.js");
const routeSource = read("worker/routes/karma-destiny-ai.js");
const modelSource = read("worker/lib/models.js");
const registrySource = read("worker/lib/paid-feature-registry.js");

function assertIncludes(source, needle, label) {
  assert.ok(source.includes(needle), `${label}: missing ${needle}`);
}

function assertNotIncludes(source, needle, label) {
  assert.ok(!source.includes(needle), `${label}: unexpected ${needle}`);
}

assertIncludes(indexSource, 'href="/karma-destiny-ai"', "main entry");
assertIncludes(indexSource, 'data-feature-key="karma-destiny-ai-consultation"', "main entry feature key");
assertIncludes(indexSource, "/fuctionassets/soul-origin-cover.webp", "image asset preserved");
assertIncludes(indexSource, "AI Consultation · 50,000원", "price marker");
assertNotIncludes(indexSource, "openSoulOriginModal", "legacy modal action removed");
assertNotIncludes(indexSource, "soulOriginModal", "legacy modal removed");
assertNotIncludes(indexSource, "/js/soul-origin-book.js", "legacy client script removed");
assertNotIncludes(indexSource, "premium_pdf_soul_origin", "legacy feature key removed from main shell");

assertIncludes(pageSource, "runBillingCoinGate", "common billing gate");
assertIncludes(pageSource, "/api/karma-destiny-ai/ensure-access", "ensure access API");
assertIncludes(pageSource, "/api/karma-destiny-ai/start", "start API");
assertIncludes(pageSource, "/api/karma-destiny-ai/message", "message API");
assertIncludes(pageSource, "운명의 기록을 펼치고 있습니다", "preparing copy");
assertIncludes(pageSource, "결제창을 확인해 주세요", "payment copy");
assertIncludes(pageSource, "삶의 반복 패턴과 업의 흐름을 읽고 있습니다", "reading copy");
assertNotIncludes(pageSource, "/api/soul-origin", "old API not called");
assertNotIncludes(pageSource, "prepare", "old prepare copy not present");
assertNotIncludes(pageSource, "create-job", "old create API not present");
assertNotIncludes(pageSource, "generate-mock", "old mock API not present");
assertNotIncludes(pageSource, "soChapter", "old section UI not present");

assertIncludes(workerIndexSource, "handleKarmaDestinyAiRoutes", "worker route handler wired");
assertIncludes(workerIndexSource, "/api/karma-destiny-ai", "worker dispatch wired");
assertIncludes(routeSource, "handleKarmaDestinyAiRoutes", "worker route exported");
assertIncludes(routeSource, "buildKarmaDestinyIntegratedResult", "calculation adapter wired");
assertIncludes(routeSource, "FEATURE_KEY = \"karma-destiny-ai-consultation\"", "feature key");
assertIncludes(routeSource, "PointHistory", "billing evidence verification");
assertIncludes(modelSource, "karmaDestinyAiConsultations", "new collection");
assertIncludes(modelSource, "KarmaDestinyAiConsultation", "model export");
assertIncludes(registrySource, "\"karma-destiny-ai-consultation\": { cost: 500, amountKRW: 50000", "pricing");

assert.ok(!existsSync(resolve(root, "js/soul-origin-book.js")), "legacy soul-origin client should be deleted");
assert.ok(!existsSync(resolve(root, "worker/lib/pdf-v2/soul-origin")), "legacy soul-origin service directory should be deleted");

const { handleSoulOriginRoutes } = await import(pathToFileURL(resolve(root, "worker/routes/soul-origin.js")).href);
const removedResponse = await handleSoulOriginRoutes(new Request("https://example.test/api/soul-origin/create-job", { method: "POST" }), {});
const removedJson = await removedResponse.json();
assert.equal(removedResponse.status, 410, "legacy soul-origin API should be disabled");
assert.equal(removedJson.next, "/karma-destiny-ai", "legacy API should point to new page");

const { handleKarmaDestinyAiRoutes } = await import(pathToFileURL(resolve(root, "worker/routes/karma-destiny-ai.js")).href);
const noLoginResponse = await handleKarmaDestinyAiRoutes(new Request("https://example.test/api/karma-destiny-ai/ensure-access", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Idempotency-Key": "verify-kdai-123456" },
  body: JSON.stringify({
    idempotencyKey: "verify-kdai-123456",
    birthInfo: {
      name: "테스트",
      gender: "female",
      birthDate: "1990-01-01",
      birthTime: "12:00",
      birthTimeUnknown: false,
      calendarType: "solar",
      birthPlace: {
        city: "Seoul",
        country: "South Korea",
        latitude: 37.5665,
        longitude: 126.978,
        timezone: "Asia/Seoul",
      },
    },
    topic: "전체 운명의 업",
    userQuestion: "반복되는 관계 흐름이 궁금합니다.",
  }),
}), {});
const noLoginJson = await noLoginResponse.json();
assert.equal(noLoginResponse.status, 401, "unauthenticated ensure-access should require login");
assert.equal(noLoginJson.reason, "LOGIN_REQUIRED", "unauthenticated reason");
assert.equal(noLoginJson.message, "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.", "login message");

console.log("[verify-karma-destiny-ai-flow] ok");

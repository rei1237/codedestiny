const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const home = read("index.html");
const registry = read("js/core/service-registry.js");

const quickSection = home.match(/id="cdQuickServices"[\s\S]*?<\/section>/)?.[0] || "";
assert.ok(quickSection, "홈 무료 바로 시작 섹션을 찾지 못했습니다");

const expectedQuickLinks = [
  'href="/saju/" data-action="cdOneStepFreeSajuEntry"',
  'href="/tarot/" data-cd-open-collection="tarotCollection"',
  'href="/ziwei/chart/" data-action="openZiweiModal"',
  'href="/sukuyo/" data-action="openSukuyoModal"',
  'href="/astrology/" data-action="openAstroModal"',
  'href="/vedic/" data-action="navigateToVedic"',
];
for (const link of expectedQuickLinks) assert.ok(quickSection.includes(link), `직접 기능 링크가 없습니다: ${link}`);
assert.doesNotMatch(quickSection, /openTarotModal/, 'home tarot opens the service library, not a card draw');
assert.deepEqual([...quickSection.matchAll(/data-cd-service-id="([^"]+)"/g)].map(m => m[1]), ['saju', 'ziwei', 'sukuyo', 'vedic', 'astrology', 'tarot']);
const template = read('templates/home-funnel.html');
assert.ok(template.indexOf('id="cdhQuickSlot"') < template.indexOf('id="cdhServices"'), 'methods precede search');
assert.ok(template.indexOf('id="cdhQuickSlot"') < template.indexOf('id="cdhMore"'), 'methods are outside the fold');

assert.doesNotMatch(quickSection, /href="[^"]*\?action=/, "crawler links must use real hubs while JS actions remain available");

for (const entry of [
  ['daily-fortune', '/today/', null],
  ['saju', '/?action=cdOneStepFreeSajuEntry', 'cdOneStepFreeSajuEntry'],
  ['tarot', '/index.html?action=openTarotModal', 'openTarotModal'],
  ['ziwei', '/ziwei/chart/', null],
  ['sukuyo', '/index.html?action=openSukuyoModal', 'openSukuyoModal'],
  ['vedic', '/index.html?action=navigateToVedic', null],
  ['astrology', '/index.html?action=openAstroModal', 'openAstroModal'],
]) {
  const [id, href, action] = entry;
  const entryPattern = new RegExp(`id: "${id}"[\\s\\S]*?\\n  },`);
  const sourceEntry = registry.match(entryPattern)?.[0] || "";
  assert.ok(sourceEntry.includes(`href: "${href}"`), `서비스 레지스트리 경로가 없습니다: ${id} -> ${href}`);
  if (action) assert.ok(sourceEntry.includes(`action: "${action}"`), `서비스 레지스트리 직접 실행 액션이 없습니다: ${id} -> ${action}`);
}

console.log("[home-direct-feature-links] PASS");

assert.ok(template.indexOf('id="cdhFeatured"') < template.indexOf('id="cdhMore"'), 'signature readings stay directly visible');

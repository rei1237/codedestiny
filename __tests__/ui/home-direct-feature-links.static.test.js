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
  'href="/today/" data-cd-service-id="daily-fortune"',
  'href="/saju/basic/play" data-cd-service-id="saju"',
  'href="/index.html?action=openTarotModal" data-action="openTarotModal" data-cd-service-id="tarot"',
  'href="/ziwei/chart" data-cd-service-id="ziwei"',
  'href="/index.html?action=openSukuyoModal" data-action="openSukuyoModal" data-cd-service-id="sukuyo"',
  'href="/index.html?action=openAstroModal" data-action="openAstroModal" data-cd-service-id="astrology"',
];
for (const link of expectedQuickLinks) assert.ok(quickSection.includes(link), `직접 기능 링크가 없습니다: ${link}`);

for (const seoRoot of [
  'href="/saju/" data-cd-service-id="saju"',
  'href="/tarot/" data-action="openTarotModal" data-cd-service-id="tarot"',
  'href="/ziwei/" data-action="openZiweiModal" data-cd-service-id="ziwei"',
  'href="/sukuyo/" data-action="openSukuyoModal" data-cd-service-id="sukuyo"',
  'href="/astrology/" data-action="openAstroModal" data-cd-service-id="astrology"',
]) {
  assert.equal(quickSection.includes(seoRoot), false, `SEO 허브 링크가 홈 바로가기에서 남아 있습니다: ${seoRoot}`);
}

for (const entry of [
  ['daily-fortune', '/today/', null],
  ['saju', '/saju/basic/play', null],
  ['tarot', '/index.html?action=openTarotModal', 'openTarotModal'],
  ['ziwei', '/ziwei/chart', null],
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

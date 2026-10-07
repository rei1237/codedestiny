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
  'href="/?action=cdOneStepFreeSajuEntry" data-action="cdOneStepFreeSajuEntry"',
  'href="/?action=cdHomeTarotEntry" data-action="cdHomeTarotEntry"',
  'href="/?action=cdHomeZiweiEntry" data-action="cdHomeZiweiEntry"',
  'href="/?action=cdHomeSukuyoEntry" data-action="cdHomeSukuyoEntry"',
  'href="/?action=cdHomeAstroEntry" data-action="cdHomeAstroEntry"',
  'href="/?action=cdHomeVedicEntry" data-action="cdHomeVedicEntry"',
];
for (const link of expectedQuickLinks) assert.ok(quickSection.includes(link), `직접 기능 링크가 없습니다: ${link}`);
assert.doesNotMatch(quickSection, /data-cd-open-collection/, 'home tiles open the selected fortune directly');
assert.deepEqual([...quickSection.matchAll(/data-cd-service-id="([^"]+)"/g)].map(m => m[1]), ['saju', 'ziwei', 'sukuyo', 'vedic', 'astrology', 'tarot']);
const template = read('templates/home-funnel.html');
assert.ok(template.indexOf('id="cdhQuickSlot"') < template.indexOf('id="cdhServices"'), 'methods precede search');
assert.ok(template.indexOf('id="cdhQuickSlot"') < template.indexOf('id="cdhMore"'), 'restored fortune entries remain visible outside optional exploration');

assert.equal([...quickSection.matchAll(/href="\/\?action=([^"]+)" data-action="\1"/g)].length, 6, 'early clicks retain the selected action before JavaScript is ready');

for (const entry of [
  ['daily-fortune', '/today/', null],
  ['saju', '/?action=cdOneStepFreeSajuEntry', 'cdOneStepFreeSajuEntry'],
  ['tarot', '/?action=cdHomeTarotEntry', 'cdHomeTarotEntry'],
  ['ziwei', '/?action=cdHomeZiweiEntry', 'cdHomeZiweiEntry'],
  ['sukuyo', '/?action=cdHomeSukuyoEntry', 'cdHomeSukuyoEntry'],
  ['vedic', '/?action=cdHomeVedicEntry', 'cdHomeVedicEntry'],
  ['astrology', '/?action=cdHomeAstroEntry', 'cdHomeAstroEntry'],
]) {
  const [id, href, action] = entry;
  const entryPattern = new RegExp(`id: "${id}"[\\s\\S]*?\\n  },`);
  const sourceEntry = registry.match(entryPattern)?.[0] || "";
  assert.ok(sourceEntry.includes(`href: "${href}"`), `서비스 레지스트리 경로가 없습니다: ${id} -> ${href}`);
  if (action) assert.ok(sourceEntry.includes(`action: "${action}"`), `서비스 레지스트리 직접 실행 액션이 없습니다: ${id} -> ${action}`);
}

console.log("[home-direct-feature-links] PASS");

assert.ok(template.indexOf('id="cdhFeatured"') < template.indexOf('id="cdhMore"'), 'signature readings are visible before optional exploration');

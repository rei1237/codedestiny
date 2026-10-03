const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

// 홈 무료 바로 시작 섹션(#cdQuickServices)은 2026-10-03 삭제됐다 — 방식 허브 6종의 직접 실행 경로는
// 모든 운세·검색이 그리는 레지스트리 항목이 정본이다.
const registry = read("js/core/service-registry.js");

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

/**
 * PagedResultViewer 페이지를 자손 셀렉터로 스타일하지 못하게 막는다.
 *
 * 🔴 실사고: neo-operation-room-result.module.css 가
 *   `.pagedViewer > div[role="region"] > div { display: grid; gap: 12px; }`
 * 로 페이지를 잡았다. 특정성 (0,2,2) 라 뷰어의 `.page { display: none }` (0,1,0) 을 이겨,
 * 페이지 넘김 모드인데도 비활성 페이지가 전부 표시됐다 — 브리핑 10장·명령서 6장이 세로로
 * 쌓이고 인디케이터만 "1 / 10" 을 가리켰다. 페이지 스타일은 pageClassName prop 으로만 준다.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');

function collectCssModules(dir, found = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) collectCssModules(rel, found);
    else if (entry.name.endsWith('.module.css')) found.push(rel);
  }
  return found;
}

test('CSS 모듈이 뷰어 페이지를 role=region 자손 셀렉터로 잡지 않는다', () => {
  const cssModules = [...collectCssModules('app'), ...collectCssModules('src'), ...collectCssModules('components')];
  // 검사 대상이 없으면 통과시키지 않는다(가드는 fail-closed 여야 한다).
  assert.ok(cssModules.length > 20, `CSS 모듈을 찾지 못했다 (${cssModules.length}개)`);

  const offenders = cssModules.filter((file) => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    // 주석 안의 경고 문구는 셀렉터가 아니므로 제외한다.
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
    return /\[role=["']region["']\]\s*>/.test(withoutComments);
  });
  assert.deepEqual(offenders, [], `pageClassName prop 을 써라: ${offenders.join(', ')}`);
});

test('네오 결과 화면은 pageClassName 으로 페이지를 스타일한다', () => {
  const page = fs.readFileSync(path.join(root, 'src/features/neo-war-room/NeoOperationRoomResultPage.tsx'), 'utf8');
  const viewerCount = (page.match(/<PagedResultViewer/g) || []).length;
  const pageClassCount = (page.match(/pageClassName=/g) || []).length;
  assert.ok(viewerCount >= 2, `PagedResultViewer 호출을 찾지 못했다 (${viewerCount}개)`);
  assert.equal(pageClassCount, viewerCount);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 공통 스텝 플로우 셸의 달빛 예화 계약(docs/context/design-canon.md)을 정적으로 고정한다.
// 실제 대비 수치는 scripts/design/verify-guided-flow-contrast.cjs(브라우저 합성색)가 잰다.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const css = fs.readFileSync(path.join(root, 'app/components/guided-flow/guided-flow.module.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'app/components/guided-flow/GuidedFlowShell.tsx'), 'utf8');
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');

function block(selector) {
  const start = code.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} 블록이 없다`);
  return code.slice(start, code.indexOf('}', start));
}

test('새 hex·다크 분기·--cd-* 재선언을 쓰지 않는다', () => {
  assert.equal(/#[0-9a-f]{3,8}\b/i.test(code), false, '색은 토큰으로만 참조한다');
  assert.equal(/prefers-color-scheme|\bdark:/.test(code), false);
  assert.equal(/(^|[;{\s])--cd-[\w-]+\s*:/m.test(code), false, '--cd-* 를 재선언하지 않는다');
});

test('셸이 표면과 글자를 함께 칠한다(반쪽 오버라이드 금지)', () => {
  const flow = block('.flow');
  assert.match(flow, /background:\s*var\(--gf-surface\)/);
  assert.match(flow, /color:\s*var\(--gf-ink\)/);
});

test('영냥이 분기는 밤 토큰만 쓰고 분홍 --cd-* 를 끌어오지 않는다', () => {
  const night = block(".flow[data-brand='yeongnyangi']");
  assert.match(night, /--gf-surface:\s*var\(--yn-night\)/);
  assert.equal(/var\(--cd-(?!sp-|r-|t-|dur-|ease-)/.test(night), false, night);
  assert.match(shell, /'data-yn-night'/);
  assert.match(shell, /'data-brand': brand/);
});

test('주 CTA 는 예화 버튼 + 48px, 선택 상태는 색 외 표시(체크)를 가진다', () => {
  assert.match(shell, /cd-yehwa-button cd-yehwa-button--primary/);
  assert.match(block('.flow .primary'), /min-height:\s*var\(--cd-btn-h\)/);
  assert.match(code, /\.choice\[aria-pressed='true'\]::before\s*\{/);
});

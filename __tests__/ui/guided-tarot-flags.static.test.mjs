import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 공통 스텝 플로우 이관(3c-A1) 롤백 스위치 계약: 흐름마다 코드 상수 하나, 끄면 이관 전 컴포넌트가 그대로 돈다.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('흐름별 롤백 플래그는 boolean 코드 상수다', async () => {
  const flags = await import('../../lib/guided-flow/flags.mjs');
  assert.equal(typeof flags.GUIDED_DAILY_TAROT_ENABLED, 'boolean');
  assert.equal(typeof flags.GUIDED_HEALING_TAROT_ENABLED, 'boolean');
});

test('셸은 영냥이 전용 밤 예화 CSS 를 싣지 않는다(꿀꿀 흐름 번들 분리)', () => {
  const shell = read('app/components/guided-flow/GuidedFlowShell.tsx');
  assert.equal(/^import\s+['"][^'"]*yehwa-night\.generated\.css['"]/m.test(shell), false);
  assert.match(read('app/dev/guided-flow/GuidedFlowDemo.tsx'), /^import '@\/app\/yeongnyangi\/yehwa-night\.generated\.css';/m);
});

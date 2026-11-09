import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const source = fs.readFileSync(path.join(root, 'js/core/saju/manse-shinsal.js'), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const api = context.globalThis.CdManseShinsal;

test('연지 기준 12신살 순서를 네 기둥에 배치한다', () => {
  assert.equal(api.twelveName('子', '巳'), '겁살');
  assert.equal(api.twelveName('子', '子'), '장성살');
  assert.equal(api.twelveName('子', '辰'), '화개살');
});

test('별신살은 실제로 성립한 이름과 자리만 돌려준다', () => {
  const result = api.build({
    y: { g:'甲', j:'子' },
    m: { g:'丁', j:'卯' },
    d: { g:'甲', j:'午' },
    h: { g:'辛', j:'未' },
  });
  const byName = Object.fromEntries(result.extras.map((row) => [row.name, Array.from(row.positions)]));
  assert.deepEqual(byName['홍염살'], ['일주']);
  assert.deepEqual(byName['양인살'], ['월주']);
  assert.deepEqual(byName['원진살'], ['시주', '년주']);
  assert.equal(byName['괴강살'], undefined);
});

test('공망은 일주의 旬에 맞는 두 지지를 구한다', () => {
  assert.deepEqual(Array.from(api.gongmangBranches('甲', '子')), ['戌', '亥']);
  assert.deepEqual(Array.from(api.gongmangBranches('甲', '戌')), ['申', '酉']);
});

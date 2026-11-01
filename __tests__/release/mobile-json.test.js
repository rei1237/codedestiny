const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const load = () => import('../../scripts/lib/mobile-json.mjs');

test('JSON compaction retains numeric tokens, duplicate keys, and string whitespace', async () => {
  const { compactJson } = await load();
  const source = '{\n "id": 9007199254740993, "zero": -0, "n": 1.20e+40, "x": 1, "x": 2,\n "text": "한 글\\n\\t \\\" \\\\ /", "items": [ true, null ]\n}';
  const compact = compactJson(source);
  assert.deepEqual(JSON.parse(compact), JSON.parse(source));
  assert.ok(compact.includes('9007199254740993'));
  assert.ok(compact.includes('"zero":-0'));
  assert.ok(compact.includes('1.20e+40'));
  assert.ok(compact.includes('"x":1,"x":2'));
  assert.equal(compactJson(compact), compact);
  assert.throws(() => compactJson('{ "broken": }'));
});

test('only packaged JSON is compacted; routes, RSC payloads and other files survive', async t => {
  const { compactMobileJson } = await load();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-mobile-json-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(path.join(directory, 'i18n'));
  await fs.writeFile(path.join(directory, 'i18n', 'ko.json'), '{\n "message": "줄 바꿈\\n유지"\n}\n');
  await fs.writeFile(path.join(directory, 'index.txt'), ' RSC payload \n');
  await fs.writeFile(path.join(directory, 'index.html'), '<main> 그대로 </main>');
  const result = await compactMobileJson(directory);
  assert.equal(result.total, 1);
  assert.equal(result.rewritten, 1);
  assert.ok(result.afterBytes < result.beforeBytes);
  assert.equal(await fs.readFile(path.join(directory, 'index.txt'), 'utf8'), ' RSC payload \n');
  assert.equal(await fs.readFile(path.join(directory, 'index.html'), 'utf8'), '<main> 그대로 </main>');
  assert.equal((await compactMobileJson(directory)).rewritten, 0);
  await fs.writeFile(path.join(directory, 'invalid.json'), '{"unfinished":');
  await assert.rejects(compactMobileJson(directory), /Invalid mobile JSON: invalid.json/);
});

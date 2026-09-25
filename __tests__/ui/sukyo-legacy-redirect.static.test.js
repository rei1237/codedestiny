const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('retired Sukyo encyclopedia redirects precede the spelling alias wildcard', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../public/_redirects'), 'utf8');
  const rules = source.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#')).map(line => line.trim().split(/\s+/));
  const match = pathname => rules.find(([from]) => from === pathname || from.endsWith('*') && pathname.startsWith(from.slice(0, -1)));
  for (const pathname of ['/sukyo/relationship-encyclopedia', '/sukyo/relationship-encyclopedia/']) assert.deepEqual(match(pathname), [pathname, '/sukuyo/', '301']);
  assert.deepEqual(match('/sukyo/other'), ['/sukyo/*', '/sukuyo/:splat', '301']);
  assert.equal(match('/sukuyo/'), undefined);
});

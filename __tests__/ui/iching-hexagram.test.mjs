import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

// Independent King Wen composition fixture: lower/upper trigram numbers.
// https://iching.sourceforge.net/Documentation/design/design-one/index.html
// 1=heaven, 2=earth, 3=thunder, 4=wind, 5=fire, 6=water, 7=lake, 8=mountain.
const pairs = `11 22 36 68 16 61 62 26 14 71 12 21 51 15 82 23
37 48 72 24 35 58 28 32 31 18 38 47 66 55 87 43
81 13 25 52 54 75 86 63 78 34 17 41 27 42 67 46
57 45 33 88 84 73 53 85 44 77 64 76 74 83 56 65`.split(/\s+/);
const symbols = ['', '☰', '☷', '☳', '☴', '☲', '☵', '☱', '☶'];
const source = readFileSync(new URL('../../js/iching-engine.js', import.meta.url), 'utf8');

function harness() {
  let result;
  const context = vm.createContext({
    window: {},
    document: { getElementById: id => id === 'ichingQuestion' ? { value: '  나의 진로  ' } : null },
    setTimeout: fn => fn(),
    capture: (...args) => { result = args; },
  });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, `
    window.reveal = _doReveal;
    window.names = HEXAGRAM_NAMES;
    window.wisdom = HEXAGRAM_WISDOM;
    _renderResult = capture;
  })();`), context);
  return { context, reveal(seed) { context.window.reveal(seed); return result; } };
}

test('all 64 rendered hexagrams match lower/upper composition, name and wisdom', () => {
  const { context, reveal } = harness();
  const seen = new Set();
  for (let seed = 0; seed < 8192; seed++) {
    const [upper, lower, char, name, wisdom, question] = reveal(seed);
    const index = char.charCodeAt(0) - 0x4DC0;
    const pair = pairs[index];
    assert.ok(pair, `invalid hexagram at seed ${seed}`);
    assert.equal(lower.sym, symbols[Number(pair[0])], `lower at seed ${seed}`);
    assert.equal(upper.sym, symbols[Number(pair[1])], `upper at seed ${seed}`);
    assert.equal(name, context.window.names[index]);
    assert.equal(wisdom, context.window.wisdom[name]);
    assert.equal(question, '나의 진로');
    seen.add(index);
  }
  assert.equal(seen.size, 64);
});

test('seed zero resolves fire over mountain to hexagram 56, not mountain over water', () => {
  const { reveal } = harness();
  const [upper, lower, char, name] = reveal(0);
  assert.equal(upper.sym, '☲');
  assert.equal(lower.sym, '☶');
  assert.equal(char, String.fromCharCode(0x4DC0 + 55));
  assert.equal(name, '화산려');
  assert.deepEqual(reveal(0), reveal(0));
});

test('maximum unsigned RNG output remains inside the eight trigram indexes', () => {
  const { reveal } = harness();
  // Inverse LCG: force the first or second generated uint32 to 0xffffffff.
  const previous = value => Number(BigInt.asUintN(32, (BigInt(value) - 1013904223n) * 4276115653n));
  for (const state of [previous(0xffffffff), previous(previous(0xffffffff))]) {
    const result = reveal(state ^ 0xCAFEBABE);
    assert.ok(result[0].sym);
    assert.ok(result[1].sym);
    assert.ok(result[3]);
  }
});

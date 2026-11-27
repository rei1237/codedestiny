// 액땜 삼재 판정(lib/saju/remedy/samjae.mjs)을 기존 정본 lib/fortune/new-year-sign.ts samjaeFor 와 대조한다.
// TS 파일은 고치지 않고, 선언만 AST 로 뽑아 트랜스파일한 뒤 vm 에서 실행한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { samjaeStatus, yearBranchIndex, toBranchIndex, SAMJAE_GROUPS, SAMJAE_STAGES } from '../../lib/saju/remedy/samjae.mjs';

const plain = (value) => JSON.parse(JSON.stringify(value));
const TS_PATH = '../../lib/fortune/new-year-sign.ts';

function extractTsDeclarations(path, names) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const wanted = new Set(names);
  const found = new Set();
  const chunks = [];
  for (const statement of file.statements) {
    const declared = ts.isVariableStatement(statement)
      ? statement.declarationList.declarations.map((declaration) => declaration.name.getText(file))
      : ts.isFunctionDeclaration(statement) && statement.name ? [statement.name.text] : [];
    if (!declared.some((name) => wanted.has(name))) continue;
    declared.forEach((name) => found.add(name));
    chunks.push(statement.getText(file).replace(/^export\s+/, ''));
  }
  assert.deepEqual(names.filter((name) => !found.has(name)), [], `${path} 에서 찾지 못한 선언`);
  const js = ts.transpileModule(chunks.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = vm.createContext({ RangeError });
  vm.runInContext(`${js}\nglobalThis.__extracted = { ${names.join(', ')} };`, context);
  return context.__extracted;
}

const canon = extractTsDeclarations(TS_PATH, ['SAMJAE_START', 'SAMJAE_STAGE', 'samjaeFor']);
const BRANCH_HANJA = [...'子丑寅卯辰巳午未申酉戌亥'];
const BRANCH_HANGUL = [...'자축인묘진사오미신유술해'];
const YEARS = Array.from({ length: 24 }, (_, i) => 2015 + i);

test('삼재 그룹·단계 표가 new-year-sign.ts 와 같다', () => {
  assert.deepEqual(plain(SAMJAE_GROUPS), plain(canon.SAMJAE_START));
  assert.deepEqual(plain(SAMJAE_STAGES), plain(canon.SAMJAE_STAGE));
});

test('12띠 × 2015~2038 년 모두 samjaeFor 와 단계·세 해·다음 시작 해·라벨이 같다', () => {
  let samjaeYears = 0;
  for (let branch = 0; branch < 12; branch += 1) {
    for (const year of YEARS) {
      const expected = plain(canon.samjaeFor(branch, { year, branchIndex: yearBranchIndex(year) }));
      const actual = samjaeStatus(branch, year);
      assert.ok(actual, `${branch}@${year}`);
      const { offset, ...rest } = plain(actual);
      assert.deepEqual(rest, expected, `${BRANCH_HANJA[branch]}띠 ${year}`);
      assert.equal(offset, actual.stage ? SAMJAE_STAGES.indexOf(actual.stage) : null);
      if (actual.stage) samjaeYears += 1;
    }
  }
  // 띠마다 12년에 3년씩: 24년이면 띠당 6해, 12띠 72해.
  assert.equal(samjaeYears, 72);
});

test('한자·한글·번호 입력이 같은 결과를 낸다', () => {
  for (let branch = 0; branch < 12; branch += 1) {
    assert.equal(toBranchIndex(BRANCH_HANJA[branch]), branch);
    assert.equal(toBranchIndex(BRANCH_HANGUL[branch]), branch);
    assert.deepEqual(samjaeStatus(BRANCH_HANJA[branch], 2026), samjaeStatus(branch, 2026));
    assert.deepEqual(samjaeStatus(BRANCH_HANGUL[branch], 2026), samjaeStatus(branch, 2026));
    assert.deepEqual(samjaeStatus(branch, '2026'), samjaeStatus(branch, 2026));
  }
});

test('세운 지지 번호와 알려진 해', () => {
  assert.equal(yearBranchIndex(2026), 6, '2026 丙午');
  assert.equal(yearBranchIndex(2024), 4, '2024 甲辰');
  assert.equal(yearBranchIndex(1984), 0, '1984 甲子');
  assert.equal(yearBranchIndex(-1), 7);
  // 2026 午년: 亥卯未 띠가 巳午未 해 삼재의 가운데(눌삼재).
  assert.equal(samjaeStatus('亥', 2026).stage, '눌삼재');
  assert.equal(samjaeStatus('寅', 2026).label, '삼재 아님 · 다음 삼재 2028~2030년');
  assert.equal(samjaeStatus('寅', 2027).label, '삼재 아님 · 2028년 들삼재 직전 해');
});

test('읽을 수 없는 입력은 null 이고 던지지 않는다', () => {
  for (const branch of [12, -1, 1.5, 'x', '子丑', '', null, undefined, NaN, {}, []]) {
    assert.equal(samjaeStatus(branch, 2026), null, String(branch));
  }
  for (const year of ['abc', NaN, Infinity, undefined, {}]) {
    assert.equal(samjaeStatus(0, year), null, String(year));
  }
  assert.throws(() => canon.samjaeFor(12, { year: 2026, branchIndex: 6 }), RangeError, '정본은 잘못된 띠에 던진다(액땜 모듈은 null)');
});

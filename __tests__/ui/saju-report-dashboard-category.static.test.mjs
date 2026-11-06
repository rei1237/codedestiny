import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE_PATH = 'js/core/saju/reportDashboard.js';
const PUBLIC_PATH = 'public/js/core/saju/reportDashboard.js';
const source = readFileSync(SOURCE_PATH, 'utf8');
const publicSource = readFileSync(PUBLIC_PATH, 'utf8');

function objectBody(sourceText, declaration) {
  const match = sourceText.match(new RegExp(`var ${declaration} = \\{([\\s\\S]*?)\\n\\};`));
  assert.ok(match, `${declaration} 선언을 찾지 못했습니다.`);
  return match[1];
}

function objectEntries(body) {
  return [...body.matchAll(/(?:'([^']+)'|([A-Za-z0-9_]+))\s*:\s*'([^']+)'/g)]
    .map(([, quotedKey, bareKey, value]) => [quotedKey || bareKey, value]);
}

test('사주 콘텐츠 카테고리 키가 유효한 UI 분류만 사용한다', () => {
  const categories = Object.fromEntries(objectEntries(objectBody(source, 'REPORT_CARD_CATEGORIES')));
  const mapping = Object.fromEntries(objectEntries(objectBody(source, 'REPORT_CARD_CATEGORY_BY_ID')));
  const validKeys = new Set(Object.keys(categories));

  assert.deepEqual(mapping, {
    meryok: 'self',
    quantum: 'self',
    sajuhealth: 'life',
    sajuprompt: 'self',
    sajurpg: 'self',
    tbal: 'fun',
    tetoegen: 'relation',
    trip: 'life',
    vilun: 'relation',
    lotto: 'fun',
    fortunePlanner: 'life',
    legacyLuckSyncDiary: 'life',
    '4CUT': 'fun',
    dopamine: 'fun',
    secretHouse: 'relation',
    relationshipTemptation: 'relation',
    'saju-animal-test': 'fun',
    'destiny-meeting-place': 'relation',
    'love-code': 'relation',
  });
  assert.ok([...new Set(Object.values(mapping))].every((key) => validKeys.has(key)));
  assert.ok(!Object.values(mapping).includes('fun-saju'));
});

test('ID별 분류가 카드 내부 category 값보다 우선한다', () => {
  const helper = source.match(/function _rptCategoryOf\(card\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.match(helper, /var idCategory = REPORT_CARD_CATEGORY_BY_ID\[card && card\.id\];/);
  assert.match(helper, /if \(idCategory\) return idCategory;/);
  assert.match(helper, /Object\.prototype\.hasOwnProperty\.call\(REPORT_CARD_CATEGORIES, declaredCategory\)/);
  assert.match(source, /relationshipTemptation:'relation'/);
});

test('reportDashboard 정본과 public 미러가 동일하다', () => {
  assert.equal(publicSource, source);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { renderCraftedDetail, renderFeatureDetailPanels } from '../../js/feature-detail-panels.mjs';

// 대표 상담 상세의 새 필드(masters·outcomes·chapters[].gain·master)가 없는 상품은 공용 렌더러 출력이 바이트 단위로 같아야 한다.
// 각 행은 입력 해시와 출력 해시를 함께 묶는다. 입력(문구)이 바뀐 행은 건너뛰고, 입력이 같은데 출력이 바뀌면 실패한다.
// 렌더러 출력을 의도해서 바꿨다면 UPDATE_FEATURE_DETAIL_SNAPSHOT=1 로 다시 기록하고 이유를 커밋에 적는다.
const fixture = '__tests__/fixtures/feature-detail-panels-legacy-output.json';
const sha = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex').slice(0, 16);
const legacyCard = ({ masters, outcomes, ...card }) => ({ ...card, ...(card.chapters ? { chapters: card.chapters.map(({ gain, master, ...chapter }) => chapter) } : {}) });
const legacy = detail => detail.crafted ? { ...detail, crafted: detail.crafted.map(legacyCard) } : detail;

function rows() {
  const out = {};
  for (const file of fs.readdirSync('public/feature-details').filter(name => name.endsWith('.json') && name !== 'catalog.json').sort()) {
    const detail = legacy(JSON.parse(fs.readFileSync(`public/feature-details/${file}`, 'utf8')));
    const html = [renderFeatureDetailPanels(detail), renderFeatureDetailPanels(detail, { headingLevel: 2, startPriceLabel: '10,000원부터' }), renderFeatureDetailPanels(detail, { conversionPrompt: true })];
    out[`detail/${file}`] = { input: sha(detail), output: sha(html.join('\n')) };
  }
  for (const id of fs.readdirSync('public/feature-details/crafted').sort()) {
    const path = `public/feature-details/crafted/${id}/manifest.json`;
    if (!fs.existsSync(path)) continue;
    const manifest = legacyCard(JSON.parse(fs.readFileSync(path, 'utf8')));
    out[`crafted/${id}`] = { input: sha(manifest), output: sha(`${renderCraftedDetail(manifest)}\n${renderCraftedDetail(manifest, { eager: false })}`) };
  }
  return out;
}

test('새 필드가 없는 상품의 상세 렌더 출력은 기록과 같다', () => {
  const current = rows();
  if (process.env.UPDATE_FEATURE_DETAIL_SNAPSHOT === '1') fs.writeFileSync(fixture, `${JSON.stringify(current, null, 1)}\n`);
  const recorded = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  const fresh = Object.entries(current).filter(([key, row]) => recorded[key]?.input === row.input);
  for (const [key, row] of fresh) assert.equal(row.output, recorded[key].output, `${key}: 입력이 같은데 렌더 출력이 바뀌었다`);
  assert.ok(fresh.length >= Object.keys(current).length / 2, `기록된 입력과 맞는 행이 ${fresh.length}/${Object.keys(current).length}개뿐이다 — 렌더러가 그대로인지 확인한 뒤 다시 기록한다`);
});

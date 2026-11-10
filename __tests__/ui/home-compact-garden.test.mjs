import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { petSpriteMarkup } from '../../js/core/profile-pet-card.mjs';
import { PET_SPECIES } from '../../js/core/profile-pet.mjs';

const source = readFileSync('app/components/daily-card/DailyCard.tsx', 'utf8');
const ast = ts.createSourceFile('card.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const snippet = ['CompactGarden', 'attendLine', 'loginHref'].map(name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(ast)).join('\n');
const { code } = await transform(snippet, { loader: 'tsx', format: 'cjs', jsx: 'automatic' });
const Garden = new Function('require', 'styles', 'petSpriteMarkup', 'PET_MANAGE_HREF', 'ArrowRight', 'HoneyIcon', 'Link', code + ';return CompactGarden;')(
  createRequire(import.meta.url), new Proxy({}, { get: (_, key) => String(key) }), petSpriteMarkup,
  '/ggulggul/?action=dpOpenList&petEntry=my', () => null, () => null,
  ({ children, prefetch, ...props }) => React.createElement('a', props, children));
const base = { status: 'ready', profileStatus: 'ready', profile: { id: 'saved' }, portrait: { pet: null }, progress: null, honey: null, rules: null };
const render = overrides => renderToStaticMarkup(React.createElement(Garden, { journey: { ...base, ...overrides } }));

test('all 16 saved pets use the same My renderer and garden destination', () => {
  for (const species of PET_SPECIES) {
    const pet = { speciesId: species.id, name: species.name, coat: 'wood', traits: { pattern: 0, expression: 1, accessory: 1 }, affection: 75, fed: true, played: false };
    const dom = new JSDOM(render({ portrait: { pet }, profile: { profileId: 'selected-profile', id: 'mongo-id' } }));
    const expected = new JSDOM(petSpriteMarkup(pet));
    assert.equal(dom.window.document.querySelector('.pg-pet').outerHTML, expected.window.document.querySelector('.pg-pet').outerHTML);
    assert.equal(dom.window.document.querySelector('a').getAttribute('href'), '/ggulggul/?action=dpOpenList&petEntry=my');
    assert.equal(dom.window.document.querySelector('[data-daily-profile]').dataset.dailyProfile, 'selected-profile');
    const state = dom.window.document.querySelector('[data-pet-affection]').dataset;
    assert.equal(state.petAffection, '75'); assert.equal(state.petFed, 'true'); assert.equal(state.petPlayed, 'false');
    assert.match(dom.window.document.querySelector('strong').textContent, /^나의 친구 · /);
    dom.window.close(); expected.window.close();
  }
});
test('guest login preserves home return and does not show sample balances', () => {
  const html = render({ status: 'guest', profile: null });
  assert.match(html, /\/login\/\?next=%2F%23daily-home-title/);
  assert.match(html, /profileEgg/);
  assert.doesNotMatch(html, /data-daily-balance|Lv\.|pg-pet--/);
});
test('loading and failed authentication or profile reads cannot open a stale pet', () => {
  for (const overrides of [{ status: 'guest' }, { status: 'loading' }, { status: 'error' }, { profileStatus: 'loading' }, { profileStatus: 'error' }, { portraitFailed: true }]) {
    const html = render({ portrait: { pet: { speciesId: 'rabbit', name: '토끼', affection: 75, fed: true, played: false } }, ...overrides });
    assert.doesNotMatch(html, /href="\/ggulggul|pg-pet--|Lv\.|data-pet-affection|data-pet-fed|data-pet-played|data-daily-profile/);
    if (overrides.status !== 'guest') assert.doesNotMatch(html, /profileEgg/);
  }
  assert.match(render({ status: 'error' }), /정원 다시 불러오기/);
});
test('missing profile and unhatched pet are safe and known balances stay server-owned', () => {
  assert.match(render({ profile: null }), /첫 카드를 만들고/);
  assert.match(render({}), /달빛 알을 부화해요/);
  const html = render({ honey: { balance: 27, attended: true } });
  assert.match(html, /27방울/); assert.match(html, /오늘 출석 완료/);
  assert.match(html, /\/diary\/#daily-home-title/);
  assert.match(html, /퀘스트는 경험치/); assert.match(html, /레벨·결제 등 지급 조건/);
});
test('home mounts only the compact entry; diary keeps all full sections', () => {
  assert.match(snippet, /href="\/diary\/#daily-home-title" prefetch=\{false\}/);
  assert.match(source, /surface === "home" \? <CompactGarden journey=\{journey\} \/> : <>/);
  for (const name of ['ProfileHeader', 'HoneyStatus', 'AttendanceCalendar', 'TodayQuests', 'HoneyUses']) assert.match(source, new RegExp('<' + name + ' '));
  assert.doesNotMatch(snippet, /journey\.(attend|toggleQuest|selectQuest)|fetch\(|hatchPet|carePet/);
});

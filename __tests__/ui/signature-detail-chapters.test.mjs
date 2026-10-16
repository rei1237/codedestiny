import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { LOVE_SECRET_AI_GROUPS, LOVE_SPEAKER_BY_GROUP } from '../../worker/lib/love-secret-ai-prompt.js';
import { __newYearAiTestUtils } from '../../worker/routes/new-year-ai.js';
import { __lifeBookAiTestUtils } from '../../worker/routes/life-book-ai.js';

// 대표 상담 상세의 목차는 실제 생성 코드와 같아야 한다 — 손으로 쓴 목차가 어긋나면 허위 표시다.
const require = createRequire(import.meta.url);
const sources = id => [
  [`${id}/panels.cjs`, require(`../../content/product-details/${id}/panels.cjs`)],
  ...['content/product-details', 'public/feature-details/crafted'].map(dir => [`${dir}/${id}/manifest.json`, JSON.parse(fs.readFileSync(`${dir}/${id}/manifest.json`, 'utf8'))]),
];
const catalog = JSON.parse(fs.readFileSync('content/product-details/catalog.json', 'utf8'));
const contiguous = (titles, expected) => titles.slice(titles.indexOf(expected[0]), titles.indexOf(expected[0]) + expected.length);

test('연애 비책 목차는 LOVE_SECRET_AI_GROUPS 의 섹션·그룹·화자와 같다', () => {
  const expected = LOVE_SECRET_AI_GROUPS.flatMap(group => group.sections.map(section => ({ title: section.title, detail: group.label, master: `${LOVE_SPEAKER_BY_GROUP[group.key]}Love` })));
  for (const [name, source] of sources('love-secret')) {
    assert.deepEqual(source.chapters.map(({ title, detail }) => ({ title, detail })), expected.map(({ title, detail }) => ({ title, detail })), name);
    for (const [index, chapter] of source.chapters.entries()) {
      if (chapter.master !== undefined) assert.equal(chapter.master, expected[index].master, `${name}: ${chapter.title}`);
    }
  }
});

test('신년운세 상세는 연결되어 있고, 목차가 6부와 1월~12월을 담는다', () => {
  assert.deepEqual(catalog.introductions['new-year-ai'], ['new-year-expert']);
  const labels = __newYearAiTestUtils.NEW_YEAR_AI_SECTIONS.map(section => section.label);
  const months = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);
  for (const [name, source] of sources('new-year-expert')) {
    const titles = (source.chapters || []).map(chapter => chapter.title);
    assert.deepEqual(titles.filter(title => labels.includes(title)), labels, `${name}: 6부`);
    assert.deepEqual(titles.filter(title => months.includes(title)), months, `${name}: 열두 달`);
    assert.equal(titles.length, labels.length + months.length, `${name}: 코드에 없는 장이 없다`);
  }
});

test('인생의 책 1~10장과 깊은 판독은 생성 계획의 제목과 같다', () => {
  const plan = __lifeBookAiTestUtils.buildSectionPlan({});
  const chapters = plan.filter(section => section.kind === 'chapter').map(section => section.title);
  const expert = plan.filter(section => section.kind === 'expert').map(section => section.title);
  assert.equal(chapters.length, 10);
  for (const [name, source] of sources('life-book')) {
    const titles = source.chapters.map(chapter => chapter.title);
    assert.deepEqual(contiguous(titles, chapters), chapters, `${name}: 10장`);
    assert.deepEqual(contiguous(titles, expert), expert, `${name}: 깊은 판독`);
  }
});

test('대표 상담 상세의 마스터는 master-profiles 에서 읽어 붙이고, 모르는 키는 빌드를 멈춘다', async () => {
  const { loadTsModule } = await import('../../scripts/lib/load-ts-module.mjs');
  const { craftedMasters } = await import('../../scripts/lib/build-visual-details.mjs');
  const { masterProfiles, masterAvatars } = loadTsModule('components/fortune/master-profiles.ts');
  const expected = { 'love-secret-ai': ['yeoniLove', 'hanbiLove'], 'new-year-ai': ['neoNewYear'], 'life-book-ai': ['yunLifeBook'] };
  for (const [slug, keys] of Object.entries(expected)) {
    const [crafted] = JSON.parse(fs.readFileSync(`public/feature-details/${slug}.json`, 'utf8')).crafted;
    assert.deepEqual(crafted.masters.map(master => master.key), keys, slug);
    for (const master of crafted.masters) {
      const profile = masterProfiles[master.key];
      assert.deepEqual(master, {
        key: master.key, name: profile.name, epithet: profile.epithet, signature: profile.signature, role: profile.role,
        part: profile.dossier.find(row => row.label === '이 상담에서 맡는 부분').text,
        avatar: masterAvatars[master.key], portrait: profile.portrait, portraitSrcSet: profile.portraitSrcSet,
      }, `${slug}: ${master.key}`);
      assert.ok(fs.existsSync(`public${master.avatar}`), master.avatar);
    }
  }
  assert.throws(() => craftedMasters({ masters: ['nobodyLove'] }), /Unknown crafted master/);
  assert.throws(() => craftedMasters({ masters: ['master'] }), /Unknown crafted master/, '대표 상담 전용 프로필만 쓴다');
  assert.throws(() => craftedMasters({ masters: ['yeoniLove'], chapters: [{ title: 't', master: 'hanbiLove' }] }), /Chapter master/);
});

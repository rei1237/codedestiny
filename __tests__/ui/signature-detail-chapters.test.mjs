import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { renderCraftedDetail } from '../../js/feature-detail-panels.mjs';
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
        basis: profile.dossier.find(row => row.label === '읽는 근거').text, principles: profile.principles,
        avatar: masterAvatars[master.key], portrait: profile.portrait, portraitSrcSet: profile.portraitSrcSet,
      }, `${slug}: ${master.key}`);
      assert.ok(fs.existsSync(`public${master.avatar}`), master.avatar);
      assert.ok(fs.existsSync(`public${master.portrait}`), master.portrait);
    }
  }
  assert.throws(() => craftedMasters({ masters: ['nobodyLove'] }), /Unknown crafted master/);
  assert.equal(craftedMasters({ masters: ['master'] })[0].name, masterProfiles.master.name, '기존 인연의 서 프로필도 정본에서 읽는다');
  assert.throws(() => craftedMasters({ masters: ['yeoniLove'], chapters: [{ title: 't', master: 'hanbiLove' }] }), /Chapter master/);
});

const craftedOf = slug => JSON.parse(fs.readFileSync(`public/feature-details/${slug}.json`, 'utf8')).crafted[0];
const render = detail => JSDOM.fragment(renderCraftedDetail(detail, { eager: false })).querySelector('.craftedDetail');

test('마스터 섹션은 목차 앞에 서고, 연애 비책은 두 마스터를 나란히 둔다', () => {
  const love = render(craftedOf('love-secret-ai'));
  assert.ok(love.firstElementChild.matches('header'));
  assert.ok(love.querySelector('header + .craftedEditorialMasters'));
  assert.deepEqual([...love.querySelectorAll('.craftedMaster strong')].map(node => node.textContent), ['연이', '서한비']);
  for (const image of love.querySelectorAll('.craftedMaster img')) {
    assert.deepEqual([image.getAttribute('width'), image.getAttribute('height'), image.getAttribute('loading'), image.getAttribute('alt')], ['64', '64', 'lazy', '']);
    assert.equal(image.hasAttribute('fetchpriority'), false, '아바타는 상세 그림의 LCP 자리를 뺏지 않는다');
  }
  const neo = render(craftedOf('new-year-ai'));
  assert.equal(neo.querySelectorAll('.craftedMaster').length, 1);
  assert.equal(neo.querySelector('.craftedEditorialMasters > h3').textContent, '이 상담을 읽어 주는 마스터');
  assert.match(neo.querySelector('.craftedMasterPart').textContent, /여섯 장 전부/);
  assert.deepEqual([...neo.querySelectorAll('.craftedMasterDossier dt')].map(node => node.textContent), ['읽는 근거', '맡는 부분']);
});

test('마스터마다 포인트 색 자리를 달고, 원칙과 초상은 산출물 뒤에서만 lazy 로 그린다', () => {
  const love = render(craftedOf('love-secret-ai'));
  assert.deepEqual([...love.querySelectorAll('.craftedMaster')].map(node => node.dataset.master), ['yeoniLove', 'hanbiLove']);
  assert.deepEqual([...love.querySelectorAll('.craftedChapterGroup')].map(node => node.dataset.master), LOVE_SECRET_AI_GROUPS.map(group => `${LOVE_SPEAKER_BY_GROUP[group.key]}Love`));
  for (const slug of ['love-secret-ai', 'new-year-ai', 'life-book-ai']) {
    const detail = craftedOf(slug);
    const node = render(detail);
    const principles = node.querySelector('.craftedOutcomes + .craftedPrinciples');
    assert.ok(principles, `${slug}: 원칙은 산출물 바로 뒤`);
    assert.deepEqual([...principles.querySelectorAll('.craftedPrinciple')].map(item => item.dataset.master), detail.masters.map(master => master.key));
    assert.deepEqual([...principles.querySelectorAll('.craftedPrinciple li')].map(item => item.textContent), detail.masters.flatMap(master => master.principles));
    for (const image of principles.querySelectorAll('img')) {
      assert.deepEqual([image.getAttribute('loading'), image.getAttribute('sizes'), image.getAttribute('alt')], ['lazy', '96px', ''], slug);
      assert.equal(image.hasAttribute('fetchpriority'), false);
    }
    const eager = [...new Set([...node.querySelectorAll('img[loading="eager"]')].map(image => image.getAttribute('src')))];
    const chapterAvatars = [...new Set(detail.chapters.filter(chapter => chapter.master).map(chapter => detail.masters.find(master => master.key === chapter.master).avatar))];
    assert.deepEqual(eager, chapterAvatars, `${slug}: 접힌 소개는 lazy, 기존 목차 칩은 유지`);
  }
  const forged = render({ notice: 'n', masters: [{ key: 'x" onmouseover="y', name: 'n', avatar: '/a.webp' }], panels: [{ title: 'p', text: 'p', src: '/p.webp' }] });
  assert.equal(forged.querySelector('.craftedMasters'), null, '영문자 키만 data-master 로 나간다');
});

test('묶음 목차는 번호를 이어 가고, 28장 목록은 첫 묶음만 펼친 채 전부 글로 남긴다', () => {
  const detail = craftedOf('love-secret-ai');
  const love = render(detail);
  const groups = [...love.querySelectorAll('.craftedChapterGroup')];
  assert.deepEqual(groups.map(group => group.querySelector('.craftedChapterGroupTitle > span').textContent), LOVE_SECRET_AI_GROUPS.map(group => group.label));
  assert.deepEqual(groups.map(group => group.querySelector('.craftedChapterMaster').textContent), LOVE_SECRET_AI_GROUPS.map(group => ({ yeoni: '연이', hanbi: '서한비' })[LOVE_SPEAKER_BY_GROUP[group.key]]));
  let next = 1;
  for (const group of groups) {
    assert.equal(Number(group.querySelector('ol').getAttribute('start') || 1), next);
    next += group.querySelectorAll('li').length;
  }
  assert.equal(next - 1, detail.chapters.length);
  const more = love.querySelector('details.craftedChaptersMore');
  assert.ok(more && !more.open && !more.contains(groups[0]) && groups.slice(1).every(group => more.contains(group)));
  assert.equal(more.querySelector('summary').textContent, `나머지 ${detail.chapters.length - groups[0].querySelectorAll('li').length}개 장 펼쳐 보기`);
  assert.deepEqual([...love.querySelectorAll('.craftedChapters li strong')].map(node => node.textContent), detail.chapters.map(chapter => chapter.title));
  assert.equal(render(craftedOf('new-year-ai')).querySelector('.craftedChaptersMore'), null, '18장은 접지 않는다');
});

test('원본 manifest 의 마스터 키는 그리지 않고, 산출물 카드는 이스케이프해 목차 뒤에 둔다', () => {
  const raw = render(JSON.parse(fs.readFileSync('content/product-details/love-secret/manifest.json', 'utf8')));
  assert.equal(raw.querySelector('.craftedMasters'), null);
  assert.equal(raw.querySelector('.craftedChapterMaster'), null);
  assert.ok(raw.querySelector('.craftedChaptersGrouped'));
  const published = render(JSON.parse(fs.readFileSync('public/feature-details/crafted/love-secret/manifest.json', 'utf8')));
  assert.equal(published.querySelectorAll('.craftedMaster').length, 2, '개별 페이지도 공개 manifest의 마스터를 읽는다');
  const detail = render({ notice: '예시', chapters: [{ title: '첫 장', gain: '<b>얻는 것</b>' }], outcomes: [{ title: '<i>체크리스트</i>', text: '이번 주 할 일', evidence: 'x.tsx' }, { title: '빈 카드' }], panels: [{ title: 'p', text: 'p', src: '/p.webp' }] });
  assert.ok(detail.querySelector('.craftedChapters + .craftedOutcomes'));
  assert.equal(detail.querySelector('.craftedOutcomesTitle').textContent, '받고 나면 손에 남는 것');
  assert.deepEqual([...detail.querySelectorAll('.craftedOutcomes strong')].map(node => node.textContent), ['<i>체크리스트</i>']);
  assert.equal(detail.querySelector('.craftedChapters li > span').textContent, '<b>얻는 것</b>');
  assert.equal(detail.querySelector('b, i'), null);
});

test('새 섹션 스타일은 아바타 크기를 고정하고 움직임·토큰 재선언·이미지 자르기를 쓰지 않는다', () => {
  const popup = fs.readFileSync('styles/feature-visual-detail.css', 'utf8');
  const page = fs.readFileSync('app/components/crafted-product-detail.module.css', 'utf8');
  for (const [name, css] of [['popup', popup], ['page', page]]) {
    const rules = css.split(/\r?\n/).filter(line => /craftedMaster|craftedChapterGroup|craftedChapterMaster|craftedChaptersGrouped|craftedChaptersMore|craftedOutcomes|craftedPrinciple|data-master/.test(line));
    assert.ok(rules.some(rule => /craftedMaster img\s*\)?\s*\{[^}]*width:\s*80px;\s*height:\s*80px/.test(rule)), `${name}: 아바타 80px`);
    assert.ok(rules.some(rule => /craftedChapterMaster img\s*\)?\s*\{[^}]*width:\s*24px;\s*height:\s*24px/.test(rule)), `${name}: 칩 24px`);
    assert.ok(rules.every(rule => !/aspect-ratio|object-fit|animation|transition|--cd-[\w-]+\s*:/.test(rule)), `${name}: 금지 속성`);
  }
});

test('대표 상담 3종은 모든 장에 얻는 것을 쓰고, 산출물 카드는 결과 화면 코드를 근거로 3~5개 둔다', () => {
  for (const id of ['love-secret', 'new-year-expert', 'life-book']) {
    for (const [name, source] of sources(id)) {
      for (const chapter of source.chapters) assert.ok(chapter.gain?.trim(), `${name}: ${chapter.title}`);
      assert.ok(source.outcomes.length >= 3 && source.outcomes.length <= 5, `${name}: 산출물 ${source.outcomes.length}개`);
      for (const outcome of source.outcomes) {
        assert.ok(outcome.title && outcome.text, `${name}: ${outcome.title}`);
        assert.ok(fs.existsSync(outcome.evidence), `${name}: ${outcome.evidence}`);
      }
      const copy = JSON.stringify([source.chapters.map(chapter => chapter.gain), source.outcomes.map(({ title, text }) => [title, text])]);
      assert.doesNotMatch(copy, /경력|년차|보장|반드시|확실히|치료/, `${name}: 금지어`);
    }
  }
});

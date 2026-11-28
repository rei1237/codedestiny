import test from 'node:test';
import assert from 'node:assert/strict';

// 내 절기 리듬(月令): 12개 월지 모두 계절 그림·연이의 계절 이야기·생활 카드가 채워지고,
// 마음을 여는 속도가 계절 축(봄·여름 빠름 / 가을·겨울 느리지만 깊음 / 환절기 조율)을 따른다.
// 날짜는 2000~2001년 각 절입 구간의 가운데쯤이다(정오 출생).
const CASES = [
  ['寅', '2000-02-20', 'spring', 'fast'], ['卯', '2000-03-20', 'spring', 'fast'], ['辰', '2000-04-20', 'spring', 'tune'],
  ['巳', '2000-05-20', 'summer', 'fast'], ['午', '2000-06-20', 'summer', 'fast'], ['未', '2000-07-22', 'summer', 'tune'],
  ['申', '2000-08-22', 'autumn', 'slow'], ['酉', '2000-09-22', 'autumn', 'slow'], ['戌', '2000-10-22', 'autumn', 'tune'],
  ['亥', '2000-11-22', 'winter', 'slow'], ['子', '2000-12-22', 'winter', 'slow'], ['丑', '2001-01-20', 'winter', 'tune'],
];
const AXIS_WORDS = { fast: '빨리 열리고', slow: '깊고 오래가는', tune: '조율하는' };
const CARD_TITLES = ['타고난 성향', '사람을 받아들이는 방식', '연애할 때', '일과 돈', '컨디션'];
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('절기 리듬은 12개 월지마다 계절 그림·연이 이야기·생활 카드를 채운다', async () => {
  const { buildSajuSectionHtml } = await import('../../worker/lib/saju-section/report.js');
  const headlines = new Set();
  const bodies = new Set();
  for (const [branch, date, art, axis] of CASES) {
    const html = buildSajuSectionHtml({
      featureKey: 'saju_lifetime_bundle', birth: { calendarDate: date, calType: 'solar', hour: 12, minute: 0, timeKnown: true },
      gender: 'F', name: '검증', mode: 'pig', lang: 'ko',
    }).parts.terms;
    const label = `${branch}월 (${date})`;
    assert.match(html, new RegExp(`data-month-branch="${branch}"`), `${label} 월지`);
    assert.match(html, new RegExp(`<figure class="t24-art" data-season="${art}"><img src="/images/saju/nature/${art}-960\\.webp"`), `${label} 계절 그림`);
    assert.match(html, /yeoni-greet\.webp/, `${label} 연이 아이콘`);
    assert.ok(text(html).includes('연이의 계절 이야기'), `${label} 연이 표제`);
    const headline = (html.match(/<h3 class="t24-headline">([^<]+)<\/h3>/) || [])[1] || '';
    assert.ok(headline.length > 12 && /요$/.test(headline), `${label} 헤드라인: ${headline}`);
    headlines.add(headline);
    assert.ok(new RegExp(`class="t24-axis t24-axis--${axis}"`).test(html), `${label} 계절 축`);
    assert.ok(text(html).includes(AXIS_WORDS[axis]), `${label} 축 문구`);
    const cards = [...html.matchAll(/<article class="t24-domain[^"]*"><h4>([^<]+)<\/h4><p>([^<]+)<\/p><\/article>/g)];
    assert.deepEqual(cards.map((m) => m[1]), CARD_TITLES, `${label} 카드 제목`);
    for (const [, title, body] of cards) {
      assert.ok(body.length > 40, `${label} ${title} 본문이 짧다`);
      if (title !== '컨디션') bodies.add(body);
    }
    assert.match(html, /<div class="cd-speaker cd-speaker--yeoni"[\s\S]*?연이 한마디<\/strong><p style="margin:0">[^<]{20,}<\/p>/, `${label} 연이 한마디 말풍선`);
    assert.match(html, /<p class="t24-phase-note">[^<]{20,}<\/p>/, `${label} 구간 보정`);
    // 예전 행동 지침 문장과 단정형 요약은 나오지 않는다.
    assert.ok(!html.includes('t24-action'), `${label} 행동 지침 줄이 남았다`);
    assert.ok(!text(html).includes('사주의 기본 계절감입니다'), `${label} 옛 요약이 남았다`);
    assert.ok(text(html).includes('편이에요'), `${label} 단정하지 않는 말투`);
  }
  assert.equal(headlines.size, 12, '월지마다 헤드라인이 달라야 한다');
  assert.equal(bodies.size, 48, '월지마다 카드 본문이 달라야 한다');
});

test('영냥이 모드 절기 리듬은 영냥이 얼굴·표제만 쓰고 연이 표제를 남기지 않는다', async () => {
  const { buildSajuSectionHtml } = await import('../../worker/lib/saju-section/report.js');
  const html = buildSajuSectionHtml({
    featureKey: 'saju_lifetime_bundle', birth: { calendarDate: '2000-02-20', calType: 'solar', hour: 12, minute: 0, timeKnown: true },
    gender: 'F', name: '검증', mode: 'neo', lang: 'ko',
  }).parts.terms;
  assert.match(html, /yeongnyangi-listen\.webp/, '영냥이 아이콘');
  assert.match(html, /<div class="cd-speaker cd-speaker--nyang"[\s\S]*?영냥이 한마디<\/strong>/, '영냥이 한마디 말풍선');
  for (const word of ['영냥이의 계절 이야기', '영냥이가 본 ']) assert.ok(text(html).includes(word), word);
  assert.ok(!/yeoni-|cd-speaker--yeoni/.test(html), '연이 그림이 남았다');
  assert.ok(!/(^|[^냥])연이/.test(text(html)), '연이 표제가 남았다');
});
// 말투는 모드를 따른다: 영냥이 절기 본문은 반말("너")만, 연이 절기 본문은 해요체만 쓴다.
const BANMAL_END = /[가-힣](?:이야|거야|있어|없어|돼|해|줘|가|봐)[.!]/;
const YO_END = /[가-힣]요[.!]/;
const renderPart = async (date, mode, part) => {
  const { buildSajuSectionHtml } = await import('../../worker/lib/saju-section/report.js');
  return buildSajuSectionHtml({
    featureKey: 'saju_lifetime_bundle', birth: { calendarDate: date, calType: 'solar', hour: 12, minute: 0, timeKnown: true },
    gender: 'F', name: '검증', mode, lang: 'ko',
  }).parts[part];
};

test('영냥이 절기 본문은 12개 월지 모두 반말이고 당신·해요체가 없다', async () => {
  for (const [branch, date] of CASES) {
    const body = text(await renderPart(date, 'neo', 'terms'));
    assert.match(body, BANMAL_END, `${branch}월 반말 문장`);
    assert.ok(!body.includes('당신'), `${branch}월에 당신이 남았다`);
    assert.ok(!YO_END.test(body), `${branch}월에 해요체가 섞였다: ${(body.match(YO_END) || [])[0]}`);
  }
});

test('연이 절기 본문은 12개 월지 모두 반말 어미를 쓰지 않는다', async () => {
  for (const [branch, date] of CASES) {
    const body = text(await renderPart(date, 'pig', 'terms'));
    assert.ok(!BANMAL_END.test(body), `${branch}월에 반말이 섞였다: ${(body.match(BANMAL_END) || [])[0]}`);
  }
});

test('영냥이 모드 일주 요약은 dayReading 의 영냥이 갈래를 쓴다', async () => {
  const { dayReading } = await import('../../lib/saju/reading-depth.mjs');
  const neoSummary = [].concat(dayReading('戊申', 'neo').summary)[0];
  const pigSummary = [].concat(dayReading('戊申').summary)[0];
  assert.notEqual(neoSummary, pigSummary);
  const neo = text(await renderPart('2000-02-20', 'neo', 'ilju'));
  const pig = text(await renderPart('2000-02-20', 'pig', 'ilju'));
  assert.ok(neo.includes(neoSummary) && !neo.includes(pigSummary), '영냥이 일주 요약');
  assert.ok(pig.includes(pigSummary) && !pig.includes(neoSummary), '연이 일주 요약');
});

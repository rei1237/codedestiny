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
    assert.match(html, /<p class="t24-tip"><strong>연이 한마디<\/strong>[^<]{20,}<\/p>/, `${label} 연이 한마디`);
    assert.match(html, /<p class="t24-phase-note">[^<]{20,}<\/p>/, `${label} 구간 보정`);
    // 예전 행동 지침 문장과 단정형 요약은 나오지 않는다.
    assert.ok(!html.includes('t24-action'), `${label} 행동 지침 줄이 남았다`);
    assert.ok(!text(html).includes('사주의 기본 계절감입니다'), `${label} 옛 요약이 남았다`);
    assert.ok(text(html).includes('편이에요'), `${label} 단정하지 않는 말투`);
  }
  assert.equal(headlines.size, 12, '월지마다 헤드라인이 달라야 한다');
  assert.equal(bodies.size, 48, '월지마다 카드 본문이 달라야 한다');
});

// 홈(/ggulggul/) 신뢰 띠 + 비교 섹션. 한국어 전용 구역이라 빌드 때 이 모듈의 키에서 문구를 읽는다.
// 수치는 저장소에 근거가 있는 것만 쓴다(공개 기록 날짜·언론 보도일). 사용자 수·평점은 근거 데이터가 없어 넣지 않는다.
import { trustRecordCopy } from './trust-record.mjs';
import { LATEST_PRESS_COVERAGE } from '../seo/press-coverage.mjs';

export const HOME_TRUST_COMPARE_COPY = Object.freeze({
  'homeTrust.label': '꿀꿀 운세를 믿을 수 있는 이유',
  'homeTrust.record.title': '2024년 공개 글 기록',
  'homeTrust.record.sub': trustRecordCopy.publicLink,
  'homeTrust.press.title': '스타트업데일리 보도',
  'homeTrust.calc.title': '명식은 계산으로',
  'homeTrust.calc.sub': '만세력 명식은 AI 생성이 아니에요',
  'homeTrust.free.title': '기본 결과 무료',
  'homeTrust.free.sub': 'AI 심층 상담만 별도 유료',
  'homeCompare.title': '일반적인 방식과 이렇게 달라요',
  'homeCompare.old.head': '일반적인 방식',
  'homeCompare.new.head': '꿀꿀 운세',
  'homeCompare.old.1': '무엇부터 눌러야 할지 몰라 헤매요',
  'homeCompare.new.1': '지금 마음에 걸리는 상황부터 골라요',
  'homeCompare.old.2': '결과를 보려면 먼저 결제부터 해요',
  'homeCompare.new.2': '만세력과 기본 풀이는 무료로 먼저 봐요',
  'homeCompare.old.3': '한자와 전문용어가 가득해요',
  'homeCompare.new.3': '쉬운 말로 풀어 주고 뜻도 함께 알려줘요',
  'homeCompare.old.4': '한 번 보고 나면 다시 찾기 어려워요',
  'homeCompare.new.4': '구매한 결과는 보관함에서 다시 열어봐요',
});

export function ht(key) {
  const value = HOME_TRUST_COMPARE_COPY[key];
  if (typeof value !== 'string' || !value) throw new Error(`Missing home trust/compare copy: ${key}`);
  return value;
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderTrustBar() {
  if (!trustRecordCopy.href || !LATEST_PRESS_COVERAGE.url || !LATEST_PRESS_COVERAGE.dateLabel) throw new Error('Missing trust bar source');
  const items = [
    { href: trustRecordCopy.href, title: ht('homeTrust.record.title'), sub: ht('homeTrust.record.sub') },
    { href: LATEST_PRESS_COVERAGE.url, title: ht('homeTrust.press.title'), sub: LATEST_PRESS_COVERAGE.dateLabel, external: true },
    { title: ht('homeTrust.calc.title'), sub: ht('homeTrust.calc.sub') },
    { title: ht('homeTrust.free.title'), sub: ht('homeTrust.free.sub') },
  ];
  const inner = (item) => `<span class="yh-trustbar__mark" aria-hidden="true"></span><span class="yh-trustbar__text"><strong>${esc(item.title)}</strong><span>${esc(item.sub)}</span></span>`;
  return `<section class="yh-trustbar" aria-label="${esc(ht('homeTrust.label'))}" data-cd-no-trans data-cd-korean-only><ul class="yh-trustbar__list">${items.map((item) => `<li class="yh-trustbar__item">${item.href ? `<a href="${esc(item.href)}"${item.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${inner(item)}</a>` : `<div>${inner(item)}</div>`}</li>`).join('')}</ul></section>`;
}

export function renderCompareSection() {
  const rows = [1, 2, 3, 4];
  const list = (side, mark) => `<ul class="yh-compare__list">${rows.map((n) => `<li><span class="yh-compare__icon" aria-hidden="true">${mark}</span><span>${esc(ht(`homeCompare.${side}.${n}`))}</span></li>`).join('')}</ul>`;
  return `<section class="yh-compare" aria-labelledby="yhCompareTitle" data-cd-no-trans data-cd-korean-only><h2 class="yh-block__title" id="yhCompareTitle">${esc(ht('homeCompare.title'))}</h2><div class="yh-compare__grid"><article class="yh-compare__col yh-compare__col--old"><h3>${esc(ht('homeCompare.old.head'))}</h3>${list('old', '✗')}</article><article class="yh-compare__col yh-compare__col--new"><h3>${esc(ht('homeCompare.new.head'))}</h3>${list('new', '✓')}</article></div></section>`;
}

// 메인 "지금 많이 찾는 상담 TOP5" 화면 조각(2026-11-21 사용자 요청: 도화서원처럼 실제 인기 순위).
//
// - 데이터: GET /api/popular-services (최근 30일 실제 구매 순위, 건수 없음). 표본이 적은 자리는 "추천".
// - 🔴 fail-closed: 응답이 없거나 이상하면 섹션을 통째로 지운다. 가짜 순위를 그리지 않는다.
// - 렌더 차단 CSS(yehwa-home.css·app CSS)는 건드리지 않으려고 스타일을 여기서 늦게 넣는다(W4 마스터 모션과 같은 방식).
// - 분석은 popular_top5_click 하나만 쏜다 — data-cd-service-id·data-cd-funnel-section 을 달지 않아
//   홈 select_item·home_section_click 수치에 섞이지 않는다.
// - 한국어 전용 구역(data-cd-korean-only, 문서 lang 이 ko 가 아니면 CSS 로 숨김). 쓰는 곳: app/components/PopularTop5.tsx(`/`), js/core/yehwa-home.mjs(`/ggulggul/`).
// 롤백: POPULAR_TOP5_ENABLED=false — 섹션도, 요청도 생기지 않는다.

import { findPopularService, POPULAR_TOP_N, POPULAR_WINDOW_DAYS } from './popular-services.mjs';

export const POPULAR_TOP5_ENABLED = true;
export const POPULAR_TOP5_ENDPOINT = '/api/popular-services';
// 행 높이 고정(64px) × 5 + 머리글. 자리를 미리 잡아 두어 데이터가 와도 아래 내용이 밀리지 않는다.
export const POPULAR_TOP5_RESERVED_HEIGHT = 452;

const STYLE_ID = 'cd-popular-top5-style';
const CSS = `.cd-pop5{box-sizing:border-box;min-height:${POPULAR_TOP5_RESERVED_HEIGHT}px;margin:24px auto;max-width:640px;padding:20px 16px;border:1px solid var(--cd-yehwa-line);border-radius:var(--cd-r-card,20px);background:var(--cd-surface);color:var(--cd-text)}`
  + '.cd-pop5__head{margin:0 0 12px}.cd-pop5__title{margin:0;font-size:20px;line-height:1.4;font-weight:700;color:var(--cd-text)}'
  + '.cd-pop5__period{margin:4px 0 0;font-size:14px;line-height:1.6;color:var(--cd-text-muted)}'
  + '.cd-pop5__list{list-style:none;margin:0;padding:0}.cd-pop5__item+.cd-pop5__item{border-top:1px solid var(--cd-yehwa-line)}'
  + '.cd-pop5__link{display:flex;align-items:center;gap:12px;height:64px;padding:0 4px;color:var(--cd-text);text-decoration:none;border-radius:12px}'
  + '.cd-pop5__link:focus-visible{outline:none;box-shadow:var(--cd-focus-ring)}@media (hover:hover){.cd-pop5__link:hover .cd-pop5__name{text-decoration:underline}}'
  + '.cd-pop5__badge{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:28px;padding:0 8px;box-sizing:border-box;border-radius:var(--cd-r-pill,999px);font-size:15px;font-weight:700;line-height:1;border:1px solid var(--cd-yehwa-line-deep);color:var(--cd-text);background:var(--cd-accent-soft)}'
  + '.cd-pop5__badge--curated{font-size:13px;font-weight:600;background:transparent;color:var(--cd-text-muted)}'
  + '.cd-pop5__img{flex:0 0 auto;width:44px;height:44px;border-radius:12px;object-fit:cover;background:var(--cd-accent-soft)}'
  + '.cd-pop5__name{flex:1 1 auto;min-width:0;font-size:17px;line-height:1.5;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  + '.cd-pop5__arrow{flex:0 0 auto;color:var(--cd-text-muted)}'
  + 'html:not([lang|=ko]) .cd-pop5{display:none!important}'
  + '.cd-pop5__note{margin:8px 0 0;font-size:13px;line-height:1.6;color:var(--cd-text-muted)}';

function ensureStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.append(style);
}

function apiUrl(view) {
  const base = String(view?.__CD_API_BASE_URL || view?.CODE_DESTINY_API_BASE_URL || '').replace(/\/+$/, '');
  return `${base}${POPULAR_TOP5_ENDPOINT}`;
}

function formatAsOf(asOf) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(asOf || ''));
  return match ? `${Number(match[2])}월 ${Number(match[3])}일 기준` : '';
}

/** 응답을 화면용 행으로 바꾼다. 하나라도 이상하면 null(섹션 숨김). */
export function toPopularRows(payload) {
  if (!payload || payload.ok !== true || !Array.isArray(payload.items) || payload.items.length !== POPULAR_TOP_N) return null;
  const rows = [];
  for (const [index, item] of payload.items.entries()) {
    const service = findPopularService(item?.featureKey);
    const source = item?.source === 'sales' ? 'sales' : item?.source === 'curated' ? 'curated' : '';
    if (!service || !source || Number(item.rank) !== index + 1) return null;
    rows.push({ rank: index + 1, source, service });
  }
  // 판매 순위는 늘 앞쪽에 몰려 있어야 한다(추천 뒤에 판매 순위가 오면 응답이 이상한 것).
  const firstCurated = rows.findIndex((row) => row.source === 'curated');
  if (firstCurated >= 0 && rows.slice(firstCurated).some((row) => row.source === 'sales')) return null;
  return rows;
}

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function renderPopularTop5(section, payload, { surface = 'home' } = {}) {
  const doc = section.ownerDocument;
  const rows = toPopularRows(payload);
  if (!rows) return false;
  const hasSales = rows.some((row) => row.source === 'sales');
  const hasCurated = rows.some((row) => row.source === 'curated');

  const head = el(doc, 'div', 'cd-pop5__head');
  const title = el(doc, 'h2', 'cd-pop5__title', '지금 많이 찾는 상담 TOP5');
  title.id = `cdPop5Title-${surface}`;
  section.setAttribute('aria-labelledby', title.id);
  const asOf = formatAsOf(payload.asOf);
  const period = hasSales
    ? `최근 ${POPULAR_WINDOW_DAYS}일 구매 기준${asOf ? ` · ${asOf}` : ''}`
    : `최근 ${POPULAR_WINDOW_DAYS}일 구매가 아직 적어 추천 상담을 먼저 보여 드려요`;
  head.append(title, el(doc, 'p', 'cd-pop5__period', period));

  const list = el(doc, 'ol', 'cd-pop5__list');
  for (const row of rows) {
    const item = el(doc, 'li', 'cd-pop5__item');
    const link = el(doc, 'a', 'cd-pop5__link');
    link.href = row.service.href;
    link.dataset.cdPop5Rank = String(row.rank);
    link.dataset.cdPop5Source = row.source;
    link.dataset.cdPop5Service = row.service.id;
    const badge = row.source === 'sales'
      ? el(doc, 'span', 'cd-pop5__badge', String(row.rank))
      : el(doc, 'span', 'cd-pop5__badge cd-pop5__badge--curated', '추천');
    if (row.source === 'sales') badge.setAttribute('aria-label', `${row.rank}위`);
    const img = el(doc, 'img', 'cd-pop5__img');
    img.src = row.service.image;
    img.width = 44;
    img.height = 44;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    const arrow = el(doc, 'span', 'cd-pop5__arrow', '›');
    arrow.setAttribute('aria-hidden', 'true');
    link.append(badge, img, el(doc, 'span', 'cd-pop5__name', row.service.name), arrow);
    item.append(link);
    list.append(item);
  }

  section.replaceChildren(head, list);
  if (hasSales && hasCurated) section.append(el(doc, 'p', 'cd-pop5__note', '‘추천’은 구매 표본이 적은 자리를 채운 운영진 추천이에요.'));
  section.dataset.cdPop5State = 'ready';
  return true;
}

/**
 * section 에 TOP5 를 채운다. 실패하면 section 을 지우고 false.
 * @param {HTMLElement} section 비어 있는 자리(높이는 호출부나 여기 CSS 가 잡는다)
 * @param {{surface?: string, fetchImpl?: Function, removeOnFail?: boolean}} [options]
 */
export async function mountPopularTop5(section, { surface = 'home', fetchImpl, removeOnFail = true } = {}) {
  const doc = section?.ownerDocument;
  const view = doc?.defaultView;
  if (!POPULAR_TOP5_ENABLED || !doc || !view || section.dataset.cdPop5State) return false;
  section.dataset.cdPop5State = 'loading';
  section.classList.add('cd-pop5');
  section.setAttribute('data-cd-no-trans', '');
  section.setAttribute('data-cd-korean-only', '');
  ensureStyle(doc);

  let payload = null;
  try {
    const doFetch = fetchImpl || view.fetch?.bind(view);
    const response = await doFetch(apiUrl(view), { credentials: 'omit', headers: { Accept: 'application/json' } });
    if (response?.ok) payload = await response.json();
  } catch {
    payload = null;
  }

  if (!section.isConnected || !renderPopularTop5(section, payload, { surface })) {
    // React 가 가진 노드는 React 가 치운다(removeOnFail:false). 정적 셸에서는 여기서 지운다.
    if (removeOnFail) section.remove(); else section.replaceChildren();
    section.dataset.cdPop5State = 'failed';
    return false;
  }

  section.addEventListener('click', (event) => {
    const link = event.target?.closest?.('a[data-cd-pop5-rank]');
    if (!link) return;
    try {
      if (typeof view.cdTrack === 'function') view.cdTrack('popular_top5_click', {
        rank: Number(link.dataset.cdPop5Rank),
        source: link.dataset.cdPop5Source,
        service_id: link.dataset.cdPop5Service,
        surface,
      });
    } catch {}
  });
  return true;
}

/** `/ggulggul/` 정적 셸: 상황별 고르기 뒤(없으면 "모든 운세 보기" 앞)에 자리를 만들고 채운다. */
export function mountPopularTop5InShell(doc) {
  if (!POPULAR_TOP5_ENABLED || !doc?.defaultView || doc.querySelector('[data-cd-pop5-shell]')) return;
  if (!String(doc.documentElement.lang || 'ko').toLowerCase().startsWith('ko')) return;
  // 앱 셸은 `/` 의 !IS_APP_BUILD 와 맞춰 넣지 않는다.
  if (doc.defaultView.__cdAppContext?.isApp?.()) return;
  const home = doc.querySelector('#cdHomeFunnel [data-yh-home]');
  if (!home) return;
  const anchor = home.querySelector(':scope > .yh-situations');
  const before = home.querySelector(':scope > .yh-all');
  if (!anchor && !before) return;
  const section = doc.createElement('section');
  section.dataset.cdPop5Shell = '';
  if (anchor) anchor.after(section); else before.before(section);
  mountPopularTop5(section, { surface: 'ggulggul' });
}

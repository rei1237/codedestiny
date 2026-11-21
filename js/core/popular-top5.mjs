// 메인 "지금 많이 찾는 상담 TOP5" 화면 조각(2026-11-21 사용자 요청: 도화서원처럼 실제 인기 순위).
//
// - 데이터: GET /api/popular-services (최근 30일 실제 구매 순위, 건수 없음). 표본이 적은 자리는 "추천".
// - 1~5위 숫자는 늘 붙인다(2026-11-22 사용자 결정). 판매 표본이 적어 운영진 추천으로 채운 줄에는 "추천" 꼬리표를 달아
//   판매 순위와 구분한다. 응답이 없거나 이상하면 전부 추천 꼬리표인 목록을 그리고 머리글에 그 사실을 적는다.
// - 즉시 표시(2026-11-22): 스타일은 styles/popular-top5.css(정적), 자리와 스켈레톤은 정적 셸 생성기·React SSR 이 미리 그린다.
//   직전 응답은 localStorage 에 KST 날짜 키로 두고 마운트 즉시 그린 뒤, 요청(3초 타임아웃)으로 새로 고친다.
// - 분석은 popular_top5_click 하나만 쏜다 — data-cd-service-id·data-cd-funnel-section 을 달지 않아
//   홈 select_item·home_section_click 수치에 섞이지 않는다.
// - 한국어 전용 구역(data-cd-korean-only, 문서 lang 이 ko 가 아니면 CSS 로 숨김). 쓰는 곳: app/components/PopularTop5.tsx(`/`), js/core/yehwa-home.mjs(`/ggulggul/`).
// 롤백: POPULAR_TOP5_ENABLED=false — 섹션도, 요청도 생기지 않는다.

import { findPopularService, POPULAR_TOP_N, POPULAR_WINDOW_DAYS, rankPopularServices } from './popular-services.mjs';

export const POPULAR_TOP5_ENABLED = true;
export const POPULAR_TOP5_ENDPOINT = '/api/popular-services';
// 행 높이 고정(64px) × 5 + 머리글. 자리를 미리 잡아 두어 데이터가 와도 아래 내용이 밀리지 않는다.
export const POPULAR_TOP5_RESERVED_HEIGHT = 484;

const CACHE_KEY = 'cd-pop5-cache-v1';
export const POPULAR_TOP5_FETCH_TIMEOUT_MS = 3000;
const TITLE = '지금 많이 찾는 상담 TOP5';

/** 첫 페인트용 스켈레톤(정적 셸 생성기·React SSR·모듈이 같은 마크업을 쓴다). 스타일은 styles/popular-top5.css. */
export function popularTop5SkeletonHtml() {
  const row = '<li class="cd-pop5__item"><span class="cd-pop5__link cd-pop5__link--skel"><span class="cd-pop5__skel cd-pop5__skel--rank"></span><span class="cd-pop5__skel cd-pop5__skel--thumb"></span><span class="cd-pop5__skel cd-pop5__skel--name"></span></span></li>';
  return `<div class="cd-pop5__head"><h2 class="cd-pop5__title">${TITLE}</h2><p class="cd-pop5__period">불러오는 중이에요</p></div><ol class="cd-pop5__list" aria-hidden="true">${row.repeat(POPULAR_TOP_N)}</ol>`;
}

function apiUrl(view) {
  const base = String(view?.__CD_API_BASE_URL || view?.CODE_DESTINY_API_BASE_URL || '').replace(/\/+$/, '');
  return `${base}${POPULAR_TOP5_ENDPOINT}`;
}

function formatAsOf(asOf) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(asOf || ''));
  return match ? `${Number(match[2])}월 ${Number(match[3])}일 기준` : '';
}

/** 응답을 화면용 행으로 바꾼다. 하나라도 이상하면 null(추천 목록으로 대체). */
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

export function renderPopularTop5(section, payload, { surface = 'home', fallback = false } = {}) {
  const doc = section.ownerDocument;
  const rows = toPopularRows(payload);
  if (!rows) return false;
  const hasSales = rows.some((row) => row.source === 'sales');
  const hasCurated = rows.some((row) => row.source === 'curated');

  const head = el(doc, 'div', 'cd-pop5__head');
  const title = el(doc, 'h2', 'cd-pop5__title', TITLE);
  title.id = `cdPop5Title-${surface}`;
  section.setAttribute('aria-labelledby', title.id);
  section.removeAttribute('aria-label');
  const asOf = formatAsOf(payload.asOf);
  const period = fallback
    ? '지금은 운영진이 고른 추천 상담을 먼저 보여 드려요'
    : hasSales
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
    const badge = el(doc, 'span', `cd-pop5__rank cd-pop5__rank--${row.rank}`, String(row.rank));
    badge.setAttribute('aria-label', `${row.rank}위`);
    const thumb = el(doc, 'span', 'cd-pop5__thumb');
    const img = el(doc, 'img', 'cd-pop5__img');
    img.src = row.service.image;
    img.width = 44;
    img.height = 44;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    thumb.append(img);
    const body = el(doc, 'span', 'cd-pop5__body');
    body.append(el(doc, 'span', 'cd-pop5__name', row.service.name));
    if (row.source === 'curated') body.append(el(doc, 'span', 'cd-pop5__tag', '추천'));
    const arrow = el(doc, 'span', 'cd-pop5__arrow', '›');
    arrow.setAttribute('aria-hidden', 'true');
    link.append(badge, thumb, body, arrow);
    item.append(link);
    list.append(item);
  }

  section.replaceChildren(head, list);
  if (hasSales && hasCurated) section.append(el(doc, 'p', 'cd-pop5__note', '‘추천’ 꼬리표는 구매 표본이 적은 자리를 운영진이 채운 상담이에요.'));
  section.dataset.cdPop5State = 'ready';
  if (fallback) section.dataset.cdPop5Fallback = ''; else delete section.dataset.cdPop5Fallback;
  return true;
}

/** API 가 없거나 이상할 때 쓰는 추천 목록(전부 curated — 순위 숫자 + "추천" 꼬리표). */
export function popularFallbackPayload() {
  return { ok: true, asOf: '', windowDays: POPULAR_WINDOW_DAYS, items: rankPopularServices([]) };
}

function kstDate(now = Date.now()) {
  return new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function readCache(view) {
  try {
    const cached = JSON.parse(view.localStorage.getItem(CACHE_KEY) || 'null');
    return cached && cached.day === kstDate() && toPopularRows(cached.payload) ? cached.payload : null;
  } catch {
    return null;
  }
}

function writeCache(view, payload) {
  try { view.localStorage.setItem(CACHE_KEY, JSON.stringify({ day: kstDate(), payload })); } catch {}
}

async function fetchPayload(view, fetchImpl, timeoutMs) {
  const controller = typeof view.AbortController === 'function' ? new view.AbortController() : null;
  let timer = null;
  try {
    const doFetch = fetchImpl || view.fetch?.bind(view);
    const request = doFetch(apiUrl(view), { credentials: 'omit', headers: { Accept: 'application/json' }, signal: controller?.signal });
    const timeout = new Promise((resolve) => { timer = setTimeout(() => { controller?.abort(); resolve(null); }, timeoutMs); });
    const response = await Promise.race([request, timeout]);
    return response?.ok ? await response.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * section 에 TOP5 를 채운다. 오늘 받은 응답이 있으면 바로 그리고, 요청이 실패·지연(3초)되면 추천 목록으로 자리를 지킨다.
 * 그것도 못 그리면 section 을 지우고 false.
 * @param {HTMLElement} section 자리(스켈레톤이 미리 그려져 있을 수 있다)
 * @param {{surface?: string, fetchImpl?: Function, removeOnFail?: boolean, timeoutMs?: number}} [options]
 */
export async function mountPopularTop5(section, { surface = 'home', fetchImpl, removeOnFail = true, timeoutMs = POPULAR_TOP5_FETCH_TIMEOUT_MS } = {}) {
  const doc = section?.ownerDocument;
  const view = doc?.defaultView;
  if (!POPULAR_TOP5_ENABLED || !doc || !view || section.dataset.cdPop5State) return false;
  section.dataset.cdPop5State = 'loading';
  section.classList.add('cd-pop5');
  section.setAttribute('data-cd-no-trans', '');
  section.setAttribute('data-cd-korean-only', '');
  if (!section.querySelector('.cd-pop5__list')) section.innerHTML = popularTop5SkeletonHtml();

  const cached = readCache(view);
  if (cached) renderPopularTop5(section, cached, { surface });

  const fresh = await fetchPayload(view, fetchImpl, timeoutMs);
  if (fresh && toPopularRows(fresh)) writeCache(view, fresh);

  const rendered = section.isConnected
    && (renderPopularTop5(section, fresh, { surface })
      || (cached && section.dataset.cdPop5State === 'ready')
      || renderPopularTop5(section, popularFallbackPayload(), { surface, fallback: true }));
  if (!rendered) {
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

/** `/ggulggul/` 정적 셸: 생성기가 미리 그린 자리를 채운다. 자리가 없으면 상황별 고르기 뒤(없으면 "모든 운세 보기" 앞)에 만든다. */
export function mountPopularTop5InShell(doc) {
  if (!POPULAR_TOP5_ENABLED || !doc?.defaultView) return;
  const existing = doc.querySelector('[data-cd-pop5-shell]');
  if (existing) {
    // 생성기가 미리 그린 자리(스켈레톤). 한국어가 아니거나 앱 셸이면 자리째 치운다.
    const korean = String(doc.documentElement.lang || 'ko').toLowerCase().startsWith('ko');
    if (!korean || doc.defaultView.__cdAppContext?.isApp?.()) { existing.remove(); return; }
    mountPopularTop5(existing, { surface: 'ggulggul' });
    return;
  }
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

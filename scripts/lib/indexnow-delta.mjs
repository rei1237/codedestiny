// Canonical sitemap entries are the only source of public notification URLs.
// Public editorial pages whose segments overlap API/private service names.
// Exact paths only: dashboards, results and future child routes stay blocked.
const PUBLIC_SERVICE_PAGES = new Set([
  '/business/api/',
  '/business/api/docs/',
  '/yeongnyangi/',
  '/yeongnyangi/1000-won-fortune/',
  '/yeongnyangi/season-1/',
  // 1화(프롤로그)는 항상 공개·색인 대상이라 사이트맵에 있다. 2화부터의 회차는 noindex 라 넣지 않는다.
  '/yeongnyangi/season-1/prologue/',
  // 0139351c3(11/14)에서 사이트맵에 들어갔지만 여기 빠져, 그 뒤 모든 운영 제출이 29행 throw 로 0건이었다.
  '/yeongnyangi/faq/',
]);

// 사이트맵 <url> 블록의 loc 중 공개 알림 정책이 거부하는 것을 돌려준다. indexnow-submit.mjs 와 같은 파싱이다.
// 하나라도 있으면 buildSubmissionState 가 throw 해 그 릴리스의 제출 전체가 0건이 된다.
export function sitemapLocsRejectedByPolicy(xml, host) {
  const locs=[...String(xml).matchAll(/<url>[\s\S]*?<\/url>/g)].map(match=>/<loc>([^<]+)<\/loc>/.exec(match[0])?.[1]?.trim()).filter(Boolean);
  return {total:locs.length,rejected:locs.filter(loc=>!publicNotificationUrl(loc,host))};
}

export function publicNotificationUrl(value, host) {
  try {
    const url=new URL(value);
    if(url.protocol!=='https:' || url.host!==host || url.username || url.password || url.search || url.hash) return false;
    const path=decodeURIComponent(url.pathname);
    if(PUBLIC_SERVICE_PAGES.has(url.pathname))return url.href===value;
    if(/(?:^|\/)(?:api|admin|auth|login|signup|profile|profiles|payment|payments|checkout|points|result|results|library|callback|debug|test)(?:\/|$)/i.test(path))return false;
    if(path.startsWith('/yeongnyangi/'))return false;
    return url.href===value;
  }catch{return false;}
}

export function buildSubmissionState(entries, ledger, host) {
  const urls={};
  for(const entry of entries){
    if(!publicNotificationUrl(entry.loc,host))throw new Error('[indexnow] Non-public sitemap URL rejected');
    const path=new URL(entry.loc).pathname;
    urls[entry.loc]=`${entry.lastmod}:${ledger.routes?.[path]?.signature || ledger.routes?.[path.replace(/\/$/,'')]?.signature || ''}`;
  }
  return {version:1,host,urls};
}

// 429·5xx·시간 초과(status null)만 다시 보낸다. 그 밖의 4xx 는 키·호스트 문제라 다시 보내도 같은 답이 온다.
// Retry-After(초 또는 HTTP 날짜)를 먼저 따르고, 없으면 2·4·8초로 늘린다. 어느 쪽이든 60초를 넘기지 않는다.
export const INDEXNOW_MAX_RETRIES=3;
export function indexNowRetryDelayMs(status, retryAfter, attempt, now=Date.now()) {
  if(attempt>=INDEXNOW_MAX_RETRIES)return null;
  if(status!==null && status!==429 && !(status>=500 && status<=599))return null;
  const fallback=Math.min(60000,2000*2**attempt);
  const header=String(retryAfter||'').trim();
  if(!header)return fallback;
  const ms=/^\d+$/.test(header)?Number(header)*1000:Date.parse(header)-now;
  return Number.isFinite(ms)?Math.min(60000,Math.max(0,ms)):fallback;
}

export function selectSubmissionDelta(current, previous, extra=[]) {
  if(previous && (previous.version!==1 || previous.host!==current.host || !previous.urls))throw new Error('[indexnow] Invalid submission checkpoint');
  const before=previous?.urls || {};
  const changed=Object.keys(current.urls).filter(url=>current.urls[url]!==before[url]);
  const removed=Object.keys(before).filter(url=>!(url in current.urls));
  const allowed=new Set([...Object.keys(current.urls),...Object.keys(before)]);
  for(const url of [...removed,...extra]){
    if(!allowed.has(url) || !publicNotificationUrl(url,current.host))throw new Error('[indexnow] Extra or removed URL violates public sitemap policy');
  }
  return [...new Set([...changed,...removed,...extra])];
}

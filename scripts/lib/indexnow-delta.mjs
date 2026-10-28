// Canonical sitemap entries are the only source of public notification URLs.
export function publicNotificationUrl(value, host) {
  try {
    const url=new URL(value);
    if(url.protocol!=='https:' || url.host!==host || url.username || url.password || url.search || url.hash) return false;
    const path=decodeURIComponent(url.pathname);
    if(/(?:^|\/)(?:api|admin|auth|login|signup|profile|profiles|payment|payments|checkout|points|result|results|library|callback|debug|test)(?:\/|$)/i.test(path))return false;
    if(path.startsWith('/yeongnyangi/') && !['/yeongnyangi/','/yeongnyangi/1000-won-fortune/'].includes(path))return false;
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

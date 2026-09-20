// Canonical sitemap entries are the only source of public notification URLs.
export function publicNotificationUrl(value, host) {
  try {
    const url=new URL(value);
    if(url.protocol!=='https:' || url.host!==host || url.username || url.password || url.search || url.hash) return false;
    const path=decodeURIComponent(url.pathname);
    if(/(?:^|\/)(?:api|admin|auth|login|signup|profile|profiles|payment|payments|checkout|points|result|results|library|callback|debug|test)(?:\/|$)/i.test(path))return false;
    if(path.startsWith('/yeongnyangi/') && path!=='/yeongnyangi/1000-won-fortune/')return false;
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

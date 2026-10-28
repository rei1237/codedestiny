// Presentation state only. No birth records, questions, access rights or payment data.
const memory = new Map();
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  memory.clear();
  if (!event.key || event.key === 'cd:yeongnyangi:guide-hidden-until') guideHiddenUntil = 0;
});
const prefix = 'cd:first-visit:v1:';
const statuses = new Set(['new', 'offered', 'active', 'dismissed', 'complete']);
const yeongnyangiGuideCookie = 'cd_yeongnyangi_guide_hidden';
const yeongnyangiGuideUntil = 'cd:yeongnyangi:guide-hidden-until';
let guideHiddenUntil = 0;
export function readYeongnyangiGuideHidden() {
  try { if (typeof document !== 'undefined' && document.cookie.split(';').some(part => part.trim().startsWith(yeongnyangiGuideCookie + '='))) return true; }
  catch { /* Try the local fallback. */ }
  try { guideHiddenUntil = Math.max(guideHiddenUntil, Number(localStorage.getItem(yeongnyangiGuideUntil)) || 0); }
  catch { /* Current page fallback. */ }
  return guideHiddenUntil > Date.now();
}
export function hideYeongnyangiGuide(days = 1) {
  const maxAge = days === 1 ? 86400 : 31536000;
  guideHiddenUntil = Date.now() + maxAge * 1000;
  try { localStorage.setItem(yeongnyangiGuideUntil, String(guideHiddenUntil)); } catch { /* Optional storage. */ }
  try {
    if (typeof document === 'undefined') return;
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${yeongnyangiGuideCookie}=1; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
  } catch { /* Optional cookie; the current page can still dismiss the guide. */ }
}
export function clearYeongnyangiGuideHidden() {
  guideHiddenUntil = 0;
  try { localStorage.removeItem(yeongnyangiGuideUntil); } catch { /* Optional storage. */ }
  try { if (typeof document !== 'undefined') document.cookie = `${yeongnyangiGuideCookie}=; Max-Age=0; Path=/; SameSite=Lax`; }
  catch { /* Optional cookie. */ }
}
export function firstVisitScope() {
  try {
    const user = JSON.parse(localStorage.getItem('fortune_auth_user') || 'null');
    return String(user?.id || user?.userId || user?._id || user?.uid || 'guest').trim().toLowerCase() || 'guest';
  } catch { return 'guest'; }
}
const keyFor = (service, scope) => prefix + service + ':' + scope;
export function readFirstVisit(service, scope = firstVisitScope()) {
  const key = keyFor(service, scope);
  let value = memory.get(key);
  if (!value) { try { value = JSON.parse(localStorage.getItem(key) || 'null'); } catch { /* Optional storage. */ } }
  return value && statuses.has(value.status) ? {status:value.status, step:Number(value.step) || 0} : {status:'new', step:0};
}
export function writeFirstVisit(service, status, step = 0, scope = firstVisitScope()) {
  if (!statuses.has(status)) return;
  const previous = readFirstVisit(service, scope);
  if (previous.status === status && previous.step === step) return;
  const value = {status, step};
  memory.set(keyFor(service, scope), value);
  try { localStorage.setItem(keyFor(service, scope), JSON.stringify(value)); } catch { /* Current page still works. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cd:first-visit-change'));
}
export function firstVisitEvent(service, event, step = 0) {
  if (typeof window !== 'undefined') window.cdTrack?.('first_visit_' + event, {service, step, content_version:'first-visit-v1'});
}
export function firstVisitLogin(service) {
  if (firstVisitScope() !== 'guest' || readFirstVisit(service).status !== 'active') return;
  try { sessionStorage.setItem(prefix + 'login', JSON.stringify({service, at:Date.now()})); } catch { /* Optional resume. */ }
}
export function resumeFirstVisitLogin(service) {
  const scope = firstVisitScope();
  if (scope === 'guest') return;
  try {
    const pending = JSON.parse(sessionStorage.getItem(prefix + 'login') || 'null');
    if (pending?.service !== service) return;
    sessionStorage.removeItem(prefix + 'login');
    if (Date.now() - pending.at < 10 * 60 * 1000 && Date.now() >= pending.at && readFirstVisit(service, scope).status === 'new') {
      writeFirstVisit(service, 'active', 1, scope);
    }
  } catch { /* Optional resume. */ }
}
export function firstVisitHome(location, service) {
  const path = location.pathname.replace(/\/$/, '');
  if (path !== (service === 'ggulggul' ? '/ggulggul' : '/yeongnyangi')) return false;
  if (location.hash && location.hash !== '#home') return false;
  return [...new URLSearchParams(location.search).keys()].every(key => /^(utm_[a-z_]+|gclid|fbclid|msclkid)$/.test(key));
}
export function firstVisitOverlayBusy(doc) {
  return [...doc.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"], #cdCookieConsent.is-visible, [aria-labelledby="analytics-consent-title"]')].some(el => !el.hidden && el.getClientRects().length);
}


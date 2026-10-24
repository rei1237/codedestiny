// Presentation state only. No birth records, questions, access rights or payment data.
const memory = new Map();
if (typeof window !== 'undefined') window.addEventListener('storage', () => memory.clear());
const prefix = 'cd:first-visit:v1:';
const statuses = new Set(['new', 'offered', 'active', 'dismissed', 'complete']);
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


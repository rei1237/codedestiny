// Display preferences only. Reward eligibility and grants remain server-owned.
import { readFirstVisit } from '../first-visit-state.mjs';

const hidden = new Map();
const readings = new Set();
const keyFor = accountId => `cd:activation-guide:hidden-until:${accountId}`;

export function isActivationGuideHidden(accountId, now = Date.now()) {
  if (!accountId) return true;
  let until = hidden.get(accountId) || 0;
  try { until = Math.max(until, Number(localStorage.getItem(keyFor(accountId))) || 0); } catch { /* In-page fallback. */ }
  return until > now;
}

export function hideActivationGuideToday(accountId, now = Date.now()) {
  if (!accountId) return;
  const korea = new Date(now + 9 * 3600000);
  const until = Date.UTC(korea.getUTCFullYear(), korea.getUTCMonth(), korea.getUTCDate() + 1) - 9 * 3600000;
  hidden.set(accountId, until);
  try { localStorage.setItem(keyFor(accountId), String(until)); } catch { /* In-page fallback. */ }
  window.dispatchEvent(new Event('cd:activation-guide-hidden'));
}

export function shouldShowTutorialGuide(data) {
  if (!data?.accountId || isActivationGuideHidden(data.accountId)) return false;
  const tutorial = data.tutorial;
  return tutorial?.guideEligible === true && tutorial.eligible === true
    && !tutorial.legacySignupReceived && !tutorial.receipt
    && !hasViewedFreeSaju(data.accountId)
    && readFirstVisit('ggulggul', data.accountId).status !== 'complete';
}

export function rememberFreeSajuViewed(accountId) {
  if (!accountId) return;
  readings.add(accountId);
  try { localStorage.setItem(`cd:activation-guide:saju-viewed:${accountId}`, '1'); } catch { /* In-page fallback. */ }
}

function hasViewedFreeSaju(accountId) {
  try { return readings.has(accountId) || localStorage.getItem(`cd:activation-guide:saju-viewed:${accountId}`) === '1'; }
  catch { return readings.has(accountId); }
}

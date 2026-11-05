import { TUTORIAL_REWARD } from './core/activation-reward-policy.mjs';
import { hasCompleteSnuGift, mountSnuReadingContents } from './core/snu-reading-flow.mjs';
import { hideActivationGuideToday, isActivationGuideHidden, rememberFreeSajuViewed, shouldShowTutorialGuide } from './core/activation-guide-state.mjs';

const prefix = '/api/activation-rewards/';
let account = null, campus = null, revision = 0, tutorialPending = false, pendingTutorialProfileId = '', sajuViewed = false;

async function request(path, body) {
  const init = { method: body === undefined ? 'GET' : 'POST', credentials: 'include', cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) };
  const result = typeof window.fetchJsonWithAuth === 'function'
    ? await window.fetchJsonWithAuth(prefix + path, init)
    : await fetch(prefix + path, init);
  const data = typeof result.json === 'function' ? await result.json() : result.payload || result;
  if (result.ok === false || data.ok !== true) throw new Error(data.message || '연이가 선물을 확인 중이에요. 잠시 후 다시 확인해 주세요.');
  return data;
}

function renderNote(text, href, action) {
  if (!document.documentElement.lang.startsWith('ko')) return;
  document.getElementById('cdActivationGuide')?.remove();
  const note = document.createElement('aside'); note.id = 'cdActivationGuide'; note.className = 'cd-activation-guide';
  note.setAttribute('aria-label', '연이의 월정석과 학교 선물 안내');
  const image = document.createElement('img'); image.src = '/assets/service-intro/yeoni-gift.webp'; image.width = 54; image.height = 61; image.alt = '';
  const copy = document.createElement('div'), label = document.createElement('p'); label.textContent = text;
  const link = document.createElement('a'); link.href = href; link.textContent = action;
  const close = document.createElement('button'); close.type = 'button'; close.textContent = '오늘 하루 보지 않기';
  close.addEventListener('click', () => { hideActivationGuideToday(account?.accountId); note.remove(); });
  copy.append(label, link, close); note.append(image, copy); document.body.append(note);
}

function showAccountNote() {
  document.getElementById('cdActivationGuide')?.remove();
  if (!account || isActivationGuideHidden(account.accountId)) return;
  if (campus?.verified && !hasCompleteSnuGift(campus))
    renderNote('등록한 SNULIFE 사주 선물을 이어서 열어보세요.', '/snu/', '등록한 사주 선물 확인하기');
  else if (!sajuViewed && shouldShowTutorialGuide(account))
    renderNote(`연이랑 무료 만세력을 보고 월정석 ${TUTORIAL_REWARD.amount}개를 받아볼까요?`, '/first-steps/', '첫걸음 안내 보기');
}

async function refresh() {
  const turn = ++revision;
  try {
    const [reward, school] = await Promise.all([request('status'), request('snu/status')]);
    if (turn !== revision) return;
    account = reward; campus = school;
    if (sajuViewed) rememberFreeSajuViewed(account.accountId);
    showAccountNote(); showSnuContents(); void startPendingTutorial();
  } catch { if (turn === revision) { account = null; campus = null; document.getElementById('cdActivationGuide')?.remove(); } }
}

async function startPendingTutorial() {
  if (!account?.tutorial?.eligible || !pendingTutorialProfileId || tutorialPending) return;
  const profileId = pendingTutorialProfileId, turn = revision; tutorialPending = true;
  try {
    const result = await request('tutorial/start', { profileId });
    if (turn === revision) { account = result; pendingTutorialProfileId = ''; showAccountNote(); }
  } catch { /* The explicit first-steps page handles retries; do not interrupt the reading. */ }
  finally { if(turn === revision)tutorialPending = false; }
}
function showSnuContents() {
  const current = window.__cdGetCurrentDestinyProfile?.();
  const displayedId = window.cdBirthScopeCurrentProfileId?.();
  const profile = window.G_PILLARS && current && String(current.id || current.profileId || '') === String(displayedId || '') ? current : null;
  mountSnuReadingContents(document, campus, profile);
}
document.addEventListener('destinyProfileChanged', () => document.getElementById('snuReadingContents')?.remove());
window.addEventListener('cd:saju-summary-ready', () => {
  sajuViewed = true; rememberFreeSajuViewed(account?.accountId);
  document.getElementById('cdActivationGuide')?.remove();
  showSnuContents();
  const profileId = typeof window._sajuPromptResolveProfileId === 'function' ? window._sajuPromptResolveProfileId() : '';
  if (!profileId) return;
  pendingTutorialProfileId = profileId; void startPendingTutorial();
});

export async function showLegacyCompletionBenefits() {
  if (!document.documentElement.lang.startsWith('ko')) return;
  const turn = revision;
  try {
    const data = await request('first-paid/claim', {});
    if(turn !== revision)return;
    account = data; showAccountNote();
    const key = `cd:legacy-benefits:${data.accountId}`;
    try { if (sessionStorage.getItem(key)) return; } catch { return; }
    if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
    try { sessionStorage.setItem(key, '1'); } catch { return; }
    const dialog = document.createElement('dialog'); dialog.className = 'cd-activation-dialog'; dialog.setAttribute('aria-labelledby', 'cdActivationResultTitle');
    const art = document.createElement('img'); art.src = '/assets/service-intro/yeoni-gift.webp'; art.width = 92; art.height = 104; art.alt = '';
    const heading = document.createElement('h2'); heading.id = 'cdActivationResultTitle'; heading.textContent = '다음 이야기도, 천천히 골라요.';
    const balance = document.createElement('p'); balance.textContent = `내 월정석 ${data.wallet.balance.toLocaleString('ko-KR')}개 · ${data.wallet.minimumProductKRW.toLocaleString('ko-KR')}원 이상 대상 서비스 할인에 쓸 수 있어요.`;
    const note = document.createElement('p'); note.textContent = `후기 공개 승인 후 월정석 ${data.policy.review.amount.toLocaleString('ko-KR')}개를 받을 수 있어요. 솔직한 후기라면 별점과 관계없어요.`;
    const links = document.createElement('nav');
    for (const item of [...data.recommendations.map(row => ({ href: row.href, title: row.title })), { href: '/reviews/?write=1', title: '솔직한 후기 남기기' }, { href: '/first-steps/', title: '내 월정석과 첫 이용 혜택 보기' }]) {
      const link = document.createElement('a'); link.href = item.href; link.textContent = item.title; links.append(link);
    }
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '지금은 상담을 더 읽을게요'; close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove());
    dialog.append(art, heading, balance, note, links, close); document.body.append(dialog); dialog.showModal();
  } catch { /* Saved consultations remain readable when benefits are unavailable. */ }
}

window.addEventListener('cd:activation-reward-updated', () => { document.getElementById('cdActivationGuide')?.remove(); void refresh(); });
window.addEventListener('cd:activation-guide-hidden', showAccountNote);
window.addEventListener('storage', showAccountNote);
window.addEventListener('cd:destiny-profile-server-ready', () => { void refresh(); });
window.addEventListener('cd:auth-changed', event => {
  revision++; account = null; campus = null; pendingTutorialProfileId = ''; tutorialPending = false; sajuViewed = false;
  document.querySelector('.cd-activation-dialog')?.remove(); document.getElementById('cdActivationGuide')?.remove();
  document.getElementById('snuReadingContents')?.remove();
  if (String(event.detail?.event || '').toLowerCase() !== 'logout') void refresh();
});
if (window.__cdDestinyProfileServerReady) void refresh();

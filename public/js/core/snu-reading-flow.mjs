import { SNU_SAJU_FEATURES } from './snu-campus-policy.mjs';

export const SNU_READING_URL = '/ggulggul/?action=cdOneStepFreeSajuEntry&entry=snulife';

export function hasCompleteSnuGift(state) {
  return Boolean(state?.verified && state.profileId && SNU_SAJU_FEATURES.every(({ featureKey }) => state.unlockedFeatureKeys?.includes(featureKey)));
}

// Both inputs must have just been read from the signed-in account's server endpoints.
// This chooses a presentation profile; content APIs still enforce every entitlement.
export function resolveSnuReadingProfile(state, profiles) {
  if (!state?.verified || !state.profileId || !Array.isArray(profiles)) return null;
  return profiles.find(profile => String(profile.id || profile.profileId || '') === String(state.profileId)) || null;
}

export function mountSnuReadingContents(document, state, profile) {
  const previous = document.getElementById('snuReadingContents');
  if (!profile || !state?.verified || String(profile.id || profile.profileId || '') !== state.profileId) { previous?.remove(); return; }
  const result = document.getElementById('resultPage');
  if (!result) return;
  const available = SNU_SAJU_FEATURES.filter(item => state.unlockedFeatureKeys?.includes(item.featureKey));
  if (!available.length) { previous?.remove(); return; }
  const signature = JSON.stringify([state.profileId, profile.name, available.map(item => item.featureKey)]);
  if (previous?.dataset.signature === signature) return;
  const open = previous?.open ?? true;
  previous?.remove();
  const section = document.createElement('details');
  section.id = 'snuReadingContents'; section.className = 'saju-gift-contents'; section.open = open; section.dataset.signature = signature;
  const summary = document.createElement('summary'); summary.textContent = '이용 가능한 풀이';
  const owner = document.createElement('p'); owner.textContent = `${profile.name || '내 프로필'} · 열린 콘텐츠 ${available.length}종`;
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', '이용 가능한 사주 풀이');
  available.forEach(item => {
    const link = document.createElement('a'); link.textContent = item.title;
    const target = item.featureKey === 'section_summary' ? 'summaryCard' : item.featureKey === 'section_daewun' ? 'daewunCard' : item.featureKey.replace(/^rpt_/, '');
    link.href = item.featureKey === 'animal-destiny-unlock' ? '/saju/animal-destiny/'
      : item.featureKey === 'saju-career-style' ? '/saju/career-style/'
      : item.featureKey === 'rpt_secretHouseEntryCard' ? '/secret-house_real.html'
      : '#' + target;
    if (item.featureKey === 'rpt_secretHouseEntryCard') link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const win = document.defaultView;
      if (typeof win.openSecretHouseRoute === 'function') { event.preventDefault(); win.openSecretHouseRoute(); }
    });
    if (item.featureKey.startsWith('rpt_')) link.addEventListener('click', event => {
      if (item.featureKey === 'rpt_secretHouseEntryCard') return;
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const win = document.defaultView;
      if (typeof win.openSajuFunFeature === 'function') { event.preventDefault(); win.openSajuFunFeature(target); }
    });
    nav.append(link);
  });
  const note = document.createElement('p'); note.textContent = '현재 프로필의 선물이에요. AI가 답변을 생성하는 상담은 별도 상품이에요.';
  section.append(summary, owner, nav, note);
  const header = document.getElementById('sajuReadingHeader');
  if (header) header.after(section); else result.prepend(section);
}

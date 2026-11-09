import { SPIRITS, SPIRIT_BONUS_PERCENT, spriteUrl, mobileSpriteUrl, findSpirit, spiritExp } from './profile-characters.mjs';
import { elementBadgeMarkup } from './profile-element-badge.mjs';
import { mountPetGarden } from './profile-pet-card.mjs';
import { adoptHoneyManager } from './profile-honey-manager.mjs';
export { elementBadgeMarkup };

const mounts = new WeakMap();
const previews = new Map();
let activeMount = null;
const koreaDate = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
function refreshDay() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'hidden' && activeMount?.root.isConnected && activeMount.date !== koreaDate()) {
    mountCharacterCard(activeMount.root, activeMount.profile, activeMount.options);
  }
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('focus', refreshDay);
  document.addEventListener('visibilitychange', refreshDay);
  window.addEventListener('cd:auth-changed', () => {
    previews.clear();
    if (activeMount?.root.isConnected) mountCharacterCard(activeMount.root, activeMount.profile, activeMount.options);
  });
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const pad = value => String(value).padStart(2, '0');
const errors = { INSUFFICIENT_HONEY_DROPS: '꿀방울이 부족해요. 출석으로 모은 뒤 다시 확인해 주세요.', SPIRIT_NOT_OWNED: '먼저 이 정령을 해금해 주세요.', SPIRIT_REQUEST_MISMATCH: '요청이 일치하지 않아요. 도감을 다시 열어 주세요.' };
export function spriteMarkup(id, name, animate = true) {
  const url = spriteUrl(id);
  const mobileUrl = mobileSpriteUrl(id);
  return url ? `<span class="pc-sprite${animate ? '' : ' pc-sprite--still'}" role="img" aria-label="${escape(name)}" style="--pc-sprite:url('${url}');--pc-sprite-mobile:url('${mobileUrl}')"></span>` : '';
}
export function birthInput(profile) {
  const birth = profile?.birth || {};
  const place = profile?.location || {};
  return { birthDate: birth.year && birth.month && birth.day ? `${birth.year}-${pad(birth.month)}-${pad(birth.day)}` : '',
    birthTime: birth.hour != null && birth.minute != null ? `${pad(birth.hour)}:${pad(birth.minute)}` : '',
    birthTimeUnknown: birth.timeUnknown === true || profile?.birthTimeUnknown === true,
    gender: profile?.gender || profile?.sex || '', calendarType: birth.calType || 'solar',
    ...(place.tz && place.lng != null ? { birthPlace: { longitude: Number(place.lng), latitude: Number(place.lat), timezone: place.tz } } : {}) };
}
function unwrapResult(result) {
  const data = result?.data;
  if (!result?.ok || !data?.ok || data.degraded) throw Object.assign(new Error(errors[data?.code] || data?.message || '잠시 불러오지 못했어요. 다시 시도해 주세요.'), { code:data?.code });
  return data;
}
export async function loadProfileCharacterPreview(profile, { request }) {
  const input = birthInput(profile);
  const key = JSON.stringify([koreaDate(), input]);
  if (previews.has(key)) return previews.get(key);
  const job = Promise.resolve(request('/api/rpg/character-preview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })).then(unwrapResult).catch(error => { previews.delete(key); throw error; });
  if (previews.size >= 12) previews.clear();
  previews.set(key, job);
  return job;
}
export async function mountCharacterCard(root, profile, options) {
  if (activeMount?.root && activeMount.root !== root) mounts.get(activeMount.root)?.controller.abort();
  activeMount = { root, profile, options, date: koreaDate() };
  if (!document.querySelector('link[data-profile-characters]')) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/styles/profile-characters.css'; link.dataset.profileCharacters = ''; document.head.append(link);
  }
  if (!document.querySelector('link[data-profile-pet]')) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/styles/profile-pet.css'; link.dataset.profilePet = ''; document.head.append(link);
  }
  const panel = root.querySelector('[data-profile-character]');
  if (!panel) return;
  mounts.get(root)?.controller.abort();
  const target = document.createElement('div');
  const honeyHost = document.createElement('div');
  honeyHost.className = 'pg-honey-host pg-garden';
  honeyHost.id = 'petHoneyManager';
  honeyHost.setAttribute('data-pet-honey-host', '');
  panel.replaceChildren(target, honeyHost);
  const oldAvatar = root.querySelector('.dp-mc-avatar');
  if (oldAvatar) oldAvatar.replaceChildren();
  root.querySelector('[data-pc-element]')?.replaceChildren();
  options.onQuestExp?.(15);
  const token = { controller: new AbortController() }; mounts.set(root, token);
  adoptHoneyManager(honeyHost, token.controller.signal);
  const owner = options.owner();
  const current = () => mounts.get(root) === token && target.isConnected && options.owner() === owner;
  const api = async (path, body) => {
    const result = await options.request(path, { method: body === undefined ? 'GET' : 'POST', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
    if (!current()) throw new Error('STALE_PROFILE');
    return unwrapResult(result);
  };
  let preview, state = null, pending = false;
  target.innerHTML = '<p role="status">나의 일주 캐릭터를 만나고 있어요.</p>';
  try {
    preview = await loadProfileCharacterPreview(profile, { request: options.request });
    if (!current()) return;
  } catch (error) {
    if (!current()) return;
    const incomplete = error.code === 'PROFILE_INCOMPLETE' || error.code === 'CHARACTER_UNAVAILABLE';
    target.innerHTML = `<p role="status">${escape(error.message)}</p><button type="button" data-pc-retry>${incomplete ? '프로필 완성하기' : '다시 확인하기'}</button>`;
    target.querySelector('[data-pc-retry]').onclick = () => incomplete ? window.dpEditProfile?.(profile.id || profile.profileId) : mountCharacterCard(root, profile, options);
    return;
  }
  const character = preview.character;
  const elementSlot = root.querySelector('[data-pc-element]');
  if (elementSlot) elementSlot.innerHTML = elementBadgeMarkup(character.element);
  const title = root.querySelector('[data-pc-title]');
  if (title) { title.textContent = `${character.ganji} · ${character.name}`; title.classList.add('pc-summary'); }
  function drawAvatar() {
    const spirit = findSpirit(state?.equippedId);
    options.onQuestExp?.(spiritExp('quest', 15, state?.ownedIds || [], state?.equippedId));
    const avatar = root.querySelector('.dp-mc-avatar');
    if (avatar) { avatar.classList.add('pc-avatar'); avatar.innerHTML = ''; }
    const bonus = target.querySelector('[data-pc-bonus]');
    if (bonus) bonus.textContent = spirit ? `${spirit.name}과 함께 · 출석·생활 미션 EXP +${SPIRIT_BONUS_PERCENT}%` : '작은 실천을 쌓아 함께 성장해요.';
    const equipment = root.querySelector('[data-pc-equipment]');
    if (equipment) equipment.textContent = spirit ? '정령 장착' : '나의 일주';
  }
  target.innerHTML = `<div data-pet-garden></div>
    <p class="pc-bonus" data-pc-bonus></p>
    <details class="pc-details"><summary>캐릭터 소개 · 정령 도감</summary><div class="pc-description"><p>${escape(character.summary)}</p><h4>나의 강점</h4><p>${escape(character.strength)}</p><h4>마음에 둘 점</h4><p>${escape(character.caution)}</p><h4>오늘의 작은 실천</h4><p>${escape(character.advice)}</p></div>
    <section aria-label="정령 도감"><h4>함께할 정령</h4><p>이미 보유한 정령과 함께할 수 있어요. 꿀방울은 꿀꿀운세 지정 상품에서 사용해요. 장착한 정령 한 마리만 성장 보너스를 줘요.</p><p data-pc-wallet role="status"></p><button type="button" data-pc-base>내 일주 캐릭터로 돌아가기</button><div class="pc-collection" data-pc-collection></div><p data-pc-status role="status" aria-live="polite"></p><button type="button" data-pc-reload>보유 정령 다시 확인하기</button></section></details>`;
  target.querySelector('[data-pet-garden]').after(honeyHost);
  drawAvatar();
  const status = message => { if (current()) target.querySelector('[data-pc-status]').textContent = message; };
  function drawCollection() {
    if (!current()) return;
    const balance = target.querySelector('[data-pc-wallet]');
    balance.textContent = honeyHost.querySelector('[data-cd-honey-widget]') ? '잔액과 사용처는 위의 출석·꿀단지에서 확인해 주세요.' : state ? `보유 꿀방울 ${state.balance}개` : owner ? '보유 정령을 확인해 주세요.' : '로그인하면 보유 정령을 확인할 수 있어요.';
    target.querySelector('[data-pc-base]').disabled = !state?.equippedId || pending;
    target.querySelector('[data-pc-collection]').innerHTML = SPIRITS.map(spirit => {
      const owned = state?.ownedIds.includes(spirit.id), equipped = state?.equippedId === spirit.id;
      return `<div class="pc-specimen">${spriteMarkup(spirit.id, spirit.name, false)}<strong>${escape(spirit.name)}</strong><span>출석·미션 EXP +${SPIRIT_BONUS_PERCENT}%</span><button type="button" data-pc-spirit="${spirit.id}" ${pending || !state || equipped || !owned ? 'disabled' : ''}>${equipped ? '함께하는 중' : owned ? '함께하기' : '신규 해금 종료'}</button></div>`;
    }).join('');
    drawAvatar();
  }
  async function refresh() {
    if (!owner) { drawCollection(); return; }
    try { state = await api('/api/rpg/characters'); status(''); drawAvatar(); if (target.querySelector('.pc-details').open) drawCollection(); }
    catch (error) { if (current()) { state = null; drawAvatar(); status(error.message); } }
  }
  target.querySelector('.pc-details').addEventListener('toggle', () => { if (target.querySelector('.pc-details').open) drawCollection(); });
  target.querySelector('[data-pc-reload]').onclick = refresh;
  target.addEventListener('click', async event => {
    const button = event.target.closest('[data-pc-spirit],[data-pc-base]');
    if (!current() || !button || button.disabled || pending || !state) return;
    const id = button.dataset.pcSpirit || null;
    const owned = id === null || state.ownedIds.includes(id);
    if (!owned) return;
    pending = true; drawCollection(); status('정령과 함께할 준비 중이에요.');
    try {
      state = await api('/api/rpg/characters/equip', { characterId: id });
      status(id ? '정령과 함께해요. 다음 출석·생활 미션부터 보너스가 적용돼요.' : '내 일주 캐릭터로 돌아왔어요.');
      window.dispatchEvent(new CustomEvent('cd:honey-refresh'));
      window.CdHoney?.refresh(false);
      try { localStorage.setItem('cd:honey-refresh', String(Date.now())); } catch { /* Other tabs refresh when storage is available. */ }
    } catch (error) { status(error.message); }
    finally { pending = false; if (current()) drawCollection(); }
  }, { signal: token.controller.signal });
  await Promise.all([refresh(), mountPetGarden(target.querySelector('[data-pet-garden]'), {
    profileId: profile.profileId || profile.id, preview, owner, api, current, signal: token.controller.signal, honeyHost,
  })]);
}

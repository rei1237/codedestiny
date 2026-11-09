import { pawOffsets } from './profile-pet-anchors.mjs';
import { PET_EGGS, PET_CARE_HONEY, petArtUrl, petReaction } from './profile-pet.mjs';
import { adoptHoneyManager, petBond } from './profile-honey-manager.mjs';
import { petAppearanceKey, PET_TRIM_HUES, petCharmMarkup } from './profile-pet-appearance.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const requestId = () => crypto.randomUUID();
const icons = {
  feed: '<path d="M4 12h16c-.5 6-3 8-8 8s-7.5-2-8-8Z" fill="currentColor" fill-opacity=".12"/><path d="M7 12c-1-3 2-5 4-3 1-4 5-4 6 0 2-1 4 1 3 3M8 17h3M7 4v2m5-3v2m5-1v2"/>',
  play: '<circle cx="12" cy="13" r="8" fill="currentColor" fill-opacity=".12"/><path d="m7 7 5 5 7-3M12 12l-1 9M6 16l5-1 6 4M5 3l1 2m12-3-1 2"/>',
  sleep: '<path d="M18 13A8 8 0 0 1 9 4a8 8 0 1 0 9 9Z" fill="currentColor" fill-opacity=".12"/><path d="m17 3 1 2 2 1-2 1-1 2-1-2-2-1 2-1ZM7 14c1 1 3 1 4 0"/>',
  fortune: '<rect x="6" y="4" width="13" height="17" rx="3" fill="currentColor" fill-opacity=".12"/><path d="M3 16V5a3 3 0 0 1 3-3h8m-2 6 1.2 2.5L16 12l-2.8 1.3L12 16l-1.2-2.7L8 12l2.8-1.5ZM10 19h5"/>',
};
const icon = id => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[id] + '</svg>';

export function petSpriteMarkup(pet, action = 'idle') {
  const sleeping = action === 'sleep', unique = pet.unique;
  const row = action === 'feed' ? 1 : action === 'play' ? 2 : 0;
  const source = petArtUrl(pet.speciesId, sleeping ? 'sleep' : 'body');
  const look = !unique && petAppearanceKey(pet.appearance) ? pet.appearance : null;
  const tile = index => '--part-x:' + (index % 4 * 100 / 3) + '%;--part-y:' + (Math.floor(index / 4) * 100 / 3) + '%';
  const outfit = look ? '<span class="pg-outfit" style="--pet-trim:' + PET_TRIM_HUES[look.trim] + 'deg"><span class="pg-outfit-headwear" data-part="' + look.headwear + '" style="' + tile(look.headwear) + '"></span><span class="pg-outfit-neckwear" style="' + tile(look.neckwear) + '"></span><span class="pg-outfit-prop" style="' + tile(look.prop) + '"></span><span class="pg-outfit-charm">' + petCharmMarkup(look.charm) + '<span class="pg-outfit-stamp"></span></span></span>' : '';
  const start = sleeping ? 12 : row * 4;
  const frames = (pawOffsets[pet.speciesId] || []).slice(start, start + 4);
  const style = [
    ...frames.map(([x,y], i) => '--paw-' + i + ':' + x + '% ' + y + '%'),
    '--pet-body:url(' + source + ')', '--pet-row:' + (row * 50) + '%',
    '--pet-idle-duration:' + (4.8 + pet.traits.expression * .8) + 's', '--pet-idle-delay:' + (-pet.traits.expression * .4) + 's',
    '--pet-pattern:' + ((look?.pattern ?? pet.traits.pattern) * 100 / 3) + '%', '--pet-accessory:' + (pet.traits.accessory * 100 / 7) + '%',
    '--pet-egg-row:' + (PET_EGGS.findIndex(egg => egg.id === pet.eggType) * 50) + '%',
  ].join(';');
  // The unique mascot keeps its authored face, hat and color in every action.
  return '<span class="pg-pet pg-pet--' + action + ' pg-pet--' + pet.speciesId + '" data-coat="' + pet.coat + '" role="img" aria-label="' + escape(pet.name + (sleeping ? ', 포근하게 잠자는 중' : action === 'feed' ? ', 먹이를 먹는 중' : action === 'play' ? ', 함께 노는 중' : ', 당신을 반기는 중')) + '" style="' + style + '"><span class="pg-body"></span>' + (!unique && !sleeping && !look ? '<span class="pg-pattern" aria-hidden="true"></span><span class="pg-accessory" aria-hidden="true"></span>' : '') + outfit + '</span>';
}

export async function mountPetGarden(target, { profileId, preview, owner, api, current, signal, honeyHost: parentHoneyHost }) {
  let data = null, busy = false, animation = 'idle', timer = null, fortuneOpen = false, failure = '', note = '';
  let loadVersion = 0;
  const valid = () => current() && target.isConnected && !signal.aborted;
  const pet = () => data?.pet;
  target.innerHTML = '<div data-pet-view></div>' + (parentHoneyHost ? '' : '<div class="pg-honey-host pg-garden" id="petHoneyManager" data-pet-honey-host></div>');
  const view = target.querySelector('[data-pet-view]');
  const honeyHost = parentHoneyHost || target.querySelector('[data-pet-honey-host]');
  if (!parentHoneyHost) adoptHoneyManager(honeyHost, signal);
  const flower = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 10C7-1 1 10 10 16 0 23 10 32 16 22c7 10 17 1 6-6C32 9 22-1 16 10Z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>';
  function announce(message) {
    note = message;
    const status = view.querySelector('[data-pet-status]');
    if (status) status.textContent = message;
  }
  function syncHoney() {
    window.dispatchEvent(new CustomEvent('cd:honey-refresh'));
    window.CdHoney?.refresh(false);
    try { localStorage.setItem('cd:honey-refresh', String(Date.now())); } catch { /* Storage is optional; server is authoritative. */ }
  }
  function walletLabel() {
    const wallet = window.CdHoney?.getState?.();
    return !owner || wallet?.guest ? '로그인 후 확인' : wallet?.error ? '다시 확인하기' : Number.isFinite(wallet?.balance) ? wallet.balance + '개' : data ? data.balance + '개' : '확인 중';
  }
  function bondMessage() {
    const attended = window.CdHoney?.getState?.()?.attended === true;
    if (data?.pet?.affection >= 100 && !attended) return '함께 쌓은 마음이 활짝 피었어요. 오늘도 곁에 있어요.';
    return petBond(data?.pet?.affection, attended).greeting;
  }
  function updateWallet() {
    if (!valid()) return;
    const balance = view.querySelector('[data-pet-wallet] strong');
    const label = '꿀방울 ' + walletLabel();
    if (balance && balance.textContent !== label) balance.textContent = label;
    const hint = view.querySelector('#petBondHint');
    const message = bondMessage();
    if (hint && hint.textContent !== message) hint.textContent = message;
  }
  function draw() {
    if (!valid()) return;
    const companion = pet(), fortune = data?.fortune || preview.fortune;
    const balance = walletLabel();
    target.setAttribute('aria-busy', String(busy || Boolean(owner && !data && !failure)));
    const bond = petBond(companion?.affection);
    const stage = companion
      ? '<div class="pg-stage" data-pet-stage><span class="pg-stage-branch" aria-hidden="true"></span>' + petSpriteMarkup(companion, animation) + '</div><div class="pg-companion-name"><strong>' + escape(companion.name) + '</strong>' + (companion.unique ? '<span class="pg-rarity">개발자의 영냥이 · 유니크</span>' : companion.rare ? '<span class="pg-rarity">드물게 만나는 친구</span>' : '<span>' + escape(preview.character.element) + '의 빛을 닮은 친구</span>') + '</div><p class="pg-reaction">' + escape(animation === 'sleep' ? '곁에서 포근하게 쉬고 있어요. 편할 때 깨워 주세요.' : petReaction(companion.affection, animation)) + '</p><div class="pg-affection"><div class="pg-bond-heading"><label for="petAffection">우리 사이 <b>' + companion.affection + '</b></label><span>' + bond.label + '</span></div><div class="pg-bond-track"><progress id="petAffection" max="100" value="' + companion.affection + '" aria-describedby="petBondHint">' + companion.affection + '/100</progress><span class="pg-bond-blooms" aria-hidden="true">' + [30, 70, 100].map(value => '<span class="' + (companion.affection >= value ? 'is-bloomed' : '') + '">' + flower + '</span>').join('') + '</span></div><p id="petBondHint">' + escape(bondMessage()) + '</p></div>'
      : owner && !data && !failure ? '<div class="pg-loading" role="status">' + flower + '<span>친구와 꿀단지를 만나고 있어요.</span></div>'
      : '<div class="pg-welcome"><h3>어떤 알과 만나볼까요?</h3><p>고른 알에서 나만의 운세 친구가 태어나요.</p></div><div class="pg-eggs">' + PET_EGGS.map((egg, index) => '<button type="button" data-pet-egg="' + egg.id + '" ' + (busy || !owner || !data ? 'disabled' : '') + '><span class="pg-egg" aria-hidden="true" style="background-position:' + (index * 50) + '% 0"></span><strong>' + egg.name + '</strong><span>부화하기</span></button>').join('') + '</div><p class="pg-egg-note">알은 장식의 분위기만 달라요. 희귀 친구를 만날 확률은 같아요.</p>';
    const actions = [['feed', '먹이주기'], ['play', '놀아주기'], ['sleep', animation === 'sleep' ? '깨우기' : '잠자기'], ['fortune', '오늘의 운세']].map(([id, label]) => {
      const done = id === 'feed' && companion?.fed || id === 'play' && companion?.played;
      return '<button type="button" class="pg-action pg-action--' + id + (done ? ' is-complete' : '') + '" data-pet-action="' + id + '" ' + (busy || (id !== 'fortune' && (!owner || !companion)) ? 'disabled' : '') + (id === 'fortune' ? ' aria-expanded="' + fortuneOpen + '" aria-controls="petDailyFortune"' : '') + (done ? ' aria-label="' + label + ' · 오늘 돌봄 완료, 다시 함께하기"' : '') + '><span class="pg-action-icon">' + icon(id) + '</span><span>' + label + '</span>' + (done ? '<svg class="pg-action-done" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') + '</button>';
    }).join('');
    view.innerHTML = '<section class="pg-garden" aria-label="나의 달빛 운세 정원"><div class="pg-wallet"><h3>나의 달빛 정원</h3><button type="button" data-pet-wallet aria-controls="petHoneyManager"><img src="/images/fortune-tea-house/honey-jar-bonus-v1.webp" width="36" height="36" alt=""><span>출석 · 꿀단지<strong>꿀방울 ' + escape(balance) + '</strong></span><svg class="pg-wallet-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v10m-4-4 4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' + stage + '<div class="pg-actions">' + actions + '</div>' + (owner ? '<div class="pg-care"><p class="pg-checklist"><span class="' + (companion?.fed ? 'is-complete' : '') + '">' + (companion?.fed ? '먹이 완료' : '먹이 기다리는 중') + '</span><span class="' + (companion?.played ? 'is-complete' : '') + '">' + (companion?.played ? '놀이 완료' : '놀이 기다리는 중') + '</span></p><p class="pg-reward">' + (data?.careRewardClaimed ? '오늘의 돌봄 꿀방울을 받았어요.' : '이 친구와 먹이·놀이를 모두 챙기면 꿀방울 +' + (data?.careHoney ?? PET_CARE_HONEY) + '개 · 계정당 하루 한 번') + '</p></div>' : '<p class="pg-login"><a href="/login/">로그인하고 알 부화하기</a><span>무료 오늘의 운세는 지금도 확인할 수 있어요.</span></p>') + '<section class="pg-fortune" id="petDailyFortune" ' + (fortuneOpen ? '' : 'hidden') + ' aria-label="오늘의 무료 운세"><h3>오늘의 흐름</h3><p class="pg-fortune-headline">' + escape(fortune?.headline || '오늘의 흐름을 불러오지 못했어요.') + '</p><p>' + escape(fortune?.advice || '잠시 후 다시 확인해 주세요.') + '</p></section><p class="pg-status' + (failure ? ' is-error' : '') + '" data-pet-status role="status" aria-live="polite">' + escape(failure || note) + '</p>' + (failure ? '<button type="button" data-pet-retry ' + (busy ? 'disabled' : '') + '>다시 확인하기</button>' : '') + '</section>';
  }
  async function refresh() {
    const version = ++loadVersion;
    if (!owner) { draw(); return; }
    failure = '';
    try { const result = await api('/api/rpg/pet?profileId=' + encodeURIComponent(profileId)); if (!valid() || version !== loadVersion) return; data = result; }
    catch (error) { if (!valid() || version !== loadVersion) return; failure = error.message; }
    if (data?.exclusiveSpecies && !data.pet) {
      try { const hatched = await api('/api/rpg/pet/hatch', { profileId, eggType: 'moon' }); if (!valid() || version !== loadVersion) return; data = hatched; }
      catch (error) { failure = error.message; }
    }
    draw();
  }
  target.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || !target.contains(button) || button.closest('[data-pet-honey-host]') || !valid() || button.disabled) return;
    if (button.hasAttribute('data-pet-wallet')) {
      const details = honeyHost.querySelector('.cdh-honey__details');
      if (details) { details.open = true; honeyHost.scrollIntoView?.({ block: 'nearest', behavior: 'auto' }); details.querySelector('summary')?.focus({ preventScroll: true }); }
      return;
    }
    if (busy) return;
    if (button.hasAttribute('data-pet-retry')) { busy = true; draw(); try { await refresh(); } finally { busy = false; draw(); } return; }
    const action = button.dataset.petAction;
    if (action === 'fortune') { fortuneOpen = !fortuneOpen; draw(); view.querySelector('[data-pet-action="fortune"]')?.focus({ preventScroll: true }); return; }
    if (action === 'sleep') {
      clearTimeout(timer);
      animation = animation === 'sleep' ? 'wake' : 'sleep';
      draw();
      view.querySelector('[data-pet-action="sleep"]')?.focus({ preventScroll: true });
      if (animation === 'wake') timer = setTimeout(() => {
        if (!valid()) return;
        const sprite = view.querySelector('.pg-pet--wake');
        animation = 'idle';
        if (sprite) sprite.classList.replace('pg-pet--wake', 'pg-pet--idle');
      }, 800);
      return;
    }
    if (!owner) return;
    loadVersion++; busy = true; failure = ''; note = ''; draw();
    const focusSelector = action ? '[data-pet-action="' + action + '"]' : '[data-pet-action="feed"]';
    try {
      if (button.dataset.petEgg) {
        data = await api('/api/rpg/pet/hatch', { profileId, eggType: button.dataset.petEgg });
        announce('반가워요. 이제 이 친구와 함께해요.');
      } else if (['feed', 'play'].includes(action)) {
        data = await api('/api/rpg/pet/care', { profileId, action, requestId: requestId() });
        clearTimeout(timer); animation = action;
        timer = setTimeout(() => {
          if (!valid()) return;
          animation = 'idle';
          const stage = view.querySelector('[data-pet-stage]');
          const sprite = stage?.querySelector('.pg-pet');
          if (sprite && data?.pet) sprite.outerHTML = petSpriteMarkup(data.pet, 'idle');
          const reaction = view.querySelector('.pg-reaction');
          if (reaction && data?.pet) reaction.textContent = petReaction(data.pet.affection);
        }, 3200);
        announce(data.rewarded ? '오늘의 돌봄 완료. 꿀방울 ' + data.rewarded + '개를 받았어요.' : data.firstCare ? '오늘의 돌봄을 기록했어요. 함께해줘서 고마워요.' : '오늘 돌봄은 완료했어요. 함께하는 시간은 계속 즐겨도 좋아요.');
        syncHoney();
      }
    } catch (error) { if (valid()) failure = error.message; }
    finally { busy = false; draw(); if (valid()) view.querySelector(focusSelector)?.focus({ preventScroll: true }); }
  }, { signal });
  const onRefresh = () => { if (valid() && !busy && document.visibilityState !== 'hidden') void refresh(); };
  window.addEventListener('focus', onRefresh, { signal });
  window.addEventListener('cd:honey-refresh', onRefresh, { signal });
  window.addEventListener('cd:honey-state', updateWallet, { signal });
  window.addEventListener('storage', event => { if (event.key === 'cd:honey-refresh') onRefresh(); }, { signal });
  document.addEventListener('visibilitychange', onRefresh, { signal });
  signal.addEventListener('abort', () => { clearTimeout(timer); loadVersion++; }, { once: true });
  draw();
  await refresh();
}

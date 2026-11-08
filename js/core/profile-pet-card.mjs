import { PET_EGGS, PET_CARE_HONEY, petArtUrl, petReaction } from './profile-pet.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const requestId = () => crypto.randomUUID();
const icons = {
  feed: '<path d="M4 10h16c0 6-3 9-8 9s-8-3-8-9ZM8 5v2m4-3v3m4-2v2"/>',
  play: '<circle cx="12" cy="12" r="8"/><path d="m7 6 4 6-2 7m2-7 8-2"/>',
  sleep: '<path d="M19 14a8 8 0 0 1-9-10 8 8 0 1 0 9 10Z"/>',
  fortune: '<path d="M7 4h10v16H7zM10 8h4m-2-2v4m-2 5h4m-4 3h3"/>',
};
const icon = id => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[id] + '</svg>';

export function petSpriteMarkup(pet, action = 'idle') {
  const sleeping = action === 'sleep', unique = pet.unique;
  const row = action === 'feed' ? 1 : action === 'play' ? 2 : 0;
  const source = petArtUrl(pet.speciesId, sleeping ? 'sleep' : 'body');
  const style = [
    '--pet-body:url(' + source + ')', '--pet-row:' + (row * 50) + '%',
    '--pet-idle-duration:' + (4.8 + pet.traits.expression * .8) + 's', '--pet-idle-delay:' + (-pet.traits.expression * .4) + 's',
    '--pet-pattern:' + (pet.traits.pattern * 100 / 3) + '%', '--pet-accessory:' + (pet.traits.accessory * 100 / 7) + '%',
    '--pet-egg-row:' + (PET_EGGS.findIndex(egg => egg.id === pet.eggType) * 50) + '%',
  ].join(';');
  // The unique mascot keeps its authored face, hat and color in every action.
  return '<span class="pg-pet pg-pet--' + action + ' pg-pet--' + pet.speciesId + '" data-coat="' + pet.coat + '" role="img" aria-label="' + escape(pet.name + (sleeping ? ', 포근하게 잠자는 중' : action === 'feed' ? ', 먹이를 먹는 중' : action === 'play' ? ', 함께 노는 중' : ', 당신을 반기는 중')) + '" style="' + style + '"><span class="pg-body"></span>' + (!unique && !sleeping ? '<span class="pg-pattern" aria-hidden="true"></span><span class="pg-accessory" aria-hidden="true"></span>' : '') + '</span>';
}

export async function mountPetGarden(target, { profileId, preview, owner, api, current, signal }) {
  let data = null, attendance = null, busy = false, animation = 'idle', timer = null, fortuneOpen = false, failure = '', note = '';
  let loadVersion = 0;
  const valid = () => current() && target.isConnected && !signal.aborted;
  const pet = () => data?.pet;
  function announce(message) {
    note = message;
    const status = target.querySelector('[data-pet-status]');
    if (status) status.textContent = message;
  }
  function syncHoney() {
    window.dispatchEvent(new CustomEvent('cd:honey-refresh'));
    window.CdHoney?.refresh(false);
    try { localStorage.setItem('cd:honey-refresh', String(Date.now())); } catch { /* Storage is optional; server is authoritative. */ }
  }
  function draw() {
    if (!valid()) return;
    const companion = pet(), fortune = data?.fortune || preview.fortune;
    target.setAttribute('aria-busy', String(busy));
    const stage = companion
      ? '<div class="pg-stage" data-pet-stage>' + petSpriteMarkup(companion, animation) + '</div><div class="pg-companion-name"><strong>' + escape(companion.name) + '</strong>' + (companion.unique ? '<span class="pg-rarity">개발자의 영냥이 · 유니크</span>' : companion.rare ? '<span class="pg-rarity">드물게 만나는 친구</span>' : '<span>' + escape(preview.character.element) + '의 빛을 닮은 친구</span>') + '</div><p class="pg-reaction">' + escape(animation === 'sleep' ? '곁에서 포근하게 쉬고 있어요. 편할 때 깨워 주세요.' : petReaction(companion.affection, animation)) + '</p><div class="pg-affection"><label for="petAffection">우리 사이 <b>' + companion.affection + '</b></label><progress id="petAffection" max="100" value="' + companion.affection + '">' + companion.affection + '/100</progress></div>'
      : '<div class="pg-welcome"><h3>어떤 알과 만나볼까요?</h3><p>고른 알에서 나만의 운세 친구가 태어나요.</p></div><div class="pg-eggs">' + PET_EGGS.map((egg, index) => '<button type="button" data-pet-egg="' + egg.id + '" ' + (busy || !owner || !data ? 'disabled' : '') + '><span class="pg-egg" aria-hidden="true" style="background-position:' + (index * 50) + '% 0"></span><strong>' + egg.name + '</strong><span>부화하기</span></button>').join('') + '</div><p class="pg-egg-note">알은 장식의 분위기만 달라요. 희귀 친구를 만날 확률은 같아요.</p>';
    const actions = [['feed', companion?.fed ? '먹이 한 번 더 주기' : '먹이주기'], ['play', companion?.played ? '한 번 더 놀아주기' : '놀아주기'], ['sleep', animation === 'sleep' ? '깨우기' : '잠자기'], ['fortune', '오늘의 운세']].map(([id, label]) => '<button type="button" data-pet-action="' + id + '" ' + (busy || (id !== 'fortune' && (!owner || !companion)) ? 'disabled' : '') + (id === 'fortune' ? ' aria-expanded="' + fortuneOpen + '" aria-controls="petDailyFortune"' : '') + '>' + icon(id) + '<span>' + label + '</span></button>').join('');
    target.innerHTML = '<section class="pg-garden" aria-label="나의 달빛 운세 정원"><div class="pg-wallet"><span>나의 달빛 정원</span><span>꿀방울 <strong>' + (owner ? data ? data.balance + '개' : '확인 중' : '로그인 후 확인') + '</strong></span></div>' + stage + '<div class="pg-actions">' + actions + '</div><section class="pg-fortune" id="petDailyFortune" ' + (fortuneOpen ? '' : 'hidden') + ' aria-label="오늘의 무료 운세"><h3>오늘의 흐름</h3><p class="pg-fortune-headline">' + escape(fortune?.headline || '오늘의 흐름을 불러오지 못했어요.') + '</p><p>' + escape(fortune?.advice || '잠시 후 다시 확인해 주세요.') + '</p></section>' + (owner ? '<div class="pg-daily"><button type="button" data-pet-attend ' + (busy || !attendance || attendance.attended ? 'disabled' : '') + '>' + (attendance?.attended ? '오늘 출석 완료' : '출석 체크하기') + '</button><span>' + (attendance ? '연속 ' + attendance.streak + '일 · 보너스까지 ' + attendance.nextBonusIn + '일' : '출석 기록 확인 중') + '</span></div><p class="pg-checklist"><span>' + (companion?.fed ? '먹이 완료' : '먹이 기다리는 중') + '</span><span>' + (companion?.played ? '놀이 완료' : '놀이 기다리는 중') + '</span></p><p class="pg-reward">' + (data?.careRewardClaimed ? '오늘의 돌봄 꿀방울을 받았어요.' : '한 친구에게 먹이와 놀이를 모두 챙기면 꿀방울 +' + (data?.careHoney ?? PET_CARE_HONEY) + '개 · 계정당 하루 한 번') + '</p>' : '<p class="pg-login"><a href="/login/">로그인하고 알 부화하기</a><span>무료 오늘의 운세는 지금도 확인할 수 있어요.</span></p>') + '<p class="pg-status" data-pet-status role="status" aria-live="polite">' + escape(failure || note) + '</p>' + (failure ? '<button type="button" data-pet-retry ' + (busy ? 'disabled' : '') + '>다시 확인하기</button>' : '') + '</section>';
  }
  async function refresh() {
    const version = ++loadVersion;
    if (!owner) { draw(); return; }
    failure = '';
    const [petResult, attendanceResult] = await Promise.allSettled([api('/api/rpg/pet?profileId=' + encodeURIComponent(profileId)), api('/api/honey/attendance')]);
    if (!valid() || version !== loadVersion) return;
    if (petResult.status === 'fulfilled') data = petResult.value;
    else failure = petResult.reason.message;
    if (attendanceResult.status === 'fulfilled') attendance = attendanceResult.value;
    else failure ||= '출석 기록을 불러오지 못했어요. 다시 확인해 주세요.';
    // A server-verified exclusive account receives its own mascot automatically.
    if (data?.exclusiveSpecies && !data.pet) {
      try { const hatched = await api('/api/rpg/pet/hatch', { profileId, eggType: 'moon' }); if (!valid() || version !== loadVersion) return; data = hatched; }
      catch (error) { failure = error.message; }
    }
    draw();
  }
  target.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || !target.contains(button) || !valid() || busy || button.disabled) return;
    if (button.hasAttribute('data-pet-retry')) { busy = true; draw(); try { await refresh(); } finally { busy = false; draw(); } return; }
    const action = button.dataset.petAction;
    if (action === 'fortune') { fortuneOpen = !fortuneOpen; draw(); target.querySelector('[data-pet-action="fortune"]')?.focus({ preventScroll: true }); return; }
    if (action === 'sleep') { clearTimeout(timer); animation = animation === 'sleep' ? 'idle' : 'sleep'; draw(); target.querySelector('[data-pet-action="sleep"]')?.focus({ preventScroll: true }); return; }
    if (!owner) return;
    loadVersion++; busy = true; failure = ''; note = ''; draw();
    let focusSelector = action ? '[data-pet-action="' + action + '"]' : '[data-pet-action="feed"]';
    try {
      if (button.dataset.petEgg) {
        data = await api('/api/rpg/pet/hatch', { profileId, eggType: button.dataset.petEgg });
        announce('반가워요. 이제 이 친구와 함께해요.');
      } else if (button.hasAttribute('data-pet-attend')) {
        focusSelector = '[data-pet-attend]';
        attendance = await api('/api/honey/attendance', {});
        if (data) data.balance = attendance.balance;
        syncHoney(); announce(attendance.rewarded ? '출석 꿀방울 ' + attendance.rewarded + '개를 받았어요.' : '오늘 출석을 확인했어요.');
      } else if (['feed', 'play'].includes(action)) {
        data = await api('/api/rpg/pet/care', { profileId, action, requestId: requestId() });
        clearTimeout(timer); animation = action;
        timer = setTimeout(() => {
          if (!valid()) return;
          animation = 'idle';
          const stage = target.querySelector('[data-pet-stage]');
          if (stage && data?.pet) stage.innerHTML = petSpriteMarkup(data.pet, 'idle');
          const reaction = target.querySelector('.pg-reaction');
          if (reaction && data?.pet) reaction.textContent = petReaction(data.pet.affection);
        }, 3200);
        announce(data.rewarded ? '오늘의 돌봄 완료. 꿀방울 ' + data.rewarded + '개를 받았어요.' : data.firstCare ? '오늘의 돌봄을 기록했어요. 함께해줘서 고마워요.' : '오늘 돌봄은 완료했어요. 함께하는 시간은 계속 즐겨도 좋아요.');
        syncHoney();
      }
    } catch (error) { if (valid()) failure = error.message; }
    finally { busy = false; draw(); if (valid()) target.querySelector(focusSelector)?.focus({ preventScroll: true }); }
  }, { signal });
  const onRefresh = () => { if (valid() && !busy && document.visibilityState !== 'hidden') void refresh(); };
  window.addEventListener('focus', onRefresh, { signal });
  window.addEventListener('cd:honey-refresh', onRefresh, { signal });
  window.addEventListener('storage', event => { if (event.key === 'cd:honey-refresh') onRefresh(); }, { signal });
  document.addEventListener('visibilitychange', onRefresh, { signal });
  signal.addEventListener('abort', () => { clearTimeout(timer); loadVersion++; }, { once: true });
  draw();
  await refresh();
}

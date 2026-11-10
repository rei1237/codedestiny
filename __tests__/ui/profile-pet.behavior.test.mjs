import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountPetGarden, petSpriteMarkup } from '../../js/core/profile-pet-card.mjs';
const preview = { character: { id: 'animal-rabbit', element: '목' }, fortune: { headline: '나의 리듬을 살피는 날', advice: '오늘 끝낼 일 하나를 골라 보세요.' } };
const pet = { speciesId: 'rabbit', name: '토끼', coat: 'wood', unique: false, rare: false, eggType: 'moon', traits: { pattern: 1, expression: 2, accessory: 3 }, affection: 0, fed: false, played: false };
const attendance = { balance: 20, attended: false, streak: 1, nextBonusIn: 4 };
const tick = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
let cleanup;
afterEach(() => cleanup?.());
function fixture({ guest = false, initialPet = null, exclusiveSpecies = null, fail = false, delayed = false } = {}) {
  const dom = new JSDOM('<main><div id="garden"></div></main>', { url: 'https://example.test/ggulggul/' });
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage;
  const controller = new dom.window.AbortController();
  let alive = true, shouldFail = fail, resolvePending;
  let state = { ...preview, pet: initialPet, exclusiveSpecies, balance: 20, careRewardClaimed: false, careHoney: 1, affectionGain: 5 };
  const calls = [], target = document.getElementById('garden');
  const api = async (path, body) => {
    calls.push({ path, body });
    if (shouldFail) throw new Error('잠시 불러오지 못했어요. 다시 확인해 주세요.');
    if (path.startsWith('/api/rpg/pet?')) { if (delayed) await new Promise(resolve => { resolvePending = resolve; }); return structuredClone(state); }
    if (path === '/api/rpg/pet/hatch') state.pet = { ...structuredClone(pet), eggType: body.eggType, ...(exclusiveSpecies ? { speciesId: exclusiveSpecies, name: '영냥이', coat: 'natural', unique: true } : {}) };
    if (path === '/api/rpg/pet/care') {
      state.pet[body.action === 'feed' ? 'fed' : 'played'] = true;
      state.pet.affection += 5; state.firstCare = true;
      state.rewarded = state.pet.fed && state.pet.played && !state.careRewardClaimed ? 1 : 0;
      state.balance += state.rewarded; state.careRewardClaimed ||= Boolean(state.rewarded);
    }
    if (path === '/api/honey/attendance') return { ...attendance, ...(body ? { attended: true, balance: state.balance + 1, rewarded: 1 } : {}) };
    return structuredClone(state);
  };
  const run = mountPetGarden(target, { profileId: 'one', preview, owner: guest ? '' : 'owner', api, current: () => alive, signal: controller.signal });
  cleanup = () => { alive = false; controller.abort(); dom.window.close(); };
  return { target, calls, run, release: () => resolvePending?.(), stop: () => { alive = false; }, recover: () => { shouldFail = false; } };
}
test('미로그인은 알 안내와 무료 정적 운세를 보고 저장 API를 호출하지 않는다', async () => {
  const f = fixture({ guest: true }); await f.run;
  assert.equal(f.target.querySelectorAll('[data-pet-egg]').length, 3);
  assert.ok([...f.target.querySelectorAll('[data-pet-egg]')].every(button => button.disabled));
  f.target.querySelector('[data-pet-action="fortune"]').click();
  assert.equal(f.target.querySelector('#petDailyFortune').hidden, false);
  assert.ok(f.target.textContent.includes(preview.fortune.advice)); assert.equal(f.calls.length, 0);
});
test('알 선택을 저장하고 먹이·놀이·무료 운세를 같은 카드에서 사용한다', async () => {
  const f = fixture(); await f.run;
  f.target.querySelector('[data-pet-egg="flower"]').click(); await tick();
  assert.equal(f.calls.find(row => row.path.endsWith('/hatch')).body.eggType, 'flower');
  assert.ok(f.target.querySelector('.pg-pet--rabbit'));
  f.target.querySelector('[data-pet-action="feed"]').click(); await tick();
  assert.ok(f.target.textContent.includes('먹이 완료'));
  f.target.querySelector('[data-pet-action="play"]').click(); await tick();
  assert.ok(f.target.textContent.includes('꿀방울 21개')); assert.ok(f.target.textContent.includes('오늘의 돌봄 꿀방울을 받았어요.'));
  assert.equal(f.calls.filter(row => row.path.endsWith('/care')).length, 2);
  assert.ok(f.calls.filter(row => row.path.endsWith('/care')).every(row => row.body.profileId === 'one' && row.body.requestId));
});
test('잠자기·깨우기는 전용 시트로 전환하며 보상 API를 호출하지 않는다', async () => {
  const f = fixture({ initialPet: structuredClone(pet) }); await f.run; const before = f.calls.length;
  f.target.querySelector('[data-pet-action="sleep"]').click();
  assert.ok(f.target.querySelector('.pg-pet--sleep').getAttribute('style').includes('rabbit-sleep.webp'));
  f.target.querySelector('[data-pet-action="sleep"]').click();
  assert.ok(f.target.querySelector('.pg-pet--wake')); assert.equal(f.calls.length, before);
});
test('서버가 알려준 전용 계정에만 영냥이를 자동 연결한다', async () => {
  const f = fixture({ exclusiveSpecies: 'yeongnyangi' }); await f.run;
  assert.ok(f.target.querySelector('.pg-pet--yeongnyangi')); assert.ok(f.target.textContent.includes('개발자의 영냥이'));
  assert.equal(f.target.querySelectorAll('.pg-accessory,.pg-expression').length, 0);
  assert.ok(petSpriteMarkup({ ...pet, speciesId: 'yeongnyangi', unique: true, coat: 'natural' }, 'sleep').includes('yeongnyangi-sleep.webp'));
});
test('불러오기 실패는 재시도로 복구하고 실패 상태에서 부화를 허용하지 않는다', async () => {
  const f = fixture({ fail: true }); await f.run;
  assert.ok(f.target.querySelector('[data-pet-retry]')); assert.ok(f.target.querySelector('[data-pet-egg]').disabled);
  f.recover(); f.target.querySelector('[data-pet-retry]').click(); await tick();
  assert.equal(f.target.querySelector('[data-pet-retry]'), null); assert.equal(f.target.querySelector('[data-pet-egg]').disabled, false);
});
test('프로필·계정 전환 뒤 늦게 도착한 응답은 이전 카드를 수정하지 않는다', async () => {
  const f = fixture({ delayed: true }); const before = f.target.innerHTML;
  f.stop(); f.release(); await f.run;
  assert.equal(f.target.innerHTML, before);
});

test('successful hatch emits existing refresh signals with persisted companion available',async()=>{
 const f=fixture();await f.run;let refreshes=0;
 const previousCustomEvent=globalThis.CustomEvent; globalThis.CustomEvent=window.CustomEvent;
 window.addEventListener('cd:honey-refresh',()=>{refreshes++;});
 f.target.querySelector('[data-pet-egg="moon"]').click();await tick();
 globalThis.CustomEvent=previousCustomEvent;
 assert.equal(refreshes,1);assert.ok(localStorage.getItem('cd:honey-refresh'));
 assert.ok(f.target.querySelector('.pg-pet--rabbit'));
 assert.equal(f.calls.filter(row=>row.path.endsWith('/hatch')).length,1);
});

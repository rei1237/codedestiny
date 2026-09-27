const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = file => fs.readFileSync(file, 'utf8');
const source = read('index.html');
const scripts = ['js/services/animal-totem-content-engine.js', 'js/core/paid-narrative-reader.js', 'js/animal-totem-experience.js'].map(read);
const entry = read('js/core/checkout-entry.js');
const pause = () => new Promise(resolve => setTimeout(resolve, 20));
function setup(fetcher, records = {}, realEntry = false) {
  const dom = new JSDOM(source, { url: 'https://mock.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const win = dom.window; let handler;
  win.localStorage.setItem('fortune_auth_user', JSON.stringify({ id: 'owner-a' }));
  for (const [key, value] of Object.entries(records)) win.localStorage.setItem(key, value);
  win.AbortController = AbortController; win.fetch = fetcher;
  win.requestAnimationFrame = () => 0; win.matchMedia = () => ({ matches: false });
  const timer = win.setTimeout.bind(win); win.setTimeout = (fn, ms) => timer(fn, ms >= 22000 ? ms : 1);
  if (realEntry) win.eval(entry);
  else win.__cdCheckoutEntry = { registerPaidResumeHandler: (_kind, fn) => { handler = fn; } };
  win._cdCoinGatePerUse = () => { throw Error('payment gate must not reopen'); };
  scripts.forEach(script => win.eval(script));
  win.openAnimalTotemModal();
  return { win, dom, resume: (...args) => handler(...args) };
}
const cards = [{ slot: 'today_guide', animalId: 'cat' }];
const descriptor = { args: { mode: 'one', question: '원래 질문', requestId: 'original-paid-id', cards } };
const completed = { ok: true, saved: true, status: 'completed', resultId: 'paid-narrative:result', requestId: 'original-paid-id', mode: 'one', cards, question: '원래 질문', source: 'llm', narrative: { opening: '저장된 시작', question_answer: '고객에게 전달한 LLM 본문', closing: '마지막 메시지', action_plan: [] } };
const reply = (status, payload) => ({ status, json: async () => payload });
test('paid return preserves cards and request, retries storage then resumes, and reloads without payment or generation', async () => {
  const posts = [];
  const env = setup(async (url, options) => {
    assert.match(url, /^\/api\/animal-totem\//);
    if (options.method === 'GET') return posts.length === 3 ? reply(200, completed) : reply(404, {});
    posts.push(JSON.parse(options.body));
    if (posts.length === 1) return reply(503, { ok: false, retryable: true, reason: 'RESULT_STORAGE_UNAVAILABLE' });
    if (posts.length === 2) return reply(202, { ...completed, saved: false, status: 'partial', narrative: null, resumeBody: { resumeResultId: completed.resultId }, retryable: true });
    return reply(200, completed);
  });
  await pause(); assert.equal(await env.resume(descriptor), true);
  assert.equal(posts.length, 3); assert.equal(posts[0].requestId, 'original-paid-id');
  assert.deepEqual(posts[0], posts[1]); assert.equal(posts[0].cards[0].animalId, 'cat');
  assert.deepEqual(posts[2], { mode: 'one', resumeResultId: completed.resultId });
  assert.equal(await env.resume(descriptor), true); assert.equal(posts.length, 3);
  env.win.revealAnimalTotemCard(null, '0'); await pause();
  assert.match(env.win.document.getElementById('animalTotemReadingPanels').textContent, /고객에게 전달한 LLM 본문/);
  const key = 'cd:animal-totem:v2:owner-a', stored = env.win.localStorage.getItem(key); env.dom.window.close();
  let reads = 0;
  const reloaded = setup(async (_url, options) => { assert.equal(options.method, 'GET'); reads++; return reply(200, completed); }, { [key]: stored });
  await pause(); assert.equal(reads, 1); assert.match(reloaded.win.document.body.textContent, /마지막 메시지/); reloaded.dom.window.close();
});
test('account changes hide old content and prevent a late response from saving into another account', async () => {
  let release, started = false;
  const pending = new Promise(resolve => { release = resolve; });
  const env = setup(async (_url, options) => { if (options.method === 'GET') return reply(404, {}); started = true; await pending; return reply(200, completed); });
  await pause(); const result = env.resume(descriptor);
  for (let i = 0; i < 20 && !started; i++) await pause();
  env.win.localStorage.setItem('fortune_auth_user', JSON.stringify({ id: 'owner-b' }));
  env.win.dispatchEvent(new env.win.Event('cd:auth-changed')); release();
  assert.equal(await result, false); await pause();
  assert.doesNotMatch(env.win.document.body.textContent, /고객에게 전달한 LLM 본문/);
  assert.equal(env.win.localStorage.getItem('cd:animal-totem:v2:owner-b'), null); env.dom.window.close();
});
test('draw ticket passes the real resume sanitizer and re-sends the exact in-page reading body', async () => {
  const capture = (posts, intents = []) => async (url, options) => {
    if (options.method === 'GET') return reply(404, {});
    const body = JSON.parse(options.body);
    if (url.startsWith('/api/paid-narrative/intent?')) { intents.push(body); return reply(200, { ok: true, registered: true }); }
    posts.push(body);
    return reply(200, { ...completed, requestId: body.requestId, mode: body.mode, cards: body.cards });
  };
  const inPage = [], intents = [], gates = [], first = setup(capture(inPage, intents));
  first.win.__cdCurrentDestinyProfile = { birthDate: '1990-05-17', birthTime: '07:30', gender: 'female', calendarType: 'solar' };
  first.win._cdCoinGatePerUse = (_cost, _reason, onPaid, _cancel, options) => { gates.push(options); onPaid('paid-id', {}); return { ok: true }; };
  await pause(); first.win.drawAnimalTotemSpread();
  for (let i = 0; i < 50 && !inPage.length; i++) await pause();
  const ticket = JSON.parse(JSON.stringify(gates[0].resume)); first.dom.window.close();
  const resumed = [], back = setup(capture(resumed), {}, true);
  await pause();
  assert.equal(await back.win.__cdCheckoutEntry.runPaidResume(ticket, { requestId: inPage[0].requestId, merchantUid: 'paid-id', payload: {} }), true);
  assert.equal(inPage[0].birth.birthDate, '1990-05-17'); assert.ok(inPage[0].cards.length > 0);
  assert.deepEqual(resumed[0], inPage[0]);
  // 결제창 전에 맡긴 본문이 결제 뒤 풀이 본문과 달라지면 서버가 승격한 기록과 409 로 충돌한다.
  assert.deepEqual(intents, [inPage[0]]); back.dom.window.close();
});

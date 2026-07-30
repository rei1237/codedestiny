const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

// 숙요점 1년운(#syYearlyFortuneContent)의 자동 로딩 계약을 지킨다.
//
// 종전 구조는 하이드레이션 성공 시 syBindSukuyoMonthlyUnlock 을 다시 불렀고, 그 안에는
// "키가 다르면 하이드레이트" 분기가 있었다 — 하이드레이트 → 바인딩 → 하이드레이트 재귀.
// 게다가 진행 중 요청을 기억하지 않아 렌더/바인딩이 겹치면 같은 왕복이 그대로 중복 발사됐고,
// 완료 표식이 전역 문자열이라 모달을 다시 열면 로딩 문구에서 멈춰 있었다.
// 이 테스트는 (1) 중복 발사 0 (2) 재렌더 시 정상 재조회 (3) 실패 후 자동 재발사 억제를 고정한다.

const SECTION_HTML = [
  '<div class="sy-card" data-sy-yearly-fortune-card>',
  '<input data-sy-yearly-input type="number" value="2026">',
  '<button type="button" data-sy-yearly-view>보기</button>',
  '<span class="sy-paid-status" data-sy-monthly-status>잠금 콘텐츠 · 10,000원</span>',
  '<div id="syYearlyFortuneContent"><div class="sy-yearly-empty-state is-loading">숙요점 1년운을 열고 있어요.</div></div>',
  '</div>',
].join('');

const LOCKED_PAYLOAD = {
  ok: true,
  unlocked: false,
  contentKey: 'sukyo_yearly_fortune_unlock:2026',
  unlockScope: { profileId: 'P1', targetYear: 2026 },
  preview: {
    yearlyTheme: { title: '올해의 달빛', summary: '요약', keywords: ['관계'] },
    profileSummary: {},
    monthlyPreview: [],
  },
};

function bootEngine() {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="sukuyoSection">' + SECTION_HTML + '</div></body></html>',
    { runScripts: 'outside-only', url: 'https://code-destiny.com/' },
  );
  const { window } = dom;
  const previousWindow = global.window;
  const previousDocument = global.document;
  global.window = window;
  global.document = window.document;

  const state = { count: 0, paths: [], respond: null };
  window.alert = (message) => { throw new Error('예기치 않은 alert: ' + message); };
  window._cdResolveCurrentProfileIdForAccess = () => 'P1';
  window.fetchJsonWithAuth = (requestPath) => {
    state.count += 1;
    state.paths.push(requestPath);
    return Promise.resolve(state.respond());
  };
  state.respond = () => ({ ok: true, status: 200, payload: LOCKED_PAYLOAD });

  const source = fs.readFileSync(
    path.join(process.cwd(), 'js/saju-engine-tarot-sukuyo-quantum.js'),
    'utf8',
  );
  window.eval(source + '\n;window.__syYearlyApi={bind:syBindSukuyoMonthlyUnlock,hydrate:syHydrateSukuyoYearlyFortune};');

  return {
    window,
    state,
    api: window.__syYearlyApi,
    rerender: () => { window.document.getElementById('sukuyoSection').innerHTML = SECTION_HTML; },
    restore: () => { global.window = previousWindow; global.document = previousDocument; },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 80));

test('숙요점 1년운 자동 로딩은 중복 왕복을 만들지 않는다', async () => {
  const env = bootEngine();
  try {
    const reading = { targetYear: 2026, monthlyFlow: [] };

    env.api.bind(reading);
    await settle();
    assert.equal(env.state.count, 1, '최초 바인딩은 1회만 호출해야 한다');
    assert.match(env.state.paths[0], /^\/api\/sukuyo\/yearly-fortune\?profileId=P1&year=2026$/);

    // 렌더가 반복돼도(모달 재바인딩) 이미 그린 화면을 다시 불러오지 않는다.
    for (let i = 0; i < 5; i += 1) env.api.bind(reading);
    await settle();
    assert.equal(env.state.count, 1, '같은 조건의 재바인딩이 추가 왕복을 만들면 안 된다');

    // 같은 키로 동시에 몰려도 진행 중 요청 하나로 합쳐진다.
    env.api.hydrate(env.window._sySukuyoYearlyReading);
    env.api.hydrate(env.window._sySukuyoYearlyReading);
    env.api.hydrate(env.window._sySukuyoYearlyReading);
    await settle();
    assert.equal(env.state.count, 2, '동시 호출은 1건으로 합쳐져야 한다');
  } finally {
    env.restore();
  }
});

test('화면이 새로 그려지면 다시 불러오고, 실패 직후에는 자동 재발사를 쉬어간다', async () => {
  const env = bootEngine();
  try {
    const reading = { targetYear: 2026, monthlyFlow: [] };

    env.api.bind(reading);
    await settle();
    assert.equal(env.state.count, 1);

    // 모달을 다시 열면 컨테이너가 새 노드다 → 완료 표식이 사라져 정상 재조회.
    env.rerender();
    env.api.bind(reading);
    await settle();
    assert.equal(env.state.count, 2, '재렌더 후에는 다시 불러와야 한다(로딩 고착 방지)');

    // 503 실패 뒤에는 자동 경로가 쿨다운을 지켜야 한다(실패 요청 연타 방지).
    env.state.respond = () => ({ ok: false, status: 503, payload: { code: 'SERVICE_UNAVAILABLE', message: 'db' } });
    env.rerender();
    env.api.bind(reading);
    await settle();
    assert.equal(env.state.count, 3, '실패도 1회만 시도한다');

    const content = env.window.document.getElementById('syYearlyFortuneContent');
    assert.ok(content.querySelector('[data-sy-yearly-retry]'), '일시적 실패에는 다시 시도 버튼이 있어야 한다');

    for (let i = 0; i < 5; i += 1) { env.rerender(); env.api.bind(reading); }
    await settle();
    assert.equal(env.state.count, 3, '실패 쿨다운 중 재렌더는 추가 왕복을 만들면 안 된다');
  } finally {
    env.restore();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

// 만세력 신살 요약: 연이·영냥이 말풍선, 한 줄 설명 펼쳐 보기, 한국어 대화형 시트.
const read = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const viewSrc = read('js/core/saju/manse-view.js');
const coreSrc = read('js/core/saju/natal-core.generated.js');
const copySrc = read('js/core/saju/shinsal-copy.generated.js');
const speakerSrc = read('js/core/saju/speaker.generated.js');
const en = JSON.parse(read('public/i18n/en.json'));

const G = { 甲: ['wood', '+'], 乙: ['wood', '-'], 丙: ['fire', '+'], 丁: ['fire', '-'], 戊: ['earth', '+'], 己: ['earth', '-'], 庚: ['metal', '+'], 辛: ['metal', '-'], 壬: ['water', '+'], 癸: ['water', '-'] };
const J = { 子: ['water', '-'], 丑: ['earth', '-'], 寅: ['wood', '+'], 卯: ['wood', '-'], 辰: ['earth', '+'], 巳: ['fire', '+'], 午: ['fire', '-'], 未: ['earth', '-'], 申: ['metal', '+'], 酉: ['metal', '-'], 戌: ['earth', '+'], 亥: ['water', '+'] };
const table = (o) => Object.fromEntries(Object.entries(o).map(([k, [e, y]]) => [k, { e, y }]));
// 1990-05-15 14:30 의 원국(庚午·辛巳·庚辰·癸未)
const chart = { y: { g: '庚', j: '午' }, m: { g: '辛', j: '巳' }, d: { g: '庚', j: '辰' }, h: { g: '癸', j: '未' } };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), dict);
}

function mount({ lang = 'ko', copy = 'ok', speaker = false } = {}) {
  const dom = new JSDOM('<body><div id="sajuCard"><div id="manseGrid"></div><section class="manse-shinsal"><div id="manseShinsalList"></div><p id="manseShinsalBasis"></p></section></div>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const win = dom.window;
  win.GAN = table(G);
  win.JI = table(J);
  win.getTenGod = () => '';
  win.cdGetCurrentLanguage = () => lang;
  win.cdTranslate = (key, vars, base) => {
    const v = lookup(en, key);
    const s = typeof v === 'string' ? v : base;
    return String(s || '').replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
  };
  // 설명 사전은 지연 로드된다. 성공·실패 두 갈래를 이 스텁으로 고른다.
  win.__cdLoadScriptOnce = () => (copy === 'ok' ? Promise.resolve().then(() => win.eval(copySrc)) : Promise.reject(new Error('offline')));
  win.eval(coreSrc);
  if (speaker) win.eval(speakerSrc);
  win.eval(viewSrc);
  assert.equal(win.CdManseView.render(chart), true);
  return { dom, win, doc: win.document };
}

test('speaker lines show Yeoni on top and Yeongnyangi below with fixed-size decorative faces', () => {
  const { dom, doc } = mount();
  try {
    const says = [...doc.querySelectorAll('#manseShinsalList .mxv-say')];
    assert.equal(says.length, 2);
    assert.ok(says[0].classList.contains('mxv-say--yeoni'));
    assert.ok(says[1].classList.contains('mxv-say--nyang'));
    for (const img of doc.querySelectorAll('#manseShinsalList .mxv-say img')) {
      assert.equal(img.getAttribute('alt'), '');
      assert.equal(img.getAttribute('loading'), 'eager');
      assert.ok(img.getAttribute('width') && img.getAttribute('height'));
    }
    assert.doesNotMatch(doc.getElementById('manseShinsalList').textContent, /🌸/);
  } finally { dom.window.close(); }
});

test('with the speaker bundle the faces are the same round crops as the reading', () => {
  const { dom, doc } = mount({ speaker: true });
  try {
    const says = [...doc.querySelectorAll('#manseShinsalList .mxv-say')];
    assert.equal(says.length, 2);
    assert.equal(doc.querySelector('#manseShinsalList .mxv-say__face'), null);
    const [yeoni, nyang] = says.map((say) => say.querySelector('.cd-speaker__face[aria-hidden="true"] img'));
    assert.match(yeoni.getAttribute('src'), /^\/images\/fortune-chat\/persona\/yeoni-\w+\.webp$/);
    assert.match(nyang.getAttribute('src'), /^\/images\/saju\/yeongnyangi-\w+\.webp$/);
    for (const img of [yeoni, nyang]) assert.equal(img.getAttribute('alt'), '');
  } finally { dom.window.close(); }
});

test('natal positions read per cell: day stem is yourself, day branch the partner, a whole pillar keeps the pillar meaning', async () => {
  for (const lang of ['ko', 'en']) {
    const { dom, doc } = mount({ lang });
    try {
      doc.querySelector('#manseShinsalList [data-mxv-ctl="expand"]').click();
      await tick(); await tick();
      const means = new Map();
      for (const place of doc.querySelectorAll('#mxvShinsalLines .mxv-line__place')) {
        const mean = place.querySelector('.mxv-line__mean');
        if (mean) means.set(place.querySelector('.mxv-line__spot').textContent, mean.textContent);
      }
      if (lang === 'ko') {
        assert.equal(means.get('일간'), '나 자신을 비추는 자리');
        assert.equal(means.get('일지'), '배우자·가까운 관계를 비추는 자리');
        assert.equal(means.get('일주'), '나 자신과 배우자·가까운 관계를 비추는 자리');
      } else {
        const seen = [...means.values()];
        for (const key of ['dayStem', 'dayBranch', 'day']) assert.ok(seen.includes(en.manseView.posMean[key]), key);
      }
    } finally { dom.window.close(); }
  }
});

test('the one-line toggle expands a list with positions, meanings and short notes', async () => {
  const { dom, doc } = mount();
  try {
    const btn = doc.querySelector('#manseShinsalList [data-mxv-ctl="expand"]');
    const box = doc.getElementById(btn.getAttribute('aria-controls'));
    assert.equal(btn.getAttribute('aria-expanded'), 'false');
    assert.ok(box.hasAttribute('hidden'));
    assert.equal(btn.getAttribute('data-html2canvas-ignore'), 'true');
    assert.equal(box.getAttribute('data-html2canvas-ignore'), 'true');
    btn.click();
    assert.equal(btn.getAttribute('aria-expanded'), 'true');
    assert.ok(!box.hasAttribute('hidden'));
    await tick(); await tick();
    const rows = box.querySelectorAll('.mxv-line');
    assert.ok(rows.length > 0);
    assert.equal(rows.length, doc.querySelectorAll('#manseShinsalList .mxv-chips .mxv-chip').length);
    assert.ok(box.querySelector('.mxv-line__short'));
    assert.match(box.querySelector('.mxv-line__mean').textContent, /비추는 자리/);
    btn.click();
    assert.equal(btn.getAttribute('aria-expanded'), 'false');
    assert.ok(box.hasAttribute('hidden'));
  } finally { dom.window.close(); }
});

test('a failed copy load still lists names and positions', async () => {
  const { dom, doc } = mount({ copy: 'fail' });
  try {
    doc.querySelector('#manseShinsalList [data-mxv-ctl="expand"]').click();
    await tick(); await tick();
    const box = doc.getElementById('mxvShinsalLines');
    assert.match(box.querySelector('.mxv-lines__note').textContent, /불러오지 못했어요/);
    assert.ok(box.querySelectorAll('.mxv-line .mxv-line__name').length > 0);
    assert.ok(box.querySelector('.mxv-line__spot'));
  } finally { dom.window.close(); }
});

test('the Korean sheet speaks in two bubbles and shows what each position reflects', async () => {
  const { dom, doc } = mount();
  try {
    const chip = [...doc.querySelectorAll('#manseShinsalList .mxv-chip')].find((c) => !c.classList.contains('mxv-chip--relation'));
    chip.click();
    await tick(); await tick();
    const sheet = doc.querySelector('.mxv-sheet');
    assert.equal(sheet.querySelector('.mxv-sheet__panel').getAttribute('role'), 'dialog');
    assert.ok(sheet.querySelector('.mxv-say--yeoni .mxv-copy--easy'));
    assert.ok(sheet.querySelector('.mxv-say--nyang .mxv-copy--tip'));
    assert.ok(sheet.querySelector('.mxv-how__mean'));
  } finally { dom.window.close(); }
});

test('a non-Korean sheet keeps the short line only', async () => {
  const { dom, doc } = mount({ lang: 'en' });
  try {
    doc.querySelector('#manseShinsalList .mxv-chip').click();
    await tick(); await tick();
    const sheet = doc.querySelector('.mxv-sheet');
    assert.ok(sheet.querySelector('.mxv-sheet__short'));
    assert.equal(sheet.querySelector('.mxv-copy--easy, .mxv-copy--tip, .mxv-say, .mxv-how__mean'), null);
  } finally { dom.window.close(); }
});

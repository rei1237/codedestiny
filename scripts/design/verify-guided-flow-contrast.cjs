// Local-only contrast check for the shared guided step flow shell (app/components/guided-flow/).
// 정본: docs/context/design-canon.md §5 "본문 4.5:1, 큰 글씨·UI 3:1, 반투명 표면은 합성색으로 잰다".
// verify-home-funnel.cjs 의 계산식을 쓰되, 바탕은 "가장 가까운 불투명 배경"이 아니라
// 조상 배경을 아래에서부터 알파 합성한 색으로 잰다(글자색의 알파도 그 위에 합성한다).
//
// 사용: GUIDED_FLOW_ORIGIN=http://127.0.0.1:3291 node scripts/design/verify-guided-flow-contrast.cjs
//   개발 서버(next dev)의 /dev/guided-flow 데모를 꿀꿀·영냥이 × 연이·네오 테마 × 360/390/430/960px 로 돈다.
//   GUIDED_FLOW_BRANDS=ggulggul 로 브랜드를 줄일 수 있다. --report 는 실패해도 표만 찍고 0 으로 끝난다.
const { chromium } = require('playwright');

const origin = process.env.GUIDED_FLOW_ORIGIN || 'http://127.0.0.1:3291';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Local dev origin required');
const reportOnly = process.argv.includes('--report');
const brands = (process.env.GUIDED_FLOW_BRANDS || 'ggulggul,yeongnyangi').split(',').filter(Boolean);
const widths = [360, 390, 430, 960];
const themes = ['yeoni', 'neo'];

// [이름, 셀렉터, 기준, 종류] — text: 글자색 대 합성 바탕, 나머지(fill·border·ring·fill-vs-track): UI 경계 3:1.
// 모듈 클래스는 빌드마다 해시되므로 원래 이름이 들어간 부분 문자열로 찾는다.
const cls = (name) => `[class*="_${name}__"]`;
const LANDING = [
  ['eyebrow', cls('eyebrow'), 4.5, 'text'],
  ['heroTitle', cls('heroTitle'), 4.5, 'text'],
  ['heroSub', cls('heroSub'), 4.5, 'text'],
  ['blockTitle', cls('blockTitle'), 4.5, 'text'],
  ['blockBody', cls('blockBody'), 4.5, 'text'],
  ['guideNo', cls('guideNo'), 4.5, 'text'],
  ['guideTitle', cls('guideTitle'), 4.5, 'text'],
  ['guideBody', cls('guideBody'), 4.5, 'text'],
  ['ctaHint', cls('ctaHint'), 4.5, 'text'],
  ['startCta', `${cls('cta')} button`, 4.5, 'text'],
  ['startCtaEdge', `${cls('cta')} button`, 3, 'fill'],
  ['block edge', cls('block'), 3, 'border'],
];
const STEP = [
  ['stepTitle', `section ${cls('title')}`, 4.5, 'text'],
  ['back', cls('back'), 4.5, 'text'],
  ['progressText', cls('progressText'), 4.5, 'text'],
  ['choiceLabel', cls('choiceLabel'), 4.5, 'text'],
  ['choice edge', cls('choice'), 3, 'border'],
  ['choice ring', cls('choice'), 3, 'ring'],
  ['progressFill', cls('progressFill'), 3, 'fill-vs-track'],
  ['progressTrack', cls('progressTrack'), 3, 'fill'],
];
const SELECTED = [
  ['selected label', `${cls('choice')}[aria-pressed="true"] ${cls('choiceLabel')}`, 4.5, 'text'],
  ['selected edge', `${cls('choice')}[aria-pressed="true"]`, 3, 'border'],
];

// 계산색은 rgb()/rgba() 이거나, color-mix() 를 거치면 color(srgb r g b / a)(0~1 채널)로 나온다.
function parse(color) {
  const text = String(color);
  const srgb = text.match(/color\(srgb\s+([^)]+)\)/);
  if (srgb) {
    const parts = srgb[1].split(/[\s/]+/).filter(Boolean).map(Number);
    return { r: parts[0] * 255, g: parts[1] * 255, b: parts[2] * 255, a: parts.length > 3 ? parts[3] : 1 };
  }
  const match = text.match(/rgba?\(([^)]+)\)/);
  if (!match) throw new Error(`Unsupported computed colour: ${text}`);
  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}
function over(top, bottom) {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (k) => (top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a;
  return { r: mix('r'), g: mix('g'), b: mix('b'), a };
}
function luminance({ r, g, b }) {
  const [R, G, B] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function ratio(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// 브라우저 안: 요소별 계산색과 조상 배경 스택(아래→위 순서는 Node 에서 합성).
async function sample(page, items) {
  return page.evaluate((list) => {
    const stack = (node) => {
      const layers = [];
      for (let el = node; el; el = el.parentElement) layers.push(getComputedStyle(el).backgroundColor);
      return layers;
    };
    return list.map(([name, selector, min, kind]) => {
      const node = [...document.querySelectorAll(selector)].find((el) => el.getBoundingClientRect().width > 0);
      if (!node) return { name, selector, min, kind, missing: true };
      const style = getComputedStyle(node);
      const parentStack = node.parentElement ? stack(node.parentElement) : [];
      const trackStack = kind === 'fill-vs-track' ? stack(node.parentElement) : null;
      return {
        name, selector, min, kind,
        color: style.color,
        border: style.borderTopColor,
        borderWidth: parseFloat(style.borderTopWidth) || 0,
        ring: getComputedStyle(node, '::after').borderTopColor,
        own: stack(node),
        parent: parentStack,
        track: trackStack,
      };
    });
  }, items);
}
function composite(layers) {
  // layers[0] 이 가장 위(요소 자신). 아래(문서 바탕)부터 합성한다. 바닥은 흰색(브라우저 캔버스).
  let base = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = parse(layers[i]);
    if (layer.a > 0) base = over(layer, base);
  }
  return base;
}
function measure(item) {
  if (item.missing) return { ...item, value: 0 };
  const own = composite(item.own);
  const parent = composite(item.parent);
  if (item.kind === 'text') return { ...item, value: ratio(over(parse(item.color), own), own) };
  if (item.kind === 'fill') return { ...item, value: ratio(own, parent) };
  // ring: 선택지 오른쪽 빈 원(::after 테두리) 대 선택지 채움.
  if (item.kind === 'ring') return { ...item, value: ratio(over(parse(item.ring), own), own) };
  if (item.kind === 'fill-vs-track') return { ...item, value: ratio(own, composite(item.track)) };
  // border(WCAG 1.4.11): 구성 요소의 경계 — 테두리 또는 채움 중 하나가 바깥(인접) 합성 바탕과 3:1 이면 된다.
  const edge = parse(item.border);
  if (!item.borderWidth || edge.a === 0) return { ...item, value: ratio(own, parent) };
  return { ...item, value: Math.max(ratio(own, parent), ratio(over(edge, parent), parent)) };
}

(async () => {
  const browser = await chromium.launch();
  const failures = [];
  const table = new Map();
  for (const brand of brands) {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      for (const theme of themes) {
        await page.goto(`${origin}/dev/guided-flow/?brand=${brand}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => sessionStorage.clear());
        await page.reload({ waitUntil: 'networkidle' });
        await page.evaluate((neo) => {
          const root = document.documentElement;
          root.classList.toggle('neo-mode', neo);
          document.body.classList.toggle('neo-mode', neo);
          if (neo) root.setAttribute('data-cd-theme', 'neo'); else root.removeAttribute('data-cd-theme');
        }, theme === 'neo');
        await page.getByRole('button', { name: '필수만 사용' }).click({ timeout: 1500 }).catch(() => {});
        const rows = [...await sample(page, LANDING)];
        await page.locator(`${cls('cta')} button`).first().click();
        await page.locator(cls('choice')).first().waitFor();
        rows.push(...await sample(page, STEP));
        await page.locator(cls('choice')).first().click();
        rows.push(...await sample(page, SELECTED));
        for (const row of rows.map(measure)) {
          const key = `${brand}|${theme}|${row.name}`;
          const prev = table.get(key);
          table.set(key, { brand, theme, name: row.name, min: row.min, low: prev ? Math.min(prev.low, row.value) : row.value, missing: row.missing });
          if (row.missing || row.value < row.min) failures.push(`${brand} ${theme} ${width}px ${row.name}: ${row.missing ? 'missing' : row.value.toFixed(2)} < ${row.min}`);
        }
      }
      await context.close();
    }
  }
  await browser.close();
  console.log('brand | theme | element | min over widths | target');
  for (const row of table.values()) console.log(`${row.brand} | ${row.theme} | ${row.name} | ${row.missing ? 'missing' : row.low.toFixed(2)} | ${row.min}`);
  if (failures.length) {
    console.log(`\n${failures.length} failure(s):\n${failures.join('\n')}`);
    if (!reportOnly) process.exit(1);
  } else {
    console.log(`\nguided flow contrast ok: ${brands.length} brand(s) x ${themes.length} theme(s) x ${widths.length} widths`);
  }
})().catch((error) => { console.error(error); process.exit(1); });

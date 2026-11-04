// 상세·마케팅·SEO 문구가 "무료 만세력 + 영구 묶음(29,000원) 하나" 기준과 맞는지 정적으로 본다.
// 판매 종료 키 목록과 가격은 정본(worker/lib)에서 읽는다. 문구를 읽는 검사라 렌더나 결제는 건드리지 않는다.
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const BUNDLE = 'saju_lifetime_bundle';

// 판매 표면: 고객이 읽는 상품·마케팅·SEO 문구가 사는 곳.
const SALES_SURFACES = [
  'app/yeongnyangi/1000-won-fortune/page.tsx',
  'lib/seo/entity-registry.mjs',
  'lib/seo-landing-pages.js',
  'lib/seo/intent-copy.mjs',
  'lib/saju/saju-service-catalog.mjs',
  'js/core/service-registry.js',
  'js/basic-fortune-detail.mjs',
  'js/core/saju/bundle-offer.js',
  'js/core/saju/reading-personas.js',
  'app/saju/page.js',
  'llms.txt',
  'llms-full.txt',
];
// 묶음 이름 통일 대상(고객 문구).
const NAME_SURFACES = [
  ...SALES_SURFACES,
  'app/saju/career-style/CareerStyleClient.tsx',
  'app/saju/career-style/page.tsx',
  'app/human-design/_copy/index.ts',
];
// 판매 종료 키의 고객 이름. 옆에 원 단위 가격이 붙으면 안 된다.
const CLOSED_NAMES = ['나의 매력 클래스', '인생 스킬 트리', '달빛 럭키 리추얼'];
// 묶음 보유와 별개로 무료로 남아 있던 시절의 안내 문구가 남으면 안 되는 popup 항목(묶음 포함으로 닫힌 카드).
const GATED_POPUP_IDS = ['rpt_tTestCard', "'rpt_hormone-vibe-section'", 'rpt_lottoCard', 'rpt_sajuFourCutCard', 'rpt_dopamineCard'];
const BUNDLE_POPUP_IDS = [
  'rpt_healthReportCard', 'rpt_quantumCard', 'rpt_skillTreeCard', "'animal-destiny-unlock'",
  'rpt_specialCharmCard', 'rpt_energyCoordCard', 'rpt_villainCard', 'rpt_secretHouseEntryCard',
];

const PRICE_RE = /\d[\d,]*\s*원|FUN_PRICE/;

async function importPolicy() {
  const policy = await import(pathToFileURL(path.join(root, 'worker/lib/saju-bundle-policy.js')).href);
  const registry = await import(pathToFileURL(path.join(root, 'worker/lib/paid-feature-registry.js')).href);
  return { policy, registry };
}

function popupLine(index, id) {
  const lines = index.split('\n');
  const needle = id.startsWith("'") ? `${id}:{featureId` : `${id}:{featureId`;
  const line = lines.find((entry) => entry.trimStart().startsWith(needle));
  assert.ok(line, `popup 항목을 찾지 못함: ${id}`);
  return line;
}

test('판매 표면에 판매 종료 키의 개별 가격이 없다', async () => {
  const { policy, registry } = await importPolicy();
  assert.equal(policy.SAJU_BUNDLE_SALE_CLOSED_KEYS.length, 18);
  for (const rel of SALES_SURFACES) {
    const text = read(rel);
    for (const name of CLOSED_NAMES) {
      let at = text.indexOf(name);
      while (at >= 0) {
        const near = text.slice(Math.max(0, at - 40), at + name.length + 40);
        assert.doesNotMatch(near, PRICE_RE, `${rel}: "${name}" 옆에 가격이 있다: ${near.replace(/\s+/g, ' ')}`);
        at = text.indexOf(name, at + name.length);
      }
    }
  }
  // 천원 페이지: 1,000원 가격 상수와 가격 가드가 없어야 한다.
  const hub = read('app/yeongnyangi/1000-won-fortune/page.tsx');
  assert.doesNotMatch(hub, /FUN_PRICE|amountKRW\s*!==\s*1000|won\(1000\)/, '천원 페이지에 1,000원 가격 상수가 남아 있다');
  // 옛 개별 가격은 정본에 남아 있어도(기존 구매 권리) 판매 문구에는 나오지 않는다.
  for (const key of policy.SAJU_BUNDLE_SALE_CLOSED_KEYS) {
    const spec = registry.FEATURE_KEY_PRICE_TABLE[key];
    if (!spec || !spec.amountKRW) continue;
    const label = `${spec.amountKRW.toLocaleString('ko-KR')}원`;
    for (const rel of ['llms.txt', 'llms-full.txt', 'lib/seo/entity-registry.mjs']) {
      const text = read(rel);
      for (const name of CLOSED_NAMES) {
        const at = text.indexOf(name);
        if (at < 0) continue;
        assert.ok(!text.slice(Math.max(0, at - 60), at + 60).includes(label), `${rel}: ${name} 근처에 ${label}`);
      }
    }
  }
});

test('묶음 가격 표기는 29,000원 하나다', async () => {
  const { policy, registry } = await importPolicy();
  assert.equal(policy.SAJU_BUNDLE_FEATURE_KEY, BUNDLE);
  assert.equal(registry.PIG_COIN_UNLOCK_PRODUCTS[`unlock.${BUNDLE}`].amountKRW, 29000);
  const names = [policy.SAJU_BUNDLE_LABEL, '사주 영구 묶음', '평생 소장'];
  for (const rel of NAME_SURFACES) {
    const text = read(rel);
    for (const name of names) {
      let at = text.indexOf(name);
      while (at >= 0) {
        const near = text.slice(at, at + name.length + 24);
        const price = near.match(/\d[\d,]*\s*원/);
        if (price) assert.equal(price[0].replace(/\s+/g, ''), '29,000원', `${rel}: 묶음 옆 가격이 29,000원이 아니다: ${near}`);
        at = text.indexOf(name, at + name.length);
      }
    }
  }
  // 천원 페이지는 묶음 가격을 정본 가격표에서 읽는다(숫자를 새로 적지 않는다).
  const hub = read('app/yeongnyangi/1000-won-fortune/page.tsx');
  assert.match(hub, /SAJU_BUNDLE_FEATURE_KEY|saju_lifetime_bundle/);
  assert.match(hub, /BUNDLE_PRICE/);
  // 결과 화면의 묶음 카드 가격 표기는 하나다.
  const index = read('index.html');
  const cardPrices = [...index.matchAll(/<span class="pf-coin-amount">([^<]*)<\/span>/g)].map((m) => m[1].trim());
  assert.ok(cardPrices.length >= 2);
  assert.deepEqual([...new Set(cardPrices)], ['묶음 29,000원']);
  assert.match(read('js/core/saju/bundle-offer.js'), /PRICE_LABEL = '29,000원'/);
});

test('묶음 이름이 하나로 통일되어 있다', async () => {
  const { policy } = await importPolicy();
  for (const rel of NAME_SURFACES) {
    const text = read(rel);
    assert.doesNotMatch(text, /사주 영구 묶음|사주 전체 풀이 묶음/, `${rel}: 묶음 이름이 표시 이름과 다르다`);
  }
  assert.ok(read('js/core/saju/bundle-offer.js').includes(policy.SAJU_BUNDLE_LABEL));
  assert.ok(read('app/yeongnyangi/1000-won-fortune/page.tsx').includes('SAJU_BUNDLE_LABEL'));
});

test('무료 사주 표기가 사라졌다', () => {
  for (const rel of SALES_SURFACES) {
    assert.doesNotMatch(read(rel), /무료 사주/, `${rel}: "무료 사주"가 남아 있다`);
  }
  // 이름을 바꾸는 만큼 "무료 만세력"이 판매 표면 어딘가에는 있어야 한다.
  for (const rel of ['lib/seo/entity-registry.mjs', 'lib/seo-landing-pages.js', 'lib/saju/saju-service-catalog.mjs', 'llms.txt', 'app/yeongnyangi/1000-won-fortune/page.tsx']) {
    assert.match(read(rel), /무료 만세력/, `${rel}: "무료 만세력"이 없다`);
  }
  assert.doesNotMatch(read('index.html'), /무료 ?사주/, 'index.html: "무료 사주"가 남아 있다');
  // 무료로 열린 것처럼 보이는 popup 문구도 같이 정리한다.
  const html = read('index.html');
  for (const id of GATED_POPUP_IDS) {
    const line = popupLine(html, id);
    assert.doesNotMatch(line, /무료|추가 결제 없이/, `${id} popup에 무료 안내가 남아 있다`);
  }
  for (const id of BUNDLE_POPUP_IDS) {
    const line = popupLine(html, id);
    assert.doesNotMatch(line, /기존 결제 정책을 따릅니다/, `${id} popup이 묶음 기준이 아니다`);
    assert.match(line, /평생 소장에 포함/, `${id} popup에 묶음 포함 안내가 없다`);
  }
});

test('결과 화면 묶음 버튼 이름이 묶음 상품과 맞다', () => {
  const index = read('index.html');
  assert.doesNotMatch(index, /라이트 풀이 열기 →|대운 분석 열기 →/);
  const bundleButtons = [...index.matchAll(/data-unlock-key="saju_lifetime_bundle"[^>]*>\s*<span[^>]*>([^<]*)<\/span>/g)].map((m) => m[1]);
  assert.ok(bundleButtons.length >= 2);
  for (const label of bundleButtons) assert.match(label, /사주 전체 풀이 평생 소장/);
  assert.doesNotMatch(index, /라이트 풀이로 타고난 결을 먼저/);
});

test('고객 문구에 금지어가 없다', () => {
  const surfaces = [...NAME_SURFACES, 'js/core/saju/crafted-product-details.mjs'];
  for (const rel of surfaces) {
    const text = read(rel).replace(/\bAI 기반\b/g, '');
    assert.doesNotMatch(text, /비\s*LLM|AI\s*미사용|\bLLM\b/, `${rel}: 금지어`);
    assert.doesNotMatch(text, /정확도\s*\d|\d+\s*%\s*(적중|정확)|100%\s*보장/, `${rel}: 정확도 수치나 보장 표현`);
  }
  for (const id of [...GATED_POPUP_IDS, ...BUNDLE_POPUP_IDS]) {
    const line = popupLine(read('index.html'), id);
    assert.doesNotMatch(line, /비\s*LLM|AI\s*미사용|\bLLM\b/, `${id} popup 금지어`);
  }
});

test('URL을 바꾸지 않는다', () => {
  const sitemap = read('scripts/generate-sitemap.mjs');
  for (const route of ['/saju', '/saju/destiny-anatomy', '/yeongnyangi/1000-won-fortune']) {
    assert.ok(sitemap.includes(`path: "${route}"`), `사이트맵 입력에서 ${route}가 빠졌다`);
  }
  assert.ok(fs.existsSync(path.join(root, 'app/yeongnyangi/1000-won-fortune/page.tsx')));
  assert.ok(fs.existsSync(path.join(root, 'app/saju/destiny-anatomy/page.tsx')) || fs.existsSync(path.join(root, 'app/saju/destiny-anatomy/page.js')));
  const entity = read('lib/seo/entity-registry.mjs');
  for (const route of ['/saju', '/yeongnyangi/1000-won-fortune']) {
    assert.ok(entity.includes(`path: "${route}"`) || entity.includes(`path: '${route}'`) || entity.includes(`'${route}'`) || entity.includes(`"${route}"`), `엔티티 레지스트리에서 ${route}가 빠졌다`);
  }
  assert.match(read('app/yeongnyangi/1000-won-fortune/page.tsx'), /const PATH='\/yeongnyangi\/1000-won-fortune\/'/);
});

test('색인 소개 페이지의 공개 소개와 예시는 그대로 열려 있다', () => {
  const landing = read('lib/seo-landing-pages.js');
  assert.match(landing, /path: "\/saju"/);
  assert.match(landing, /resultItems:/);
  assert.match(landing, /sections:/);
  // 무료 범위를 만세력·원국으로 밝히고, 나머지는 평생 소장 묶음이라고 숨기지 않고 말한다.
  assert.match(landing, /사주 전체 풀이 평생 소장/);
});

test('개별 판매 서비스 목록의 가격 노출 키가 판매 종료 키와 겹치지 않는다', async () => {
  const { policy } = await importPolicy();
  const catalog = await import(pathToFileURL(path.join(root, 'lib/saju/saju-service-catalog.mjs')).href);
  const closed = new Set(policy.SAJU_BUNDLE_SALE_CLOSED_KEYS);
  const leaked = catalog.SAJU_SERVICE_ITEMS.filter((item) => item.featureKey && closed.has(item.featureKey)).map((item) => item.featureKey);
  assert.deepEqual(leaked, [], `/saju/#services 에 판매 종료 키의 개별 가격이 노출된다: ${leaked.join(', ')}`);
});

test('사주 궁합 소개는 무료로 열려 있다고 말하지 않는다', () => {
  const pages = read('lib/seo-landing-pages.js');
  const compat = pages.split('\n').filter((line) => /seoLanding\.(title|description)\.006/.test(line)).join('\n');
  assert.ok(compat, '궁합 소개 줄을 찾지 못함');
  assert.doesNotMatch(compat, /무료/, '궁합은 볼 때마다 결제하는 분석이다');
});

test('결과 화면 정적 결제 안내가 묶음 이름과 한 번 결제를 말한다', async () => {
  const { policy } = await importPolicy();
  const personas = read('js/core/saju/reading-personas.js');
  assert.match(personas, /paidBundle/);
  assert.ok(personas.includes(policy.SAJU_BUNDLE_LABEL), '결제 안내에 묶음 표시 이름이 없다');
  assert.match(personas, /saju-static-offer__bundle/);
});

// 고객에게 보이는 곳에 "무료 사주"를 새로 쓰면 실패한다. 무료 범위는 만세력(원국)과 한 줄 성향뿐이다.
// 허용 목록: 주석에만 남은 파일. 파일 안에서도 주석 줄에 있는 것만 통과시킨다. scripts/ 는 주석 줄만 허용한다.
const FREE_SAJU_COMMENT_ONLY_FILES = new Set([
  'app/_lib/mobile-tabs.ts', 'app/compare/fortune-apps/page.tsx', 'app/components/guide-cta-targets.js',
  'js/core/analytics.js', 'js/core/home-service-finder.js', 'js/core/saju/destiny-anatomy/boot.js',
  'js/core/saju/destiny-anatomy/engine.js', 'js/core/signup-benefit-policy.mjs', 'js/destiny-profile.js',
  'styles/destiny-anatomy.css', 'styles/fortune-ui.css', 'styles/home-funnel.css',
]);
const FREE_SAJU_COMMENT_ONLY_PREFIXES = ['scripts/'];
// 검색어 조사용 시드 목록이다. 고객에게 보이는 문구가 아니라 실제 검색어 "무료사주"를 그대로 적는다.
const FREE_SAJU_ALLOWED_FILES = new Set(['scripts/seo/keyword-research.mjs']);

// 주석 줄로 인정하는 경우: 줄이 주석 표지로 시작하거나, 문자열 밖(따옴표 짝수)에서 시작한 // 또는 /* 뒤에 적힌 경우.
// 문자열 안의 // (URL 등)나 코드 뒤에 문구가 붙은 줄은 통과시키지 않는다.
function isCommentHit(line) {
  if (/^(\/\/|\/\*|\*|#)/.test(line.trim())) return true;
  const hit = line.search(/무료 ?사주/);
  if (hit < 0) return false;
  const head = line.slice(0, hit);
  const re = /\/\/|\/\*/g;
  let m;
  while ((m = re.exec(head))) {
    const before = head.slice(0, m.index);
    if (before.endsWith(':')) continue;
    if (["'", '"', '`'].every((q) => before.split(q).length % 2 === 1)) return true;
  }
  return false;
}

test('고객 노출 면에 "무료 사주"가 새로 생기지 않는다', () => {
  const { execFileSync } = require('node:child_process');
  const out = execFileSync('git', ['grep', '-n', '-E', '무료 ?사주', '--', '.',
    ':(exclude)public', ':(exclude)docs', ':(exclude)__tests__', ':(exclude)marketing'],
  { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const offenders = [];
  for (const row of out.split(/\r?\n/).filter(Boolean)) {
    const m = row.match(/^([^:]+):(\d+):(.*)$/);
    if (!m) { offenders.push(row); continue; }
    const [, file, lineNo, line] = m;
    if (FREE_SAJU_ALLOWED_FILES.has(file)) continue;
    const commentOnly = FREE_SAJU_COMMENT_ONLY_FILES.has(file) || FREE_SAJU_COMMENT_ONLY_PREFIXES.some((prefix) => file.startsWith(prefix));
    if (commentOnly && isCommentHit(line)) continue;
    offenders.push(`${file}:${lineNo}`);
  }
  assert.deepEqual(offenders, [], `"무료 사주"를 "무료 만세력"으로 바꿔야 한다: ${offenders.join(', ')}`);
});

// 영어·일본어·중국어 등 다른 언어 문구도 "무료 사주"를 약속하지 않는다. 무료 범위는 만세력(원국)이다.
// 고친 파일에서 같은 표현이 돌아오면 실패한다. 번역 값은 i18n 사전과 화면 코드 양쪽을 본다.
const NON_KO_FREE_SAJU_FILES = [
  'js/first-visit-copy.mjs',
  'i18n/authored/croHome-01.json',
  'i18n/authored/brandSignals-01.json',
  'i18n/authored/freeHubDetails-01.json',
  'i18n/authored/shellRuntime-52.json',
  'i18n/authored/homeQuestions-01.json',
  'app/_content/about-copy.js',
  'app/components/HomeServiceSections.tsx',
  'app/app/_lib/copy.ts',
  'app/components/auth/AuthShell.tsx',
  'lib/seo/i18nKeywords.ts',
];
// 정규식은 String.raw 로 쓴다. 일반 따옴표 문자열에 '\s'를 쓰면 백슬래시가 사라져 's'가 되고, 라틴 문자 패턴이 조용히 죽는다.
// GAP: 구분자(| · — – . , ; :)를 넘지 않는 단어 최대 2개. "무료 ... 사주" 사이에 제목 구분이 끼면 다른 문장으로 본다.
const GAP = String.raw`(?:[^\s|·—–.,;:]+\s+){0,2}`;
const GAP3 = String.raw`(?:[^\s|·—–.,;:]+\s+){0,3}`;
const NON_KO_FREE_SAJU_PATTERN = new RegExp([
  // 한·중·일: "무료 사주" 계열
  String.raw`무료 ?사주`,
  String.raw`無料.{0,3}四柱`, String.raw`免[费費].{0,3}四柱`, String.raw`免[费費]看八字`, String.raw`免[费費].{0,3}八字`, String.raw`無料で四柱`,
  // en
  String.raw`free\s+(?:saju|bazi|four\s+pillars)`, String.raw`saju\s+free`, String.raw`(?:saju|bazi|four\s+pillars)\s+(?:\([^)]*\)\s+)?${GAP3}free\b`,
  // es
  String.raw`(?:saju|bazi)\s+(?:gratis|gratuit[ao]s?)`, String.raw`(?:gratis|gratuit[ao]s?)\s+${GAP}(?:saju|bazi|cuatro\s+pilares)`,
  String.raw`cuatro\s+pilares\s+(?:\([^)]*\)\s+)?${GAP3}gratis`,
  // fr
  String.raw`(?:saju|bazi)\s+gratuit`, String.raw`gratuit\w*\s+${GAP}(?:saju|bazi|quatre\s+piliers)`,
  String.raw`quatre\s+piliers\s+(?:\([^)]*\)\s+)?${GAP3}gratuit`,
  // de
  String.raw`kostenlos\w*\s+${GAP}(?:saju|bazi|vier\s+s.ulen)`, String.raw`vier\s+s.ulen\s+(?:\([^)]*\)\s+)?${GAP3}kostenlos`,
  // nl
  String.raw`gratis\s+${GAP}(?:saju|bazi|vier\s+pijlers)`, String.raw`vier\s+pijlers\s+(?:\([^)]*\)\s+)?${GAP3}gratis`,
  // ms
  String.raw`(?:saju|bazi)\s+percuma`, String.raw`percuma\s+${GAP}(?:saju|bazi|empat\s+tiang)`,
  String.raw`empat\s+tiang\s+(?:\([^)]*\)\s+)?${GAP3}percuma`,
  // vi
  String.raw`miễn phí\s+${GAP}(?:tứ trụ|bát tự)`, String.raw`(?:tứ trụ|bát tự)\s+(?:\([^)]*\)\s+)?${GAP3}miễn phí`,
  // hi (नुक्ता 유무 모두)
  String.raw`(?:मुफ़?्त|निःशुल्क)\s+${GAP}(?:साज|बाज़?ी|फ़?ोर\s+पिलर|चार\s+स्तंभ)`,
].join('|').normalize('NFC'), 'i');
const hitsNonKoFreeSaju = (text) => NON_KO_FREE_SAJU_PATTERN.test(String(text).normalize('NFC'));

test('다른 언어 "무료 사주" 가드 정규식이 실제로 걸린다', () => {
  // 가드가 죽어 있으면 파일 검사가 무조건 통과한다. 언어마다 걸려야 하는 문구와 걸리면 안 되는 문구를 못 박는다.
  const mustHit = {
    en: ['Free Saju & Tarot', 'Free Four Pillars (BaZi) Compatibility', 'Four Pillars (BaZi) reading is free'],
    ja: ['無料の四柱推命', '無料四柱推命分析'],
    'zh-CN': ['免费八字占算', '免费四柱八字分析'],
    'zh-TW': ['免費四柱八字分析', '免費看八字'],
    de: ['Kostenlose Vier Säulen (BaZi) Analyse', 'Kostenloses Saju'],
    nl: ['Gratis Vier Pijlers (BaZi) Analyse', 'Vier Pijlers (BaZi) analyse gratis'],
    ms: ['Analisis Empat Tiang (BaZi) Percuma', 'Bacaan Empat Tiang percuma'],
    hi: ['मुफ्त फोर पिलर्स (बाज़ी)', 'मुफ़्त चार स्तंभ पाठ'],
    es: ['Cuatro Pilares (BaZi) gratis', 'Análisis gratuito de Cuatro Pilares'],
    fr: ['Quatre Piliers gratuits', 'Analyse gratuite des Quatre Piliers (BaZi)'],
    vi: ['Phân tích Tứ Trụ Bát Tự miễn phí', 'Tứ Trụ miễn phí'],
    ko: ['무료 사주 보기', '무료사주'],
  };
  for (const [lang, samples] of Object.entries(mustHit)) {
    for (const s of samples) assert.ok(hitsNonKoFreeSaju(s), `${lang} 문구가 가드에 걸려야 한다: ${s}`);
  }
  const mustPass = [
    'Free Manseryeok Natal Chart | How to Read Four Pillars',
    'Enter your birth date in the free Manseryeok to see your Four Pillars natal chart',
    'Kostenloses Manseryeok: Geburtschart | Vier Säulen, Fünf Elemente',
    'Lịch vạn niên miễn phí – Mệnh bàn Tứ Trụ',
    'Manseryeok gratis · Cuatro Pilares (BaZi) · Tarot',
    '無料の万年暦で見る四柱の原局',
    '免费万年历命盘 | 四柱五行',
    '무료 만세력 사주 원국 보기',
  ];
  for (const s of mustPass) assert.ok(!hitsNonKoFreeSaju(s), `가드가 잘못 걸리면 안 된다: ${s}`);
});


test('다른 언어 문구도 "무료 사주"를 약속하지 않는다', () => {
  const offenders = [];
  for (const rel of NON_KO_FREE_SAJU_FILES) {
    read(rel).split(/\r?\n/).forEach((line, idx) => {
      if (hitsNonKoFreeSaju(line) && !isCommentHit(line)) offenders.push(`${rel}:${idx + 1}`);
    });
  }
  assert.deepEqual(offenders, [], `다른 언어에서도 "무료 만세력"으로 써야 한다: ${offenders.join(', ')}`);
});

// 배포되는 번역 사전(public/i18n)의 값도 본다. 사전은 화면이 실제로 읽는 값이라 코드만 고쳐서는 낡은 문구가 남는다.
// 허용 목록은 "사주 기반이지만 진짜 무료인 별도 상품"만 담는다. 키 단위로 이유를 적는다.
const I18N_FREE_SAJU_ALLOWED = {
  'featureMarketing.rpt_tTestCard.tagline': '무료 사주 기반 성향 테스트(별도 무료 상품)',
  'featureMarketing.rpt_lottoCard.fallbackTitle': '무료 행운 번호 카드(별도 무료 상품)',
  'featureMarketing.rpt_aiPromptCard.premiumIntro': '사주 프롬프트는 별도 결제 없는 무료 도구',
  'shellRuntime.s449': '사주 네컷은 별도 결제 없는 무료 콘텐츠',
  'shellRuntime.s466': '사주 프롬프트는 별도 결제 없는 무료 도구',
};
const I18N_LANGS = ['ko', 'en', 'ja', 'zh-cn', 'zh-tw', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms'];
function flattenStrings(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flattenStrings(v, key, out);
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
}

test('배포 번역 사전 값에 "무료 사주"가 남아 있지 않다(허용 목록 제외)', () => {
  const offenders = [];
  const used = new Set();
  for (const lang of I18N_LANGS) {
    const files = [[`public/i18n/${lang}.json`, '']];
    for (const ns of ['shellRuntime', 'firstVisitGuide', 'loveSimulationScenes']) {
      if (fs.existsSync(path.join(root, `public/i18n/${lang}/${ns}.json`))) files.push([`public/i18n/${lang}/${ns}.json`, `${ns}.`]);
    }
    for (const [rel, nsPrefix] of files) {
      const flat = flattenStrings(JSON.parse(read(rel)));
      for (const [key, value] of Object.entries(flat)) {
        if (!hitsNonKoFreeSaju(value)) continue;
        // 네임스페이스 파일의 키는 'shellRuntime.s449' 꼴이 이미 접두어를 품고 있으면 그대로 쓴다.
        const id = key.startsWith(nsPrefix) ? key : `${nsPrefix}${key}`;
        if (Object.hasOwn(I18N_FREE_SAJU_ALLOWED, id)) { used.add(id); continue; }
        offenders.push(`${lang}:${id}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `사전 값을 "무료 만세력" 기준으로 고쳐야 한다: ${offenders.join(', ')}`);
  // 허용 목록이 낡아 아무 데도 안 걸리는 항목을 들고 있으면 걷어 낸다.
  assert.deepEqual(Object.keys(I18N_FREE_SAJU_ALLOWED).filter((k) => !used.has(k)), [], '허용 목록에 더는 필요 없는 항목이 있다');
});

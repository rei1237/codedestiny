/**
 * 자미·숙요·베다 운세 정적 HTML 생성 (4기간 × 전 항목)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
/** 소스는 repo 루트 `fortune/` — sync:public 시 public 으로 복사됨 */
const publicRoot = path.join(root, 'fortune');

const periods = ['today', 'tomorrow', 'weekly', 'monthly'];

const ziweiSlugs = ['mingong', 'jaeback', 'gwanllok', 'bubu', 'chunyi', 'bokdeok', 'janyeo', 'noebok', 'jilaek', 'jeonaek', 'hyeongje', 'bumo'];
const vedicSlugs = ['mesha', 'vrishabha', 'mithuna', 'karka', 'simha', 'kanya', 'tula', 'vrishchika', 'dhanu', 'makara', 'kumbha', 'meena'];

const PERIOD_KR = { today: '오늘', tomorrow: '내일', weekly: '이번 주', monthly: '이달' };

function titleFor(type, id, period) {
  const pk = PERIOD_KR[period] || period;
  if (type === 'ziwei') return `${pk}의 자미두수 ${id} 운세 | 연이의 꿀꿀 만세력`;
  if (type === 'sukuyo') return `${pk}의 숙요 ${id}번 운세 | 연이의 꿀꿀 만세력`;
  if (type === 'vedic') return `${pk}의 베다 점성 ${id} 운세 | 연이의 꿀꿀 만세력`;
  return '운세';
}

function template({ period, type, id }) {
  let pathPart = '';
  if (type === 'ziwei') pathPart = `ziwei/${id}.html`;
  else if (type === 'sukuyo') pathPart = `sukuyo/${id}.html`;
  else if (type === 'vedic') pathPart = `vedic/${id}.html`;

  const canon = `https://code-destiny.com/fortune/${period}/${pathPart}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${titleFor(type, id, period)}</title>
  <meta name="description" content="자미두수·숙요·베다 점성술 기반 ${PERIOD_KR[period] || period} 운세. 총운·연애·재물·건강·직장운과 행운 숫자를 무료로 확인하세요.">
  <meta property="og:title" content="${titleFor(type, id, period)}">
  <meta property="og:description" content="다국어: URL에 ?lang=en 등을 추가해 보세요.">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="연이의 꿀꿀 만세력">
  <meta property="og:image" content="https://code-destiny.com/icons/icon-512x512.png">
  <link rel="canonical" href="${canon}">
  <link rel="icon" href="/icons/icon-192x192.png">
  <script id="jsonLd" type="application/ld+json">{}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;700;900&display=swap">
  <link rel="stylesheet" href="/css/fortune.css">
</head>
<body data-fortune-type="${type}" data-fortune-id="${id}" data-fortune-period="${period}">
<nav class="fe-gnb" role="navigation" aria-label="사이트 탐색">
  <a href="/" class="fe-gnb-logo">🐷 연이의 꿀꿀 만세력</a>
  <a href="/fortune/">📅 운세 홈</a>
</nav>
<main class="fe-wrap">
  <div id="fortuneApp"><div id="feLoading"><div class="fe-spinner"></div><p>운세를 불러오는 중입니다...</p></div></div>
</main>
<footer class="fe-footer-detail">
  © 2026 연이의 꿀꿀 만세력 · <a href="/">홈으로</a>
</footer>
<script defer src="/js/fortune-engine.js"></script>
</body>
</html>
`;
}

function writeAll() {
  for (const period of periods) {
    const zdir = path.join(publicRoot, period, 'ziwei');
    const sdir = path.join(publicRoot, period, 'sukuyo');
    const vdir = path.join(publicRoot, period, 'vedic');
    fs.mkdirSync(zdir, { recursive: true });
    fs.mkdirSync(sdir, { recursive: true });
    fs.mkdirSync(vdir, { recursive: true });

    for (const id of ziweiSlugs) {
      fs.writeFileSync(path.join(zdir, `${id}.html`), template({ period, type: 'ziwei', id }), 'utf8');
    }
    for (let n = 1; n <= 27; n++) {
      fs.writeFileSync(path.join(sdir, `${n}.html`), template({ period, type: 'sukuyo', id: String(n) }), 'utf8');
    }
    for (const id of vedicSlugs) {
      fs.writeFileSync(path.join(vdir, `${id}.html`), template({ period, type: 'vedic', id }), 'utf8');
    }
  }
  console.log('Wrote ziwei/sukuyo/vedic pages under fortune/{period}/ (sync:public → public/fortune/)');
}

writeAll();

import { readFileSync } from 'fs';

// life-book.js 검증
const lb = readFileSync('js/life-book.js', 'utf8');
console.log('[JS] 길이:', lb.length);
console.log('[JS] openLifeBookModal:', lb.includes('window.openLifeBookModal'));
console.log('[JS] generateLifeBook:', lb.includes('window.generateLifeBook'));
console.log('[JS] MYSTIC_QUOTES:', lb.includes('MYSTIC_QUOTES'));
console.log('[JS] _mysticTimer:', lb.includes('_mysticTimer'));
console.log('[JS] lbLoadingChapterNum:', lb.includes('lbLoadingChapterNum'));
console.log('[JS] lb-ch-dot:', lb.includes('lb-ch-dot'));

// public/js/life-book.js 동기화 체크
const lbPub = readFileSync('public/js/life-book.js', 'utf8');
console.log('\n[public/JS] 길이:', lbPub.length);
console.log('[public/JS] public == root:', lb === lbPub);

// route.js 검증
const route = readFileSync('app/api/lifebook/session/route.js', 'utf8');
console.log('\n[route.js] 길이:', route.length);
console.log('[route.js] POST handler:', route.includes('export async function POST'));
console.log('[route.js] 13 configs:', (route.match(/id:\s*\d+/g)||[]).length);
console.log('[route.js] gemini-2.5-flash:', route.includes('gemini-2.5-flash'));
console.log('[route.js] thinkingConfig:', route.includes('thinkingConfig'));

// 로딩 화면 HTML 확인
const html = readFileSync('public/index.html', 'utf8');
console.log('\n[HTML] lb-ch-grid:', html.includes('lb-ch-grid'));
console.log('[HTML] lbLoadingChapterNum:', html.includes('lbLoadingChapterNum'));
console.log('[HTML] lbMysticQuote:', html.includes('lbMysticQuote'));
console.log('[HTML] lb-stars:', html.includes('lb-stars'));
console.log('[HTML] CSS버전:', (html.match(/life-book\.css\?v=[^"]+/)||['없음'])[0]);

// openLifeBookModal 로드 지점 확인
const lazyIdx = html.indexOf('life-book.js');
const lazy5Lines = html.substring(lazyIdx - 50, lazyIdx + 100);
console.log('\n[HTML] life-book.js 로드 방식:', lazy5Lines.trim().replace(/\n/g, ' '));

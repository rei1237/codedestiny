/**
 * _clean_sitemap.mjs
 * 사이트맵에서 실제 존재하지 않는 URL (리다이렉트 소스, 비HTML 피드, 샘플 페이지) 제거
 */
import { readFileSync, writeFileSync } from 'fs';

const sitemap = readFileSync('sitemap.xml', 'utf8');

// ── 제거 패턴: 리다이렉트 소스 / 비HTML / 테스트 페이지 ──
// 로케일 접두사(de-de/en-us/...) 포함 모든 변형에 적용
const REMOVE_PATTERNS = [
  // 리다이렉트 소스 → /saju-picture
  /\/animal\/(mbti|physio|totem)(\/|$)/,
  // 리다이렉트 소스 → /insights?topic=...
  /\/flower\/(astrology|destiny|jamidusu|sukuyo)(\/|$)/,
  /\/dream\/(tarot|psycho)(\/|$)/,
  /\/oracle\/sukuyo(\/|$)/,
  // 리다이렉트 소스 → /oracle/hwatu-life  (hwatu-life는 보존)
  /\/oracle\/hwatu(?!-life)(\/|$)/,
  // 리다이렉트 소스 → /oracle/sikojen-povailu
  /\/oracle\/juyuk(\/|$)/,
  // 리다이렉트 소스 → /royal-tea-oracle.html
  /\/oracle\/kemet(\/|$)/,
  // 리다이렉트 소스 → /tarot/love
  /\/tarot\/reunion(\/|$)/,
  /\/tarot\/self-esteem(\/|$)/,
  // 리다이렉트 소스 → /tarot/mingri
  /\/tarot\/year(\/|$)/,
  // 리다이렉트 소스 → /astrology/cosmic
  /\/vedic\/jyotish(\/|$)/,
  // 비HTML 피드
  /\/rss\.xml/,
  // 샘플/테스트 페이지
  /\/sample\//,
];

// <url>...</url> 블록 단위로 분리해서 필터링
const urlBlockRegex = /<url>[\s\S]*?<\/url>/g;
let removed = 0;
let kept = 0;

const cleaned = sitemap.replace(urlBlockRegex, (block) => {
  const locMatch = block.match(/<loc>(.*?)<\/loc>/);
  if (!locMatch) return block;
  const url = locMatch[1];
  // https://code-destiny.com 제거 후 경로만 검사
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  // 로케일 접두사 제거 후 검사
  const pathNoLocale = path.replace(/^\/(de-de|en-us|es-es|fr-fr|hi-in|ja-jp|ms-my|nl-nl|zh-cn)/, '');
  
  const shouldRemove = REMOVE_PATTERNS.some(pattern => 
    pattern.test(path) || pattern.test(pathNoLocale)
  );
  
  if (shouldRemove) {
    removed++;
    return ''; // 빈 문자열로 교체 (제거)
  }
  kept++;
  return block;
});

// 빈 줄 정리 (연속된 빈 줄 2개 이상 → 1개)
const cleanedTrimmed = cleaned.replace(/\n{3,}/g, '\n\n');

writeFileSync('sitemap.xml', cleanedTrimmed, 'utf8');
console.log(`✅ 정리 완료: 제거 ${removed}개, 유지 ${kept}개, 최종 총 ${kept}개`);

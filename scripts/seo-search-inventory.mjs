// Read-only source inventory. Does not call production services or generate articles.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { build } from 'esbuild';
register(pathToFileURL(resolve('scripts/app-module-loader.mjs')).href);
const { INSIGHT_SEED_ARTICLES: articles } = await import('../app/insights/seed-articles.js');
const { INSIGHT_ARTICLES: originalArticles } = await import('../app/insights/articles.js');
const { SEO_GROWTH_ARTICLES: growthArticles } = await import('../app/insights/seo-growth-articles.js');
const rawArticles = new Map([...growthArticles, ...originalArticles].map(a=>[a.slug,a]));
const { SEO_LANDING_PAGES: landings } = await import('../lib/seo-landing-pages.js');
const { SEO_ROUTE_PROFILES: profiles } = await import('../lib/seo/entity-registry.mjs');
const { getCelebrityEditorial, getIndexedCelebritySlugs } = await import('../lib/famous-saju/celebrity-editorial.js');
const bundle = await build({ entryPoints: ['lib/famous-saju/celebrity-data.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const celebrities = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const ctx = { window: {} };
vm.runInNewContext(readFileSync('js/core/service-registry.js', 'utf8'), ctx);
const services = ctx.window.__cdServiceRegistry;
if (!Array.isArray(services)) throw Error('Service registry must be an array');
const clean = v => String(v ?? '미확인').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const table = (headers, rows) => `| ${headers.join(' | ')} |\n| ${headers.map(()=>'---').join(' | ')} |\n${rows.map(row=>`| ${row.map(clean).join(' | ')} |`).join('\n')}\n`;
const related = path => articles.filter(a => String(a.contentHtml).includes(`href="${path.replace(/\/$/, '')}`)).map(a=>`/insights/${a.slug}/`).slice(0, 4);
mkdirSync('docs/seo', { recursive: true });
writeFileSync('docs/seo/SERVICE_INVENTORY.md', '# 서비스 소스 목록\n\n2026-09-08. 실제 홈 레지스트리와 SEO 랜딩 소스의 합집합. 모달은 독립 색인 페이지가 아니며 URL의 action을 보존한다. title/H1은 랜딩 소스값이며 빌드·운영 검증과 구별한다. 알려지지 않은 필드는 미확인으로 남긴다. 검색 유입 가능성은 데이터 매핑 문서에서 별도 평가한다.\n\n' + table(
  ['URL','서비스명','title','H1','대표 의도 / 설명','핵심 키워드','보조 키워드','관련 글','연결 서비스','현재 문제 / 개선'],
  [...new Set([...services.map(s=>s.href), ...Object.values(landings).map(p=>p.path)])].filter(Boolean).map(url=>{
    const p = Object.values(landings).find(p=>p.path.replace(/\/$/,'')===url.replace(/\/$/,''));
    const s = services.find(s=>s.href===url);
    const profile = profiles[url.replace(/\/$/,'')];
    return [url,s?.name || profile?.title || p?.h1,p?.title,p?.h1,profile?.topicSummary || s?.desc || p?.intro,profile?.primary || p?.keywords?.[0],(profile?.secondary || p?.keywords?.slice(1,4))?.join(', '),related(url).join(', '),(p?.relatedServices || profile?.relatedPaths)?.join(', '),url.includes('?')?'모달 진입: 독립 랜딩과 역할 분리; action 보존':'유입 데이터와 교차 확인; 제목 일괄 수정 금지'];
  })));
const seedSource = readFileSync('app/insights/seed-articles.js','utf8');
const originalSet = seedSource.split('const ORIGINAL_CONTENT_SLUGS = new Set([')[1].split(']);')[0];
writeFileSync('docs/seo/INSIGHT_INVENTORY.md', '# 전체 인사이트 목록\n\n2026-09-08. 렌더링에 쓰는 INSIGHT_SEED_ARTICLES를 직접 불러온 목록. 자동 분류는 편집 검수 완료를 뜻하지 않는다. 원문 보존 여부와 실제 본문의 반복을 함께 검토하며 기존 URL은 유지한다.\n\n' + table(
 ['URL','제목 / H1 소스','분류','관련 서비스','편집 우선 판단'], articles.map(a=>{
 const html=String(a.contentHtml || '');
 const links=[...html.matchAll(/href="(\/[^"#]*)"/g)].map(m=>m[1]);
 return [`/insights/${a.slug}/`,a.title,a.category,[...new Set(links.filter(l=>!l.startsWith('/insights/')))].slice(0,5).join(', '),originalSet.includes(`"${a.slug}"`) || rawArticles.get(a.slug)?.useOriginalContent ? '유지·내부링크 강화 후보; 개별 사실 검수 필요':'원문/템플릿 중복 대조 후 개선; 유입 확인 전 통합 금지'];
 })));
const indexed = new Set(getIndexedCelebritySlugs());
writeFileSync('docs/seo/CELEBRITY_CONTENT_AUDIT.md', '# 유명인 콘텐츠 감사\n\n2026-09-08. 전체 공개 인물 데이터와 원고 색인 게이트를 직접 대조했다. 인물별 재검수를 완료했다는 뜻은 아니다. 기존 reviewedAt은 저자의 검수 이력이므로 자동으로 갱신하지 않는다.\n\n공개 생년월일·사건과 점술적 해석을 분리해야 한다. 출생시간이 불명확한 글은 시주·상승궁·세부 시기 단정을 피한다. 현재 12개 원고의 단정적인 성격·건강·심리 해석은 출처 대조 후 수정할 대상으로 남긴다. 정국 원고의 잘못된 입대 연도를 AP 현장 보도로 확인해 2023년으로 바로잡고 출처를 추가했다. 같은 문단의 어린 시절·사고·건강 단정을 제거하고 일반 독자의 해석 질문으로 연결했다. 다른 문단과 인물의 개별 재검수는 남아 있다. 새 색인 확대와 일괄 삭제는 하지 않는다.\n\n' + table(
 ['URL','인물','현재 원고 상태','처리 분류','사실 확인 / 불확실성','출처'],celebrities.publishedCelebritySajuSeeds.map(p=>{
 const e=getCelebrityEditorial(p.slug);
 return [`/famous-saju/${p.slug}/`,p.nameKo || p.name,indexed.has(p.slug)?'기존 검수 원고 / 색인 대상':'템플릿 / 기존 제외 정책',p.slug==='bts-jungkook'?'개선: 입대 연도·건강 단정 교정; 나머지 문단 추가 검수':'유지; '+(e?'개선·사실 확인 필요·내부링크 강화':'고유 원고와 출처 확보 전 색인 확대 보류'),p.isBirthTimeKnown?'시간의 공개 출처 재확인':'출생시간 불명확: 시주·사생활 추론 금지',e?.sources?.map(s=>s.url).join(', ') || '원본 인물 데이터 출처 대조 필요'];
 })));
console.log(JSON.stringify({ services: services.length, landings: Object.keys(landings).length, articles: articles.length, publicCelebrities: celebrities.publishedCelebritySajuSeeds.length, indexedEditorials:indexed.size }));

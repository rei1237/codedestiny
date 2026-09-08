// Inspect the actual exported HTML; no HTTP/LLM requests and no site mutation.
import { readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'parse5';
const base='dist';
const files=[];
function walk(dir) {for(const entry of readdirSync(dir,{withFileTypes:true})) {const path=join(dir,entry.name); if(entry.isDirectory()) walk(path); else if(entry.name==='index.html') files.push(path);}}
walk(base);
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes || []).map(text).join('');
const clean=value=>String(value || '—').replace(/\s+/g,' ').replace(/\|/g,'\\|').trim();
const rows=[];
for(const file of files.sort()) {
  const doc=parse(readFileSync(file,'utf8'));
  const data={url:'/'+relative(base,file).replaceAll('\\','/').replace(/index\.html$/,''),h1:[],schemas:[],altMissing:0,images:0,canonical:[],title:[],description:[],robots:[],language:'',hreflang:[]};
  function visit(node,hidden=false) {
    const a=Object.fromEntries((node.attrs || []).map(a=>[a.name,a.value]));
    // React streams server-rendered content in S:* containers, then moves it into
    // place. Count that delivered content; exclude actual hidden UI sections.
    hidden=hidden || (Object.hasOwn(a,'hidden') && !/^S:/.test(a.id || ''));
    if(node.tagName==='html') data.language=a.lang;
    if(node.tagName==='title') data.title.push(text(node));
    if(node.tagName==='h1'&&!hidden) data.h1.push(text(node));
    if(node.tagName==='meta'&&a.name==='description') data.description.push(a.content);
    if(node.tagName==='meta'&&a.name==='robots') data.robots.push(a.content);
    if(node.tagName==='link'&&a.rel==='canonical') data.canonical.push(a.href);
    if(node.tagName==='link'&&a.hreflang) data.hreflang.push(a.hreflang);
    if(node.tagName==='img') {data.images++; if(!Object.hasOwn(a,'alt')) data.altMissing++;}
    if(node.tagName==='script'&&a.type==='application/ld+json') {
      try {const value=JSON.parse(text(node)); data.schemas.push(...(value['@graph'] || [value]).map(v=>v['@type']).flat().filter(Boolean));} catch {data.schemas.push('INVALID JSON');}
    }
    for(const child of node.childNodes || []) visit(child,hidden);
  }
  visit(doc);
  rows.push(data);
}
const issues=rows.filter(r=>r.title.length!==1 || r.description.length!==1 || r.canonical.length!==1 || r.h1.length!==1 || r.schemas.includes('INVALID JSON') || r.altMissing);
const headers=['URL','lang','title','H1 (hidden 제외)','canonical','meta robots','hreflang','JSON-LD 타입','alt 누락/이미지'];
writeFileSync('docs/seo/PAGE_INVENTORY.md',`# 빌드 HTML 전수 목록\n\n2026-09-08. dist 내 index.html ${rows.length}개를 parse5로 파싱했다. title/description/canonical/H1 개수·JSON-LD 구문·alt 검사 후보 ${issues.length}개. hidden 속성만 제외하므로 CSS/탭 상태에 따른 H1 가시성은 추가 판단이 필요하다. meta robots는 HTTP 헤더와 별개이며 빈 값은 색인 확정을 뜻하지 않는다. 파일 존재는 운영 HTTP 200의 증거가 아니다. 결과 페이지/로그인/테스트 등 기존 noindex도 조사 목적으로 포함하며 사이트맵에 새로 넣지 않는다.\n\n| ${headers.join(' | ')} |\n| ${headers.map(()=>'---').join(' | ')} |\n`+rows.map(r=>`| ${[r.url,r.language,r.title.join(' / '),r.h1.join(' / '),r.canonical.join(' / '),r.robots.join(' / '),r.hreflang.join(', '),[...new Set(r.schemas)].join(', '),`${r.altMissing}/${r.images}`].map(clean).join(' | ')} |`).join('\n')+'\n\n## 추가 검토 후보\n\n'+issues.map(r=>`- ${r.url}: title ${r.title.length}, description ${r.description.length}, canonical ${r.canonical.length}, H1 ${r.h1.length}, alt 누락 ${r.altMissing}, schema ${r.schemas.includes('INVALID JSON')?'구문 오류':'파싱 가능'}`).join('\n')+'\n');
const indexCandidates=issues.filter(r=>!r.robots.some(v=>/noindex/i.test(v))).map(r=>r.url);
appendFileSync('docs/seo/PAGE_INVENTORY.md', `\n위 후보 중 meta noindex가 없는 URL: ${indexCandidates.length ? indexCandidates.join(', ') : '없음'}. React의 S:* 서버 스트리밍 컨테이너 안의 H1은 전달된 본문으로 계산했다. 이 목록은 noindex 기능 페이지에 SEO용 H1을 억지로 넣으라는 지시가 아니다.\n`);
console.log(JSON.stringify({pages:rows.length,candidates:issues.length,withoutMetaNoindex:indexCandidates,invalidSchema:rows.filter(r=>r.schemas.includes('INVALID JSON')).length}));

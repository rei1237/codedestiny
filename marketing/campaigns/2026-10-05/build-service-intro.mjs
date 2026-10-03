// Move the approved campaign design into a CMS-backed, route-owned introduction.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import postcss from 'postcss';
const base='marketing/campaigns/2026-10-05';
const assetDir='public/assets/service-intro';
await mkdir(assetDir,{recursive:true});
const assets=[['v2/art/duo-stars.png','duo-stars'],['v2/art/cat-reading.png','cat-reading'],['v2/art/yeoni-gift.png','yeoni-gift'],['assets/actual-free-tarot.jpg','free-tarot'],['assets/reading-elements-refined.jpg','elements'],['assets/actual-component-report-example.jpg','report']];
for(const [source,name] of assets) await sharp(`${base}/${source}`).resize({width:1100,withoutEnlargement:true}).webp({quality:87}).toFile(`${assetDir}/${name}.webp`);
let html=(await readFile(`${base}/preview.html`,'utf8')).match(/<main id="top">([\s\S]*?)<\/main>/)[1];
html=html.replace(/<section id="start"[\s\S]*?<\/section>/,`<section id="start" class="wrap welcome"><div><h2>처음 만난 당신에게,<br><em>달빛 선물.</em></h2><p class="lead">가입 혜택을 확인하고,<br>나에게 맞는 상담을 만나보세요.</p><p>보유한 월정석과 유효기간은 계정에서 확인할 수 있어요. 원하는 상담의 이용 조건과 실제 적용 금액은 결제창에서 안내합니다.</p><a class="button" href="/ggulggul/">무료 운세부터 시작하기 ↗</a><p class="note">월정석은 현금으로 출금할 수 없습니다.<br>최신 가격과 혜택은 서비스의 이용 안내를 확인해 주세요.</p></div><img src="v2/art/yeoni-gift.png" width="1024" height="1024" alt="월정석 선물 상자를 건네는 꽃돼지 연이"></section>`);
html=html.replace(/<details><summary>월정석을 전부[\s\S]*?<\/details>/,'<details><summary>가격과 월정석 이용 조건은 어디서 확인하나요?</summary><p>상담 선택 화면과 결제창에서 최신 가격 및 적용 가능한 결제 수단을 확인해 주세요. 보유 월정석과 유효기간은 계정에서 확인할 수 있습니다.</p></details>');
html=html.replace('실제 개선 컴포넌트 · 가상 입력 예시 · 운영 반영 전','오행 분포 · 가상 입력 예시');
html=html.replaceAll('https://code-destiny.com/ggulggul/?utm_source=threads&utm_medium=social&utm_campaign=pinned_20261005','/ggulggul/').replaceAll('https://code-destiny.com/today/?utm_source=threads&utm_medium=social&utm_campaign=pinned_20261005','/today/');
html=html.replace('<a class="text-link" href="#reading">상담은 어떻게 다른가요?</a>','<a class="text-link" href="/yeongnyangi/">영냥이 상담 만나보기 ↗</a>');
// Human-review evidence is retained, but the public route avoids linking a mixed historical analysis collection.
html=html.replace('<a class="text-link" href="https://blog.naver.com/neosaju/224032671570">후기 원문 읽기 ↗</a>','<a class="text-link" href="#author">콘텐츠를 만드는 사람 ↗</a>');
for(const [source,name] of assets) html=html.replaceAll(source,`/assets/service-intro/${name}.webp`);
const dimensions={};
for(const [,name] of assets){const m=await sharp(`${assetDir}/${name}.webp`).metadata();dimensions[name]=[m.width,m.height];}
html=html.replace(/<img ([^>]+)>/g,(all,attrs)=>{const name=attrs.match(/service-intro\/([^".]+)/)[1];const [w,h]=dimensions[name];return `<img ${attrs.replace(/\s(?:width|height)="\d+"/g,'')} width="${w}" height="${h}" loading="${name==='duo-stars'?'eager':'lazy'}" />`;});
html=html.replaceAll('<br>','<br />').replaceAll('class=','className=');
// All prose is in the existing about CMS namespace. Keys identify the section and element.
const copy={};
const sections=['hero','questions','consultation','systems','fusion','free','elements','report','reviews','welcome','faq'];
html=html.split(/(?=<section\b)/).map((part,idx)=>{
 let index=0;const section=sections[idx-1];
 if(section&&!/^<section[^>]*\bid=/.test(part)) part=part.replace('<section ',`<section id="about-${section}" `);
 return part.replace(/>([^<>]+)</g,(match,value)=>{
  if(!value.trim())return match;
  const key=`intro.${section}.text${++index}`;copy[key]=value;
  return `>{text(${JSON.stringify(key)})}<`;
 });
}).join('');
await writeFile('app/_content/about-intro-copy.js','// Service introduction copy shares the existing about CMS namespace.\nexport const ABOUT_INTRO_COPY = '+JSON.stringify(copy,null,2)+';\n');
await writeFile('app/about/ServiceIntroduction.jsx',`/* eslint-disable @next/next/no-img-element -- optimized local WebP exports with explicit dimensions */\nimport './service-intro.css';\n\nexport default function ServiceIntroduction({text}) {\n  return <div className="cd-service-intro">${html}</div>;\n}\n`);
let css=await readFile(`${base}/campaign.css`,'utf8');
const ast=postcss.parse(css);
ast.walkAtRules('import',x=>x.remove());
ast.walkRules(rule=>{
 rule.selector=rule.selectors.map(s=>{
  if(s===':root'||s==='body') return '.cd-service-intro';
  if(s==='html') return '.cd-service-intro';
  return `.cd-service-intro ${s}`;
 }).join(',');
});
await writeFile('app/about/service-intro.css',`@import './service-intro-fonts.css';\n/* Approved campaign palette, scoped to the introduction; policy and app chrome are unaffected. */\n${ast.toString()}\n`);
await writeFile('app/about/service-intro-fonts.css',(await readFile(`${base}/campaign-fonts.css`,'utf8')).replaceAll('../../../public/assets/','/assets/'));
const contentPath='app/_content/about-copy.js';
let content=await readFile(contentPath,'utf8');
if(!content.includes('import { ABOUT_INTRO_COPY }')) content='import { ABOUT_INTRO_COPY } from "./about-intro-copy";\n'+content.replace('ko: {','ko: {\n    ...ABOUT_INTRO_COPY,');
await writeFile(contentPath,content);
await writeFile(`${assetDir}/provenance.json`,JSON.stringify({sourceCampaign:base,artwork:'Previously generated with built-in ImageGen; exact prompts in campaign v2/generation-prompts.json; no new raster artwork or UI reconstruction.',files:assets.map(([source,name])=>({file:name+'.webp',source:base+'/'+source,transform:'WebP quality 87, max width 1100, preserve aspect ratio'}))},null,2)+'\n');
console.log('Service introduction integrated; existing CMS, policy anchors and metadata retained. No numeric future offer added to permanent page.');

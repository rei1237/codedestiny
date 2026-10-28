// Local-only integration preview: real CMS UI and adminFetch, in-memory data.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url); require('./lib/mock-network-guard.cjs');
const defaults={
 'feature-detail':[{key:'sample',label:'상담 안내 (검증용)',fields:{record:{description:{text:'관계의 속도를 이해하는 상담 안내'},'panels/0/title':{text:'나를 위한 선택'}}}}],
 'feature-copy':[
  {key:'fortune-tea-house:landing.title',label:'운명의 찻집 · 제목',fields:{text:'마음의 흐름을 읽는 운명의 찻집'}},
  {key:'fortune-tea-house:landing.lead',label:'운명의 찻집 · 소개',fields:{text:'잠시 쉬어가며 지금의 마음을 살펴보세요.'}},
  {key:'fortune-tea-house:landing.cta',label:'운명의 찻집 · 버튼',fields:{text:'상담 시작하기'}},
 ],
 'daily-fortune':[{key:'love',label:'연애',fields:{record:{'0':{text:'마음의 간격을 존중하는 하루입니다.'},'1':{text:'작은 대화에서 관계의 실마리를 찾아보세요.'},'2':{text:'서두르지 않아도 괜찮습니다.'}}}}],
 'faq':[{key:'faq-page',label:'FAQ 페이지',fields:{items:[{question:'결과를 다시 볼 수 있나요?',answer:'보관함에서 저장된 결과를 확인하세요.'}]}}],
};
export async function startCmsPreview(port=4337) {
 const out=resolve(root,'.tmp/admin-cms-preview');mkdirSync(out,{recursive:true});
 await build({entryPoints:[resolve(root,'scripts/fixtures/admin-cms/browser.tsx')],bundle:true,outfile:resolve(out,'app.js'),jsx:'automatic',loader:{'.module.css':'local-css'},alias:{'@':root,'next/link':resolve(root,'scripts/fixtures/admin-guild/browser-adapters.tsx')},plugins:[{name:'local-only-adapters',setup(b){
  b.onResolve({filter:/api-config$/},()=>({path:resolve(root,'scripts/fixtures/admin-guild/browser-adapters.tsx')}));
  b.onResolve({filter:/\/base-values$/},()=>({path:resolve(root,'scripts/fixtures/admin-cms/base-values.ts')}));
 }}],define:{'process.env.NODE_ENV':'"development"','process.env':'{}'}});
 writeFileSync(resolve(out,'input.css'),'@tailwind base;\n@tailwind components;\n@tailwind utilities;');
 const css=spawnSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i',resolve(out,'input.css'),'-o',resolve(out,'tailwind.css'),'--content','./app/admin/**/*.{tsx,ts}'],{cwd:root,stdio:'pipe',windowsHide:true});if(css.status!==0)throw Error(css.stderr.toString());
 const calls=[];const saved=new Map(); let failDefaults='';
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1:'+port);
  res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'self'; form-action 'none'");
  const json=(data,status=200)=>res.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify(data));
  if(url.pathname==='/__fixture/calls')return json(calls);
  if(url.pathname==='/__fixture/fail-defaults'){failDefaults=url.searchParams.get('ns');return json({ok:true});}
  if(url.pathname==='/__fixture/defaults'){const ns=url.searchParams.get('ns');if(failDefaults===ns){failDefaults='';return json({},503);}return json(defaults[ns]||[]);}
  if(url.pathname.startsWith('/api/')){
   calls.push({method:req.method,path:url.pathname,query:url.search});
   if(req.headers['x-admin-token']!=='LOCAL_CMS_FIXTURE_ONLY.'+'0'.repeat(64))return json({error:'unauthorized'},401);
   if(url.pathname==='/api/admin/content' && req.method==='GET') {
    const page=Number(url.searchParams.get('page')||1);
    return json({items:[{id:'fixture-'+page,title:'검증용 원고 '+page,slug:'fixture-'+page,status:'draft',type:'fortune_insight'}],pagination:{page,limit:80,total:81,totalPages:2}});
   }
   if(url.pathname==='/api/admin/cms/entries')return json({items:[...saved.values()].filter(item=>item.namespace===url.searchParams.get('ns'))});
   const match=url.pathname.match(/^\/api\/admin\/cms\/entries\/([^/]+)\/([^/]+)(\/revisions)?$/);
   if(match){const ns=decodeURIComponent(match[1]),key=decodeURIComponent(match[2]);if(match[3])return json({items:[]});
    if(req.method==='PUT'){let body='';for await(const chunk of req)body+=chunk;const payload=JSON.parse(body);const item={namespace:ns,key,fields:payload.fields,status:payload.status,version:1,channel:ns==='feature-copy'?'runtime':'build'};saved.set(ns+'::'+key,item);return json({item});}
   }
   return json({error:'Fixture route blocked'},405);
  }
  if(['/app.js','/app.css','/tailwind.css'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':'text/css');res.end(readFileSync(resolve(out,url.pathname.slice(1))));return;}
  if(url.pathname.startsWith('/admin/')){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>관리자 편집 검증 · 테스트 데이터</title><link rel="stylesheet" href="/tailwind.css"><link rel="stylesheet" href="/app.css"><body style="margin:0"><div id="root"></div><script src="/app.js"></script></body></html>');return;}
  const ns=url.pathname.startsWith('/fortune-tea-house')?'feature-copy':url.pathname.startsWith('/faq')?'faq':'feature-detail';
  const text=ns==='feature-copy'?'<h1>마음의 흐름을 읽는 운명의 찻집</h1><p>잠시 쉬어가며 지금의 마음을 살펴보세요.</p><button>상담 시작하기</button>':ns==='faq'?'<h1>자주 묻는 질문</h1><h2>결과를 다시 볼 수 있나요?</h2><p>보관함에서 저장된 결과를 확인하세요.</p>':'<h1>나를 위한 선택</h1><p>관계의 속도를 이해하는 상담 안내</p>';
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#fffaf7;color:#3c1830;font:18px/1.8 sans-serif;padding:28px"><p style="font-size:13px">테스트 페이지 · 운영 콘텐츠 아님</p>'+text+'</body></html>');
 }catch(error){console.error(error);res.writeHead(500).end('Fixture failure');}});
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return {server,calls,saved};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){await startCmsPreview();console.log('Local CMS preview http://127.0.0.1:4337/admin/cms/');}

// Mock-only export proof: no auth, provider, payment, API or production DB access.
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';

const output=resolve(process.argv[2]||'artifacts/yeongnyangi-summary');
const root=resolve('public');
const code=(await build({entryPoints:['app/yeongnyangi/_lib/summary-export.ts'],bundle:true,platform:'browser',format:'iife',globalName:'SummaryExporter',write:false})).outputFiles[0].text;
const server=createServer(async(request,response)=>{
 if(request.url==='/'){response.setHeader('Content-Type','text/html; charset=utf-8');response.end('<!doctype html><html lang="ko"><body></body></html>');return;}
 const path=resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
 if(!path.startsWith(root)){response.writeHead(403);response.end();return;}
 try{const body=await readFile(path);response.setHeader('Content-Type',extname(path)==='.webp'?'image/webp':extname(path)==='.png'?'image/png':extname(path)==='.html'?'text/html; charset=utf-8':'text/plain');response.end(body);}catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(`http://127.0.0.1:${port}/`);
 await page.addScriptTag({content:code});
 await mkdir(output,{recursive:true});
 const mascot={saju:'/assets/mascot/yeoni-moonstone-reward-v1.png',vedic:'/assets/yeongnyangi/report/v1/vedic-elephant.webp',astrology:'/assets/yeongnyangi/report/v1/astrology-owl.webp',ziwei:'/assets/yeongnyangi/report/v1/ziwei-neo-clean.webp',tarot:'/assets/yeongnyangi/report/v1/tarot-fox.webp'};
 for(const domain of Object.keys(mascot)){
  const tarot=domain==='tarot';
  const domainLabel={saju:'사주',vedic:'베다점',astrology:'서양 점성술',ziwei:'자미두수',tarot:'타로'}[domain];
  const sajuGroups=['년주','월주','일주','시주'].map((label,index)=>({id:label,label,items:[{label:'천간·지지',value:['乙卯','辛酉','戊辰','자료 없음'][index]},{label:'천간 십성',value:['정관','상관','일간','자료 없음'][index]}]}));
  const report={serviceType:domain,locale:'ko',headline:`${domainLabel} 상담의 저장된 근거`,oneLineSummary:'이 문장은 모의 결과입니다. 계산된 차트 요소와 저장된 상담을 연결합니다.',keywords:['저장된 근거','선택','흐름'],mascotMessage:'결과를 천천히 읽고 지금 가능한 선택부터 살펴봐요.',mascot:mascot[domain],coverage:{missing:[]},sections:['성향','강점','관계','다음 행동'].map((title,index)=>({title,body:`${domainLabel} 모의 상담의 ${index+1}번째 문장입니다. 실제 계산이나 예측 결과가 아닙니다.`,chapterId:String(index)})),chart:{domain,title:tarot?'이번 질문의 카드':`${domainLabel} 계산 차트`,groups:tarot?[{id:'card',label:'현재의 상황',items:[{label:'카드',value:'힘 · 정방향'}],cardCode:'M08',image:'/assets/yeongnyangi/tarot/v1/M08-600.webp'}]:domain==='saju'?sajuGroups:[{id:'a',label:'대표 상징',items:[{label:'값',value:'계산된 배치'}]},{id:'b',label:'두 번째 요소',items:[{label:'값',value:'저장된 값'}]}]}};
  for(const format of ['feed','story']){
   const data=await page.evaluate(async({report,format})=>{const blob=await window.SummaryExporter.renderSummaryPng(report,format);return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});},{report,format});
   const bytes=Buffer.from(data.split(',')[1],'base64');await writeFile(resolve(output,`${domain}-${format}.png`),bytes);console.log(`${domain}-${format}.png ${bytes.length}`);
  }
  for(let index=0;index<1+Math.ceil(report.sections.length/3);index++){
   const data=await page.evaluate(async({report,index})=>{const blob=await window.SummaryExporter.renderSummaryPng(report,'report',index);return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});},{report,index});
   const bytes=Buffer.from(data.split(',')[1],'base64');await writeFile(resolve(output,`${domain}-report-${index+1}.png`),bytes);console.log(`${domain}-report-${index+1}.png ${bytes.length}`);
  }
 }
 await page.setViewportSize({width:1300,height:900});
 await page.goto(`http://127.0.0.1:${port}/assets/yeongnyangi/report/v1/character-sheet.html`);
 await page.locator('.grid img').first().evaluate(image=>image.decode());
 await page.screenshot({path:resolve(output,'character-sheet.png'),fullPage:true});
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}

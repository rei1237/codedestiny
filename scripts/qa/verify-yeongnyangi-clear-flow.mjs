// Loopback-only visual fixture. Run: node scripts/qa/verify-yeongnyangi-clear-flow.mjs
// YN_CLEAR_FLOW_OUTPUT optionally selects a capture folder (default .tmp/yn-clear-flow).
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const output=path.resolve(process.env.YN_CLEAR_FLOW_OUTPUT||'.tmp/yn-clear-flow');
const targeted=process.env.YN_CLEAR_FLOW_TARGETED==='1';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yn-clear-flow-'));
const require=createRequire(import.meta.url),Module=require('node:module');
let browser,server;
try {
  fs.mkdirSync(output,{recursive:true});
  await build({stdin:{contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';
    import Home from './app/yeongnyangi/_components/Home';
    import Guide from './app/yeongnyangi/_components/YeongnyangiGuide';
    import Consultation from './app/yeongnyangi/_components/Consultation';
    import QuestionSkyConsultation from './app/yeongnyangi/_components/QuestionSkyConsultation';
    import Layout from './app/yeongnyangi/layout';
    import './app/yeongnyangi/night-tokens.css';
    import './styles/theme-tokens.css';
    const params=new URLSearchParams(location.search);
    const surface=params.get('surface')||(params.get('mode')==='spirit'?'prashna':location.pathname.includes('/fortune/')?'consultation':'home');
    createRoot(document.getElementById('root')).render(<Layout>{surface==='home'?<Home guide={<Guide/>}/>:surface==='prashna'?<QuestionSkyConsultation mode="prashna-v1"/>:<Consultation/>}</Layout>);
  `,resolveDir:root,loader:'tsx'},bundle:true,external:['/assets/*','/icons/*'],outfile:path.join(temp,'fixture.js'),platform:'browser',jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"development"'},plugins:[{name:'mock-next',setup(b){
    b.onResolve({filter:/^next\/(navigation|image|link)$/},args=>({path:args.path,namespace:'mock-next'}));
    b.onLoad({filter:/.*/,namespace:'mock-next'},args=>({loader:'tsx',resolveDir:root,contents:args.path.endsWith('navigation')?
      "export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:(url)=>location.assign(url),replace:(url)=>history.replaceState({},'',url),refresh:()=>{}});":
      `import React from 'react';export default function Component({priority,fill,unoptimized,loader,blurDataURL,...props}){return React.createElement('${args.path.endsWith('image')?'img':'a'}',props)}`
    }));
  }}]});
  const catalog=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog';",resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
  const catalogModule=new Module(path.join(temp,'catalog.cjs'));catalogModule._compile(catalog.outputFiles[0].text,catalogModule.id);
  const products=catalogModule.exports.products.map(product=>({...product,available:true}));
  server=createServer((req,res)=>{
    const pathname=new URL(req.url,'http://127.0.0.1').pathname;
    const file=pathname==='/fixture.js'||pathname==='/fixture.css'?path.join(temp,pathname.slice(1)):(/^\/(assets|icons|images|feature-details)\//.test(pathname))?path.resolve(root,'public',`.${pathname}`):null;
    if(file&&fs.existsSync(file)){
      res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'application/octet-stream');
      res.end(fs.readFileSync(file));return;
    }
    // Match the root font custom property used by the actual application layout.
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="ko" style="--font-noto-sans-kr:system-ui"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0;background:#0b1220;font-family:system-ui,sans-serif"><div id="root"></div><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true});
  const evidence=[],keyboardEvidence=[],errors=[],blocked=[];
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('fortune_auth_user',JSON.stringify({_id:'visual-mock',id:'visual-mock',name:'테스트 손님'})));
  const profile={id:'mock-profile',profileId:'mock-profile',name:'테스트 손님',gender:'F',birthDate:'1994-05-16',birth:{year:1994,month:5,day:16,hour:10,minute:30,timeUnknown:false,calType:'solar'},location:{label:'서울',tz:'Asia/Seoul',lat:37.56,lng:126.97}};
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==base){blocked.push(url.hostname);return route.abort();}
    if(url.pathname.startsWith('/api/')){
      assert.equal(request.method(),'GET','Visual capture must not submit mutations');
      const data=url.pathname==='/api/auth/me'?{authenticated:true,user:{id:'visual-mock',name:'테스트 손님'}}:url.pathname.endsWith('/products')?{products}:url.pathname.endsWith('/profiles')?{ok:true,profiles:[profile],currentId:profile.id}:url.pathname.endsWith('/saju/jong-check')?{check:null}:{ok:true};
      return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    }
    return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>{errors.push(error.message);console.error('Browser error:',error.message);});
  for(const surface of targeted?['home','legacy']:['home','consultation','prashna']){
    for(const width of targeted?[360,390]:[360,390,430,1280]){
      await page.setViewportSize({width,height:width===1280?1000:844});
      await page.goto(`${base}${surface==='home'?'/yeongnyangi/':'/yeongnyangi/fortune/'}?surface=${surface}${surface==='legacy'?'&flow=legacy':''}`,{waitUntil:'networkidle'});
      await page.locator(surface==='home'?'h1':surface==='legacy'?'[role="group"][aria-label="운세 종류"]':surface==='consultation'?'#yn-question':'#sky-question').first().waitFor();
      // Decode local artwork and expose below-fold lazy images before the full capture.
      await page.evaluate(async()=>{document.querySelectorAll('img[loading="lazy"]').forEach(image=>image.loading='eager');await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));});
      const geometry=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,brokenImages:[...document.images].filter(image=>!image.complete||!image.naturalWidth).map(image=>image.getAttribute('src'))}));
      assert.deepEqual(geometry.brokenImages,[],surface+' local artwork must decode');
      assert.ok(geometry.scrollWidth<=width+1,`${surface}: ${JSON.stringify(geometry)}`);
      const file=path.join(output,`${surface}-${width}.png`);
      await page.screenshot({path:file,fullPage:true});
      await page.screenshot({path:path.join(output,`${surface}-${width}-viewport.png`)});
      evidence.push({surface,width,...geometry,file});
      if(surface==='home'){
        const entry=page.locator('#questions');
        await entry.screenshot({path:path.join(output,`question-entry-${width}.png`)});
        assert.equal(await entry.locator('button[aria-pressed]:visible').count(),4,'Four initial recommendations');
        await entry.getByRole('button',{name:'질문 더 보기',exact:true}).click();
        assert.equal(await entry.locator('button[aria-pressed]:visible').count(),8,'All recommendations remain available');
        await entry.getByRole('button',{name:'추천 질문 접기',exact:true}).click();
        const choices=entry.getByRole('button',{name:/그 사람의 말과 행동/});
        await choices.focus();await page.keyboard.press('Enter');
        const reading=page.locator('#question-reading');
        await reading.getByRole('link',{name:'이 질문으로 상담 준비하기'}).waitFor();
        assert.equal(await choices.getAttribute('aria-pressed'),'true');
        assert.ok(await entry.locator('small').evaluateAll(els=>els.every(el=>parseFloat(getComputedStyle(el).fontSize)>=14)),'Secondary question labels meet 14px minimum');
        assert.ok(await reading.locator('p').evaluateAll(els=>els.every(el=>parseFloat(getComputedStyle(el).fontSize)>=14)),'Price and condition guidance is readable');
        assert.equal(await choices.evaluate(el=>el.nextElementSibling?.id),'question-reading','Guidance follows the selected question immediately');
        assert.ok(await reading.evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#questions > details'))&Node.DOCUMENT_POSITION_FOLLOWING)),'Selected offer precedes the question finder');
        await reading.screenshot({path:path.join(output,`question-offer-${width}.png`)});
        const finder=entry.locator('details').first();await finder.locator('summary').click();
        await entry.locator('#concern-search').fill('존재하지않는검색어검증');
        assert.equal(await entry.getByText('같은 표현의 고민이 아직 없어요.',{exact:false}).count(),1);
        await entry.locator('#concern-search').fill('이직');
        assert.ok(await entry.locator('#concern-search').inputValue()==='이직');
        const searchChoice=finder.locator('button[aria-pressed]').first();await searchChoice.click();
        assert.equal(await searchChoice.evaluate(el=>el.nextElementSibling?.id),'question-reading','Search selection shows its guidance in place');
        assert.equal(await page.locator('#question-reading').count(),1,'A selection has one guidance panel');
        await finder.locator('summary').click();
        const form=entry.getByRole('form',{name:'내 고민 직접 적기'}),field=form.getByRole('textbox');
        assert.equal(await form.getByRole('button',{name:'이 고민으로 상담 준비하기'}).isDisabled(),true);
        await field.fill('   ');
        assert.equal(await form.getByRole('button',{name:'이 고민으로 상담 준비하기'}).isDisabled(),true);
        await field.fill('');
        keyboardEvidence.push({surface,width,questionSelect:'PASS',offerBeforeFinder:'PASS',searchEmptyState:'PASS',emptyQuestionBlocked:'PASS'});
      }
      if(targeted){
        if(surface==='home'){
          const sample=page.locator('#yn-example');
          assert.ok(await sample.locator('blockquote > p').count()>=2,'Sample shows interpretation and action advice without expanding');
          await sample.screenshot({path:path.join(output,`sample-${width}.png`)});
          keyboardEvidence.push({surface,width,sampleDefaultParagraphs:await sample.locator('blockquote > p').count()});
        }else{
          const spirit=page.getByRole('group',{name:'운세 종류',exact:true}).getByRole('link',{name:'영냥 신점',exact:true});
          assert.equal(await spirit.getAttribute('href'),'/yeongnyangi/fortune/?mode=spirit&lang=ko');
          await spirit.focus();await page.keyboard.press('Enter');
          await page.waitForURL('**/yeongnyangi/fortune/?mode=spirit&lang=ko');
          await page.locator('#sky-question').waitFor();
          const method=page.getByText('별의 기운은 어떻게 풀이하나요?',{exact:true});
          await method.focus();await page.keyboard.press('Enter');
          const disclosure=method.locator('..');
          assert.equal(await disclosure.getAttribute('open'),'');
          assert.match(await disclosure.textContent(),/프라슈나/);assert.match(await disclosure.textContent(),/호라리/);
          assert.equal(await disclosure.getByRole('link',{name:'영냥 호라리 살펴보기'}).getAttribute('href'),'/yeongnyangi/fortune/?mode=horary');
          const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1);
          await disclosure.screenshot({path:path.join(output,`method-${width}.png`)});
          await page.screenshot({path:path.join(output,`spirit-open-${width}.png`),fullPage:true});
          keyboardEvidence.push({surface,width,spiritHref:'PASS',keyboardNavigation:'PASS',methodDisclosure:'PASS',overflow});
        }
        continue;
      }
      if(surface==='home'){
        assert.equal(await page.locator('#yn-guide-title').count(),1,'Home guide renders once');
        const faq=page.locator('#yn-faq details summary').first();
        await faq.focus();await page.keyboard.press('Enter');
        assert.equal(await faq.evaluate(el=>el.parentElement.open),true,'FAQ expands with keyboard');
        keyboardEvidence.push({surface,width,faqKeyboard:'PASS',guideCount:1});
      }else if(surface==='consultation'){
        const input=page.locator('#yn-question'),send=page.getByRole('button',{name:'상담과 결제 확인하기',exact:true});
        await input.fill('');assert.equal(await send.isDisabled(),true,'Empty question cannot advance');
        await input.fill('내 마음을 어떻게 표현하면 좋을까?');
        assert.equal(await send.isEnabled(),true,'Valid question can advance');
        await input.focus();await page.keyboard.press('Tab');assert.equal(await send.evaluate(el=>el===document.activeElement),true,'Continue is next Tab stop');
        const focus=await send.evaluate(el=>({outlineStyle:getComputedStyle(el).outlineStyle,outlineWidth:getComputedStyle(el).outlineWidth,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
        assert.ok(focus.outlineStyle!=='none'&&parseFloat(focus.outlineWidth)>0,'Visible keyboard focus');
        assert.ok(focus.width>=44&&focus.height>=44,'44px continue target');
        await input.fill('지금의 관계와 앞으로의 선택에 대해 알고 싶어요. '.repeat(40).slice(0,1000));
        assert.equal(await send.isEnabled(),true,'Long question remains editable');
        const zoom=await page.addStyleTag({content:'html{font-size:200%!important}'});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Input page reflows at 200%');
        await zoom.evaluate(el=>el.remove());
        if(width===390){
          await page.setViewportSize({width,height:450});await input.focus();await page.keyboard.press('Tab');
          const bounds=await send.boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=450,'Continue stays reachable in reduced viewport');
          await page.screenshot({path:path.join(output,'consultation-reduced-viewport.png')});
          await page.setViewportSize({width,height:844});
        }
        await input.fill('');keyboardEvidence.push({surface,width,initialInput:'PASS',tabOrder:'PASS',focus});
      }else{
        const question=page.locator('#sky-question');await question.focus();await page.keyboard.press('Tab');
        assert.equal(await page.locator('#sky-topic').evaluate(el=>el===document.activeElement),true,'Prashna topic follows question');
        keyboardEvidence.push({surface,width,questionToTopicTabOrder:'PASS'});
      }
    }
  }
  // Exercise the real home → consultation draft bridge without sending a question
  // to the server. A storage error must leave the user's text on the home page.
  await page.goto(base+'/yeongnyangi/',{waitUntil:'networkidle'});
  const homeForm=page.getByRole('form',{name:'내 고민 직접 적기'}),homeField=homeForm.getByRole('textbox');
  const privateQuestion='이직을 고민하고 있어요.\n지금의 선택을 어떻게 정리하면 좋을까요?';
  await homeField.fill(privateQuestion);
  await page.evaluate(()=>{window.originalStorageSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Blocked for test','SecurityError');};});
  await homeForm.getByRole('button',{name:'이 고민으로 상담 준비하기'}).click();
  await homeForm.getByRole('alert').waitFor();
  assert.equal(await homeField.inputValue(),privateQuestion,'Storage failure preserves the question');
  assert.equal(new URL(page.url()).pathname,'/yeongnyangi/');
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSetItem;delete window.originalStorageSetItem;});
  await homeForm.getByRole('button',{name:'이 고민으로 상담 준비하기'}).click();
  await page.waitForURL('**/yeongnyangi/fortune/?flow=question');
  const transferred=page.locator('#yn-question');
  await transferred.waitFor();
  assert.equal(await transferred.inputValue(),privateQuestion,'The exact home question reaches the first consultation step');
  assert.equal(new URL(page.url()).search,'?flow=question','Private question stays out of the URL');
  await transferred.fill(privateQuestion+' 수정');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await transferred.inputValue(),privateQuestion+' 수정','Existing consultation draft retains subsequent edits');
  keyboardEvidence.push({surface:'home-to-consultation',storageFailurePreservesInput:'PASS',privateQuestionTransfer:'PASS',urlContainsNoQuestion:'PASS',editedDraftReload:'PASS'});
  assert.deepEqual(errors,[],'React runtime errors');
  const report={result:'PASS',mode:'mock loopback only; no generation, payment, DB or external traffic',evidence,keyboardEvidence,blockedExternalHosts:[...new Set(blocked)],errors};
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({result:report.result,captures:evidence.length,output,errors,blockedExternalHosts:report.blockedExternalHosts},null,2));
} finally {
  await browser?.close();
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
  if(path.dirname(temp)===os.tmpdir()&&path.basename(temp).startsWith('yn-clear-flow-'))fs.rmSync(temp,{recursive:true,force:true});
}

// Replays parent updates with the actual expert result renderer, with no API traffic.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const label = process.argv[2] || 'baseline', directory = resolve('.tmp/result-render');
await mkdir(directory, { recursive: true });
await build({ stdin: { contents: `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import ConsultationReading from './components/fortune/ConsultationReading';
const value = Array.from({length:100},(_,i)=>'### 흐름 '+i+'\\n\\n'+('생각과 감정의 속도를 살피고 지금 실천할 수 있는 선택을 하나씩 정리해 보세요. '.repeat(6))).join('\\n\\n');
let update;
function Screen(){const [tick,setTick]=useState(0);update=setTick;return <><output>{tick}</output>{['vedic','ziwei','astrology','karma','lifeBook','love','newYear','sukuyo'].map(kind=><ConsultationReading key={kind} kind={kind} value={value}/>)}</>;}
flushSync(()=>createRoot(document.getElementById('root')).render(<Screen/>));
window.measure=()=>{const results=[];for(let i=1;i<=12;i++){const t=performance.now();flushSync(()=>update(i));results.push(performance.now()-t);}return {updates:results,text:document.getElementById('root').textContent.length,dom:document.querySelectorAll('*').length};};
`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, minify: true, define: { 'process.env.NODE_ENV': '"production"' }, outfile: resolve(directory, 'fixture.js'), loader: { '.css': 'local-css' }, jsx: 'automatic', logLevel: 'silent' });
const server = createServer(async (req, res) => {
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script>'); return; }
  if (!['/fixture.js','/fixture.css'].includes(req.url)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', req.url.endsWith('.js') ? 'text/javascript' : 'text/css'); res.end(await readFile(resolve(directory, req.url.slice(1))));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
try {
  const results=[];
  for(let run=0;run<3;run++){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'load'});await page.waitForFunction(()=>typeof window.measure==='function');
    results.push(await page.evaluate(()=>window.measure()));await page.close();
  }
  await writeFile(resolve(directory,label+'.json'),JSON.stringify({label,results},null,2));
  const updates=results.flatMap(r=>r.updates).sort((a,b)=>a-b);
  console.log(JSON.stringify({label,medianUpdateMs:updates[Math.floor(updates.length/2)],p95UpdateMs:updates[Math.floor(updates.length*.95)],text:results[0].text,dom:results[0].dom}));
}finally{await browser.close();await new Promise(done=>server.close(done));}

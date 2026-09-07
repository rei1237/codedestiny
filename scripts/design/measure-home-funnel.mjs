// Local shell comparison. External resources are blocked by CSP and Chromium DNS rules.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
const root=process.cwd(),publicRoot=path.resolve('public'),out=path.resolve('build-cache/home-ui');
fs.mkdirSync(out,{recursive:true});
const baseline=execFileSync('git',['show','HEAD:index.html'],{maxBuffer:8e6});
let mode='current';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 res.setHeader('Content-Security-Policy',"connect-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data:; font-src 'self' data:; frame-src 'self'; form-action 'self'");
 if(url.pathname.startsWith('/api/')) {res.writeHead(401,{'Content-Type':'application/json'});res.end('{"ok":false,"mock":true,"code":"UNAUTHENTICATED"}');return}
 const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\//,'');
 const file=path.resolve(publicRoot,relative);
 if(!file.startsWith(publicRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}
 const ext=path.extname(file);
 const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
 let data=mode==='baseline'&&relative==='index.html'?baseline:fs.readFileSync(file);
 if(mode==='baseline'&&/^(js|styles)\//.test(relative)) {try{data=execFileSync('git',['show','HEAD:'+relative],{maxBuffer:20e6,stdio:['ignore','pipe','ignore']})}catch{}}
 res.setHeader('Content-Type',types[ext]||'application/octet-stream');
 if(/\.(html|css|js|json|svg)$/.test(file)){data=zlib.gzipSync(data);res.setHeader('Content-Encoding','gzip')}
 res.end(data);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const summaries=[];
try{
 for(mode of ['baseline','current']){
  console.log('[home-lighthouse] '+mode);
  const chrome=await chromeLauncher.launch({chromeFlags:['--headless=new','--disable-gpu','--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
  try{
   const result=await lighthouse(`http://127.0.0.1:${server.address().port}/`,{port:chrome.port,onlyCategories:['performance','accessibility','seo'],logLevel:'error'});
   fs.writeFileSync(path.join(out,`lighthouse-${mode}.json`),JSON.stringify(result.lhr));
   const a=result.lhr.audits;
   summaries.push({mode,scores:Object.fromEntries(Object.entries(result.lhr.categories).map(([k,v])=>[k,Math.round(v.score*100)])),lcp:a['largest-contentful-paint'].numericValue,cls:a['cumulative-layout-shift'].numericValue,tbt:a['total-blocking-time'].numericValue,failed:Object.entries(a).filter(([,v])=>v.score===0).map(([k])=>k)});
   console.log(JSON.stringify(summaries.at(-1)));
  }finally{try{await chrome.kill()}catch(e){console.log('Chrome temp cleanup: '+e.code)}}
 }
}finally{server.close();fs.writeFileSync(path.join(out,'lighthouse-summary.json'),JSON.stringify(summaries,null,2))}

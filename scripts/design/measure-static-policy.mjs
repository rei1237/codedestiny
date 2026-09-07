// Compare local production HTML snapshots. All API and non-local traffic is blocked.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
const baselineArg = process.argv.find(a => a.startsWith('--baseline-root='));
if (!baselineArg) throw new Error('An explicit previous production build --baseline-root is required');
const baselineRoot = path.resolve(baselineArg.slice(16));
const currentRoot = path.resolve('public');
const out = path.resolve('build-cache/static-policies');
let mode = 'baseline';
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  res.setHeader('Content-Security-Policy', "connect-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data:; font-src 'self' data:; frame-src 'none'; form-action 'self'");
  if (url.pathname.startsWith('/api/')) {res.writeHead(401, {'Content-Type':'application/json'});res.end('{"ok":false,"mock":true}');return;}
  const root = mode === 'baseline' ? baselineRoot : currentRoot;
  const route = url.pathname === '/privacy/' ? (mode === 'baseline' ? '/privacy/index.html' : '/static/policies/privacy/index.html') : url.pathname;
  const file = path.resolve(root, '.' + decodeURIComponent(route));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  const ext = path.extname(file);
  const type = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json','.woff2':'font/woff2'}[ext];
  res.setHeader('Content-Type',type || 'application/octet-stream');
  let bytes = fs.readFileSync(file);
  if (/\.(html|css|js|json|svg)$/.test(file)) {bytes=zlib.gzipSync(bytes);res.setHeader('Content-Encoding','gzip');}
  res.end(bytes);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const summary=[];
try {
  for(mode of ['baseline','current']) {
    const chrome=await chromeLauncher.launch({chromeFlags:['--headless=new','--disable-gpu','--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
    try {
      const {lhr}=await lighthouse(`http://127.0.0.1:${server.address().port}/privacy/`,{port:chrome.port,onlyCategories:['performance','accessibility','seo'],logLevel:'error'});
      fs.writeFileSync(path.join(out,`lighthouse-${mode}.json`),JSON.stringify(lhr));
      const a=lhr.audits;
      const requests=a['network-requests'].details.items;
      summary.push({mode,score:Math.round(lhr.categories.performance.score*100),accessibility:Math.round(lhr.categories.accessibility.score*100),seo:Math.round(lhr.categories.seo.score*100),lcp:a['largest-contentful-paint'].numericValue,cls:a['cumulative-layout-shift'].numericValue,tbt:a['total-blocking-time'].numericValue,transferBytes:requests.reduce((n,r)=>n+r.transferSize,0),frameworkRequests:requests.filter(r=>r.url.includes('/_next/')).length});
      console.log(JSON.stringify(summary.at(-1)));
    } finally {try{await chrome.kill()}catch(error){console.log('Chrome temp cleanup: '+error.code);}}
  }
} finally {server.close();fs.writeFileSync(path.join(out,'lighthouse-summary.json'),JSON.stringify(summary,null,2));}

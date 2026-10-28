// Local-only UI + real HQ route integration. No production auth, DB, PG, GA or LLM.
// Browser uses actual pages/AdminShell/adminFetch; only Next navigation/API origin and DB are adapted.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
require('./lib/mock-network-guard.cjs');
const out=resolve(root,'.tmp/admin-guild-integration');mkdirSync(out,{recursive:true});
const fixture=resolve(root,'scripts/fixtures/admin-guild');
await build({entryPoints:[resolve(root,'worker/routes/admin-hq.js')],bundle:true,platform:'node',format:'esm',packages:'external',external:['*.wasm'],banner:{js:'import { createRequire as fixtureRequire } from "node:module"; const require = fixtureRequire(import.meta.url);'},outfile:resolve(out,'api.mjs'),plugins:[{name:'memory-db-only',setup(b){b.onResolve({filter:/ops-hq\/db\.js$|^\.\/db\.js$/},args=>{if(args.path.includes('ops-hq/')||args.importer.replaceAll('\\','/').includes('/ops-hq/'))return {path:resolve(fixture,'db.mjs')};});}}]});
await build({entryPoints:[resolve(fixture,'browser.tsx')],bundle:true,outfile:resolve(out,'app.js'),jsx:'automatic',alias:{'next/link':resolve(fixture,'browser-adapters.tsx'),'next/navigation':resolve(fixture,'browser-adapters.tsx'),'@':root},plugins:[{name:'same-origin-only',setup(b){b.onResolve({filter:/api-config$/},()=>({path:resolve(fixture,'browser-adapters.tsx')}));}}],define:{'process.env.NODE_ENV':'"development"'}});
writeFileSync(resolve(out,'input.css'),'@tailwind base;\n@tailwind components;\n@tailwind utilities;');
const css=spawnSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i',resolve(out,'input.css'),'-o',resolve(out,'tailwind.css'),'--content','./app/admin/**/*.{tsx,ts}'],{cwd:root,stdio:'inherit',windowsHide:true});if(css.status!==0)throw new Error('Tailwind failed');
const {handleAdminHqRoutes}=await import(pathToFileURL(resolve(out,'api.mjs')));
if (process.argv.includes('--verify')) {
  const { verifyGuild } = await import('./fixtures/admin-guild/verify.mjs');
  await verifyGuild(handleAdminHqRoutes);
  process.exit(0);
}
const token='LOCAL_GUILD_FIXTURE_ONLY.'+'0'.repeat(64);
const calls=[];
const html='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>격리 관리자 검증</title><link rel="stylesheet" href="/tailwind.css"><link rel="stylesheet" href="/app.css"><body style="margin:0"><div id="root"></div><script src="/app.js"></script></body></html>';
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1:4321');
  res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'self'; form-action 'self'");
  if(url.pathname==='/__fixture/calls'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(calls));return;}
  if(url.pathname.startsWith('/api/')){
    if(req.headers['x-admin-token']!==token){res.writeHead(401).end();return;}
    const part=url.pathname.slice('/api/admin/hq'.length);
    const reads=new Set(['/ui-mode','/summary','/quests','/xp','/traffic','/achievements','/settings']);
    const allowed=req.method==='GET'?(reads.has(part)||/^\/quests\/q_[a-f0-9]{24}$/.test(part)):req.method==='POST'&&(part==='/quests'||/^\/quests\/q_[a-f0-9]{24}\/(transition|evidence)$/.test(part)||part==='/xp/ack');
    if(!url.pathname.startsWith('/api/admin/hq/')||!allowed){res.writeHead(405).end('Fixture route blocked');return;}
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks).toString();
    const response=await handleAdminHqRoutes(part,new Request(url,{method:req.method,headers:{'content-type':'application/json'},...(req.method==='GET'?{}:{body:body||'{}'})}),{}, {userId:'fixture-local-only'});
    const result=await response.text();calls.push({method:req.method,path:part,status:response.status});res.writeHead(response.status,{'Content-Type':'application/json'}).end(result);return;
  }
  if(url.pathname==='/mobile'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body style="margin:0;background:#090d1a"><iframe title="390px 관리자" src="/admin/" style="width:390px;height:1500px;border:0;display:block;margin:auto"></iframe>');return;}
  const file=url.pathname.startsWith('/assets/')?resolve(root,'public'+url.pathname):['/app.js','/app.css','/tailwind.css'].includes(url.pathname)?resolve(out,url.pathname.slice(1)):null;
  if(!file){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'application/octet-stream');createReadStream(file).on('error',()=>res.writeHead(404).end()).pipe(res);
}catch(error){console.error(error.message);res.writeHead(500).end('Local fixture failure');}});
server.listen(4321,'127.0.0.1',()=>console.log('Local-only admin integration: http://127.0.0.1:4321/admin/'));

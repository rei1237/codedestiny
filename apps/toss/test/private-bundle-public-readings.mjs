// Run the same home-to-result checks against the contents of a portable AIT.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const cli=createRequire(createRequire(import.meta.url).resolve('@apps-in-toss/cli/package.json'));
const reader=cli('@apps-in-toss/ait-format').AppsInTossBundle.reader(await readFile(process.argv[2]));
assert.equal(reader.appName,'ai-saju-studio');
const names=new Set(reader.bundle.index.map(row=>row.name));
assert.ok(names.has('sources/index.html') && [...names].every(name=>!name.includes('\\')));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.svg':'image/svg+xml','.wasm':'application/wasm'};
const server=createServer(async (req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const name=names.has('sources'+pathname)?'sources'+pathname:'sources/index.html';
  if(name==='sources/index.html'&&extname(pathname)&&pathname!=='/index.html'){res.writeHead(404).end();return;}
  try{res.writeHead(200,{'Content-Type':mime[extname(name)]||'application/octet-stream'}).end(Buffer.from(await reader.readEntry(name)));}
  catch{res.destroy();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const probes={
  tarot:'public-readings-browser.mjs', olympus:'studio-olympus-browser.mjs',
  turtle:'studio-turtle-browser.mjs', tea:'studio-royal-tea-browser.mjs', kemet:'studio-kemet-browser.mjs',
  island:'island-browser.mjs', widget:'widget-preview-browser.mjs', diary:'diary-browser.mjs', face:'face-browser.mjs', sibyl:'sibyl-public-browser.mjs', sections:'public-sections-browser.mjs', stories:'story-library-browser.mjs', directory:'home-directory-browser.mjs', all:'ait-directory-browser.mjs',
};
try{
  for(const key of process.argv.slice(3)){
    assert.ok(Object.hasOwn(probes,key),'Unknown release probe '+key);
    const path=fileURLToPath(new URL(probes[key],import.meta.url));
    const child=spawn(process.execPath,[path],{stdio:'inherit',env:{...process.env,TOSS_PUBLIC_TEST_ORIGIN:origin,TOSS_OFFLINE_ORIGIN:origin,TOSS_TEST_PORT:String(server.address().port)}});
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
    assert.equal(code,0,key+' failed in '+reader.deploymentId);
  }
  console.log('Linux release probes passed',reader.deploymentId,process.argv.slice(3));
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

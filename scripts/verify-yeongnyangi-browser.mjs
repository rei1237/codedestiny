import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {mockDevSettings} from './lib/mock-dev-settings.mjs';
import {QA_API_ORIGIN,verifyMobilePayments} from './lib/yeongnyangi-mobile-payment.mjs';

// Launch a mock-only local server with npm run dev; production/staging writes are forbidden.
// --payment-filter=<regexp> reruns a subset; omit it for the complete acceptance matrix.
const target=new URL(process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3108');
assert.ok(['localhost','127.0.0.1'].includes(target.hostname),'Payment QA is loopback only');
const base=target.origin;
if(process.argv.includes('--build-static')){
 const {env}=mockDevSettings(process.cwd());env.NODE_ENV='production';
 // Production config intentionally rejects an empty mock API base. Use an
 // unresolvable fixture sentinel; Node transport stays blocked and local UI
 // calls same-origin fixtures. No live origin is a fallback for this build.
 delete env.CD_MOCK_DEV;
 for(const key of ['NEXT_PUBLIC_API_URL','NEXT_PUBLIC_AUTH_API_BASE_URL','NEXT_PUBLIC_API_BASE_URL','NEXT_PUBLIC_CODE_DESTINY_API_URL','NEXT_PUBLIC_EFFECTIVE_API_BASE_URL'])env[key]=QA_API_ORIGIN;
 const safe=spawnSync(process.execPath,['scripts/verify-no-dev-server.mjs'],{env,stdio:'inherit',windowsHide:true});
 if(safe.status!==0)process.exit(safe.status??1);
 const data=spawnSync(process.execPath,['scripts/fortune-build-data.mjs'],{env,stdio:'inherit',windowsHide:true});
 if(data.status!==0)process.exit(data.status??1);
 // Reuse the repository's read-only public-file server for local ephemeris
 // loading. Pick a free loopback port and stop only this owned child afterwards.
 const reservation=createServer();
 await new Promise((resolve,reject)=>{reservation.once('error',reject);reservation.listen(0,'127.0.0.1',resolve);});
 const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const ephe=spawn(process.execPath,['scripts/serve-novel.mjs'],{env:{...env,PORT:String(port)},stdio:['ignore','pipe','inherit'],windowsHide:true});
 let status=1;
 try{
  await new Promise((resolve,reject)=>{ephe.once('error',reject);ephe.once('exit',()=>reject(new Error('Local ephemeris server exited before ready')));ephe.stdout.once('data',data=>{process.stdout.write(data);resolve();});});
  for(const key of ['SWISS_EPHEMERIS_FILES_BASE_URL','SWISS_EPHE_BASE_URL','PUBLIC_EPHE_BASE_URL'])env[key]=`http://127.0.0.1:${port}/ephe/`;
 // Direct Next export avoids the development manifest writer; this is a QA build,
 // with sanitized mock settings and the inherited Node external-network guard.
  const result=spawnSync(process.execPath,[createRequire(import.meta.url).resolve('next/dist/bin/next'),'build'],{env,stdio:'inherit',windowsHide:true});status=result.status??1;
 }finally{ephe.kill();}
 process.exit(status);
}
const built=await build({stdin:{contents:"export {products,systemNames} from './worker/yeongnyangi/payments/catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const {products,systemNames}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
await verifyMobilePayments({base,products,systemNames});

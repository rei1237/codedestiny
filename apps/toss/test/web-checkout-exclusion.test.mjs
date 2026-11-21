import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import serviceCompat from '../service/vite-service.mjs';
import stub from '../service/web-checkout-entry.js';
const root=path.resolve(import.meta.dirname,'../../..');
const webOnly=['KAKAOPAY','PORTONE_V2_KG_INICIS','loadPaymentUI','__cdCheckoutEntry','cdTrackConfirmedPurchase'];

test('every checkout-entry import form resolves to the Toss stub',()=>{
 const plugin=serviceCompat(),stubPath=/service[\\/]web-checkout-entry\.js$/;
 assert.match(plugin.resolveId('@/js/core/checkout-entry.js',path.join(root,'app/hooks/usePaidResume.ts')),stubPath);
 assert.match(plugin.resolveId('@/js/core/checkout-entry',path.join(root,'app/hooks/useCoinGate.ts')),stubPath);
 assert.match(plugin.resolveId('../../js/core/checkout-entry.js',path.join(root,'app/hooks/useCoinGate.ts')),stubPath);
 assert.equal(plugin.resolveId('@/js/core/checkout-entry-extra.js',path.join(root,'app/hooks/useCoinGate.ts')),undefined);
});

test('the stub covers every checkout-entry member the bundled shared hooks call',()=>{
 for(const file of ['app/hooks/usePaidResume.ts','app/hooks/useCoinGate.ts']){
  const source=fs.readFileSync(path.join(root,file),'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|`[^`]*`/g,'');
  const members=[...source.matchAll(/\bcheckoutEntry\.(\w+)\s*\(/g)].map(match=>match[1]);
  assert.ok(members.length,file+' no longer calls checkoutEntry; revisit this boundary');
  for(const member of members)assert.equal(typeof stub[member],'function',file+' calls checkoutEntry.'+member+' which the Toss stub does not define');
 }
 assert.ok(Object.isFrozen(stub));
 assert.equal(stub.consumePaidGrantReceipt({featureKey:'fusion-fortune-consultation'}),null);
});

test('usePaidResume bundled through the Toss swap carries no web payment runtime',async()=>{
 const plugin=serviceCompat();
 const result=await build({stdin:{contents:"export * from '@/app/hooks/usePaidResume';",resolveDir:root,loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',plugins:[{name:'toss-swap',setup(b){
  b.onResolve({filter:/checkout-entry/},args=>{const swapped=plugin.resolveId(args.path,args.importer);assert.ok(swapped,'checkout-entry import was not swapped: '+args.path);return {path:swapped};});
  b.onResolve({filter:/^@\/app\/hooks\/usePaidResume$/},()=>({path:path.join(root,'app/hooks/usePaidResume.ts')}));
  b.onResolve({filter:/^(?:react|@\/app\/_lib\/auth-store|@\/lib\/i18n\/dictionary)$/},args=>({path:args.path,external:true}));
 }}]});
 const code=result.outputFiles[0].text;
 assert.ok(code.includes('registerPaidResumeHandler'));
 for(const marker of webOnly)assert.ok(!code.includes(marker),'web payment marker bundled: '+marker);
});

test('the Toss bundle drops the web PG label from the shared billing client',()=>{
 const plugin=serviceCompat(),id=path.join(root,'app/_lib/billing-client.ts');
 const source=fs.readFileSync(id,'utf8');
 const out=plugin.transform(source,id);
 assert.ok(!out.includes('PORTONE_V2_KG_INICIS'));
 assert.throws(()=>plugin.transform(source.replace('"PORTONE_V2_KG_INICIS"','"X"'),id),/Billing provider label contract changed/);
 assert.equal(plugin.transform('const a="PORTONE_V2_KG_INICIS";',path.join(root,'app/_lib/other.ts')),'const a="PORTONE_V2_KG_INICIS";');
});

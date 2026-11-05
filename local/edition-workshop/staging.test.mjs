import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import jsQR from 'jsqr';
import {publishStaging} from './publish-staging.mjs';
import {series} from './staging-series.mjs';
import {RECORDS,STAGING_ORIGIN,issueUrl} from '../../lib/editions/staging.mjs';

test('staging release replays pinned ERC-721 receipts and always prints the HTTPS customer URL',async t=>{
  const root=fileURLToPath(new URL('.state/',import.meta.url));await fs.mkdir(root,{recursive:true});
  const temp=await fs.mkdtemp(path.join(root,'stage-test-'));t.after(()=>fs.rm(temp,{recursive:true,force:true}));
  const args={target:'staging',origin:STAGING_ORIGIN,directory:temp,stateRoot:temp};
  for(const override of [{target:'production'},{origin:'http://127.0.0.1:3000'},{origin:'https://code-destiny.com'}]){
    await assert.rejects(publishStaging({...args,...override}),/전용/);
  }
  const items=await publishStaging(args);assert.equal(items.length,series.length);
  const dest=path.join(temp,RECORDS.slice(1)),before=await Promise.all(items.map(i=>fs.readFile(path.join(dest,i.code+'.json'),'utf8')));
  await publishStaging(args);
  for(const [n,item] of items.entries()){
    const json=await fs.readFile(path.join(dest,item.code+'.json'),'utf8');assert.equal(json,before[n]);
    const record=JSON.parse(json);assert.equal(record.status,'verified');assert.equal(record.code,item.code);assert.equal(record.chainId,31337);
    const png=PNG.sync.read(await fs.readFile(path.join(dest,item.code+'.png')));
    assert.equal(jsQR(new Uint8ClampedArray(png.data),png.width,png.height).data,issueUrl(item.code));
    for(const field of ['seed','reason','sku','issuerKey'])assert.equal(Object.hasOwn(record,field),false);
  }
  await assert.rejects(publishStaging({...args,entries:[{...series[0],title:'교체된 작품'}]}),/불일치/);
});

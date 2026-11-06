import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {archiveReceipt} from './archive-receipt.mjs';
import {readTestProof} from '../../worker/routes/edition-test-records.js';
import spring from '../../lib/editions/yeoni-spring-declaration.json' with {type:'json'};
import {TEST_ORIGIN,TEST_RECORDS,TEST_PREFIX,TEST_ENVIRONMENT} from '../../lib/editions/production-test.mjs';

test('002 archive resumes after interruption; sale endpoint requires both external copies and the exact proof',async()=>{
  const base={editionId:spring.editionId,title:spring.title,character:spring.character,cap:30};
  const first={...base,...spring.records[0]};
  const proof={...base,code:'2'.repeat(24),serial:2,environment:TEST_ENVIRONMENT,status:'verified',chainId:31337,digest:'d'.repeat(64),contract:'fixture',token:'2',tx:'tx2',blockHash:'block2'};
  const hash=createHash('sha256').update(JSON.stringify([base.editionId,proof.code,proof.title,proof.character,30,2,proof.digest,31337,proof.contract,proof.token,proof.tx,proof.blockHash])).digest('hex');
  const row={...base,code:proof.code,serial:2,pin:hash,publishedOn:'2026-11-07'};
  const items=[first,row],stored=new Map();
  const archive={find:k=>stored.get(k),create(k,data){assert(!stored.has(k));stored.set(k,{sha:'a'.repeat(40),data:structuredClone(data)});throw Error('simulated outage after creation');}};
  await assert.rejects(archiveReceipt(items,row,archive),/outage/);
  row.publishedOn='2026-11-08';
  await archiveReceipt(items,row,archive);
  assert.equal(stored.size,1);assert.equal(row.publishedOn,'2026-11-07');
  const record=[...stored.values()][0].data;
  assert.equal(record.publishedCount,2);assert.equal(record.cap,30);
  const env={NODE_ENV:'production',INSIGHT_IMAGES_BUCKET:{async get(key){return {json:async()=>key===TEST_PREFIX+'index.json'?{environment:TEST_ENVIRONMENT,items}:proof};}}};
  const req=new Request(TEST_ORIGIN+TEST_RECORDS+'/'+proof.code+'.sale.json');
  const check=async(fetcher)=>{const r=await readTestProof(req,env,fetcher);return [r.status,await r.json()];};
  const [ok,verified]=await check(()=>Response.json(record));
  assert.equal(ok,200);assert(verified.saleEligible);assert.equal(verified.publishedCount,2);
  for(const altered of [{...record,cap:31},{...record,publishedCount:3},{...record,records:[first]}, {...record,records:[first,{...record.records[1],publishedOn:'2026-12-01'}]}]){
    const [status,result]=await check(url=>Response.json(url.includes('refs/tags/')?record:altered));
    assert.equal(status,409);assert.equal(result.saleEligible,false);
  }
  assert.deepEqual(await check(()=>{throw Error('offline');}),[503,{saleEligible:false}]);
  proof.tx='changed';assert.deepEqual(await check(()=>Response.json(record)),[409,{saleEligible:false}]);
  proof.tx='tx2';delete row.externalSha;
  assert.deepEqual(await check(()=>Response.json(record)),[409,{saleEligible:false}]);
});

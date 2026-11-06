import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import ganache from 'ganache';
import {network,submitBatch,verifyBatch,registryState} from '../../lib/editions/batch-registry.mjs';

test('fixed issuer commits contiguous ranges and anonymous readers detect altered certificates',async()=>{
 const path=await mkdtemp(join(tmpdir(),'edition-batch-'));
 const provider=ganache.provider({logging:{quiet:true},database:{dbPath:path},chain:{chainId:Number(network.chain)},wallet:{unlockedAccounts:[network.issuer]}});
 const request=(method,params)=>provider.request({method,params});
 const wallet={request:async({method,params})=>method==='eth_requestAccounts'?[network.issuer]:request(method,params)};
 const product={id:'spring',title:'연이 봄 부적',character:'yeoni',cap:2};
 const make=serial=>{
   const proof={...product,code:String(serial).padStart(24,'0'),serial,digest:'fixture',chainId:31337,contract:'local',token:serial,tx:'local tx',blockHash:'block'};
   const pin=createHash('sha256').update(JSON.stringify([product.id,proof.code,proof.title,proof.character,proof.cap,serial,proof.digest,proof.chainId,proof.contract,proof.token,proof.tx,proof.blockHash])).digest('hex');
   return {proof,row:{...product,serial,editionId:product.id,code:proof.code,pin}};
 };
 const a=make(1),b=make(2);
 try{
   await request('evm_setAccountBalance',[network.issuer,'0x100000000000000000']);
   assert.equal((await verifyBatch(a.proof,[a.row],request)).published,false);
   const send=async(action,rows)=>{
     const hash=await submitBatch(action,product,rows,wallet);
     assert.equal((await request('eth_getTransactionReceipt',[hash])).status,'0x1');
     return hash;
   };
   await send('deploy',[]);
   await send('seal',[]);
   const first=await send('publish',[a.row]);
   await send('publish',[a.row,b.row]);
   assert.equal((await verifyBatch(a.proof,[a.row,b.row],request)).tx,first);
   assert.equal((await registryState(product,request)).published,2);
   await assert.rejects(()=>verifyBatch({...a.proof,digest:'altered'},[a.row,b.row],request));
   await assert.rejects(()=>submitBatch('publish',product,[a.row,b.row],wallet));
   await assert.rejects(()=>registryState({...product,cap:3},request));
 }finally{await provider.disconnect();await rm(path,{recursive:true,force:true});}
});

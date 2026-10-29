// Read-only bounded reconciliation. Never emits customer or consultation content.
import {config} from 'dotenv';
import {MongoClient} from 'mongodb';
import {readFileSync} from 'node:fs';
import {fetchPortOnePayment} from '../worker/lib/portone.js';
import {classifyMarketingPayment} from './lib/marketing-pg-reconciliation.mjs';
const readPg=process.argv.includes('--read-pg');
const gaFile=process.argv.find(arg=>arg.startsWith('--ga-ids='))?.slice(9);
const gaIds=gaFile?JSON.parse(readFileSync(gaFile,'utf8').replace(/^\uFEFF/,'')):[];
if(!Array.isArray(gaIds)||gaIds.length>1000||gaIds.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,160}$/.test(id)))throw Error('Invalid GA transaction ID input');
if (!process.argv.includes('--read-production')) throw Error('Explicit --read-production required');
config({path:'.env.local',quiet:true});config({path:'.env',quiet:true});
const client=new MongoClient(process.env.MONGO_URI||process.env.MONGODB_URI,{maxPoolSize:1,retryWrites:false,serverSelectionTimeoutMS:10000});
try {
 await client.connect();
 const payments=client.db('code_destiny').collection('payments');
 const projection={_id:0,merchantUid:1,status:1,orderState:1,paymentAmount:1,featureKey:1,paidAt:1,refundedAt:1};
 const rows=await payments.find({paidAt:{$gte:new Date('2026-10-01T00:00:00+09:00'),$lt:new Date('2026-10-29T00:00:00+09:00')}},{projection,maxTimeMS:15000}).limit(1001).toArray();
 if(rows.length>1000)throw Error('Audit cap exceeded');
 const groups={};for(const r of rows){const key=JSON.stringify([r.featureKey||'unknown',r.status,r.orderState]);groups[key]??={count:0,amountKRW:0};groups[key].count++;groups[key].amountKRW+=Number(r.paymentAmount)||0;}
 const matched=gaIds.length?await payments.find({merchantUid:{$in:gaIds}},{projection,maxTimeMS:15000}).limit(1001).toArray():[];
 const gaGroups={};for(const row of matched){const key=JSON.stringify([row.status,row.orderState]);gaGroups[key]??={count:0,amountKRW:0};gaGroups[key].count++;gaGroups[key].amountKRW+=Number(row.paymentAmount)||0;}
 const pgAudit={requested:readPg,checked:0,test:0,live:0,unknown:0,failed:0,amountMismatch:0,liveGrossKRW:0,liveCancelledKRW:0,liveNetKRW:0};
 if(readPg)for(const row of (gaIds.length?matched:rows)){
  try{
   const pg=await fetchPortOnePayment(process.env,row.merchantUid);
   const verdict=classifyMarketingPayment(row,pg.rawV2);
   pgAudit.checked++;
   if(verdict.kind==='test'){pgAudit.test++;continue;}
   if(verdict.kind==='unknown'){pgAudit.unknown++;continue;}
   if(verdict.kind==='mismatch'){pgAudit.amountMismatch++;continue;}
   pgAudit.live++;pgAudit.liveGrossKRW+=verdict.grossKRW;pgAudit.liveCancelledKRW+=verdict.cancelledKRW;pgAudit.liveNetKRW+=verdict.netKRW;
  }catch{pgAudit.failed++;}
 }
 console.log(JSON.stringify({readOnly:true,fromKST:'2026-10-01',toExclusiveKST:'2026-10-29',orders:rows.length,groups,gaReconciliation:{input:gaIds.length,unique:new Set(gaIds).size,matched:matched.length,unmatched:gaIds.filter(id=>!matched.some(row=>row.merchantUid===id)).length,withinPaidDateRange:matched.filter(row=>rows.some(other=>other.merchantUid===row.merchantUid)).length,groups:gaGroups},pgAudit,operatorTestOrdersExcluded:false,advertisingRevenueVerified:false,testChannelOrdersExcluded:readPg&&pgAudit.failed===0&&pgAudit.unknown===0&&pgAudit.amountMismatch===0,pgBalanceVerified:readPg&&pgAudit.failed===0&&pgAudit.unknown===0&&pgAudit.amountMismatch===0},null,2));
}finally{await client.close();}

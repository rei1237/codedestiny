// Read-only bounded reconciliation. Never emits customer or consultation content.
import {config} from 'dotenv';
import {MongoClient} from 'mongodb';
import {readFileSync} from 'node:fs';
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
 console.log(JSON.stringify({readOnly:true,fromKST:'2026-10-01',toExclusiveKST:'2026-10-29',orders:rows.length,groups,gaReconciliation:{input:gaIds.length,unique:new Set(gaIds).size,matched:matched.length,unmatched:gaIds.filter(id=>!matched.some(row=>row.merchantUid===id)).length,withinPaidDateRange:matched.filter(row=>rows.some(other=>other.merchantUid===row.merchantUid)).length,groups:gaGroups},testOrdersExcluded:false,netRevenueVerified:false},null,2));
}finally{await client.close();}

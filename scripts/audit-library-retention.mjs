// Read-only native Mongo audit: never import models, open detail GETs, or start recovery.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parse } from 'dotenv';
import { MongoClient } from 'mongodb';

export function retentionIndexPlan(indexes) {
  const replacement={key:{retentionUntil:1},name:'unpaid_intent_retention_v1',expireAfterSeconds:0,partialFilterExpression:{status:'awaiting_payment'}};
  const ttl=indexes.filter(index=>index.expireAfterSeconds!==undefined&&index.key?.retentionUntil===1);
  const drop=ttl.filter(index=>JSON.stringify(index.partialFilterExpression)!==JSON.stringify(replacement.partialFilterExpression)).map(index=>({name:index.name,key:index.key,expireAfterSeconds:index.expireAfterSeconds,partialFilterExpression:index.partialFilterExpression||null}));
  return {create:ttl.some(index=>index.name===replacement.name&&JSON.stringify(index.partialFilterExpression)===JSON.stringify(replacement.partialFilterExpression))?null:replacement,drop};
}

export async function auditLibraryRetention(db) {
  const transactions=db.collection('serviceexecutiontransactions');
  const indexes=await transactions.listIndexes().toArray();
  const rows=await transactions.find({retentionUntil:{$type:'date'},status:{$ne:'awaiting_payment'}},{projection:{_id:1,userId:1,featureKey:1,status:1,premiumStatus:1,retentionUntil:1},maxTimeMS:10000}).toArray();
  const now=new Date(), groups={};
  for(const row of rows){const key=row.featureKey||'unknown';groups[key]=(groups[key]||0)+1;}
  const sources={};
  for(const name of ['yeongnyangi_requests','paid_execution_records']) {
    const collection=db.collection(name);
    sources[name]={total:await collection.countDocuments({},{maxTimeMS:10000}),ttlIndexes:(await collection.listIndexes().toArray()).filter(index=>index.expireAfterSeconds!==undefined).map(index=>({name:index.name,key:index.key,expireAfterSeconds:index.expireAfterSeconds}))};
  }
  return {readOnly:true,auditedAt:now.toISOString(),collection:'serviceexecutiontransactions',indexPlan:retentionIndexPlan(indexes),
    atRisk:rows.length,alreadyPastDeadline:rows.filter(row=>row.retentionUntil<=now).length,features:groups,sources,
    targets:rows.map(row=>({id:String(row._id),ownerHash:createHash('sha256').update(String(row.userId)).digest('hex'),featureKey:row.featureKey||'',status:row.status,premiumStatus:row.premiumStatus,retentionUntil:row.retentionUntil.toISOString()}))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  let client;
  try {
    const args=process.argv.slice(2);
    if(args.some(arg=>!arg.startsWith('--env-file=')&&!arg.startsWith('--db=')))throw new Error('READ_ONLY_ARGUMENTS_REQUIRED');
    const envFile=args.find(arg=>arg.startsWith('--env-file='))?.slice(11);
    if(!envFile)throw new Error('ENV_FILE_REQUIRED');
    const env=parse(await readFile(envFile));
    const uri=env.MONGO_URI||env.MONGODB_URI||env.MONGO_URL||env.DATABASE_URL;
    if(!uri)throw new Error('DATABASE_CONFIG_MISSING');
    const name=args.find(arg=>arg.startsWith('--db='))?.slice(5)||env.MONGO_DB_NAME||env.MONGODB_DB_NAME;
    if(!name)throw new Error('DATABASE_NAME_REQUIRED');
    client=new MongoClient(uri,{maxPoolSize:1,serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,socketTimeoutMS:20000});
    await client.connect();console.log(JSON.stringify(await auditLibraryRetention(client.db(name)),null,2));
  }catch(error){console.error(JSON.stringify({ok:false,name:error.name,code:error.code||'AUDIT_FAILED'}));process.exitCode=1;}
  finally{await client?.close();}
}

import {readFile,writeFile} from 'node:fs/promises';
import {MongoClient} from 'mongodb';
import {growthPipeline,summarizeGrowth} from '../lib/marketing/growth-metrics.mjs';
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const input=arg('--input'),output=arg('--output'),costFile=arg('--costs');
let rows,client;
try{
 if(input)rows=JSON.parse(await readFile(input,'utf8'));
 else {
  if(!process.argv.includes('--read-production'))throw new Error('Use --input fixture.json or explicitly --read-production --from YYYY-MM-DD --to YYYY-MM-DD');
  const from=new Date(arg('--from')),to=new Date(arg('--to'));
  if(!arg('--from')||!arg('--to')||!Number.isFinite(+from)||!Number.isFinite(+to)||to<=from||to-from>62*86400000)throw new Error('Explicit date range of 1–62 days required.');
  const uri=process.env.MONGODB_URI||process.env.MONGO_URI;if(!uri)throw new Error('Existing read credential MONGODB_URI or MONGO_URI required.');
  client=new MongoClient(uri,{maxPoolSize:1,retryWrites:false,serverSelectionTimeoutMS:8000});await client.connect();
  rows=await client.db(process.env.MONGODB_DB||'code_destiny').collection('yeongnyangi_requests').aggregate(growthPipeline(from,to),{maxTimeMS:15000}).toArray();
 }
 const costs=costFile?JSON.parse(await readFile(costFile,'utf8')):{};
 const report=JSON.stringify({...summarizeGrowth(rows,costs),observedAt:new Date().toISOString(),evidence:input?'input_fixture_or_export':'live_read_only'},null,2);
 if(output)await writeFile(output,report+'\n');else console.log(report);
}catch(error){console.error(JSON.stringify({ok:false,error:typeof error.code==='number'?`database_error_${error.code}`:String(error.message).replace(/mongodb[^\s]*/gi,'[redacted]')}));process.exitCode=1;}
finally{await client?.close();}

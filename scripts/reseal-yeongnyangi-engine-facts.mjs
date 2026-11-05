/**
 * Read-only by default. Reseals orders prepared before the fact seal, which would otherwise fail after payment.
 * Execute needs the exact --targets a fresh dry-run printed. Prints IDs, states and fact labels only.
 */
import {config} from 'dotenv';
import {connectDb,mongoose} from '../worker/lib/db.js';
import {YeongnyangiRequest} from '../worker/lib/yeongnyangi-models.js';
import {engineFactResealPlan} from './lib/engine-fact-reseal-plan.mjs';

const args=process.argv.slice(2),arg=name=>args.includes(name)?args[args.indexOf(name)+1]:'';
const database=arg('--db'),execute=args.includes('--execute'),operator=arg('--operator');
if(!['code_destiny_staging','code_destiny'].includes(database))throw Error('Required: --db code_destiny[_staging]');
if(execute&&!/^[A-Za-z0-9._-]{2,40}$/.test(operator))throw Error('Execute requires --operator (operator code, no personal name).');
config({path:'.env.local',quiet:true});
globalThis.fetch=()=>{throw Error('HTTP is forbidden in this script.');};

try{
 await connectDb({...process.env,MONGO_DB_NAME:database,MONGODB_DB_NAME:database});
 if(mongoose.connection.name!==database)throw Error('Database mismatch');
 const systems=['saju','ziwei','tarot','vedic','astrology','sukuyo'];
 const rows=await YeongnyangiRequest.find({$or:systems.map(system=>({[`snapshot.analysis.contexts.${system}.engineFacts`]:{$exists:true}}))},
  {state:1,errorCode:1,leaseUntil:1,chapters:1,completedChapters:1,updatedAt:1,generationCheckpoint:1,'snapshot.v7Timing':1,'snapshot.analysis.contexts':1}).lean();
 const eligible=[],blocked={};
 for(const row of rows){
  const plan=engineFactResealPlan(row);
  if(plan.blocked){(blocked[plan.blocked]||=[]).push(String(row._id).slice(0,12));continue;}
  eligible.push({row,plan});
 }
 const targets=eligible.map(({row})=>String(row._id)).sort();
 const output={database,mode:execute?'execute':'dry-run',scanned:rows.length,targets,
  detail:eligible.map(({row,plan})=>({id:String(row._id).slice(0,12),state:row.state,labels:plan.labels})),blocked,applied:[]};
 if(execute){
  if(arg('--targets').split(',').filter(Boolean).sort().join()!==targets.join())throw Error('Targets changed. Inspect a fresh dry-run before approving again.');
  for(const {row,plan} of eligible){
   const result=await YeongnyangiRequest.updateOne({_id:row._id,state:row.state,updatedAt:row.updatedAt,completedChapters:row.completedChapters||0,'chapters.0':{$exists:false}},
    {$set:Object.fromEntries(Object.entries(plan.replacements).map(([system,snapshot])=>[`snapshot.analysis.contexts.${system}.engineFacts`,snapshot])),
     $push:{recoveryAudit:{kind:'engine_fact_resealed',source:'operator',operator,labels:plan.labels,at:new Date()}}});
   if(result.modifiedCount!==1)throw Error(`Request ${String(row._id).slice(0,12)} changed before the write.`);
   // Read back what generation will read.
   const stored=await YeongnyangiRequest.findById(row._id,{state:1,errorCode:1,leaseUntil:1,chapters:1,completedChapters:1,generationCheckpoint:1,'snapshot.v7Timing':1,'snapshot.analysis.contexts':1}).lean();
   const after=engineFactResealPlan(stored);
   if(after.blocked!=='NOTHING_TO_SEAL')throw Error(`Request ${String(row._id).slice(0,12)} did not verify: ${after.blocked||'still mismatched'}`);
   output.applied.push(String(row._id).slice(0,12));
  }
 }
 console.log(JSON.stringify(output,null,2));
}catch(error){
 if(error?.name?.startsWith('Mongo'))console.error(JSON.stringify({error:'RESEAL_DATABASE_ERROR',type:error.name}));
 else console.error(JSON.stringify({error:String(error.message).slice(0,300)}));
 process.exitCode=1;
}finally{
 await mongoose.disconnect();
}

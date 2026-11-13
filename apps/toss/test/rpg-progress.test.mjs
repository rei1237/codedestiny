import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..'),require=createRequire(import.meta.url);
const Module=require('node:module');
const lists={UserRpgProgress:[],UserDailyQuestLog:[],UserRpgRewardLog:[]};
const matches=(row,query)=>Object.entries(query).every(([k,v])=>row[k]===v);
function model(rows){
 const query=value=>({session(){return this;},select(){return this;},lean:async()=>structuredClone(value)});
 return {init:async()=>{},findOne:filter=>query(rows.find(r=>matches(r,filter))||null),
  find:filter=>query(rows.filter(r=>matches(r,filter))),
  updateOne:async(filter,op)=>{
    let row=rows.find(r=>matches(r,filter));
    if(!row){row={...filter,...op.$setOnInsert};rows.push(row);}
    Object.assign(row,op.$set);
    for(const [k,n] of Object.entries(op.$inc||{}))row[k]+=n;
  },create:async values=>{rows.push(...structuredClone(values));}};
}
globalThis.__rpgTestModels=Object.fromEntries(Object.entries(lists).map(([k,v])=>[k,model(v)]));
const source=await build({entryPoints:[path.join(root,'worker/routes/rpg.js')],bundle:true,platform:'node',format:'cjs',write:false,
 plugins:[{name:'rpg-test-store',setup(b){
   b.onLoad({filter:/worker[\\/]lib[\\/]models\.js$/},()=>({contents:'export const {UserRpgProgress,UserDailyQuestLog,UserRpgRewardLog}=globalThis.__rpgTestModels;'+
     'export const MonthlyCreditLedger={},Payment={},ProfileCard={},User={};'}));
   b.onLoad({filter:/worker[\\/]lib[\\/]db\.js$/},()=>({contents:'export const connectDb=async()=>{},withMongoRetry=async(_env,op)=>op(),mongoTransactionOptions=()=>({}),mongoose={startSession:async()=>({withTransaction:fn=>fn(),endSession:async()=>{}})};'}));
   b.onLoad({filter:/worker[\\/]lib[\\/]db-scope-connection\.js$/},()=>({contents:'export const scopeConnection=()=>null;'}));
   b.onLoad({filter:/worker[\\/]lib[\\/]profile-spirits\.js$/},()=>({contents:'export const profileSpiritExp=async(_env,_id,_kind,base)=>base,getProfileSpirits=()=>{},unlockProfileSpirit=()=>{},equipProfileSpirit=()=>{};'}));
   for(const [file,exports] of [['profile-pet','getProfilePet,hatchProfilePet,careForProfilePet'],['profile-character-preview','profileCharacterPreview'],['auth','requireAuth,peekAccessTokenUserId'],['monthly-credit-store','grantMonthlyCreditLot'],['destiny-bias-engine','buildSajuProfile']]){
    b.onLoad({filter:new RegExp('worker[\\\\/]lib[\\\\/]'+file+'\\.js$')},()=>({contents:'export const '+exports.split(',').map(name=>name+'=()=>{throw Error("unexpected dependency")}').join(',')+';'}));
   }
 }}]});
const loaded=new Module(path.join(root,'test-toss-rpg.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(source.outputFiles[0].text,loaded.id);
const {readOwnedQuestProgress,completeOwnedQuest,adoptOwnedQuestProgress}=loaded.exports;
test('owned RPG store adopts one guest once, resumes awards by KST day, isolates owners and caps repeated quests',async()=>{
 const date=new Date(Date.now()+9*3600e3).toISOString().slice(0,10).replaceAll('-','.');
 const id=n=>'daily-'+date+'-wq'+n;
 assert.equal((await readOwnedQuestProgress({},'A')).progress.totalExp,0);
 assert.deepEqual(lists.UserRpgProgress,[]);
 for(let i=0;i<2;i++)assert.ok((await adoptOwnedQuestProgress({},'A',{totalExp:15,completed:[id(1)],date})).ok);
 assert.equal((await readOwnedQuestProgress({},'A')).progress.totalExp,15);
 assert.equal((await readOwnedQuestProgress({},'B')).progress.totalExp,0);
 const quest=async n=>(await completeOwnedQuest({},'A',id(n))).json();
 assert.equal((await quest(1)).reason,'ALREADY_GRANTED');
 assert.equal((await quest(2)).gainedExp,15);
 assert.equal((await quest(2)).reason,'ALREADY_GRANTED');
 assert.ok((await quest(3)).granted);
 assert.equal((await quest(4)).reason,'DAILY_LIMIT_REACHED');
 await adoptOwnedQuestProgress({},'A',{totalExp:4000,completed:[],date});
 const recovered=await readOwnedQuestProgress({},'A');
 assert.equal(recovered.progress.totalExp,45);assert.deepEqual(recovered.completed,[id(1),id(2),id(3)]);
 assert.deepEqual((await readOwnedQuestProgress({},'B')).completed,[]);
 assert.equal((await completeOwnedQuest({},'A','daily-2000.01.01-wq1')).status,400);
 assert.equal((await adoptOwnedQuestProgress({},'A',{totalExp:-1,date,completed:[]})).status,400);
});

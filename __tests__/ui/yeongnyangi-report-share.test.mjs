import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {build} from 'esbuild';
import {createRequire} from 'node:module';

globalThis.crypto ||= webcrypto;
const store=new Map();
const fixture={paid:true,state:'COMPLETED',id:'a'.repeat(64),createdAt:'2026-09-30',product:{domain:'saju',systems:['saju']},manifest:[{id:'part',theme:'self',title:'비공개'}],chapters:[{summary:'개인 질문과 주민번호 010101-1234567',advice:'비밀 조언',highlights:['비밀']}],charts:[{domain:'saju',title:'나의 사주와 오행',source:'저장된 차트',limitations:[],groups:[{id:'day',label:'일주',items:[{label:'천간·지지',value:'戊辰'}],chapterIds:['part']},{id:'other',label:'상대 일주',items:[{label:'천간·지지',value:'비밀상대'}],chapterIds:['part']}]}]};
globalThis.__reportShareTest={store,fixture};
const mock={
 '../lib/db.js':'export async function connectDb(){}',
 '../lib/yeongnyangi-report-share-store.js':`export const YeongnyangiReportShare={
  findOneAndUpdate(query,update){return {lean:async()=>{let row=globalThis.__reportShareTest.store.get(query._id);if(!row){row={_id:query._id,...update.$setOnInsert};globalThis.__reportShareTest.store.set(query._id,row);}return row;}}},
  findOne(query){return {select(){return {lean:async()=>{const row=globalThis.__reportShareTest.store.get(query._id);return row&&!row.revoked&&new Date(row.expiresAt)>new Date()?row:null;}}}}},
  async updateOne(query){const row=globalThis.__reportShareTest.store.get(query._id);if(!row||row.ownerId!==query.ownerId)return {matchedCount:0};row.revoked=true;delete row.public;return {matchedCount:1};}
 };`,
 './repository.js':`export const ownerId=value=>value;export async function readRequest(env,userId,requestId){const row=globalThis.__reportShareTest.fixture;if(userId!=='owner' || requestId!==row.id)throw new Error('NOT_FOUND');return row;}`,
 './service.ts':'export const presentFortune=row=>row;'
};
const result=await build({entryPoints:['worker/yeongnyangi/report-share.js'],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'report-share-mocks',setup(build){build.onResolve({filter:/^(\.\.\/lib\/(?:db|yeongnyangi-report-share-store)\.js|\.\/(?:repository\.js|service\.ts))$/},args=>args.importer.endsWith('report-share.js')?{path:args.path,namespace:'mock'}:null);build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mock[args.path],loader:'js'}));}}]});
const module={exports:{}};
new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {createReportShare,readReportShare,revokeReportShare}=module.exports;

test('public link needs an owned paid result, excludes private text, and revokes',async()=>{
 const token='b'.repeat(64);
 const created=await createReportShare({},'owner',fixture.id,token);
 assert.equal(created.status,201);
 const page=await readReportShare({},token);
 assert.equal(page.status,200);
 const html=await page.text();
 assert.match(html,/og:description/);
 assert.match(html,/戊辰/);
 for(const secret of ['010101-1234567','개인 질문','비밀상대','비밀 조언',fixture.id])assert.ok(!html.includes(secret),secret);
 assert.equal(page.headers.get('Cache-Control'),'no-store');
 const revoked=await revokeReportShare({},'owner',token);
 assert.equal(revoked.status,200);
 assert.equal((await readReportShare({},token)).status,404);
});

test('changed chart and wrong owner invalidate the share',async()=>{
 const token='c'.repeat(64);
 await assert.rejects(createReportShare({},'intruder',fixture.id,token));
 assert.equal((await createReportShare({},'owner',fixture.id,token)).status,201);
 fixture.charts[0].groups[0].items[0].value='甲子';
 assert.equal((await readReportShare({},token)).status,404);
});

test('expiry and revoked entitlement invalidate an existing public link',async()=>{
 const expired='d'.repeat(64),refunded='e'.repeat(64);
 await createReportShare({},'owner',fixture.id,expired);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(expired));
 const key=Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
 store.get(key).expiresAt=new Date(0);
 assert.equal((await readReportShare({},expired)).status,404);
 await createReportShare({},'owner',fixture.id,refunded);
 fixture.paid=false;
 try{assert.equal((await readReportShare({},refunded)).status,404);}finally{fixture.paid=true;}
});

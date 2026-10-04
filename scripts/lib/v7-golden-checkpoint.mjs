import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const APPROVED_GOLDEN_SOURCE='287721af3aa391f4f0c1be11fd7df784a0a08db44b4243b971604fed47e4bbb4';
export const goldenHash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
// The one live approval covered tuna chapters 10–23 of the reviewed 24-chapter source; nothing but a mock run widens it.
const LIVE_APPROVAL={tier:'tuna',fromOrdinal:10,toOrdinal:23,maxNewCalls:28};
// A mock import continues the rest of the current tuna book with the same two-attempt budget per chapter.
const approvalFor=(mode,lastOrdinal)=>mode==='mock'?{tier:'tuna',fromOrdinal:10,toOrdinal:lastOrdinal,maxNewCalls:2*(lastOrdinal-9)}:LIVE_APPROVAL;

// Explicit offline import; ordinary resume never falls back to this function.
export function importGoldenCheckpoint({bytes,expectedHash,scope,books,identity,mode,validate,edits}){
 assert.equal(goldenHash(bytes),expectedHash,'Source checkpoint hash mismatch');
 if(mode==='live')assert.equal(expectedHash,APPROVED_GOLDEN_SOURCE,'Unapproved live checkpoint');
 const source=JSON.parse(bytes.toString());
 assert.equal(source.mode,mode,'Checkpoint mode changed');
 assert.equal(goldenHash(source.scope),goldenHash(scope),'Checkpoint scope changed');
 assert.ok(Array.isArray(source.chapters)&&Array.isArray(source.attempts),'Invalid checkpoint');
 const keys=new Set();
 for(const row of source.chapters){
  const chapter=books.find(b=>b.tier===row.tier)?.manifest[row.ordinal];
  assert.ok(chapter&&chapter.key===row.key,'Checkpoint manifest changed');
  const key=`${row.tier}/${row.ordinal}`;
  assert.ok(!keys.has(key),'Duplicate saved chapter');keys.add(key);
 }
 const attempts=new Set();
 for(const row of source.attempts){
  const chapter=books.find(b=>b.tier===row.tier)?.manifest[row.ordinal];
  assert.ok(chapter&&(!row.key||chapter.key===row.key),'Attempt manifest changed');
  assert.ok(row.attempt===1||row.attempt===2,'Attempt budget changed');
  assert.ok(row.networkCalls===0||row.networkCalls===1,'Provider call budget changed');
  const key=`${row.tier}/${row.ordinal}/${row.attempt}`;
  assert.ok(!attempts.has(key),'Duplicate attempt');attempts.add(key);
 }
 if(edits){
  assert.equal(edits.sourceSha256,expectedHash,'Editorial source changed');
  assert.equal(edits.chapters.length,10,'Exactly ten editorial chapters required');
  assert.deepEqual(edits.chapters.map(row=>row.ordinal),Array.from({length:10},(_,i)=>i),'Editorial order changed');
 }
 const chapters=[];
 for(const book of books){
  const previous=[];
  for(const chapter of book.manifest.slice(0,book.tier==='tuna'?10:book.manifest.length)){
   const saved=source.chapters.find(row=>row.tier===book.tier&&row.ordinal===chapter.ordinal);
   let body;
   // Already stored post-prune bodies and local editorial copies must not be rejected for length again.
   if(saved)body=validate(saved.body,chapter,previous,{lengthRepair:true});
   else {
    const raw=source.attempts.filter(row=>row.tier===book.tier&&row.ordinal===chapter.ordinal&&row.raw).reverse();
    for(const record of raw){
     try{body=validate(record.raw,chapter,previous);break;}
     catch(error){if(!error.code)throw error;}
    }
    assert.ok(body,'Stored raw cannot be recovered without a new call');
   }
   const edit=book.tier==='tuna'?edits?.chapters[chapter.ordinal]:undefined;
   if(edit){
    assert.equal(edit.key,chapter.key,'Editorial manifest changed');
    assert.ok(edit.reason&&edit.reason.trim(),'Editorial reason required');
    assert.deepEqual([...edit.body.sources].sort(),[...body.sources].sort(),'Editorial citations changed');
    body=validate(edit.body,chapter,previous,{lengthRepair:true});
   }
   chapters.push({tier:book.tier,ordinal:chapter.ordinal,key:chapter.key,body,
    origin:edit?'editorial-copy':saved?'stored-chapter':'stored-raw',...(edit?{editorialReason:edit.reason}:{})});
   previous.push(body);
  }
 }
 assert.ok(!source.chapters.some(row=>row.tier==='tuna'&&row.ordinal>=10),'Source contains later chapters');
 assert.ok(!source.attempts.some(row=>row.tier==='tuna'&&row.ordinal>=10),'Source has already spent later attempts');
 return {...source,identity,chapters,stopped:undefined,
  migration:{sourceSha256:expectedHash,sourceIdentity:source.identity,baselineAttempts:source.attempts.length,
   edited:Boolean(edits),editsSha256:edits?goldenHash(edits):null},
  approval:approvalFor(mode,books.find(b=>b.tier==='tuna').manifest.length-1)};
}

export function assertGoldenGenerationAllowed(state,tier,ordinal){
 if(!state.migration)return;
 const a=state.approval;
 assert.deepEqual(a,approvalFor(state.mode,a?.toOrdinal),'Approval scope changed');
 assert.equal(tier,a.tier,'Unapproved tier');
 assert.ok(ordinal>=a.fromOrdinal&&ordinal<=a.toOrdinal,'Unapproved chapter');
 // Reserve before calling. Tokenizer failures and interrupted attempts consume a slot too.
 assert.ok(state.attempts.length-state.migration.baselineAttempts<a.maxNewCalls,'New call budget exhausted');
}

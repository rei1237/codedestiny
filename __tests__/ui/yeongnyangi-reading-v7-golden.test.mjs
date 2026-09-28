import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const run=(out,...args)=>spawnSync(process.execPath,['--require','./scripts/lib/mock-network-guard.cjs',
 'scripts/yeongnyangi-v7-golden.mjs','--out',out,...args],{cwd:process.cwd(),encoding:'utf8',timeout:60000,windowsHide:true});
const resultOf=result=>JSON.parse(result.stdout.trim().split('\n').at(-1));

test('golden finishes 24 sequential mock chapters and replays stored drafts without changing evidence',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'v7-golden-replay-'));
 try{
  const generated=run(out);
  assert.equal(generated.status,0,generated.stderr);
  const file=path.join(out,'checkpoint.json');
  const state=JSON.parse(fs.readFileSync(file,'utf8'));
  const tuna=state.attempts.filter(row=>row.tier==='tuna');
  assert.deepEqual(tuna.map(row=>row.ordinal),Array.from({length:24},(_,i)=>i));
  assert.ok(tuna.every(row=>row.validated&&row.attempt===1&&row.networkCalls===0));
  assert.equal(resultOf(generated).books.find(book=>book.tier==='tuna').completedChapters,24);

  // Simulate the incident: a provider-only failure preceded a usable tenth chapter with editorial overlap.
  state.chapters=state.chapters.filter(row=>row.tier!=='tuna'||row.ordinal<9);
  const tenth=tuna.find(row=>row.ordinal===9);
  tenth.validated=false;tenth.attempt=2;tenth.error='V7_ANCHOR_REPEAT';
  tenth.raw.blocks[0].paragraphs.push('일간의 기준은 앞 장에서 정리했습니다. 일간의 기준을 다시 확인합니다.');
  state.attempts.push({tier:'tuna',ordinal:9,attempt:1,stage:'provider',error:'FORTUNE_PROVIDER_FAILED',networkCalls:0});
  fs.writeFileSync(file,JSON.stringify(state));
  const before=fs.readFileSync(file),summaryBefore=fs.readFileSync(path.join(out,'summary.json'));
  const replay=run(out,'--revalidate-only');
  assert.equal(replay.status,0,replay.stderr);
  const result=resultOf(replay),book=result.books.find(row=>row.tier==='tuna');
  assert.equal(result.networkCalls,0);
  assert.equal(result.checkpointWritten,false);
  assert.equal(book.savedChapters,9);
  assert.equal(book.revalidatedChapters,24);
  assert.equal(book.recovered,15);
  assert.deepEqual(fs.readFileSync(file),before);
  assert.deepEqual(fs.readFileSync(path.join(out,'summary.json')),summaryBefore);
  assert.equal(fs.existsSync(path.join(out,'running.lock')),false);
  assert.notEqual(run(out,'--revalidate-only','--live').status,0,'offline replay cannot authorize paid calls');

  state.attempts=state.attempts.filter(row=>row.tier!=='tuna'||row.ordinal<=9);
  fs.writeFileSync(file,JSON.stringify(state));
  const incomplete=run(out,'--revalidate-only');
  assert.equal(incomplete.status,1,'missing later chapters must remain incomplete');
  const partial=resultOf(incomplete).books.find(row=>row.tier==='tuna');
  assert.equal(partial.revalidatedChapters,10);
  assert.equal(partial.stoppedAt,10);
  assert.equal(partial.complete,false);
 }finally{
  assert.equal(path.dirname(path.resolve(out)),path.resolve(os.tmpdir()));
  fs.rmSync(out,{recursive:true,force:true});
 }
});

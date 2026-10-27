import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSupportRecoveryPreserved, reserveSupportRecoveryAttempt, supportRecoveryGenerationOptions, supportRecoveryPartHash } from '../../worker/lib/support-recovery-budget.js';

const recovery = () => ({ active: true, approvedProvider: 'gemini', approvedModel: 'gemini-2.5-flash', maxOutputTokens: 12000, callsReserved: 0, maxProviderCalls: 2 });
test('support provider options stay within the approved model and do not fall back', () => {
  assert.deepEqual(supportRecoveryGenerationOptions(null), {});
  assert.deepEqual(supportRecoveryGenerationOptions(recovery()), { model: 'gemini-2.5-flash', maxOutputTokens: 12000, fallbackToWorkersAI: false, maxProviderAttempts: 1 });
  for (const change of [{ active: false }, { approvedModel: 'gemini-2.5-pro' }, { approvedProvider: 'workers-ai' }, { maxOutputTokens: 16000 }]) {
    assert.throws(() => supportRecoveryGenerationOptions({ ...recovery(), ...change }), { code: 'SUPPORT_RECOVERY_SCOPE_INVALID' });
  }
});
test('preserved parts must remain present and byte-equivalent', () => {
  const body={ chapterNumber:4, content:'original' }, job={preserved:{'chapter-4':supportRecoveryPartHash(body)}};
  assert.doesNotThrow(() => assertSupportRecoveryPreserved(job,[{key:'chapter-4',body}]));
  assert.throws(() => assertSupportRecoveryPreserved(job,[]),{code:'SUPPORT_RECOVERY_ORIGINAL_CHANGED'});
  assert.throws(() => assertSupportRecoveryPreserved(job,[{key:'chapter-4',body:{...body,content:'changed'}}]),{code:'SUPPORT_RECOVERY_ORIGINAL_CHANGED'});
});
test('concurrent workers share one persisted call budget and cannot proceed after losing their lock',async()=>{
  const job=recovery(); let current={llmMeta:{supportRecovery:job}};
  const Model={findOne:()=>({select:()=>({lean:async()=>current})}),findOneAndUpdate:(filter)=>({lean:async()=>{
    if (!current || !job.active || job.callsReserved>=filter['llmMeta.supportRecovery.callsReserved'].$lt) return null;
    job.callsReserved++; return current;
  }})};
  const invoke=()=>reserveSupportRecoveryAttempt({Model,id:'original',userId:'owner',lockToken:'lease'});
  const results=await Promise.allSettled([invoke(),invoke(),invoke()]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,2);
  assert.equal(results.find(r=>r.status==='rejected').reason.code,'SUPPORT_RECOVERY_BUDGET_EXHAUSTED');
  assert.equal(job.callsReserved,2);
  current=null;
  await assert.rejects(invoke(),{code:'SUPPORT_RECOVERY_LOCK_LOST'});
});

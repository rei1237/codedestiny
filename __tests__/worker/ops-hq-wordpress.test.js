/** @jest-environment node */
const { createOpsCols } = require('../fixtures/ops-hq-fake-cols.cjs');
test('WordPress quest persists once and starts without evidence or XP', async () => {
  const { createCustomQuest } = await import('../../worker/ops-hq/quests.js');
  const cols=createOpsCols(); const input={body:{kind:'copy',channel:'wordpress',title:'원문 검토',date:'2026-10-21'},actor:'admin:test',now:new Date('2026-10-21T00:00:00Z')};
  const first=await createCustomQuest(cols,input); const second=await createCustomQuest(cols,input);
  expect(first.created).toBe(true);expect(second.created).toBe(false);expect(first.quest.channel).toBe('wordpress');expect(first.quest.status).toBe('scheduled');expect(first.quest.xpVerifiedAt).toBeNull();expect(first.quest.evidenceCount).toBe(0);expect(second.quest._id).toBe(first.quest._id);
  const other=await createCustomQuest(cols,{...input,body:{...input.body,title:'운영 점검',channel:'threads_existing_worker'}});expect(other.quest.channel).toBe('custom');
});

import assert from 'node:assert/strict';

// Calls the real HQ route against the preview's isolated in-memory collections.
export async function verifyGuild(handle) {
  const call = async (path, body) => {
    const response = await handle(path, new Request(`http://127.0.0.1/api/admin/hq${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), {}, { userId: 'fixture-local-only' });
    return { status: response.status, data: await response.json() };
  };
  const input = { kind: 'copy', channel: 'wordpress', title: '격리 검증 원고', date: '2026-10-21' };
  const created = await call('/quests', input);
  assert.equal(created.status, 201);
  const id = created.data.quest.id;
  assert.ok(id);
  assert.equal((await call('/quests', input)).data.created, false);
  const detail = () => call(`/quests/${id}`);
  const move = async (to, reason) => call(`/quests/${id}/transition`, {
    to, reason, expectedVersion: (await detail()).data.quest.version,
  });
  assert.equal((await move('done')).status, 409);
  assert.equal((await call('/xp')).data.state.totalXp, 0);
  assert.equal((await call(`/quests/${id}/evidence`, { type: 'copy_ready', note: '가상 검토 완료' })).status, 201);
  assert.equal((await call(`/quests/${id}/evidence`, { type: 'copy_ready', note: '가상 검토 완료' })).data.created, false);
  assert.equal((await call(`/quests/${id}/transition`, { to: 'done', expectedVersion: -1 })).status, 409);
  assert.equal((await move('done')).status, 200);
  assert.equal((await call('/xp')).data.state.totalXp, 30);
  assert.equal((await call('/achievements')).data.items.find(row => row.key === 'first_quest').unlocked, true);
  await move('done');
  assert.equal((await call('/xp')).data.state.totalXp, 30);
  assert.equal((await move('in_progress')).status, 400);
  assert.equal((await move('in_progress', '격리 재검토')).status, 200);
  assert.equal((await call('/xp')).data.state.totalXp, 0);
  assert.equal((await move('done')).status, 200);
  assert.equal((await call('/xp')).data.state.totalXp, 30);
  assert.equal((await call('/achievements')).data.items.find(row => row.key === 'first_quest').unlocked, true);
  for (let index = 0; index < 3; index += 1) {
    const extra = await call('/quests', { ...input, title: `격리 추가 원고 ${index}` });
    const extraId = extra.data.quest.id;
    await call(`/quests/${extraId}/evidence`, { type: 'copy_ready', note: '가상 검토' });
    const version = (await call(`/quests/${extraId}`)).data.quest.version;
    assert.equal((await call(`/quests/${extraId}/transition`, { to: 'done', expectedVersion: version, xp: 999999 })).status, 200);
  }
  const leveled = (await call('/xp')).data.state;
  assert.equal(leveled.totalXp, 120);
  assert.equal(leveled.level, 2);
  assert.deepEqual(leveled.pendingLevelUp, { from: 1, to: 2 });
  assert.equal((await call('/xp/ack', { level: 2 })).status, 200);
  assert.equal((await call('/xp')).data.state.pendingLevelUp, null);
  console.log('PASS: actual HQ routes — create/deduplicate/evidence/version/complete/server XP/reopen/recomplete/achievement/level-up/ack');
}

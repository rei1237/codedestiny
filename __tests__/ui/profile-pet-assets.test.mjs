import { test } from 'node:test';

test('출고할 반려 캐릭터의 모든 시트가 투명도·규격·용량·고유 원화 계약을 지킨다', async () => {
  await import('../../scripts/verify-profile-pets.mjs');
});

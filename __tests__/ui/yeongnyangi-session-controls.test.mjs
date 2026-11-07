import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('yeongnyangi session control skips the refresh chain for a guest with no login trace', () => {
  // 앱은 API 가 다른 출처라 손님 단축 응답이 없다. 흔적 없는 손님까지 갱신을 시도하면
  // me 401 → refresh 401 → 400ms → refresh 401 → 로그아웃 방송까지 간다.
  const controls = read('../../app/yeongnyangi/_home/SessionControls.tsx');
  assert.match(controls, /authFetch\('\/api\/auth\/me',\{\},\{retryOn401:hasClientAuthHint\(\)\|\|hasMobileAppRefreshToken\(\)\}\)/);
  const client = read('../../app/_lib/auth-client.ts');
  assert.match(client, /export function hasMobileAppRefreshToken\(\) \{\s*return Boolean\(readMobileAppRefreshToken\(\)\);/);
});

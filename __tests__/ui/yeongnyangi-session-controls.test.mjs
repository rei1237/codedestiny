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

test('yeongnyangi session control stores only the sanitized login snapshot when it is missing', () => {
  // 쿠키 세션만 있으면 fortune_auth_user 가 없어 프로필 범위가 손님으로 남고 초상화가 빠진다.
  const controls = read('../../app/yeongnyangi/_home/SessionControls.tsx');
  assert.match(controls, /if\(!readDestinyProfileAccountId\(\)\)\{persistSanitizedAuthUser\(data\.user\);/);
  assert.doesNotMatch(controls, /localStorage\.setItem/);
  const storage = read('../../app/_lib/auth-storage.ts');
  assert.doesNotMatch(storage.match(/export function sanitizeClientAuthUser[\s\S]*?\n}\n/)[0], /token/i);
  // 로그아웃은 같은 키를 지운다.
  const client = read('../../app/_lib/auth-client.ts');
  assert.match(client, /const AUTH_LOCAL_STORAGE_KEYS = \[[^\]]*"fortune_auth_user"/);
});

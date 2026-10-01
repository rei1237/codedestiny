import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// 신뢰·마케팅 문구에 정치 적중 주장이 다시 들어오지 않게 막는다(2026-10-01 정치 요소 제거).
const ROOTS = ['app', 'templates', 'lib/brand', 'js/feature-detail-panels.mjs', 'i18n/authored', 'store-assets'];
const POLITICAL = /대통령|탄핵|윤석열|이재명|대선|president/gi;
const TEXT = new Set(['.css', '.csv', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.ts', '.tsx', '.txt']);
const BINARY = new Set(['.png', '.webp', '.jpg', '.jpeg', '.svg', '.ico', '.gif', '.avif']);
// 유명인 사주 데이터 속 정치인은 신뢰 문구가 아니라 인물 데이터라 유지한다(2026-10-01 사용자 결정). 숫자는 정확히 맞아야 해서, 새 문구는 허용목록에 묻히지 않는다.
const ALLOWED = {
  'app/saju/destiny-bias/lib/celebrityProfiles.ts': { count: 2, reason: '유명인 사주 데이터(정치인 프로필) — 인물 데이터, 유지' },
  'i18n/authored/shellRuntime-05.json': { count: 18, reason: '유명인 사주 소개 문구(역대 대통령 경력) — 인물 데이터, 유지' },
  'i18n/authored/shellRuntime-12.json': { count: 3, reason: '유명인 인생 단계 라벨 — 인물 데이터, 유지' },
  'i18n/authored/shellRuntime-15.json': { count: 3, reason: '유명인 인생 사건 문구 — 인물 데이터, 유지' },
  'i18n/authored/shellRuntime-17.json': { count: 3, reason: '유명인 인생 사건 문구(임시정부 주석) — 인물 데이터, 유지' },
  'i18n/authored/shellRuntime-18.json': { count: 3, reason: '"class president"(반장, 비정치) + 유명인 인생 단계 라벨 — 인물 데이터, 유지' },
};

function* walk(entry) {
  if (!statSync(entry).isDirectory()) { yield entry; return; }
  for (const name of readdirSync(entry)) yield* walk(path.posix.join(entry, name));
}

test('user-facing sources carry no political claims outside the celebrity-data allowlist', () => {
  const found = {};
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const ext = path.extname(file).toLowerCase();
      if (BINARY.has(ext)) continue;
      assert.ok(TEXT.has(ext), `${file}: unclassified extension, add it to TEXT or BINARY`);
      const count = (readFileSync(file, 'utf8').match(POLITICAL) || []).length;
      if (count) found[file] = count;
    }
  }
  for (const [file, count] of Object.entries(found)) {
    assert.ok(ALLOWED[file], `${file}: ${count} political term(s) in user-facing copy`);
    assert.equal(count, ALLOWED[file].count, `${file}: allowlisted count changed (${ALLOWED[file].reason})`);
  }
  for (const file of Object.keys(ALLOWED)) assert.ok(found[file], `${file}: no longer matches, drop it from the allowlist`);
});

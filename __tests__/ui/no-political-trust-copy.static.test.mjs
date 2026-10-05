import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// 신뢰·마케팅의 정치 주장은 제한한다. 2026-10-04 사용자 요청으로 날짜·원문을 갖춘 기존 기록 3건만 복원한다.
const ROOTS = ['app', 'templates', 'lib/brand', 'lib/seo/public-record-copy.mjs', 'js/feature-detail-panels.mjs', 'i18n/authored', 'store-assets'];
const POLITICAL = /대통령|탄핵|윤석열|이재명|대선|president/gi;
const TEXT = new Set(['.css', '.csv', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.ts', '.tsx', '.txt']);
const BINARY = new Set(['.png', '.webp', '.jpg', '.jpeg', '.svg', '.ico', '.gif', '.avif']);
// 유명인 사주 데이터 속 정치인은 신뢰 문구가 아니라 인물 데이터라 유지한다(2026-10-01 사용자 결정). 숫자는 정확히 맞아야 해서, 새 문구는 허용목록에 묻히지 않는다.
const ALLOWED = {
  'app/insights/[slug]/page.js': { count: 1, reason: '공개 기록 페이지에만 가시 FAQ와 일치하는 schema 적용' },
  'lib/seo/public-record-copy.mjs': { count: 15, reason: '2026-10-05 사용자 승인: 공개 분석 3건의 시점·방식·원문 보존 한계를 함께 명시' },
  'app/insights/public-record-article.js': { count: 3, reason: '2026-10-05 승인한 원문 3건의 날짜·사건·일치 한계 비교 문서' },
  'templates/home-funnel.html': { count: 1, reason: '승인된 공개 기록 정본 URL 링크만 추가' },
  'app/components/TrustStories.tsx': { count: 2, reason: '공유 PRESIDENTIAL_RECORDS 참조만 허용 — 인용 내용은 단일 데이터 소스에서 관리' },
  'lib/brand/trust-stories.mjs': { count: 16, reason: '사용자가 요청한 기존 대통령 분석 원문 3건 — 날짜·원문 링크·이후 사건을 분리해 유지' },
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

test('user-facing sources restrict political terms to celebrity data and owner-requested original records', () => {
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

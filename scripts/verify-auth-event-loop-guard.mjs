#!/usr/bin/env node
/**
 * cd:auth-changed 재검증 증폭 루프 재발 방지 가드.
 *
 * 사고 경위(2026-07-30): _cdStoreMembershipStatusToCache 가 이용권 상태를 캐시에 적을 때마다
 * cd:auth-changed{source:'membership-cache'} 를 무조건 발행했는데, 이를 듣는 세 리스너
 * (세션 fetch 캐시 / 헤더 인증 카드 / 타일 잠금 동기화) 중 아무도 그 source 를 걸러내지 않았다.
 * 결과: 이용권 확인 1회마다 클라이언트 캐시 4종이 전멸하고 /api/auth/me·/api/subscription/status·
 * /api/billing/balance 가 재발화했으며, 확정된 사용자 카드가 "PASS CHECK" 스켈레톤으로 되돌아갔다
 * (= 홈이 다 뜬 뒤 다시 새로고침되는 것처럼 보이던 증상).
 *
 * 이 가드는 그 수정이 조용히 되돌려지는 것을 막는다. source 문자열 하나만 빠져도 루프가 되살아나고,
 * 증상은 "가끔 느리다" 정도로만 보여서 리뷰에서 놓치기 쉽다.
 *
 * 함께 지키는 것: 부팅 게이트가 인증·프로필 준비 신호를 기다리는 배선(신호를 쏘는 쪽이 사라지면
 * 스플래시가 매번 하드 상한까지 버틴다).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(resolve(repoRoot, rel), 'utf8');

const SHELLS = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/en/index.html',
  'public/ja/index.html',
  'public/zh/index.html',
  'public/zh-tw/index.html',
];

const RUNTIMES = ['js/core/index-inline-runtime.js', 'public/js/core/index-inline-runtime.js'];

/* 🔴 이 파일은 원래 검사 대상이 아니었고, 그 사각지대에서 실제 사고가 났다(2026-08-13).
   프로필 카드의 cd:auth-changed 리스너만 두 source 를 거르지 않아서, 이용권 갱신이 스스로 쏘는
   되울림마다 프로필 스코프를 통째로 버리고 **로딩 카드를 다시 그렸다.** 카드가 0장인 계정은
   되돌아갈 캐시가 없어 매번 로딩으로 떨어졌고, 5분 하트비트·탭 재포커스가 그 이벤트를 계속
   만들어 사용자에게는 무한 로딩으로 보였다. 가드는 내내 초록불이었다 — 이 파일을 열지 않았으니까. */
const PROFILE_CLIENTS = ['js/destiny-profile.js', 'public/js/destiny-profile.js'];

const failures = [];
const fail = (file, message) => failures.push(`${file}: ${message}`);

/** 두 source 를 함께 거르는 조건문. 공백 차이를 허용하되 두 값이 한 조건 안에 있어야 한다. */
const SOURCE_FILTER = /source\s*===\s*'subscription-sync'\s*\|\|\s*source\s*===\s*'membership-cache'/;

/**
 * 함수/블록 본문을 중괄호 균형으로 잘라낸다.
 * 이름 grep 만으로 판단하면 다른 곳의 우연한 일치에 속는다(CLAUDE.md 원칙 6).
 */
function sliceBlock(source, openerIndex) {
  const start = source.indexOf('{', openerIndex);
  if (start < 0) return '';
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
}

function blockAfter(source, anchor) {
  const idx = source.indexOf(anchor);
  if (idx < 0) return null;
  return sliceBlock(source, idx);
}

for (const shell of SHELLS) {
  if (!existsSync(resolve(repoRoot, shell))) {
    fail(shell, '셸 파일이 없다 (sync:public 미실행?)');
    continue;
  }
  const html = read(shell);

  // 1) 세션 fetch 캐시 리스너 — 두 source 를 모두 걸러야 한다.
  const cacheBlockIdx = html.indexOf('id="cd-user-access-session-cache-v20260703"');
  if (cacheBlockIdx < 0) {
    fail(shell, '세션 fetch 캐시 블록(cd-user-access-session-cache-v20260703)을 찾을 수 없다');
  } else {
    const scriptEnd = html.indexOf('</script>', cacheBlockIdx);
    const cacheBlock = html.slice(cacheBlockIdx, scriptEnd < 0 ? html.length : scriptEnd);
    if (!SOURCE_FILTER.test(cacheBlock)) {
      fail(shell, "세션 fetch 캐시의 cd:auth-changed 리스너가 'subscription-sync'+'membership-cache' 를 함께 걸러내지 않는다 — 이용권 확인마다 캐시가 전멸한다");
    }
  }

  // 2) 헤더 인증 카드 리스너 — 동일 필터.
  const headerBlock = blockAfter(html, '__cdHeaderAuthSync.onAuthChanged = function');
  if (!headerBlock) {
    fail(shell, '__cdHeaderAuthSync.onAuthChanged 를 찾을 수 없다');
  } else if (!SOURCE_FILTER.test(headerBlock)) {
    fail(shell, "__cdHeaderAuthSync.onAuthChanged 가 두 source 를 걸러내지 않는다 — 확정 카드가 PASS CHECK 스켈레톤으로 되돌아간다");
  }

  // 3) BroadcastChannel 중복 수신 억제.
  const channelBlock = blockAfter(html, '__cdHeaderAuthSync.channel.onmessage = function');
  if (!channelBlock) {
    fail(shell, '__cdHeaderAuthSync.channel.onmessage 를 찾을 수 없다');
  } else if (!channelBlock.includes('__cdIsDuplicateAuthSync')) {
    fail(shell, 'BroadcastChannel 핸들러에 __cdIsDuplicateAuthSync 중복 억제가 없다 — 로그인 1회에 __cdAuthState() 가 2회 돈다');
  }

  // 4) 이용권 상태 서명 dedup.
  const storeBlock = blockAfter(html, 'function _cdStoreMembershipStatusToCache');
  if (!storeBlock) {
    fail(shell, '_cdStoreMembershipStatusToCache 를 찾을 수 없다');
  } else if (!storeBlock.includes('_cdLastMembershipSignature')) {
    fail(shell, '_cdStoreMembershipStatusToCache 에 _cdLastMembershipSignature dedup 이 없다 — 값이 그대로여도 매번 cd:auth-changed 를 쏜다');
  }

  // 5) 부팅 준비 신호 배선.
  if (!html.includes('window.__cdMarkBootSignal = function')) {
    fail(shell, '__cdMarkBootSignal 정의가 없다 (cd-boot-progress 블록)');
  }
  if (!html.includes("window.addEventListener('cd:destiny-profile-server-ready'")) {
    fail(shell, "부팅 게이트가 'cd:destiny-profile-server-ready' 를 구독하지 않는다 — 스플래시가 프로필 준비를 기다리지 않는다");
  }
  const authMarks = (html.match(/__cdMarkBootSignal\('auth'\)/g) || []).length;
  if (authMarks < 2) {
    fail(shell, `__cdMarkBootSignal('auth') 호출이 ${authMarks}곳뿐이다 (최소 2: 게스트 확정 / 확정 카드) — 일부 경로에서 스플래시가 하드 상한까지 버틴다`);
  }

  // 5-1) 미확정 상태에서 부팅 신호를 쏘면 안 된다.
  //      __cdRenderAuthSubscriptionDelay(true) 는 "재시도 예약됨"이지 "확인 종료"가 아니다.
  //      여기서 auth 를 발행하면 degraded/401 처럼 흔한 일시 오류에 스플래시가 즉시 걷힌다.
  const delayBlockForSignal = blockAfter(html, 'function __cdRenderAuthSubscriptionDelay');
  if (delayBlockForSignal && /__cdMarkBootSignal\(\s*'auth'\s*\)/.test(delayBlockForSignal)) {
    fail(shell, "__cdRenderAuthSubscriptionDelay 가 __cdMarkBootSignal('auth') 를 호출한다 — 이용권 확인이 끝나기 전에 스플래시가 걷힌다(재시도가 예약된 미확정 상태다)");
  }

  // 5-2) 쿠키 세션 프로브가 예정된 잠정 게스트 렌더도 확정이 아니다.
  const guestBlock = blockAfter(html, 'function __cdRenderGuestAuthLinks');
  if (!guestBlock) {
    fail(shell, '__cdRenderGuestAuthLinks 를 찾을 수 없다');
  } else if (!guestBlock.includes('pendingProbe')) {
    fail(shell, '__cdRenderGuestAuthLinks 에 pendingProbe 억제가 없다 — 쿠키 세션 사용자가 게스트로 보이는 시점에 스플래시가 걷힌다');
  }
  if (!html.includes('__cdRenderGuestAuthLinks({ pendingProbe:')) {
    fail(shell, '게스트 프로브 예정 경로가 pendingProbe 를 넘기지 않는다');
  }

  // 5-3) 하드 상한은 재시도(6500ms)가 답을 낼 시간을 덮어야 한다.
  const capMatch = html.match(/var HARD_CAP_MS = isDeeplink \? \d+ : (\d+);/);
  if (!capMatch) {
    fail(shell, '부팅 게이트 HARD_CAP_MS 선언을 찾을 수 없다');
  } else if (Number(capMatch[1]) < 7500) {
    fail(shell, `부팅 게이트 하드 상한이 ${capMatch[1]}ms 다 — __cdScheduleSubscriptionRetry(6500) 의 재시도 결과가 나오기 전에 걷힌다(최소 7500ms)`);
  }

  // 6) 확정 카드를 스켈레톤으로 되돌리지 않는 가드.
  const delayBlock = blockAfter(html, 'function __cdRenderAuthSubscriptionDelay');
  if (!delayBlock) {
    fail(shell, '__cdRenderAuthSubscriptionDelay 를 찾을 수 없다');
  } else if (!delayBlock.includes('.cd-user-card:not(.cd-user-card--loading)')) {
    fail(shell, '__cdRenderAuthSubscriptionDelay 에 확정 카드 보호 가드가 없다 — 확정된 카드가 "확인 중"으로 되돌아간다');
  }
}

for (const runtime of RUNTIMES) {
  if (!existsSync(resolve(repoRoot, runtime))) {
    fail(runtime, '런타임 파일이 없다 (sync:public 미실행?)');
    continue;
  }
  const js = read(runtime);
  const tileBlock = blockAfter(js, 'function __cdHandleRuntimeAuthChangedForTileLocks');
  if (!tileBlock) {
    fail(runtime, '__cdHandleRuntimeAuthChangedForTileLocks 를 찾을 수 없다');
  } else if (!SOURCE_FILTER.test(tileBlock)) {
    fail(runtime, '타일 잠금 리스너가 두 source 를 걸러내지 않는다 — 이용권 확인마다 /api/billing/balance 가 따라 나간다');
  }
}

for (const client of PROFILE_CLIENTS) {
  if (!existsSync(resolve(repoRoot, client))) {
    fail(client, '프로필 클라이언트 파일이 없다 (sync:public 미실행?)');
    continue;
  }
  const js = read(client);
  const echoBlock = blockAfter(js, 'function _dpIsEntitlementEchoAuthEvent');
  if (!echoBlock) {
    fail(client, '_dpIsEntitlementEchoAuthEvent 를 찾을 수 없다 — 프로필 리스너의 source 필터가 사라졌다');
  } else if (!SOURCE_FILTER.test(echoBlock)) {
    fail(client, '프로필 리스너가 두 source 를 걸러내지 않는다 — 이용권 되울림마다 로딩 카드가 다시 그려진다');
  }

  const scheduleBlock = blockAfter(js, 'function _dpScheduleAuthScopeRefresh');
  if (!scheduleBlock) {
    fail(client, '_dpScheduleAuthScopeRefresh 를 찾을 수 없다');
  } else if (!/_dpIsEntitlementEchoAuthEvent\s*\(/.test(scheduleBlock)) {
    fail(client, '_dpScheduleAuthScopeRefresh 가 필터를 호출하지 않는다 — 필터가 있어도 배선되지 않으면 소용없다');
  }

  /* 리스너가 detail 을 넘기지 않으면 필터는 항상 undefined 를 받아 무조건 통과한다.
     "필터가 있는데 안 먹는" 가장 흔한 형태라 배선까지 본다. */
  if (!/addEventListener\('cd:auth-changed',\s*function\s*\(event\)[\s\S]{0,200}?_dpScheduleAuthScopeRefresh\(\s*event\s*&&\s*event\.detail\s*\)/.test(js)) {
    fail(client, "cd:auth-changed 리스너가 event.detail 을 필터에 넘기지 않는다");
  }
  if (!/onmessage\s*=\s*function\s*\(message\)[\s\S]{0,200}?_dpScheduleAuthScopeRefresh\(\s*message\s*&&\s*message\.data\s*\)/.test(js)) {
    fail(client, 'BroadcastChannel 핸들러가 message.data 를 필터에 넘기지 않는다 — 필터를 우회하는 두 번째 통로가 된다');
  }
}

if (failures.length) {
  console.error('[verify-auth-event-loop-guard] FAIL');
  for (const line of failures) console.error('  - ' + line);
  console.error('\n배경: docs 없이 이 파일 상단 주석 참고. 필터의 축은 event 가 아니라 source 다.');
  process.exit(1);
}

console.log(`[verify-auth-event-loop-guard] PASS (shells=${SHELLS.length}, runtimes=${RUNTIMES.length}, profileClients=${PROFILE_CLIENTS.length})`);

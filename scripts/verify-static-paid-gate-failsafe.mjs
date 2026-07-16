#!/usr/bin/env node
/**
 * verify-static-paid-gate-failsafe.mjs
 *
 * 정적 결제 게이트(index.html 인라인)의 fail-safe 재현 테스트.
 * "이용권 없음/등급 한도 초과/전이 503"에서 결제 leaf가 실패해도 게이트가 dead-end되지 않고
 * 결제 선택 모달을 재노출(월정석 실패 시 단건 유도)하는지, PG창 사용자 취소는 정상 취소로
 * 구분되는지를 실제 index.html 소스에서 추출한 판별 헬퍼로 검증한다.
 *
 * 검증 축:
 *  1) 헬퍼 추출·실행: _cdShouldReofferPaymentChoice / _cdIsAbortedPaymentError fixture 판정
 *  2) 드리프트 가드: React 정본 shouldOpenRuntimePaymentFallback 이 인정하는 복구가능 코드가
 *     정적 헬퍼에도 모두 포함되는지(정적이 React보다 좁으면 실패)
 *  3) 6미러 구조 마커 패리티: 루프/재노출/try-catch/aborted 마킹이 6파일에 모두 존재
 */
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIRRORS = [
  'index.html',
  'public/index.html',
  'public/en/index.html',
  'public/ja/index.html',
  'public/zh/index.html',
  'public/static/index.html',
];

function read(rel) {
  return readFileSync(`${ROOT}/${rel}`, 'utf8');
}

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const rootHtml = read('index.html');

// ── 1) 판별 헬퍼 추출 + 실행 ────────────────────────────────────────────────
function extractFn(html, name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) return null;
  // 함수 시작 '{' 부터 균형 잡힌 닫는 '}' 까지 슬라이스
  const braceStart = html.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < html.length; i += 1) {
    const ch = html[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

const shouldSrc = extractFn(rootHtml, '_cdShouldReofferPaymentChoice');
const abortSrc = extractFn(rootHtml, '_cdIsAbortedPaymentError');
const disableMonthlySrc = extractFn(rootHtml, '_cdShouldDisableMonthlyAfterError');
ok(!!shouldSrc, '_cdShouldReofferPaymentChoice 함수를 index.html에서 찾지 못함');
ok(!!abortSrc, '_cdIsAbortedPaymentError 함수를 index.html에서 찾지 못함');
ok(!!disableMonthlySrc, '_cdShouldDisableMonthlyAfterError 함수를 index.html에서 찾지 못함');

let shouldReoffer = () => false;
let isAborted = () => false;
let shouldDisableMonthly = () => false;
if (shouldSrc && abortSrc && disableMonthlySrc) {
  // eslint-disable-next-line no-new-func
  const factory = new Function(`${shouldSrc}\n${abortSrc}\n${disableMonthlySrc}\nreturn { _cdShouldReofferPaymentChoice, _cdIsAbortedPaymentError, _cdShouldDisableMonthlyAfterError };`);
  const fns = factory();
  shouldReoffer = fns._cdShouldReofferPaymentChoice;
  isAborted = fns._cdIsAbortedPaymentError;
  shouldDisableMonthly = fns._cdShouldDisableMonthlyAfterError;
}

// fixture: (설명, error, expectReoffer, expectAborted)
const CASES = [
  ['① 이용권 없음 (402 PAYMENT_REQUIRED)', { status: 402, code: 'PAYMENT_REQUIRED' }, true, false],
  ['② 등급 한도 초과 (402 PRICE_EXCEEDS_PASS_LIMIT)', { status: 402, code: 'PRICE_EXCEEDS_PASS_LIMIT' }, true, false],
  ['③ 월정석 잔량 부족 (402 INSUFFICIENT_MONTHLY_CREDITS)', { status: 402, code: 'INSUFFICIENT_MONTHLY_CREDITS' }, true, false],
  ['④ 전이 503 (AUTH_STATUS_TEMPORARILY_UNAVAILABLE)', { status: 503, code: 'AUTH_STATUS_TEMPORARILY_UNAVAILABLE' }, true, false],
  ['⑤ checkout 503 (DB degraded)', { status: 503, code: 'DB_DEGRADED' }, true, false],
  ['⑥ DB 일시불가 메시지', { status: 0, message: 'Database is temporarily unavailable.' }, true, false],
  ['⑦ 미로그인 확정 (401) → 재노출 안 함', { status: 401, code: 'AUTH_REQUIRED' }, false, false],
  ['⑧ 권한 거부 확정 (403) → 재노출 안 함', { status: 403, code: 'FORBIDDEN' }, false, false],
  ['⑨ PG창 사용자 취소 → aborted(정상 취소)', { __cdPaymentAborted: true, message: '사용자 취소' }, false, true],
  ['⑩ PAYMENT_CANCELLED 코드 → aborted', { code: 'PAYMENT_CANCELLED' }, false, true],
  // 409는 402도 5xx도 아니라 상태코드만으로는 안 잡힌다 — 코드 목록에 없으면 rethrow→하드 alert(돈은 차감된 채)로
  // dead-end가 된다. 동일 requestId 재시도가 서버 원장 replay로 해소하므로 재노출이 옳다.
  ['⑪ 월정석 차감중 (409 MONTHLY_CREDIT_CONSUME_IN_PROGRESS)', { status: 409, code: 'MONTHLY_CREDIT_CONSUME_IN_PROGRESS' }, true, false],
  ['⑫ 월정석 경합 (503 MONTHLY_CREDIT_CONTENDED)', { status: 503, code: 'MONTHLY_CREDIT_CONTENDED' }, true, false],
  ['⑬ 차감 후 검증실패 (502 MONTHLY_ACCESS_UNVERIFIED)', { status: 502, code: 'MONTHLY_ACCESS_UNVERIFIED' }, true, false],
];

const rows = [];
for (const [label, err, expReoffer, expAborted] of CASES) {
  const gotReoffer = !!shouldReoffer(err);
  const gotAborted = !!isAborted(err);
  const pass = gotReoffer === expReoffer && gotAborted === expAborted;
  if (!pass) fails.push(`fixture 불일치: ${label} → reoffer=${gotReoffer}(기대 ${expReoffer}), aborted=${gotAborted}(기대 ${expAborted})`);
  rows.push({ 케이스: label, 재노출: gotReoffer, 정상취소: gotAborted, 판정: pass ? 'PASS' : 'FAIL' });
}

// ── 1-b) 월정석 비활성 판정: '재오픈할까?'와 '월정석을 내릴까?'는 다른 질문이다 ──────
// 재오픈(_cdShouldReofferPaymentChoice)은 402든 5xx든 정당하지만, 월정석을 내리는 건 서버가 확인한
// '진짜 잔량 부족'일 때만 옳다. 일시 장애까지 내리면 잔량이 충분한 사용자가 단건 결제로 세탁된다
// (2026-07 회귀: sticky _cdReofferDirectOnly가 월정석을 목록에서 아예 제거해 결제가 불가능했음).
const MONTHLY_DISABLE_CASES = [
  ['㉮ 진짜 부족 (402 + 잔량<필요) → 비활성', { status: 402, code: 'INSUFFICIENT_MONTHLY_CREDITS', monthlyBalance: 100, requiredMonthlyCredits: 500 }, true],
  ['㉯ 402지만 잔량 충분(서버 모순) → 유지', { status: 402, code: 'INSUFFICIENT_MONTHLY_CREDITS', monthlyBalance: 500, requiredMonthlyCredits: 500 }, false],
  ['㉰ 402지만 잔량 미상 → 유지(모르면 안 내림)', { status: 402, code: 'INSUFFICIENT_MONTHLY_CREDITS' }, false],
  ['㉱ 전이 503 (DB_DEGRADED) → 유지', { status: 503, code: 'DB_DEGRADED', monthlyBalance: 100, requiredMonthlyCredits: 500 }, false],
  ['㉲ 500 → 유지', { status: 500 }, false],
  ['㉳ 409 차감중(MONTHLY_CREDIT_CONSUME_IN_PROGRESS) → 유지', { status: 409, code: 'MONTHLY_CREDIT_CONSUME_IN_PROGRESS' }, false],
  ['㉴ 402 PAYMENT_REQUIRED(월정석 무관) → 유지', { status: 402, code: 'PAYMENT_REQUIRED', monthlyBalance: 0, requiredMonthlyCredits: 500 }, false],
  ['㉵ 502 검증실패(MONTHLY_ACCESS_UNVERIFIED) → 유지', { status: 502, code: 'MONTHLY_ACCESS_UNVERIFIED' }, false],
];
for (const [label, err, expDisable] of MONTHLY_DISABLE_CASES) {
  const gotDisable = !!shouldDisableMonthly(err);
  const pass = gotDisable === expDisable;
  if (!pass) fails.push(`월정석 비활성 픽스처 불일치: ${label} → disable=${gotDisable}(기대 ${expDisable})`);
  rows.push({ 케이스: label, 재노출: '-', 정상취소: '-', 판정: pass ? 'PASS' : 'FAIL' });
}
// 합성 계약: 일시 장애는 '재오픈은 하되 월정석은 살린다'.
ok(shouldReoffer({ status: 503, code: 'DB_DEGRADED' }) && !shouldDisableMonthly({ status: 503, code: 'DB_DEGRADED' }),
  '합성 계약 위반: 전이 503은 재오픈하되 월정석을 유지해야 한다');
ok(shouldReoffer({ status: 500 }) && !shouldDisableMonthly({ status: 500 }),
  '합성 계약 위반: 500은 재오픈하되 월정석을 유지해야 한다');

// ── 2) 드리프트 가드: React 정본이 인정하는 복구가능 코드 ⊆ 정적 헬퍼 ──────────
const REACT_RECOVERABLE = [
  'PAYMENT_REQUIRED', 'MEMBERSHIP_PASS_NOT_COVERED', 'PRICE_EXCEEDS_PASS_LIMIT',
  'INSUFFICIENT_COINS', 'AUTH_REFRESH_TEMPORARY_FAILURE', 'PASS_STATUS_TEMPORARILY_UNAVAILABLE',
  'BALANCE_SNAPSHOT_UNAVAILABLE', 'AUTH_DB_UNAVAILABLE', 'DB_DEGRADED', 'BILLING_REQUEST_TIMEOUT',
];
for (const code of REACT_RECOVERABLE) {
  const covered = shouldReoffer({ status: 400, code });
  ok(covered, `드리프트: React 정본이 인정하는 '${code}'를 정적 헬퍼가 복구가능으로 인정하지 않음`);
}
// 402/5xx 상태 자체도 복구가능
ok(shouldReoffer({ status: 402 }), '드리프트: status 402 미인정');
ok(shouldReoffer({ status: 500 }), '드리프트: status 5xx 미인정');

// ── 3) 6미러 구조 마커 패리티 ───────────────────────────────────────────────
const MARKERS = [
  'function _cdShouldReofferPaymentChoice(error) {',
  'function _cdIsAbortedPaymentError(error) {',
  'function _cdShouldDisableMonthlyAfterError(error) {',
  'function _cdHasVerifiedMonthlyConsumption(payload, featureKey) {',
  'for (var _cdGateAttempt = 0; _cdGateAttempt < 4; _cdGateAttempt += 1) {',
  // 월정석은 '제거'가 아니라 lot 정본 잔량을 넘겨 기존 비활성(회색) 경로로 표시한다.
  // allowedPaymentModes로 빼면 결제창에서 사라져 정책(단건/월정석 동등 노출)을 위반한다.
  "_cdMonthlyBlockedReason === 'insufficient' ? { monthlyBalance: _cdMonthlyBlockedBalance, membershipCreditCost: _cdMonthlyBlockedRequired } : {}",
  'if (_cdShouldDisableMonthlyAfterError(_cdLeafError)) {',
  'if (_cdIsAbortedPaymentError(_cdLeafError)) {',
  'if (_cdShouldReofferPaymentChoice(_cdLeafError)) {',
  'abortError.__cdPaymentAborted = true;',
  'checkoutError.status = Number(checkoutRes.status',
  // 409는 '차감됨 + 원장 미관찰' → 동일 requestId 재요청으로 idempotent 성공을 받아야 한다.
  "if (Number(res.status) !== 409 && _cdRetryCode !== 'MONTHLY_CREDIT_CONSUME_IN_PROGRESS') break;",
  // 월정석이 결제창에서 '제거'되지 않아야 한다는 계약의 음성 마커는 아래 NEGATIVE_MARKERS가 검사한다.
];
// 재발 방지: 월정석을 목록에서 제거하던 옛 sticky 구현이 되살아나면 즉시 실패시킨다.
const NEGATIVE_MARKERS = [
  "allowedPaymentModes: 'direct,pass'",
  '_cdReofferDirectOnly = true;',
];
for (const rel of MIRRORS) {
  let html;
  try { html = read(rel); } catch (e) { fails.push(`미러 읽기 실패: ${rel} (${e.message})`); continue; }
  for (const mk of MARKERS) {
    const n = html.split(mk).length - 1;
    ok(n === 1, `미러 마커 누락/중복: ${rel} :: "${mk.slice(0, 48)}..." (${n}회)`);
  }
  for (const mk of NEGATIVE_MARKERS) {
    ok(!html.includes(mk), `금지 마커 부활(월정석이 결제창에서 제거됨): ${rel} :: "${mk.slice(0, 48)}..."`);
  }
}

// ── 출력 ────────────────────────────────────────────────────────────────────
console.log('=== 정적 결제 게이트 fail-safe fixture ===\n');
console.table(rows);

if (fails.length) {
  console.error(`\n❌ 실패 ${fails.length}건:`);
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('\n✅ 통과: 402(미보유/등급초과/월정석부족)·전이 503 → 결제창 재노출(단건 유도), 401/403 → 로그인, PG취소 → 정상취소. dead-end 없음. 6미러 패리티 OK.');

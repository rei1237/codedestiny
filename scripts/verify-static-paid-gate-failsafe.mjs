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
ok(!!shouldSrc, '_cdShouldReofferPaymentChoice 함수를 index.html에서 찾지 못함');
ok(!!abortSrc, '_cdIsAbortedPaymentError 함수를 index.html에서 찾지 못함');

let shouldReoffer = () => false;
let isAborted = () => false;
if (shouldSrc && abortSrc) {
  // eslint-disable-next-line no-new-func
  const factory = new Function(`${shouldSrc}\n${abortSrc}\nreturn { _cdShouldReofferPaymentChoice, _cdIsAbortedPaymentError };`);
  const fns = factory();
  shouldReoffer = fns._cdShouldReofferPaymentChoice;
  isAborted = fns._cdIsAbortedPaymentError;
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
];

const rows = [];
for (const [label, err, expReoffer, expAborted] of CASES) {
  const gotReoffer = !!shouldReoffer(err);
  const gotAborted = !!isAborted(err);
  const pass = gotReoffer === expReoffer && gotAborted === expAborted;
  if (!pass) fails.push(`fixture 불일치: ${label} → reoffer=${gotReoffer}(기대 ${expReoffer}), aborted=${gotAborted}(기대 ${expAborted})`);
  rows.push({ 케이스: label, 재노출: gotReoffer, 정상취소: gotAborted, 판정: pass ? 'PASS' : 'FAIL' });
}

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
  'for (var _cdGateAttempt = 0; _cdGateAttempt < 4; _cdGateAttempt += 1) {',
  "_cdReofferDirectOnly ? { allowedPaymentModes: 'direct,pass', equalPriorityMethods: ['DIRECT_KRW'] } : {}",
  'if (_cdIsAbortedPaymentError(_cdLeafError)) {',
  'if (_cdShouldReofferPaymentChoice(_cdLeafError)) {',
  'abortError.__cdPaymentAborted = true;',
  'checkoutError.status = Number(checkoutRes.status',
];
for (const rel of MIRRORS) {
  let html;
  try { html = read(rel); } catch (e) { fails.push(`미러 읽기 실패: ${rel} (${e.message})`); continue; }
  for (const mk of MARKERS) {
    const n = html.split(mk).length - 1;
    ok(n === 1, `미러 마커 누락/중복: ${rel} :: "${mk.slice(0, 48)}..." (${n}회)`);
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

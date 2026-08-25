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

// ── 4) 월정석 잔량 부족을 **사용자에게 보여주는가** ─────────────────────────
// 위 1-b 는 "월정석 카드를 회색으로 내릴지"만 본다. 그건 다음 결제창이 열린 뒤의 이야기이고,
// 그 사이(월정석 진행 화면이 사라지고 결제창이 다시 뜨기까지) 아무 설명이 없으면 사용자에게는
// "눌렀는데 그냥 처음으로 돌아간다"로 보인다(실제 신고). 결과를 꽃돼지 화면으로 말해야 한다.
{
  // (a) 안내가 '진짜 부족'으로 확정된 분기 **안에서만** 뜬다. 밖으로 나가면 일시 장애(503/409)에도
  //     "월정석이 부족하다"고 거짓말하게 된다 — 1-b 가 지키는 계약과 같은 이유다.
  const branchStart = rootHtml.indexOf('if (_cdShouldDisableMonthlyAfterError(_cdLeafError)) {');
  ok(branchStart > 0, '월정석 비활성 분기를 index.html 에서 찾지 못함');
  if (branchStart > 0) {
    const braceStart = rootHtml.indexOf('{', branchStart);
    let depth = 0;
    let branchEnd = -1;
    for (let i = braceStart; i < rootHtml.length; i += 1) {
      const ch = rootHtml[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) { branchEnd = i + 1; break; }
      }
    }
    ok(branchEnd > 0, '월정석 비활성 분기의 끝을 찾지 못함');
    const branch = branchEnd > 0 ? rootHtml.slice(branchStart, branchEnd) : '';
    ok(
      branch.includes('_cdShowMonthlyInsufficientOverlay('),
      '월정석 잔량 부족을 사용자에게 알리지 않는다 — 진행 화면이 그냥 사라지고 결제창만 다시 뜬다',
    );
    // 분기 밖에 같은 호출이 또 있으면 일시 장애에도 부족하다고 알리게 된다.
    const totalCalls = rootHtml.split('_cdShowMonthlyInsufficientOverlay(').length - 1;
    ok(
      totalCalls === 2, // 정의 1 + 호출 1
      `_cdShowMonthlyInsufficientOverlay 참조가 ${totalCalls}회다(기대 2 = 정의+호출). 분기 밖 호출은 일시 장애를 부족으로 오인시킨다`,
    );
  }

  // (b) 'monthly-insufficient' 는 오버레이 허용목록과 **종단(결과)** 목록에 모두 있어야 한다.
  //     허용목록에 없으면 화면이 아예 안 뜨고, 종단이 아니면 결제창이 떠 있는 동안 억제돼 삼켜진다.
  ok(
    /CD_WAIT_UI_ALLOWED_MODE_RE = [^\n]*monthly-insufficient/.test(rootHtml),
    "'monthly-insufficient' 가 대기/결과 오버레이 허용목록에 없다 — 화면이 뜨지 않는다",
  );
  ok(
    /CD_DIRECT_PG_TERMINAL_MODE_RE = [^\n]*monthly-insufficient/.test(rootHtml),
    "'monthly-insufficient' 가 종단 모드가 아니다 — 결제창이 떠 있는 동안 안내가 억제된다",
  );

  // (c) 카피 해석기를 실제로 돌려 결과 화면이 채워지는지 본다(마커 grep 이 아니라 실행).
  const copySrc = extractFn(rootHtml, '_cdResolvePaymentOverlayCopy');
  ok(!!copySrc, '_cdResolvePaymentOverlayCopy 를 index.html 에서 찾지 못함');
  if (copySrc) {
    // eslint-disable-next-line no-new-func
    const copyFactory = new Function(`
      function _cdPaymentI18n(key, fallback) { return fallback; }
      function _cdCleanPaymentStageMessage(value) { return String(value == null ? '' : value).trim(); }
      var SAJU_PASS_CHECKING_MESSAGE = '이용권 확인 중';
      ${copySrc}
      return _cdResolvePaymentOverlayCopy;
    `);
    const resolveCopy = copyFactory();
    const copy = resolveCopy('현재 잔여 100 · 필요 월정석 500', 'monthly-insufficient');
    ok(copy.mode === 'monthly-insufficient', `부족 안내가 등록되지 않은 모드다 → '${copy.mode}' 로 폴백됐다`);
    ok(!!String(copy.title || '').trim(), '부족 안내에 제목이 없다');
    ok(!!String(copy.meta || '').trim(), '부족 안내에 다음 행동 안내(meta)가 없다');
    // 🔴 수치가 본문에 살아남아야 한다. normalizePaymentOverlayBody 가 'monthly' 계열 문구를
    //    폴백으로 치환하는 규칙을 갖고 있어, 모드를 잘못 붙이면 보유/필요가 통째로 사라진다.
    ok(
      String(copy.message || '').includes('100') && String(copy.message || '').includes('500'),
      `보유/필요 수치가 본문에서 사라졌다 → "${copy.message}"`,
    );
    // 결제 실패(환불 안내가 붙는다)와 같은 화면을 쓰면 안 된다 — 여기서는 청구된 것이 없다.
    const failedCopy = resolveCopy('', 'payment-failed');
    ok(copy.title !== failedCopy.title, '부족 안내가 결제 실패 화면과 같은 제목을 쓴다(환불 안내가 붙어 사실과 어긋난다)');
  }

  // (d) 6미러 패리티 — 정본만 고치면 프로덕션에서 한쪽만 반영된다.
  for (const rel of MIRRORS) {
    let html;
    try { html = read(rel); } catch (e) { fails.push(`미러 읽기 실패: ${rel} (${e.message})`); continue; }
    ok(html.includes("'monthly-insufficient': {"), `미러에 부족 안내 카피가 없다: ${rel}`);
    ok(html.includes('_cdShowMonthlyInsufficientOverlay('), `미러에 부족 안내 호출이 없다: ${rel}`);
  }

  rows.push({ 케이스: '㉶ 월정석 부족 → 꽃돼지 안내 노출', 재노출: '-', 정상취소: '-', 판정: fails.length ? 'FAIL' : 'PASS' });
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

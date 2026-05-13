#!/usr/bin/env node

/**
 * Premium PDF smoke checks
 *
 * Usage:
 *   node scripts/premium-pdf-smoke.mjs
 *   PREMIUM_SMOKE_BASE_URL=https://example.com PREMIUM_SMOKE_TOKEN=<jwt> node scripts/premium-pdf-smoke.mjs
 */

const baseUrl = String(process.env.PREMIUM_SMOKE_BASE_URL || process.env.CODE_DESTINY_API_BASE_URL || 'https://127.0.0.1').replace(/\/+$/, '');
const authToken = String(process.env.PREMIUM_SMOKE_TOKEN || '').trim();

function buildHeaders() {
  const headers = { 'content-type': 'application/json' };
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  return headers;
}

async function postJson(path, payload) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => ({}));
  return { url, status: response.status, ok: response.ok, data };
}

function printResult(label, result, expectedStatus, expectedCode) {
  const actualCode = String(result?.data?.code || '');
  const statusOk = Number(result?.status) === Number(expectedStatus);
  const codeOk = !expectedCode || actualCode === expectedCode;
  const pass = statusOk && codeOk;

  console.log(`\n[${pass ? 'PASS' : 'FAIL'}] ${label}`);
  console.log(`  - url: ${result.url}`);
  console.log(`  - status: ${result.status} (expected: ${expectedStatus})`);
  if (expectedCode) console.log(`  - code: ${actualCode || '(empty)'} (expected: ${expectedCode})`);
  if (!pass) {
    console.log(`  - message: ${String(result?.data?.message || result?.data?.error || '(empty)')}`);
  }

  return pass;
}

async function run() {
  console.log('[Premium Smoke] baseUrl =', baseUrl);
  console.log('[Premium Smoke] token =', authToken ? 'provided' : 'missing (most checks will return 401)');

  const checks = [];

  // 1) prepare 422: missing canonical fields
  const prepareResult = await postJson('/api/premium-report/prepare', {
    featureType: 'jamidusu_premium',
    reportType: 'ziweiPremium',
    requestBody: {
      name: '스모크테스트',
      gender: 'F',
      year: 1992,
      month: 6,
      day: 15,
      hour: 12,
      minute: 30,
      ziweiStructured: {
        meng: '',
        shen: '',
        palaceStarData: [
          {
            palace: '명궁',
            branch: '',
            stars: [{ name: '자미' }],
            auxStars: [],
            badStars: [],
          },
        ],
      },
    },
  });
  checks.push(printResult('prepare 422 (MISSING_CALCULATION_DATA)', prepareResult, authToken ? 422 : 401, authToken ? 'MISSING_CALCULATION_DATA' : 'UNAUTHORIZED'));

  // 2) chapter-level 422 via legacy ziwei session route
  const chapterResult = await postJson('/api/ziwei-book/session', {
    sessionId: 1,
    chapter: 1,
    name: '스모크테스트',
    gender: 'F',
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    ziweiStructured: {
      meng: '',
      shen: '',
      palaceStarData: [
        {
          palace: '명궁',
          branch: '',
          stars: [{ name: '자미' }],
          auxStars: [],
          badStars: [],
        },
      ],
    },
  });
  checks.push(printResult('chapter 422 (ZIWEI_CANONICAL_VALIDATION_FAILED)', chapterResult, authToken ? 422 : 401, authToken ? 'ZIWEI_CANONICAL_VALIDATION_FAILED' : 'UNAUTHORIZED'));

  // 3) refund 409 reproduction
  const refundResult = await postJson('/api/fortune/pig-coin/refund', {
    cost: 300,
    featureKey: 'premium-love-secret-solo',
    sourceTransactionId: '507f1f77bcf86cd799439011',
    requestId: `premium-smoke-refund-${Date.now()}`,
    reason: 'premium smoke refund 409 check',
  });
  checks.push(printResult('refund 409 (NO_REFUNDABLE_DEDUCTION)', refundResult, authToken ? 409 : 401, authToken ? 'NO_REFUNDABLE_DEDUCTION' : 'UNAUTHORIZED'));

  const passed = checks.every(Boolean);
  console.log(`\n[Premium Smoke] ${passed ? 'ALL PASSED' : 'FAILED'}`);
  process.exitCode = passed ? 0 : 1;
}

run().catch((error) => {
  console.error('[Premium Smoke] unexpected error:', error && error.message ? error.message : error);
  process.exitCode = 1;
});

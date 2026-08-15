#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

let loadEnv = () => {};
try {
  // Keep local DX for .env files, but do not hard-fail in minimal CI runners.
  ({ config: loadEnv } = await import('dotenv'));
} catch (e) {
  loadEnv = () => {};
}

loadEnv({ path: '.env.local' });
loadEnv();

const API_KEY = process.env.PAGESPEED_API_KEY || process.env.LIGHTHOUSE_KEY || process.env.lighthouse_key || process.env.PSI_KEY || process.env.psi_key || '';
const TARGET_URL = process.env.PSI_URL || 'https://code-destiny.com';
const OUT_DIR = process.env.PSI_OUT_DIR || 'reports';
const ENFORCE = String(process.env.PSI_ENFORCE_THRESHOLDS || 'false').toLowerCase() === 'true';
const FAIL_ON_API_KEY_ERROR = String(process.env.PSI_FAIL_ON_API_KEY_ERROR || 'false').toLowerCase() === 'true';

const thresholds = {
  perfMin: Number(process.env.PSI_PERF_MIN || 80),
  tbtMax: Number(process.env.PSI_TBT_MAX || 300),
  clsMax: Number(process.env.PSI_CLS_MAX || 0.1),
  lcpMax: Number(process.env.PSI_LCP_MAX || 2500),
  fcpMax: Number(process.env.PSI_FCP_MAX || 1000),
  seoMin: Number(process.env.PSI_SEO_MIN || 100),
  a11yMin: Number(process.env.PSI_A11Y_MIN || 90),
};

function isApiKeyError(message) {
  return /api key|apikey|key not found|invalid key|permission denied/i.test(String(message || ''));
}

function createSkipError(reason) {
  const err = new Error(reason);
  err.name = 'PsiAuditSkipped';
  return err;
}

async function skipAudit(reason) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const summaryPath = path.join(OUT_DIR, 'psi-summary.md');
  const md = [
    '# PSI Lighthouse Audit',
    '',
    `- URL: ${TARGET_URL}`,
    '- Status: skipped',
    `- Reason: ${reason}`,
  ].join('\n');
  await fs.writeFile(summaryPath, md, 'utf8');
  console.warn(`[psi-audit] skipped: ${reason}`);
  console.log(`[psi-audit] wrote ${summaryPath}`);
}

// 🔴 예전에는 키가 없으면 여기서 exit 0 으로 조용히 건너뛰었다. 그건 "건너뜀"을 "통과"로 보이게
//    만드는 형태라, 점수를 기준으로 판단해야 하는 순간에 아무 값도 못 준다.
//    PSI v5 는 **키 없이도 호출된다**(할당량만 낮다). 그러니 키가 없으면 건너뛰지 말고 그냥 부른다.
//    키를 강제하고 싶은 호출자만 PSI_FAIL_ON_API_KEY_ERROR=true 로 막는다.
if (!API_KEY) {
  if (FAIL_ON_API_KEY_ERROR) {
    console.error('[psi-audit] missing API key: set PAGESPEED_API_KEY, LIGHTHOUSE_KEY (or lighthouse_key), or PSI_KEY');
    process.exit(1);
  }
  console.warn('[psi-audit] API 키 없음 — 키 없이 호출한다(할당량 낮음, 429 가 나면 잠시 뒤 재시도).');
}

function toScore(v) {
  return typeof v === 'number' ? Math.round(v * 100) : null;
}

function readMetric(audits, id) {
  if (!audits || !audits[id]) return null;
  const v = audits[id].numericValue;
  return typeof v === 'number' ? v : null;
}

function readDisplay(audits, id) {
  if (!audits || !audits[id]) return 'n/a';
  return audits[id].displayValue || 'n/a';
}

async function fetchPsi(strategy) {
  const qs = new URLSearchParams({
    url: TARGET_URL,
    strategy,
    category: 'PERFORMANCE',
  });
  if (API_KEY) qs.set('key', API_KEY);
  qs.append('category', 'ACCESSIBILITY');
  qs.append('category', 'SEO');

  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${qs.toString()}`;
  const res = await fetch(url, {
    headers: {
      Referer: `${new URL(TARGET_URL).origin}/`,
      Origin: new URL(TARGET_URL).origin,
      'User-Agent': 'Code-Destiny-PSI-Audit',
    },
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    if (isApiKeyError(msg) && !FAIL_ON_API_KEY_ERROR) {
      throw createSkipError(`${strategy} request skipped: ${msg}`);
    }
    throw new Error(`[psi-audit] ${strategy} request failed: ${msg}`);
  }
  return json;
}

function evaluate(strategy, json) {
  const lr = json.lighthouseResult || {};
  const cats = lr.categories || {};
  const audits = lr.audits || {};

  const metrics = {
    strategy,
    performance: toScore(cats.performance?.score),
    accessibility: toScore(cats.accessibility?.score),
    seo: toScore(cats.seo?.score),
    fcp: readMetric(audits, 'first-contentful-paint'),
    lcp: readMetric(audits, 'largest-contentful-paint'),
    cls: readMetric(audits, 'cumulative-layout-shift'),
    tbt: readMetric(audits, 'total-blocking-time'),
    mainThread: readMetric(audits, 'mainthread-work-breakdown'),
    unusedCssDisplay: readDisplay(audits, 'unused-css-rules'),
    unusedJsDisplay: readDisplay(audits, 'unused-javascript'),
    renderBlockingDisplay: readDisplay(audits, 'render-blocking-resources'),
  };

  const violations = [];
  if ((metrics.performance ?? -1) < thresholds.perfMin) violations.push(`Performance ${metrics.performance} < ${thresholds.perfMin}`);
  if ((metrics.tbt ?? Number.POSITIVE_INFINITY) > thresholds.tbtMax) violations.push(`TBT ${Math.round(metrics.tbt)}ms > ${thresholds.tbtMax}ms`);
  if ((metrics.cls ?? Number.POSITIVE_INFINITY) > thresholds.clsMax) violations.push(`CLS ${metrics.cls?.toFixed(3)} > ${thresholds.clsMax}`);
  if ((metrics.lcp ?? Number.POSITIVE_INFINITY) > thresholds.lcpMax) violations.push(`LCP ${Math.round(metrics.lcp)}ms > ${thresholds.lcpMax}ms`);
  if ((metrics.fcp ?? Number.POSITIVE_INFINITY) > thresholds.fcpMax) violations.push(`FCP ${Math.round(metrics.fcp)}ms > ${thresholds.fcpMax}ms`);
  if ((metrics.seo ?? -1) < thresholds.seoMin) violations.push(`SEO ${metrics.seo} < ${thresholds.seoMin}`);
  if ((metrics.accessibility ?? -1) < thresholds.a11yMin) violations.push(`Accessibility ${metrics.accessibility} < ${thresholds.a11yMin}`);

  return { metrics, violations };
}

function toMdRow(label, mobile, desktop) {
  return `| ${label} | ${mobile} | ${desktop} |`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const [mobileRaw, desktopRaw] = await Promise.all([fetchPsi('mobile'), fetchPsi('desktop')]);

  const mobileOut = path.join(OUT_DIR, 'psi-mobile.json');
  const desktopOut = path.join(OUT_DIR, 'psi-desktop.json');
  await fs.writeFile(mobileOut, JSON.stringify(mobileRaw, null, 2), 'utf8');
  await fs.writeFile(desktopOut, JSON.stringify(desktopRaw, null, 2), 'utf8');

  const mobile = evaluate('mobile', mobileRaw);
  const desktop = evaluate('desktop', desktopRaw);

  const md = [
    '# PSI Lighthouse Audit',
    '',
    `- URL: ${TARGET_URL}`,
    `- Enforce Thresholds: ${ENFORCE}`,
    '',
    '## Metrics',
    '',
    '| Metric | Mobile | Desktop |',
    '| --- | ---: | ---: |',
    toMdRow('Performance', mobile.metrics.performance ?? 'n/a', desktop.metrics.performance ?? 'n/a'),
    toMdRow('Accessibility', mobile.metrics.accessibility ?? 'n/a', desktop.metrics.accessibility ?? 'n/a'),
    toMdRow('SEO', mobile.metrics.seo ?? 'n/a', desktop.metrics.seo ?? 'n/a'),
    toMdRow('FCP (ms)', mobile.metrics.fcp ? Math.round(mobile.metrics.fcp) : 'n/a', desktop.metrics.fcp ? Math.round(desktop.metrics.fcp) : 'n/a'),
    toMdRow('LCP (ms)', mobile.metrics.lcp ? Math.round(mobile.metrics.lcp) : 'n/a', desktop.metrics.lcp ? Math.round(desktop.metrics.lcp) : 'n/a'),
    toMdRow('CLS', mobile.metrics.cls != null ? mobile.metrics.cls.toFixed(3) : 'n/a', desktop.metrics.cls != null ? desktop.metrics.cls.toFixed(3) : 'n/a'),
    toMdRow('TBT (ms)', mobile.metrics.tbt != null ? Math.round(mobile.metrics.tbt) : 'n/a', desktop.metrics.tbt != null ? Math.round(desktop.metrics.tbt) : 'n/a'),
    toMdRow('Main Thread (ms)', mobile.metrics.mainThread != null ? Math.round(mobile.metrics.mainThread) : 'n/a', desktop.metrics.mainThread != null ? Math.round(desktop.metrics.mainThread) : 'n/a'),
    '',
    '## Opportunity Summary',
    '',
    `- Mobile unused CSS: ${mobile.metrics.unusedCssDisplay}`,
    `- Desktop unused CSS: ${desktop.metrics.unusedCssDisplay}`,
    `- Mobile unused JS: ${mobile.metrics.unusedJsDisplay}`,
    `- Desktop unused JS: ${desktop.metrics.unusedJsDisplay}`,
    `- Mobile render blocking: ${mobile.metrics.renderBlockingDisplay}`,
    `- Desktop render blocking: ${desktop.metrics.renderBlockingDisplay}`,
    '',
    '## Threshold Violations',
    '',
    ...((mobile.violations.length || desktop.violations.length)
      ? [
          '### Mobile',
          ...(mobile.violations.length ? mobile.violations.map((v) => `- ${v}`) : ['- none']),
          '',
          '### Desktop',
          ...(desktop.violations.length ? desktop.violations.map((v) => `- ${v}`) : ['- none']),
        ]
      : ['- none']),
    '',
    `Artifacts: ${mobileOut}, ${desktopOut}`,
  ].join('\n');

  const summaryPath = path.join(OUT_DIR, 'psi-summary.md');
  await fs.writeFile(summaryPath, md, 'utf8');

  console.log(`[psi-audit] wrote ${mobileOut}`);
  console.log(`[psi-audit] wrote ${desktopOut}`);
  console.log(`[psi-audit] wrote ${summaryPath}`);

  if (ENFORCE && (mobile.violations.length || desktop.violations.length)) {
    console.error('[psi-audit] Threshold check failed.');
    process.exit(2);
  }
}

main().catch(async (err) => {
  if (err && err.name === 'PsiAuditSkipped') {
    await skipAudit(err.message);
    return;
  }
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

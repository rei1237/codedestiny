/** Read-only source audit. A wiring match is deliberately NOT a completion guarantee. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEATURE_KEY_PRICE_TABLE, PIG_COIN_UNLOCK_PRODUCTS, FEATURE_KEY_REASON_COSTS, PAID_FEATURE_KEY_ALIASES } from '../worker/lib/paid-feature-registry.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = execFileSync('rg', ['--files', '-g', '*.js', '-g', '*.jsx', '-g', '*.ts', '-g', '*.tsx', '-g', '*.html', '-g', '!docs/**', '-g', '!reports/**', '-g', '!scripts/**', '-g', '!__tests__/**', '-g', '!apps/**', '-g', '!js/vendor/**'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).map(p => p.replaceAll('\\', '/'));
const sources = files.map(file => ({ file, text: readFileSync(resolve(root, file), 'utf8') }));
const prices = { ...FEATURE_KEY_PRICE_TABLE, ...PIG_COIN_UNLOCK_PRODUCTS };
const keywords = /PortOne|INIpay|checkout|purchase|resume|redirectUrl|returnUrl|successUrl|failUrl|callbackUrl|entitlement|consume|unlock|merchantUid|impUid|paymentId|sessionStorage|localStorage|URLSearchParams|location\.(?:href|assign|replace)|window\.open|\bprice\b|\bticket\b|\bsubscription\b/i;
const redirects = /redirectUrl|returnUrl|successUrl|failUrl|callbackUrl|location\.(?:href|assign|replace)|window\.open/;
const gates = /ensurePaidAccess\s*\(|runPaidAccessGate\s*\(|runBillingCoinGate\s*\(|purchaseFeature\s*\(|_cdOpenPaidServiceGate\s*\(|_cdCoinGatePerUse\s*\(|syRequirePaidSukuyoFeature\s*\(|requestPayment\s*\(|unlockPremiumFeature\s*\(/;
function occurrences(pattern) {
  return sources.flatMap(({ file, text }) => text.split(/\r?\n/).flatMap((line, i) => pattern.test(line) ? [{ file, line: i + 1, text: line.trim().slice(0, 300) }] : []));
}
function route(file) {
  if (file.endsWith('.html')) return '/' + file.replace(/^public\//, '');
  if (file.startsWith('app/')) return '/' + file.slice(4).split('/').slice(0, -1).filter(s => !s.startsWith('_') && !s.startsWith('(')).join('/');
  return '호출 라우트 추가 추적 필요';
}
const inventory = Object.entries(prices).map(([key, price]) => {
  const aliases = Object.entries(PAID_FEATURE_KEY_ALIASES).filter(([, target]) => target === key).map(([alias]) => alias);
  const refs = sources.filter(s => !s.file.startsWith('worker/') && [key, ...aliases].some(k => s.text.includes(k))).map(s => ({ file: s.file, route: route(s.file), resume: /usePaidResume|registerPaidResumeHandler/.test(s.text) }));
  return { key, reason: price.reason || key, billingType: price.billingType, accessModel: price.accessModel, aliases, variants: FEATURE_KEY_REASON_COSTS[key] || null, references: refs, risk: 'CRITICAL', finalResultVerified: false };
});
const output = resolve(root, 'docs/payment-resume-audit');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'inventory.json'), JSON.stringify({ generatedFrom: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), notice: '참조 파일의 resume 문자열 존재는 해당 상품의 실행·입력 복원 보장이 아니다. 미검증 경로는 SAFE로 분류하지 않는다.', inventory, gates: occurrences(gates), redirects: occurrences(redirects), candidateFiles: sources.filter(s => keywords.test(s.text)).map(s => s.file) }, null, 2) + '\n');
const rows = inventory.map(item => {
  const refs = item.references;
  const pages = refs.filter(r => r.file.endsWith('.html') || (r.file.startsWith('app/') && !r.file.includes('/_lib/')));
  const kind = refs.some(r => /\.[jt]sx$/.test(r.file)) ? (refs.some(r => r.file.endsWith('.html')) ? 'hybrid' : 'React') : '정적/기타';
  return `| ${item.reason} / \`${item.key}\` | ${[...new Set(pages.map(r => r.route))].join(', ') || '호출 라우트 추가 추적 필요'} | ${kind} | 정본 정책별 이용권·월정석·PG | 공통 복귀 코드 존재, 기능별 미검증 | ${refs.some(r => r.resume) ? '참조 파일에 배선 존재' : '동적 호출 추적 필요'} | 미검증 | 미검증 | 미보장 / CRITICAL |`;
});
writeFileSync(resolve(output, 'inventory.md'), '# 결제 resume 1차 소스 Inventory\n\n정본 가격 키 전수. 판매 중단 키·별칭도 삭제하지 않고 포함한다. URL은 참조 파일에서 도출한 후보이며 호출부 추적 후 확정한다. 이용권 상품·동적 음악 트랙은 별도 감사 표에 추가한다. 이 표는 완료 보고서가 아니다.\n\n| 기능 | URL 후보 | 구현 방식 | 결제 방식 | 모바일 Redirect | Resume | 상태 복원 | 결제 후 자동 실행 | 최종 결과 보장 |\n|---|---|---|---|---|---|---|---|---|\n' + rows.join('\n') + '\n');
console.log(JSON.stringify({ pricingKeys: inventory.length, sources: sources.length, candidateFiles: sources.filter(s => keywords.test(s.text)).length, gates: occurrences(gates).length, redirects: occurrences(redirects).length }));

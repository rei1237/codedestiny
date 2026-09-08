/** Source inventory, not a claim of browser coverage. Run from any directory. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildFeatureMarketingCopy, readShellHtml } from './lib/feature-marketing-extract.mjs';
import { STATIC_CANONICAL_ROUTES } from './static-canonical-route-map.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const ignored = /^(?:\.claude\/worktrees|\.codex-worktrees|\.cleanup|reports|docs\/performance-audit\/results)\//;
const sources = files.filter(file => !ignored.test(file));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const pending = () => Object.fromEntries(['entry', 'loading', 'input', 'selection', 'result', 'error', 'back', 'share', 'layout', 'network', 'auth', 'paymentEntry'].map(key => [key, 'unverified']));
const routes = sources.filter(file => /^app\/(?:.*\/)?page\.[jt]sx?$/.test(file)).map(source => ({
  source, kind: 'react', route: '/' + source.replace(/^app\//, '').replace(/(?:^|\/)page\.[jt]sx?$/, '').replace(/\([^/]+\)\//g, ''),
  dynamic: source.includes('['), status: pending(),
}));
for (const source of sources.filter(file => file.endsWith('.html') && !/^(?:docs|scripts|templates)\//.test(file))) {
  const rootSource = source.replace(/^public\//, '');
  const mirror = source.startsWith('public/') && sources.includes(rootSource);
  routes.push({ source, kind: mirror ? 'static-mirror' : 'static', route: '/' + rootSource.replace(/(^|\/)index\.html$/, '$1'), mirrorOf: mirror ? rootSource : null, status: pending() });
}
const shell = readShellHtml();
const book = buildFeatureMarketingCopy(shell);
const features = Object.entries(book.items).map(([key, { dictNs, copy }]) => ({
  key, namespace: dictNs, featureId: copy.featureId || null, category: copy.category || null,
  source: 'index.html:FEATURE_MARKETING_COPY',
  questionCandidates: copy.answersQuestions || copy.painPoints || [],
  claimCandidates: [...(copy.feats || []), ...(copy.unlockBenefits || [])],
  claimsStatus: 'requires-implementation-and-fixture-verification',
  detailStatus: 'unverified', status: pending(),
}));
const actions = [...new Set([...shell.matchAll(/data-action=["']([^"']+)["']/g)].map(match => match[1]))].sort();
const sourceTexts = sources.filter(file => /\.(?:[cm]?[jt]sx?|css|html|json)$/.test(file) && !/^(?:public|docs|__tests__)\//.test(file) && !file.endsWith('lock.json')).map(file => [file, read(file)]);
const assets = sources.filter(file => /\.(?:png|jpe?g|webp|avif|gif|svg)$/i.test(file) && !file.startsWith('store-assets/')).map(file => {
  const url = '/' + file.replace(/^public\//, '');
  const references = sourceTexts.filter(([, text]) => text.includes(url) || text.includes(encodeURI(url))).map(([source]) => source);
  return { file, bytes: fs.statSync(path.join(root, file)).size, literalReferences: references, referenceStatus: references.length ? 'literal-match' : 'unresolved-dynamic-reference-possible', transferBytes: null };
}).sort((a, b) => b.bytes - a.bytes);
const externalLinks = [...new Set(sourceTexts.flatMap(([, text]) => [...text.matchAll(/https?:\/\/[^\s"'<>`\\)]+/g)].map(match => match[0])).filter(url => /\.html(?:[?#]|$)|pages\.dev/.test(url)))].sort();
const inventory = {
  schemaVersion: 1, sourceSha: sha,
  limitations: ['Source inventory only; no route is marked browser-verified.', 'Dynamic routes require expansion from generateStaticParams/build output.', 'Literal asset references miss concatenated URLs; absence is not deletion authority.', 'HTML mirrors and route aliases are not distinct features.', 'Legacy action coverage must be joined with runtime service search.'],
  routes, canonicalMappings: STATIC_CANONICAL_ROUTES, shellActions: actions, features, assets, externalLinks,
};
const output = path.join(root, 'docs/mobile-platform');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
const rows = routes.map(row => `| ${row.route} | ${row.kind} | ${row.source} | 미검증 |`);
fs.writeFileSync(path.join(output, 'inventory.md'), [
  '# 모바일 플랫폼 조사 원장', '', `기준 SHA: ${sha}`, '',
  `React 소스 ${routes.filter(row => row.kind === 'react').length}개, 정적 HTML 원본/미러 ${routes.filter(row => row.kind !== 'react').length}개, 마케팅 별칭 ${features.length}개, 셸 액션 ${actions.length}개. 숫자는 고유 기능 수가 아니다.`, '',
  '이 문서는 코드 위치 인벤토리다. 동적 경로 확장·외부 링크 운영 상태·기능별 입력/결과 검증은 JSON 원장에서 별도로 추적한다. 미검증을 통과로 취급하지 않는다.', '',
  '| 경로 | 종류 | 소스 | 브라우저 검증 |', '|---|---|---|---|', ...rows, '',
  '재생성: `node scripts/audit-mobile-platform.mjs`. 파일 용량은 실제 전송량이 아니다. 참조 미발견은 삭제 근거가 아니다.', '',
].join('\n'));
console.log(JSON.stringify({ routes: routes.length, marketingAliases: features.length, actions: actions.length, assets: assets.length, output: 'docs/mobile-platform/inventory.json' }));

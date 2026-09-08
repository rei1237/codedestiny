import ts from 'typescript';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import { BUILD_ARTIFACT_DIRS } from './source-scan-ignore.mjs';

// Git 추적 파일을 입력받는다. rg 기본 ignore가 가리는 apps/mobile, 독립 public도 포함한다.
const EXCLUDED = new Set([...BUILD_ARTIFACT_DIRS, '.claude', '.codex-worktrees', '.cleanup', '__snapshots__']);
export function isInventorySource(file) {
  if (file.split('/').some(part => EXCLUDED.has(part))) return false;
  if (/^(?:docs|reports|__tests__|tests|scripts)\//.test(file)) return false;
  return /\.(?:[cm]?[jt]sx?|html|java|kt|swift|json|toml|ya?ml)$/i.test(file)
    && !/(?:^|\/)(?:package-lock|[^/]*\.test|[^/]*\.spec|[^/]*\.min)\./.test(file);
}

export const PAYMENT_TERMS = /portone|inicis|kakaopay|\b(?:pay|payment|checkout|order|purchase|billing|transaction|merchantUid|impUid|paymentId|complete|success|fail|cancel|redirect|callback|webhook|resume|paidResume|unlock|entitlement|access|subscription|pass|ticket)\b|usePaidResume|markOptimisticallyUnlocked|이용권|월정석|잠금\s*해제|구매|결제|최근\s*주문|주문\s*상태|포트원|이니시스|카카오페이/i;
const CALL_TERMS = /pay|checkout|billing|purchase|order|unlock|entitlement|subscription|coinGate|paidResume|passCoverage|consumePass|moonstone/i;

export function sourceRoute(file) {
  if (/^app\/.*\/(?:page|route)\.[jt]sx?$/.test(file)) {
    const parts = file.replace(/^app\//, '').replace(/\/(?:page|route)\.[jt]sx?$/, '').split('/');
    return '/' + parts.filter(p => !/^\(.+\)$/.test(p) && !p.startsWith('@')).join('/') + '/';
  }
  if (/^app\/(?:page|route)\.[jt]sx?$/.test(file)) return '/';
  if (/\.html$/.test(file)) return '/' + file.replace(/^public\//, '').replace(/index\.html$/, '');
  return null; // 컴포넌트 디렉터리만으로 공개 route를 추정하지 않는다.
}

export function inspectSource(file, source, knownKeys) {
  const evidence = { file, sha256: createHash('sha256').update(source).digest('hex'), route: sourceRoute(file),
    frontendType: file.startsWith('apps/mobile/') ? 'native' : file.endsWith('.html') ? 'static' : file.startsWith('app/') ? 'React' : null,
    keywordLines: [], features: [], calls: [], apiPaths: [], externalLinks: [], parseErrors: [] };
  source.split(/\r?\n/).forEach((line, index) => { if (PAYMENT_TERMS.test(line)) evidence.keywordLines.push(index + 1); });
  // HTMLはscriptを個別解析して元ファイルの行番号を保つ。HTML属性中のキーも別途拾う。
  let blocks = /\.[cm]?[jt]sx?$/.test(file) ? [{ text: source, offset: 0 }] : [];
  if (file.endsWith('.html')) {
    // HTML 주석 안의 <script>를 코드로 읽으면 실제 게이트 행까지 잘못 분류한다.
    // jsdom 기본값은 script 실행·외부 resource 로딩 모두 비활성이다.
    const dom = new JSDOM(source, { includeNodeLocations: true, virtualConsole: new VirtualConsole() });
    try {
      blocks = [...dom.window.document.querySelectorAll('script')].filter(node => {
        const type = (node.getAttribute('type') || '').toLowerCase();
        return !type || ['module', 'text/javascript', 'application/javascript'].includes(type);
      }).map(node => ({ text: node.textContent, offset: dom.nodeLocation(node).startTag.endOffset }));
    } finally { dom.window.close(); }
  }
  const lineStarts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') lineStarts.push(i + 1);
  const lineAt = offset => {
    let low = 0, high = lineStarts.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (lineStarts[mid] <= offset) low = mid + 1;
      else high = mid;
    }
    return low;
  };
  const featureRefs = new Map();
  for (const { text, offset } of blocks) {
    const tree = ts.createSourceFile(file.endsWith('.html') ? 'inline.js' : file, text, ts.ScriptTarget.Latest, true,
      /\.tsx$/.test(file) ? ts.ScriptKind.TSX : /\.jsx$/.test(file) ? ts.ScriptKind.JSX : /\.ts$/.test(file) ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    for (const error of tree.parseDiagnostics) evidence.parseErrors.push({ line: lineAt(offset + error.start), code: error.code });
    function visit(node) {
      if (ts.isStringLiteralLike(node)) {
        if (knownKeys.has(node.text)) featureRefs.set(`${node.text}:${lineAt(offset + node.getStart(tree))}`, { key: node.text, line: lineAt(offset + node.getStart(tree)) });
        if (/^\/?api\/.*(?:pay|bill|order|access|entitlement|subscription|music|app-store)/i.test(node.text)) {
          evidence.apiPaths.push({ path: node.text.split('?')[0], line: lineAt(offset + node.getStart(tree)) });
        }
      }
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        const name = ts.isIdentifier(expression) ? expression.text
          : ts.isPropertyAccessExpression(expression) ? expression.name.text
          : ts.isElementAccessExpression(expression) && ts.isStringLiteralLike(expression.argumentExpression) ? expression.argumentExpression.text : '';
        if (CALL_TERMS.test(name)) {
          evidence.calls.push({ name: name.slice(0, 180), line: lineAt(offset + node.getStart(tree)),
            // 함수명 일치는 실제 호출 경로의 증명이 아니다. 확인 전 PASS로 표시하지 않는다.
            review: 'UNREVIEWED' });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  // Native/JSON/HTML属性のリテラルも記録する。実行可能性は推測しない。
  for (const match of source.matchAll(/["']([^"'\r\n]{1,180})["']/g)) {
    if (knownKeys.has(match[1])) featureRefs.set(`${match[1]}:${lineAt(match.index)}`, { key: match[1], line: lineAt(match.index) });
  }
  for (const match of source.matchAll(/https?:\/\/[^\s"'<>`]+/g)) {
    // クエリやfragmentを成果物へ複写しない。
    try {
      const url = new URL(match[0]);
      if (/pay|checkout|billing|static|portone|inicis|kakao/i.test(url.hostname + url.pathname)) {
        evidence.externalLinks.push({ url: url.origin + url.pathname, line: lineAt(match.index) });
      }
    } catch { /* URLではないコード断片。keywordLinesには残る。 */ }
  }
  evidence.features = [...featureRefs.values()];
  return evidence;
}

/** 同一バイトのpublicコピーだけ重複排除。名前が同じでも内容差があれば独立検査。 */
export function sourceCopies(files) {
  const sourceByHash = new Map();
  for (const item of files) if (!item.file.startsWith('public/')) sourceByHash.set(item.sha256, item.file);
  return files.map(item => ({ ...item, mirrorOf: item.file.startsWith('public/') ? sourceByHash.get(item.sha256) || null : null }));
}

/** 実際のmanifest変換を実行する。I/Oのimportは許可せず価格ポリシーだけ注入。 */
export function readMusicManifest(source, policy) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, URLSearchParams,
    require(name) {
      if (name === '@/lib/music-access-policy') return policy;
      if (name === '@/lib/r2-public-url') return { buildMusicPublicUrl: key => '/inventory-only/' + encodeURIComponent(key) };
      throw new Error(`Unreviewed manifest dependency: ${name}`);
    },
  }, { timeout: 1500, filename: 'musicManifest.ts' });
  if (!Array.isArray(exports.tracks) || !exports.tracks.length) throw new Error('Music manifest has no tracks');
  const keys = new Map();
  for (const track of exports.tracks) {
    if (!track.downloadRequiresPurchase) continue;
    const key = policy.buildMusicTrackFeatureKey(track.audioSourceKey);
    if (!key || key !== track.purchaseFeatureKey) throw new Error('Invalid music product mapping');
    const prior = keys.get(key);
    if (prior && prior.audioSourceKey !== track.audioSourceKey) throw new Error(`Music feature hash collision: ${key}`);
    keys.set(key, { ...track });
  }
  return { manifestEntries: exports.tracks.length, products: [...keys.values()] };
}

export function unresolvedInventory(inventory) {
  const issues = [];
  if (!inventory.products.length || !inventory.sources.length) issues.push('EMPTY_INVENTORY');
  for (const item of inventory.products) {
    if (item.review !== 'VERIFIED') issues.push(`PRODUCT_UNREVIEWED:${item.id}`);
  }
  for (const item of inventory.sources.filter(x => !x.mirrorOf)) {
    if (item.keywordLines.length && item.review !== 'VERIFIED') issues.push(`SOURCE_UNREVIEWED:${item.file}`);
    for (const error of item.parseErrors) issues.push(`PARSE_ERROR:${item.file}:${error.line}:${error.code}`);
    for (const call of item.calls) if (call.review !== 'VERIFIED') issues.push(`CALL_UNREVIEWED:${item.file}:${call.line}`);
  }
  return issues;
}

export function productFingerprint(row) {
  const { review, reviewEvidence, ...facts } = row;
  return createHash('sha256').update(JSON.stringify(facts)).digest('hex');
}

/** 사람이 추적한 근거를 코드 hash에 묶는다. 소스 변경 뒤 과거 검토가 자동 승계되지 않는다. */
export function applyInventoryReviews(inventory, reviews = { sources: {}, products: {} }) {
  const byFile = new Map(inventory.sources.map(source => [source.file, source]));
  const errors = [];
  for (const [file, review] of Object.entries(reviews.sources || {})) {
    const source = byFile.get(file);
    if (!source || source.sha256 !== review.sha256 || !review.rationale?.trim()
        || !['entry', 'payment-core', 'feature-consumer', 'supporting-code', 'non-payment'].includes(review.role)) {
      errors.push(`INVALID_SOURCE_REVIEW:${file}`);
      continue;
    }
    source.review = 'VERIFIED';
    source.reviewEvidence = review;
    // 파일 내 모든 후보 호출의 검토를 명시한다. 한 호출만 확인한 리뷰는 전체를 통과시키지 못한다.
    for (const call of source.calls) {
      const item = review.calls?.find(item => item.line === call.line && item.name === call.name && item.rationale?.trim());
      if (item) call.review = 'VERIFIED';
    }
  }
  for (const [id, review] of Object.entries(reviews.products || {})) {
    const row = inventory.products.find(product => product.id === id);
    const references = review.evidence || [];
    const validEvidence = references.length > 0 && references.every(ref => {
      const source = byFile.get(ref.file);
      return source && source.sha256 === ref.sha256 && Number.isInteger(ref.line) && ref.line > 0;
    });
    const detailKeys = ['displayName', 'routes', 'frontendTypes', 'pass', 'moonstone', 'pg', 'kakaoPay',
      'paymentStart', 'paymentApis', 'returnDestinations', 'resume', 'entitlementStorage', 'resultTiming', 'recovery'];
    const validDetails = detailKeys.every(key => {
      const value = review.details?.[key];
      return typeof value === 'boolean' || (typeof value === 'string' && value.trim() && value !== 'UNVERIFIED')
        || (Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string' && v.trim() && v !== 'UNVERIFIED'));
    });
    if (!row || productFingerprint(row) !== review.fingerprint || !review.rationale?.trim() || !validEvidence || !validDetails) {
      errors.push(`INVALID_PRODUCT_REVIEW:${id}`);
      continue;
    }
    // 검토는 E2E PASS가 아니다. 기기별 테스트 결과는 별도 증거로만 변경한다.
    row.review = 'VERIFIED';
    row.reviewEvidence = review;
    for (const key of detailKeys) row[key] = review.details[key];
  }
  return errors;
}

/**
 * 마크다운 본문에서 "레포 안의 경로를 가리키는 참조"만 뽑아내는 공유 로직.
 *
 * `verify-doc-freshness.mjs`(끊어진 링크 검사)와 `list-stale-docs.mjs`(미참조 문서 탐색)가
 * **같은 판정**을 써야 한다 — 한쪽만 고치면 "가드는 통과하는데 정리 후보로 뜨는" 문서가 생긴다.
 */

const REPO_PREFIXES = [
  'docs/',
  'app/',
  'apps/',
  'components/',
  'worker/',
  'lib/',
  'js/',
  'styles/',
  'public/',
  'scripts/',
  '__tests__/',
  '.github/',
  '.claude/',
];

const ROOT_REPO_PATHS = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'PROJECT_STRUCTURE.md',
  'PAYMENT_POLICY.md',
  'PAYMENT_CONCURRENCY_AUDIT.md',
  'CLOUDFLARE_PAGES_SETUP.md',
  'DEPLOY_CHECKLIST.md',
  'index.html',
  'package.json',
  'PhysiognomyUI.js',
  '_headers',
]);

export function normalizeRef(rawRef) {
  let ref = rawRef.trim();
  ref = ref.replace(/^["']|["']$/g, '');
  ref = ref.replace(/^\.\/+/, '');
  ref = ref.replace(/\\/g, '/');
  ref = ref.replace(/#.*$/, '');
  // 줄 참조는 `file:42` · `file:42:51` · `file:42-51` 세 형태가 모두 쓰인다.
  // 대시 범위를 빼먹으면 `lib/llm-client.ts:159-170` 이 경로째 "없는 파일"로 잡힌다(main 상시 실패였다).
  ref = ref.replace(/:[0-9]+(?:[-:][0-9]+)?$/, '');
  ref = ref.replace(/[),.;]+$/g, '');
  return ref;
}

export function looksLikeRepoPath(ref) {
  if (!ref || /\s/.test(ref)) {
    return false;
  }
  if (/^(https?:|mailto:|#)/i.test(ref)) {
    return false;
  }
  if (/^(npm|node|npx|pnpm|yarn|git|wrangler)\b/i.test(ref)) {
    return false;
  }
  if (ref.startsWith('/')) {
    return false;
  }
  if (ROOT_REPO_PATHS.has(ref)) {
    return true;
  }
  return REPO_PREFIXES.some((prefix) => ref.startsWith(prefix));
}

export function extractRefsFromLine(line) {
  const refs = [];
  const patterns = [/\]\(([^)]+)\)/g, /`([^`\n]+)`/g];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(line)) !== null) {
      const normalized = normalizeRef(match[1]);
      if (looksLikeRepoPath(normalized)) {
        refs.push(normalized);
      }
    }
  }

  return refs;
}

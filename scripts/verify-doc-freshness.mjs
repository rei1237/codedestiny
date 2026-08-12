import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const ACTIVE_DOCS = [
  'AGENTS.md',
  'docs/CURRENT_DEV_BASELINE.md',
  'CLAUDE.md',
  'docs/CONTEXT_AUDIT.md',
];

const FORBIDDEN_PREFIXES = [
  '.claude/worktrees/',
  '.codex-worktrees/',
  '.cleanup/',
  'reports/',
  'docs/performance-audit/results/',
];

const ROOT_ONE_OFF_REPORT_PATTERNS = [
  /^cleanup-[^/\\]+\.md$/i,
  /^adsense-audit-report\.[^/\\]+$/i,
  /^seo-audit-report\.[^/\\]+$/i,
];

const MAX_BASELINE_AGE_DAYS = 14;
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

function normalizeRef(rawRef) {
  let ref = rawRef.trim();
  ref = ref.replace(/^["']|["']$/g, '');
  ref = ref.replace(/^\.\/+/, '');
  ref = ref.replace(/\\/g, '/');
  ref = ref.replace(/#.*$/, '');
  ref = ref.replace(/:[0-9]+(?::[0-9]+)?$/, '');
  ref = ref.replace(/[),.;]+$/g, '');
  return ref;
}

function looksLikeRepoPath(ref) {
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

function isGlobLike(ref) {
  return ref.includes('*') || ref.includes('{') || ref.includes('}');
}

function isAllowedForbiddenContext(lines, index) {
  const context = `${lines[index - 1] || ''} ${lines[index] || ''}`.toLowerCase();
  return (
    context.includes('ignore snapshot') ||
    context.includes('exclude these paths from default reference') ||
    context.includes('unless the user explicitly asks for them')
  );
}

function extractRefsFromLine(line) {
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

async function existsWithinRepo(relPath) {
  const absPath = path.resolve(repoRoot, relPath);
  const relative = path.relative(repoRoot, absPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return false;
  }
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

function daysOldFromToday(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const curatedUtc = Date.UTC(year, month - 1, day);
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.floor((todayUtc - curatedUtc) / 86400000);
}

async function main() {
  const failures = [];
  const baselinePath = path.join(repoRoot, 'docs', 'CURRENT_DEV_BASELINE.md');
  const baselineContent = await fs.readFile(baselinePath, 'utf8');
  const curatedMatch = baselineContent.match(/^Last curated:\s*`?(\d{4}-\d{2}-\d{2})`?\s*$/m);

  if (!curatedMatch) {
    failures.push('docs/CURRENT_DEV_BASELINE.md is missing a valid `Last curated: YYYY-MM-DD` header.');
  } else {
    const ageDays = daysOldFromToday(curatedMatch[1]);
    if (ageDays > MAX_BASELINE_AGE_DAYS) {
      failures.push(
        `docs/CURRENT_DEV_BASELINE.md is stale: Last curated ${curatedMatch[1]} is ${ageDays} days old (max ${MAX_BASELINE_AGE_DAYS}).`,
      );
    }
  }

  for (const docPath of ACTIVE_DOCS) {
    const absoluteDocPath = path.join(repoRoot, docPath);
    const content = await fs.readFile(absoluteDocPath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const refs = extractRefsFromLine(lines[index]);

      for (const ref of refs) {
        for (const forbiddenPrefix of FORBIDDEN_PREFIXES) {
          if (ref.startsWith(forbiddenPrefix) && !isAllowedForbiddenContext(lines, index)) {
            failures.push(
              `${docPath}:${index + 1} references forbidden path \`${ref}\`.`,
            );
          }
        }

        if (!ref.includes('/')) {
          for (const pattern of ROOT_ONE_OFF_REPORT_PATTERNS) {
            if (pattern.test(ref)) {
              failures.push(
                `${docPath}:${index + 1} references forbidden one-off root report \`${ref}\`.`,
              );
            }
          }
        }

        if (isGlobLike(ref) || /^[A-Za-z]:\//.test(ref)) {
          continue;
        }

        const exists = await existsWithinRepo(ref);
        if (!exists) {
          failures.push(
            `${docPath}:${index + 1} references missing path \`${ref}\`.`,
          );
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error('[verify:doc-freshness] FAIL');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[verify:doc-freshness] OK');
  console.log(`- active docs checked: ${ACTIVE_DOCS.join(', ')}`);
  console.log(`- baseline freshness window: ${MAX_BASELINE_AGE_DAYS} days`);
}

main().catch((error) => {
  console.error('[verify:doc-freshness] ERROR');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

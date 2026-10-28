// Read-only by default. --write captures a review inventory, not a security verdict.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const relativePath = path => relative(root, path).replaceAll('\\', '/');
const files = new Set(['public/_worker.js', 'worker/index.js', 'worker/payments/index.js']);
// Follow real imports, including lazy and delegated route imports. No archive scans.
for (const file of files) {
  const text = readFileSync(resolve(root, file), 'utf8');
  for (const match of text.matchAll(/(?:from\s*|import\s*\()\s*["']([^"']+)["']/g)) {
    if (!match[1].startsWith('.')) continue;
    const candidate = resolve(dirname(resolve(root, file)), match[1]);
    const path = relativePath(candidate);
    if (/^worker\/(?:routes\/|yeongnyangi\/|payments\/gift-routes\.js)/.test(path) && existsSync(candidate) && statSync(candidate).isFile()) files.add(path);
  }
}
const compact = text => text.replace(/\s+/g, ' ').trim();
const groups = [];
for (const file of [...files].sort()) {
  const text = readFileSync(resolve(root, file), 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const line = node => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const calls = node => {
    const found = [];
    const visit = child => {
      if (ts.isCallExpression(child)) {
        const name = child.expression.getText(source);
        if (/^(?:handle|require|authorize|assert|validate|enforce|readJson|readBounded|runAiRoute|rewriteRequest|fetch|callGemini|withDb|connectDb|verify)/.test(name)) found.push({ name, line: line(child) });
      }
      ts.forEachChild(child, visit);
    };
    visit(node);
    return found;
  };
  const branches = [], boundaries = [];
  const visit = (node, owner = 'module') => {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) owner = node.name.getText(source);
    if (ts.isIfStatement(node) && /\b(path|pathname|routePath|method)\b/.test(node.expression.getText(source))) {
      branches.push({ line: line(node), owner, kind: 'conditional-dispatch', predicate: compact(node.expression.getText(source)), calls: calls(node.thenStatement), review: 'static evidence; conditional dominance and external callees require review' });
    }
    if (ts.isVariableDeclaration(node) && node.initializer && /\.(match|test)\(/.test(node.initializer.getText(source)) && /\b(path|pathname|routePath)\b/.test(node.initializer.getText(source))) {
      branches.push({ line: line(node), owner, kind: 'dynamic-path-matcher', predicate: compact(node.getText(source)), calls: [], review: 'matcher; not an independently registered endpoint' });
    }
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name) && /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /.test(node.name.text)) {
      const auth = ts.isObjectLiteralExpression(node.initializer) ? node.initializer.properties.find(property => property.name?.getText(source) === 'auth')?.initializer?.getText(source) : null;
      branches.push({ line: line(node), owner: node.name.text, kind: 'route-table', predicate: node.name.text, auth: auth || 'not declared here', calls: calls(node.initializer), review: 'explicit route metadata; downstream ownership remains separate' });
    }
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source);
      const categories = [];
      if (/auth|requireUser|requireAdmin|verifyJwt|verifySocialState|authorize/i.test(name)) categories.push('authentication');
      if (/owner|entitlement|access|permission|scope|claim/i.test(name)) categories.push('ownership/access');
      if (/validate|assert|readJson|readBounded|sanitize|escape/i.test(name)) categories.push('input/output');
      if (/limit|security|budget|semaphore/i.test(name)) categories.push('rate/resource');
      if (/fetch|gemini|sendMail|resend|portone|paypal|generate/i.test(name)) categories.push('external/cost candidate');
      if (/save|create|update|delete|insert|consume|spend|refund|grant|activate|withTransaction/i.test(name)) categories.push('side-effect candidate');
      if (categories.length) boundaries.push({ line: line(node), owner, name, categories });
    }
    ts.forEachChild(node, child => visit(child, owner));
  };
  visit(source);
  for (const branch of branches) {
    branch.method = branch.predicate.match(/\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g) || ['inherited or unresolved'];
    branch.authentication = branch.auth || 'follow caller and handler; not established by lexical inventory';
    branch.ownershipAndService = 'follow owner filters and service discriminators; see manual coverage matrix';
    branch.inputLimits = 'handler-specific; common readJson and selected security wrappers are bounded, not every body reader';
    branch.rateLimits = 'wrapper and action-specific; not assumed from module import';
    branch.sensitiveData = 'consultation/profile/payment routes may handle PII; field-level review status in manual matrix';
    branch.externalCallsAndEffects = branch.calls.filter(call => /fetch|generate|withDb|connectDb|handle/i.test(call.name));
  }
  groups.push({ file, sourceSha256: createHash('sha256').update(text).digest('hex'), branches, boundaryCandidates: boundaries });
}
const inventory = {
  schemaVersion: 1,
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(),
  method: 'TypeScript AST of executable entrypoints and imported route modules. Branches are exact source predicates, including aliases and method-only branches. Call names are evidence pointers, NOT proof that checks dominate every path. Regex matchers are not counted as independent routes. Unresolved dispatch/ownership must not be marked secure.',
  columns: ['entrypoint/predicate', 'method in predicate', 'owner handler', 'authentication evidence', 'ownership/service evidence', 'input/output evidence', 'rate evidence', 'external/cost and side effects', 'review status'],
  groups,
};
// Keep the review artifact compact without copying route bodies or data literals.
const output = JSON.stringify(inventory) + '\n';
if (process.argv.includes('--write')) {
  writeFileSync(resolve(root, 'docs/security/routes-20261018.json'), output);
  console.log(JSON.stringify({ groups: groups.length, branches: groups.reduce((n, group) => n + group.branches.length, 0), output: 'docs/security/routes-20261018.json' }));
} else process.stdout.write(output);

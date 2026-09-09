#!/usr/bin/env node
// Read tracked source, including standalone public assets. Never calls a provider.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const excluded = /^(?:node_modules|\.claude|\.codex|\.cleanup|reports|docs|__tests__)\//;
const verificationScript = /^scripts\/(?:verify-|audit-|test-|benchmark-|run-|check-|lib\/mock)/;
const gateways = /^(?:callLLM|callGeminiText|callGeminiJsonWithRetry)$/;
const provider = /generativelanguage\.googleapis\.com|api\.openai\.com|api\.anthropic\.com|api\.cloudflare\.com\/client\/v4\/accounts\//;
const entries = [];
for (const file of files) {
  if (excluded.test(file) || verificationScript.test(file) || !/\.(?:[cm]?js|tsx?|html)$/.test(file)) continue;
  const source = readFileSync(file, 'utf8');
  // A mirror is excluded only when its source is byte-identical.
  if (file.startsWith('public/') && files.includes(file.slice(7)) && source === readFileSync(file.slice(7), 'utf8')) continue;
  // Parse only script bodies in HTML, retaining newlines for source evidence.
  const code = file.endsWith('.html') ? (() => {
    let end = 0;
    let result = '';
    for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
      const start = match.index + match[0].indexOf('>') + 1;
      result += source.slice(end, start).replace(/[^\r\n]/g, ' ') + match[1];
      end = start + match[1].length;
    }
    return result + source.slice(end).replace(/[^\r\n]/g, ' ');
  })() : source;
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  const matches = [];
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(ast);
      const injected = (file === 'worker/routes/dream.js' && callee === 'dreamGeminiCaller')
        || (file === 'worker/lib/guardian-fortune-llm.js' && callee === 'providerCall')
        || (file === 'worker/lib/threads-ai-writer.js' && callee === 'generate');
      if (injected || gateways.test(callee) || /(?:\.AI\.run|chat\.completions\.create|responses\.create|generateContent|generateContentStream|generateText|streamText)$/.test(callee)) {
        matches.push({ line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, kind: 'call', symbol: callee });
      }
    }
    if (ts.isImportDeclaration(node) && /(?:gemini|llm-client|structured-consultation|workers-ai-rest|openai|anthropic|@ai-sdk|@google\/generative)/.test(node.moduleSpecifier.text || '')) {
      matches.push({ line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, kind: 'import-or-injected-call', symbol: node.moduleSpecifier.text });
    }
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node)) && provider.test(node.text)) {
      matches.push({ line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, kind: 'provider-url', symbol: 'direct REST' });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (matches.length) entries.push({ file, matches });
}
if (process.argv.includes('--write')) {
  writeFileSync('config/ai-locale-call-inventory.json', JSON.stringify(entries, null, 2) + '\n');
} else if (process.argv.includes('--check')) {
  const expected = JSON.parse(readFileSync('config/ai-locale-call-inventory.json', 'utf8'));
  // Line movement is harmless; new calls/imports must be reviewed and inventoried.
  const shape = rows => rows.map(({ file, matches }) => ({ file, matches: matches.map(({ kind, symbol }) => ({ kind, symbol })) }));
  if (JSON.stringify(shape(expected)) !== JSON.stringify(shape(entries))) throw new Error('LLM call inventory changed: review routes, then run audit-ai-locale-calls.mjs --write');
}
console.log(JSON.stringify({ files: entries.length, evidencePoints: entries.reduce((sum, row) => sum + row.matches.length, 0), entries: process.argv.includes('--list') ? entries : undefined }, null, 2));

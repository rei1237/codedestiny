#!/usr/bin/env node
// Only the English fallback object is generated. Korean source and all rendering behavior stay authored.
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const file = 'js/core/saju/reading-personas.js';
const source = readFileSync(file, 'utf8');
const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let englishNode;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'copy' && ts.isObjectLiteralExpression(node.initializer)) {
    englishNode = node.initializer.properties.find(property => property.name?.getText(tree) === 'en')?.initializer;
  }
  ts.forEachChild(node, visit);
}
visit(tree);
if (!englishNode) throw new Error('Expected the saju reading English copy object.');
const dictionary = JSON.parse(readFileSync('public/i18n/en.json', 'utf8')).sajuReading;
if (!dictionary || Object.keys(dictionary).length < 50) throw new Error('Missing English reading dictionary.');
function arrays(value) {
  if (!value || typeof value !== 'object') return value;
  const entries = Object.entries(value);
  if (entries.length && entries.every(([key], index) => key === String(index))) return entries.map(([, child]) => arrays(child));
  return Object.fromEntries(entries.map(([key, child]) => [key, arrays(child)]));
}
const replacement = JSON.stringify(arrays(dictionary), null, 2).replace(/\n/g, '\n    ');
const result = source.slice(0, englishNode.getStart(tree)) + replacement + source.slice(englishNode.end);
if (process.argv.includes('--check')) {
  if (source !== result) throw new Error('Run node scripts/sync-saju-reading-copy.mjs');
} else if (result !== source) writeFileSync(file, result);
console.log(`[saju-reading-copy] English fallback synchronized; ${Object.keys(dictionary).length} keys.`);

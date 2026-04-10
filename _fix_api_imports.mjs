import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPath = __dirname;

function getAllJsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...getAllJsFiles(full));
    } else if (entry.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

const apiDir = join(rootPath, 'app', 'api');
const files = getAllJsFiles(apiDir);
let fixedCount = 0;

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf8');
  if (!content.includes('"@/')) continue;

  const fileDir = dirname(filePath);
  
  const newContent = content.replace(/"@\/([^"]+)"/g, (match, capture) => {
    const targetFromRoot = join(rootPath, capture.replace(/\//g, '/'));
    let rel = relative(fileDir, targetFromRoot).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return `"${rel}"`;
  });

  if (newContent !== content) {
    writeFileSync(filePath, newContent, 'utf8');
    fixedCount++;
    console.log('Fixed:', filePath.replace(rootPath, '').replace(/\\/g, '/'));
  }
}

console.log(`\nTotal files fixed: ${fixedCount}`);

// 남은 @/ import 확인
console.log('\nRemaining @/ imports:');
for (const filePath of getAllJsFiles(apiDir)) {
  const content = readFileSync(filePath, 'utf8');
  if (content.includes('"@/')) {
    console.log('  STILL:', filePath.replace(rootPath, ''));
  }
}

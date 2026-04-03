import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(__dirname, 'public');

const OLD = '<script data-cd-noncritical-src="/js/share.js?v=2026-03-29-themefix2"></script>';
const NEW = '<script data-cd-noncritical-src="/js/share-reward.js?v=2026-04-03-v1"></script>\n<script data-cd-noncritical-src="/js/share.js?v=2026-04-03-share-reward"></script>';

const entries = fs.readdirSync(base);
let updated = 0;
for (const entry of entries) {
  const dir = path.join(base, entry);
  if (!fs.statSync(dir).isDirectory()) continue;
  const f = path.join(dir, 'index.html');
  if (!fs.existsSync(f)) continue;
  const c = fs.readFileSync(f, 'utf8');
  if (c.includes(OLD)) {
    fs.writeFileSync(f, c.replace(OLD, NEW), 'utf8');
    console.log('updated:', entry);
    updated++;
  }
}
console.log(`done — ${updated} files updated`);

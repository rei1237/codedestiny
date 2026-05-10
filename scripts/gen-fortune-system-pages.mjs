/**
 * Legacy static pages cleanup for fortune/{today,tomorrow,weekly,monthly}/{ziwei,sukuyo,vedic}.
 *
 * These HTML trees are deprecated and must not be regenerated.
 * Daily automation now relies on fortune/data JSON only.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const periods = ['today', 'tomorrow', 'weekly', 'monthly'];
const systems = ['ziwei', 'sukuyo', 'vedic'];
const bases = [
  path.join(root, 'fortune'),
  path.join(root, 'public', 'fortune'),
];

let deleted = 0;
for (const base of bases) {
  for (const period of periods) {
    for (const system of systems) {
      const target = path.join(base, period, system);
      if (!fs.existsSync(target)) continue;
      fs.rmSync(target, { recursive: true, force: true });
      deleted += 1;
      console.log('[gen-fortune-system-pages] removed:', path.relative(root, target));
    }
  }
}

console.log(`[gen-fortune-system-pages] cleanup complete. removed=${deleted}`);

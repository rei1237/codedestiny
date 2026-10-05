import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';
import { boundaryExamples } from '../lib/seo/birth-boundary-examples.mjs';
const require = createRequire(import.meta.url);
const Module = require('node:module');
const built = await build({ stdin: { contents: "export {calculateScreenSaju} from './worker/yeongnyangi/fortune/saju/runtime';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', write: false });
const filename = path.resolve('seo-birth-example-verification.cjs');
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text, filename);
for (const row of boundaryExamples.ko.rows) {
  const result = loaded.exports.calculateScreenSaju({ birthDate: '1988-01-07', birthTime: row.time, calendarType: 'solar', gender: 'female', birthPlace: { latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' } }, new Date('2026-10-05T00:00:00Z'));
  assert.deepEqual([result.yearPillar, result.monthPillar, result.dayPillar, result.hourPillar], ['丁卯', '癸丑', row.day, row.hour]);
  assert.equal(result.calculationMeta.correction.appliedMinutes, -32);
  assert.equal(result.calculationMeta.correction.dstMinutes, 0);
  const at = result.calculationMeta.corrected;
  const clock = `${String(at.hour).padStart(2, '0')}:${String(at.minute).padStart(2, '0')}`;
  assert.equal(row.corrected, `${at.day === 6 ? '전날 ' : ''}${clock}`);
  console.log(`PASS ${row.time}: ${row.day} ${row.hour}; corrected ${row.corrected}`);
}

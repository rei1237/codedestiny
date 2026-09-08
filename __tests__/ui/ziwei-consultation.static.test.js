const test = require('node:test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('Ziwei preserves chart facts and question/report contracts without network', () => {
  execFileSync(process.execPath, ['scripts/verify-ziwei-consultation.mjs'], { cwd: path.resolve(__dirname, '../..'), stdio: 'pipe' });
});

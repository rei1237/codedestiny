/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('Pages version metadata derives environment from the deployment target first', () => {
  const source = read('scripts/write-version-json.mjs');
  expect(source).toMatch(/const environment = firstNonEmpty\(\[\s*process\.env\.CD_DEPLOY_TARGET,[\s\S]{0,180}process\.env\.NODE_ENV/);
});

test('Worker version metadata reports APP_ENV while NODE_ENV remains production-safe', () => {
  const source = read('worker/index.js');
  expect(source).toContain('getEnv(env, "APP_ENV") || getEnv(env, "NODE_ENV")');

  const staging = read('worker/wrangler.staging.toml');
  expect(staging).toMatch(/^NODE_ENV = "production"$/m);
  expect(staging).toMatch(/^APP_ENV = "staging"$/m);

  const production = read('worker/wrangler.toml');
  expect(production).not.toMatch(/^APP_ENV = "staging"$/m);
});

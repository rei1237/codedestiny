import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertWorkerBindingBudget } from './lib/worker-binding-budget.mjs';

const START = '2026-11-03T15:00:00.000Z';
const END = '2027-02-03T15:00:00.000Z';
const NAMES = ['SNULIFE_STARTS_AT', 'SNULIFE_ENDS_AT', 'SNULIFE_BENEFIT_CODE'];

export async function configureSnulifePublic({ env, configText, fetchImpl = fetch }) {
  if (env.GITHUB_ACTIONS !== 'true' || env.RELEASE_MODE !== 'production') throw new Error('Public campaign configuration requires the production GitHub workflow.');
  const code = env.SNULIFE_BENEFIT_CODE || '';
  if (!/^SNU-GIFT-[A-Za-z0-9_-]{22}$/.test(code)) throw new Error('A dedicated random public code is required.');
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) throw new Error('Cloudflare production credentials are required.');
  if (env.CF_WORKER_NAME && env.CF_WORKER_NAME !== 'code-destiny-web') throw new Error('Unexpected production worker.');
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/workers/scripts/code-destiny-web/secrets`;
  const headers = { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' };
  const response = await fetchImpl(url, { headers });
  const inventory = await response.json();
  if (!response.ok || !inventory.success || !Array.isArray(inventory.result)) throw new Error('Cannot inspect existing campaign settings.');
  if (inventory.result.some(item => NAMES.includes(item.name))) throw new Error('Public campaign settings already exist; preserve them for inspection.');
  const settings = [[NAMES[0], START], [NAMES[1], END], [NAMES[2], code]];
  assertWorkerBindingBudget(configText, [...inventory.result, ...settings.map(([name]) => ({ name }))]);
  for (const [name, text] of settings) {
    const result = await fetchImpl(url, { method: 'PUT', headers, body: JSON.stringify({ name, text, type: 'secret_text' }) });
    const body = await result.json();
    if (!result.ok || !body.success) throw new Error(`Public setting failed: ${name}. Preserve partial settings for inspection.`);
  }
  return { startsAt: START, endsAt: END, limit: 1000 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await configureSnulifePublic({ env: process.env, configText: readFileSync('worker/wrangler.toml', 'utf8') });
    console.log(`SNULIFE public campaign: ${result.startsAt} to ${result.endsAt}; limit ${result.limit}.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

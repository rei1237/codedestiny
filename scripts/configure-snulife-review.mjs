import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertWorkerBindingBudget } from './lib/worker-binding-budget.mjs';

export async function configureSnulifeReview({ env, configText, now = new Date(), fetchImpl = fetch }) {
  if (env.GITHUB_ACTIONS !== 'true' || env.RELEASE_MODE !== 'production') throw new Error('Review configuration requires the production GitHub workflow.');
  const code = env.SNULIFE_REVIEW_CODE || '';
  if (!/^SNU-REVIEW-[A-Za-z0-9_-]{22}$/.test(code)) throw new Error('A dedicated random review code is required.');
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) throw new Error('Cloudflare production credentials are required.');
  if (env.CF_WORKER_NAME && env.CF_WORKER_NAME !== 'code-destiny-web') throw new Error('Unexpected production worker.');
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/workers/scripts/code-destiny-web/secrets`;
  const headers = { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' };
  const inventoryResponse = await fetchImpl(url, { headers });
  const inventory = await inventoryResponse.json();
  if (!inventoryResponse.ok || !inventory.success || !Array.isArray(inventory.result)) throw new Error('Cannot inspect existing campaign settings.');
  if (inventory.result.some(item => item.name.startsWith('SNULIFE'))) throw new Error('Campaign settings already exist; preserving the current code and period.');
  const startsAt = now.toISOString(), endsAt = new Date(now.getTime() + 14 * 86400000).toISOString();
  const settings = [['SNULIFE_REVIEW_STARTS_AT', startsAt], ['SNULIFE_REVIEW_ENDS_AT', endsAt], ['SNULIFE_REVIEW_CODE', code]];
  const budget = assertWorkerBindingBudget(configText, [...inventory.result, ...settings.map(([name]) => ({ name }))]);
  // Enable the unpredictable code last. Never configure the public campaign here.
  for (const [name, text] of settings) {
    const response = await fetchImpl(url, { method: 'PUT', headers, body: JSON.stringify({ name, text, type: 'secret_text' }) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(`Review setting failed: ${name}. Preserve partial settings for inspection.`);
  }
  return { startsAt, endsAt, limit: 3, publicCampaignEnabled: false, bindingBudget: budget };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await configureSnulifeReview({ env: process.env, configText: readFileSync('worker/wrangler.toml', 'utf8') });
    console.log(`SNULIFE_REVIEW_WINDOW ${JSON.stringify(result)}`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nSNULIFE review: ${result.startsAt} → ${result.endsAt}; 3 accounts; public campaign disabled.\n`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

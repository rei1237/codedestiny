import { readInput, envelope } from './contract.mjs';
import { verifyLicenses } from './verify-licenses.mjs';
import { blockNetwork } from './network-guard.mjs';
import { runOracle, VERSIONS } from './oracles.mjs';

const provider = process.argv[2];
let input = null;
try {
  if (process.argv.length !== 3 || !Object.hasOwn(VERSIONS, provider)) throw new Error('USAGE: node cli.mjs manseryeok|lunar-javascript|iztro|grahan < input.json');
  input = await readInput();
  verifyLicenses();
  blockNetwork();
  console.log(JSON.stringify(await runOracle(provider, input)));
} catch (error) {
  console.log(JSON.stringify(envelope(provider ?? 'unknown', VERSIONS[provider] ?? null, input, { status: 'error', reason: error.message })));
  process.exitCode = 1;
}

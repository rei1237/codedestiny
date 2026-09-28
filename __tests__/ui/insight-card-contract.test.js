const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('public cards preserve consent, ownership, expiry and privacy boundaries',()=>{
  const result=spawnSync(process.execPath,['scripts/verify-insight-cards.mjs','--unit'],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

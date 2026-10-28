import test from 'node:test';
import assert from 'node:assert/strict';
import createNextConfig from '../next.config.mjs';

test('Palm CommonJS refresh exclusion is limited to development and preserves prior exclusions',()=>{
 for(const dev of [true,false]){
  const rule={use:[{loader:'next-swc-loader'}],exclude:/node_modules/};
  const config=createNextConfig(dev?'phase-development-server':'phase-production-build');
  config.webpack({module:{rules:[{oneOf:[rule]}]}},{dev});
  assert.equal(rule.exclude('D:\\project\\lib\\palm\\palm-ui-state.js'),dev);
  assert.equal(rule.exclude('/project/lib/palm/palm-ui-state.js'),dev);
  assert.equal(rule.exclude('/project/node_modules/package/index.js'),true);
  assert.equal(rule.exclude('/project/js/core/payment-service.js'),true);
  assert.equal(rule.exclude('/project/lib/palm/interpretation-engine.ts'),false);
 }
});

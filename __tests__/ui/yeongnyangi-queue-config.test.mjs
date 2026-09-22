import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {queueConfig} from '../../scripts/prepare-yeongnyangi-queue-config.mjs';
import {compareConfigs,parseToml} from '../../scripts/verify-worker-config-parity.mjs';
test('offline queue config preserves environment isolation and bounds consumer execution',()=>{
 const prod=queueConfig('production',readFileSync('worker/wrangler.toml','utf8'));
 const stage=queueConfig('staging',readFileSync('worker/wrangler.staging.toml','utf8'));
 assert.deepEqual(compareConfigs(prod,stage),[]);
 const p=parseToml(prod),s=parseToml(stage);
 assert.equal(p.arrays['queues.producers'][0].binding,'YEONGNYANGI_QUEUE');
 assert.notEqual(p.arrays['queues.consumers'][0].queue,s.arrays['queues.consumers'][0].queue);
 assert.equal(p.arrays['queues.consumers'][0].max_batch_size,1);
 assert.equal(p.arrays['queues.consumers'][0].max_retries,5);
 assert.equal(p.arrays['queues.consumers'][0].max_concurrency,2);
 assert.throws(()=>queueConfig('production',prod));
 assert.ok(compareConfigs(prod,stage.replaceAll('yeongnyangi-consultation-staging','yeongnyangi-consultation-production')).length>0);
});

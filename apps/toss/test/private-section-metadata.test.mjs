import test from 'node:test';
import assert from 'node:assert/strict';
import metadata from '../private-simulation/section-metadata.mjs';
import {COMPASS_SECTIONS} from '../../../worker/lib/destiny-compass-report-contract.js';
test('private compass gets original chapter order and labels without server dependencies',async()=>{
 const plugin=metadata(),id=plugin.resolveId('../../../../worker/lib/destiny-compass-report-contract.js','/repo/apps/toss/test/offline/compass.mjs');
 const source=await plugin.load(id),exports=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 assert.deepEqual(exports.COMPASS_SECTIONS,COMPASS_SECTIONS.map(({key,title})=>({key,title})));
 assert.equal(plugin.resolveId('../../../../worker/lib/destiny-compass-report-contract.js','/repo/worker/production.js'),undefined);
});

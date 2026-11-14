import test from 'node:test';
import assert from 'node:assert/strict';
import privateYogaReader from '../private-simulation/yoga-reader.mjs';
import {yogaReader} from '../canonical/yoga-course.mjs';
test('private reader preserves canonical HTML and the sandbox without relaxing shell script CSP',()=>{
 const plugin=privateYogaReader();let asset;
 const code=plugin.load.call({emitFile:value=>{asset=value;return 'abc';}},plugin.resolveId('virtual:toss-yoga-reader'));
 assert.equal(asset.source,yogaReader());assert.equal(asset.fileName,'assets/private-yoga-reader.html');assert.equal(code,'export default import.meta.ROLLUP_FILE_URL_abc;');
 assert.equal(plugin.transform('<iframe sandbox="allow-scripts" srcDoc={reader}/>','/repo/apps/toss/src/YogaGuru.tsx'),'<iframe sandbox="allow-scripts" src={reader}/>');
 assert.equal(plugin.transform('other','/repo/app/yoga.tsx'),undefined);
});

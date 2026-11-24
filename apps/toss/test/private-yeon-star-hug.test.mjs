import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {privateStarHugChart} from '../private-simulation/star-hug-chart.mjs';
import example from '../private-simulation/star-hug-chart.json' with {type:'json'};
import {clearStarHugSession,isStarHugSession,starHugScope} from '../service/yeon-star-session.mjs';
import {snapshotKey} from '../../../lib/guided-flow/step-controller.mjs';
test('precise profile mock accepts the captured ephemeris input and rejects a different birth',async()=>{
 const captured=await privateStarHugChart(example.input).json();
 assert.equal(captured.ok,true);assert.equal(captured.source,'swiss-wasm-local');
 assert.ok(captured.planets.Sun&&captured.planets.Moon);
 assert.equal(privateStarHugChart({...example.input,minute:34}).status,422);
});
test('owner-specific re-entry and unlink affect only that owner',()=>{
 const a=starHugScope('PersonA'),b=starHugScope('PersonB');
 const draft=JSON.stringify({version:1,answers:{emotion:'calm'}});
 const result=JSON.stringify({version:1,consultation:{sign:'양자리'},reading:{displayCard:{}}});
 const values=new Map([[snapshotKey(a),draft],[a+':result',result],[snapshotKey(b),draft]]);
 for(const [key,raw] of values)assert.equal(isStarHugSession(key,raw),true);
 assert.equal(isStarHugSession('other:key',draft),false);
 clearStarHugSession({removeItem:key=>values.delete(key)},'PersonA');
 assert.deepEqual([...values.keys()],[snapshotKey(b)]);
});

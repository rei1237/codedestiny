import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync,strFromU8} from 'fflate';
import {packedNamingData} from '../private-simulation/compressed-naming-data.mjs';
for(const name of ['hanja-pool','name-usage'])test('packed original naming '+name+' preserves every field and row',async()=>{
 const source=await readFile(new URL('../../../worker/naming-engine/data/'+name+'.v1.json',import.meta.url),'utf8');
 const packed=packedNamingData(source);
 assert.deepEqual(JSON.parse(strFromU8(gunzipSync(Uint8Array.from(atob(packed),c=>c.charCodeAt(0))))),JSON.parse(source));
 assert.ok(packed.length<Buffer.byteLength(source)*0.5);
});

test('packed annual examples preserve original calculation results for every account and year',async()=>{
 const source=await readFile(new URL('../private-simulation/sukuyo-yearly-examples.json',import.meta.url),'utf8');
 const packed=packedNamingData(source);
 assert.deepEqual(JSON.parse(strFromU8(gunzipSync(Uint8Array.from(atob(packed),c=>c.charCodeAt(0))))),JSON.parse(source));
 assert.ok(packed.length<Buffer.byteLength(source)*0.2);
});

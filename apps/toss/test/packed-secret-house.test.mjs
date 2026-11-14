import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync,strFromU8} from 'fflate';
import serviceCompat from '../service/vite-service.mjs';
import {secretHouseDocument} from '../service/secret-house-loader.mjs';

test('packed Secret House retains the complete original document and message boundary',async()=>{
 const plugin=serviceCompat();
 const code=await plugin.load.call({addWatchFile(){}},plugin.resolveId('virtual:secret-house-page'));
 const packed=JSON.parse(/atob\(("[A-Za-z0-9+/=]+")\)/.exec(code)[1]);
 const source=await readFile(new URL('../../../public/secret-house_real.html',import.meta.url),'utf8');
 const original=secretHouseDocument(source);
 assert.equal(strFromU8(gunzipSync(Buffer.from(packed,'base64'))),original);
 assert.match(original,/event.source!==parent/);
 assert.ok(Buffer.byteLength(code)<Buffer.byteLength(original));
 console.log('Secret House module bytes',Buffer.byteLength(JSON.stringify(original)), '→',Buffer.byteLength(code));
});

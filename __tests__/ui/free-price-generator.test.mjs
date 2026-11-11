import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const generator=path.resolve('scripts/sync-flower-price-copy.mjs');
test('official flower price generator keeps exact free badges at zero across repeated syncs and preserves paid prices',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cd-free-price-'));
 fs.mkdirSync(path.join(root,'js/core'),{recursive:true});fs.mkdirSync(path.join(root,'public/i18n'),{recursive:true});
 const registry='const cards=[{id:"neo-operation-room",featureKey:"neo-operation-room-consultation",price:"30,000원"},{id:"flower",featureKey:"flower-fc",price:"5,000원"}];';
 fs.writeFileSync(path.join(root,'js/core/service-registry.js'),registry);
 const freeKeys=['flower-fc','olympus-fc','destiny-bias-analyze','vedic-compatibility-per-use'];
 fs.writeFileSync(path.join(root,'index.html'),freeKeys.map(key=>`<button data-feature-key="${key}" data-tile-lock-cost="50"><span class="tarot-tile__coin-badge" data-cd-price-key="${key}" data-price-krw="5000" data-cd-trans="oldPaid">해금 5,000원</span></button>`).join('')+'<span class="tarot-tile__coin-badge" data-cd-price-key="neo-operation-room-consultation" data-price-krw="30000">30,000원</span>');
 execFileSync(process.execPath,[generator],{cwd:root});const once=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.equal((once.match(/data-tile-lock-cost="0"/g)||[]).length,4);assert.equal((once.match(/data-price-krw="0"/g)||[]).length,4);assert.equal((once.match(/>무료<\/span>/g)||[]).length,4);assert.ok(once.includes('30,000원'));assert.ok(!once.includes('oldPaid'));
 assert.equal(fs.readFileSync(path.join(root,'js/core/service-registry.js'),'utf8'),registry);
 execFileSync(process.execPath,[generator],{cwd:root});assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8'),once);
 // Keep the isolated fixture for inspection; never touch repository mirrors or historical billing registries.
});

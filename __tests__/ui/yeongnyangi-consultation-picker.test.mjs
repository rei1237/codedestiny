import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const read=path=>fs.readFileSync(new URL('../../app/yeongnyangi/'+path,import.meta.url),'utf8');
test('premium standard web picker preserves existing selection, spirit and checkout paths',()=>{
 const source=read('_components/Consultation.tsx');
 assert.match(source,/premiumPicker=paymentSurface==='web'&&!sajuOnly&&!questionActive/);
 assert.match(source,/aria-pressed=\{domain===id\} onClick=\{\(\)=>chooseDomain\(id\)\}/);
 assert.match(source,/aria-pressed=\{kind.id===item.id\} onClick=\{\(\)=>chooseKind\(item.id\)\}/);
 assert.match(source,/mode=spirit&lang=\$\{siteLocale\}/);
 assert.match(source,/id="consultation-time-unknown" type="checkbox" checked=\{timeUnknown\}/);
 assert.match(source,/onClick=\{\(\)=>void prepare\(\)\}/);
});
test('only the selected ready profile may render an allowlisted companion image',()=>{
 const source=read('_components/ProfilePicker.tsx');
 assert.match(source,/premium&&!state.guest&&!state.loading&&!state.error&&selected&&account/);
 assert.match(source,/encodeURIComponent\(avatarId\)/);
 assert.match(source,/petArtUrl\(data.pet.speciesId\)/);
 assert.match(source,/avatar.account===account&&avatar.id===avatarId&&profileKey\(profile\)===avatarId/);
 assert.match(source,/retryOn401:false/);
 assert.match(source,/controller.abort\(\)/);
 assert.match(source,/event.currentTarget.hidden=true/);
});

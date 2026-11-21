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
 assert.match(source,/premium&&loadProfilePetArt&&!state.guest&&!state.loading&&!state.error&&selected&&account/);
 assert.match(source,/encodeURIComponent\(avatarId\)/);
 assert.match(source,/petArtUrl\(data.pet.speciesId\)/);
 assert.match(source,/avatar.account===account&&avatar.id===avatarId&&profileKey\(profile\)===avatarId/);
 assert.match(source,/retryOn401:false/);
 assert.match(source,/controller.abort\(\)/);
 assert.match(source,/event.currentTarget.hidden=true/);
});
test('web entry supplies the canonical portrait loader without putting the wardrobe in the shared consultation graph',()=>{
 const entry=read('_components/Experience.tsx');
 const consultation=read('_components/Consultation.tsx');
 const picker=read('_components/ProfilePicker.tsx');
 assert.match(entry,/const loadProfilePetArt=async\(\)=>\(await import\('@\/js\/core\/profile-pet\.mjs'\)\)\.petArtUrl/);
 assert.match(entry,/<Consultation [^>]*loadProfilePetArt=\{loadProfilePetArt\}/);
 assert.match(consultation,/loadProfilePetArt=\{premiumPicker\?loadProfilePetArt:undefined\}/);
 assert.doesNotMatch(consultation+picker,/profile-pet\.mjs/);
 assert.match(picker,/const petArtUrl=await loadProfilePetArt\(\)/);
 assert.match(picker,/if\(!avatarId\|\|!loadProfilePetArt\)return/);
 assert.match(picker,/controller\.signal\.aborted\|\|readDestinyProfileAccountId\(\)!==account/);
 assert.match(picker,/data\?\.ok===true&&!data\.degraded&&typeof data\?\.pet\?\.speciesId==='string'/);
});

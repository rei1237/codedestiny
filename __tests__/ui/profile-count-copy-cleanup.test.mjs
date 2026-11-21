import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const root=new URL('../../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const locale=['ko','en','ja','zh-cn','zh-tw','vi','hi','es','fr','de','nl','ms'];
test('the saved-profile picker no longer advertises any pass or profile-count benefit',()=>{
 for (const file of ['consultation-input-copy','consultation-input-locales']) {
  assert.doesNotMatch(read(`app/yeongnyangi/_lib/${file}.ts`),/\bfamily:/);
 }
 const picker=read('app/yeongnyangi/_components/ProfilePicker.tsx');
 assert.doesNotMatch(picker,/showPolicyNote|copy\.family/);
 assert.match(picker,/state\.select\(profileKey\(profile\)\)/);
});
test('obsolete profile-count sales labels and runtime message are absent in all twelve languages',()=>{
 for (const lang of locale) {
  const dictionary=JSON.parse(read(`public/i18n/${lang}.json`));
  assert.doesNotMatch(JSON.stringify(dictionary),/"profile(?:Unlimited|Limit)":/);
  const shell=JSON.parse(read(`public/i18n/${lang}/shellRuntime.json`));
  assert.equal(Object.hasOwn(shell.shellRuntime,'s757'),false,lang);
 }
 for (const file of ['.rest','authored/shellRuntime-17','pending/shellRuntime.ko']) {
  assert.equal(Object.hasOwn(JSON.parse(read(`i18n/${file}.json`)),'shellRuntime.s757'),false,file);
 }
});
test('legacy profile JavaScript mirror retains recovery behavior, without upgrade prompts',()=>{
 const source=read('js/destiny-profile.js');
 assert.equal(read('public/js/destiny-profile.js'),source);
 assert.doesNotMatch(source,/다시 여러 프로필|추가 이용권 결제 전까지|사용할 프로필 카드 1개|이용권 혜택 종료 후 확정한 프로필/);
 assert.match(source,/_dpCommitSingleProfileSelection\(profileId/);
 assert.match(source,/function _dpGetMaxProfiles\(\) \{\s*return 0;/);
});

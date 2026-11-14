import test from 'node:test';
import assert from 'node:assert/strict';
import {neoPartnerInput,neoPartnerResult,sameNeoPartnerInput} from './offline/neo-partner-fixture.mjs';
const input={topic:'연애 / 재회',relationshipStatus:'reconciling',partnerBirthInput:{birthDate:'1992-02-02',gender:'male',birthTimeUnknown:true}};
for(const method of ['saju','ziwei','vedic','astrology'])test('Neo partner '+method+' preserves four original chapter shapes without fabricated scores',()=>{
 const source={...input,method},result=neoPartnerResult(source);
 assert.equal(result.session.relationshipMode,'compat');assert.equal(result.session.relationshipStatus,'reconciling');assert.equal(result.session.partnerBirthTimeUnknown,true);
 assert.deepEqual(Object.keys(result.sections),['mutualRead','palaceCross','conflictPattern','relationStrategy']);assert.equal(result.session.compatScores,undefined);
 assert.ok(sameNeoPartnerInput(source,{...source,partnerBirthInput:{gender:'male',birthTimeUnknown:true,birthDate:'1992-02-02'}}));
 assert.ok(!sameNeoPartnerInput(source,{...source,relationshipStatus:'dating'}));
 assert.ok(!sameNeoPartnerInput(source,{...source,partnerBirthInput:{...input.partnerBirthInput,birthDate:'1993-02-02'}}));
 assert.equal(neoPartnerInput({...source,topic:'직업 / 이직'}),null);
 assert.equal(neoPartnerResult({...source,partnerBirthInput:undefined}).session.relationshipMode,'solo');
});

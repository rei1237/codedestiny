import test from 'node:test';
import assert from 'node:assert/strict';
import {generateTarotLibraryResult} from '../private-simulation/free-tarot-generator.mjs';
test('the private free generator rejects paid flows before any database or model access',async()=>{
 for(const id of ['tarot-prompt-maker','tarot-celestial-harmony','tarot-love-relationship','tarot-mindscan','unknown'])await assert.rejects(generateTarotLibraryResult(id,{}),/TAROT_VERIFIED_ORDER_REQUIRED/);
});

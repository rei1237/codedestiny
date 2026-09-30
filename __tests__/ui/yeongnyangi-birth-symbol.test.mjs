import test from 'node:test';
import assert from 'node:assert/strict';
import {birthSymbol,BIRTH_SYMBOL_VERSION} from '../../lib/tarot/yeongnyangi-birth-symbol.mjs';

test('versioned RWS birth symbol uses all eight Gregorian digits',()=>{
 assert.deepEqual(birthSymbol('2000-01-01'),{version:BIRTH_SYMBOL_VERSION,number:4,name:'황제',cardCode:'M04'});
 assert.deepEqual(birthSymbol('1990-01-02'),{version:BIRTH_SYMBOL_VERSION,number:0,name:'바보',cardCode:'M00'});
 assert.deepEqual(birthSymbol('1988-01-07'),{version:BIRTH_SYMBOL_VERSION,number:7,name:'전차',cardCode:'M07'});
 assert.equal(birthSymbol('2004-01-01')?.name,'힘');
 assert.equal(birthSymbol('2007-01-01')?.name,'정의');
});
test('rejects missing, invalid and overflow dates without timezone conversion',()=>{
 for(const value of ['',undefined,'2001-02-29','2024-02-30','2023-13-01','0000-01-01','2024-2-1'])assert.equal(birthSymbol(value),null);
 assert.ok(birthSymbol('2024-02-29'));
});

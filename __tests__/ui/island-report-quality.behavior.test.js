const test=require('node:test'),assert=require('node:assert/strict');
test('all twelve palace schemas retain their original sections with a 20000 body budget',async()=>{
 const {PALACE_KEYS,getPalaceConfig}=await import('../../worker/lib/island/consult/palace-prompts.js');
 const {palaceParts,palaceResult}=await import('../../worker/lib/island/consult/palace-delivery.js');
 for(const key of PALACE_KEYS){const parts=palaceParts(key);assert.ok(parts.reduce((n,p)=>n+p.minChars,0)>=20000);assert.equal(parts.length,getPalaceConfig(key).sections.length*2);assert.deepEqual(Object.keys(palaceResult({palaceKey:key},{},{}).sections),getPalaceConfig(key).sections.map(([k])=>k));}
 assert.equal(PALACE_KEYS.length,12);
});
test('19999/20000 body boundary excludes headings, whitespace and markup; evidence key order is immaterial',async()=>{
 const {validPalacePart}=await import('../../worker/lib/island/consult/palace-delivery.js');
 const evidence={palace:'명궁',mainStars:[],daeun:''},part={minChars:20000};
 assert.equal(validPalacePart({body:'# 제목\n'+ '가'.repeat(19999),evidence},part,evidence),false);
 assert.equal(validPalacePart({body:'# 제목\n'+ '가'.repeat(20000),evidence:{daeun:'',mainStars:[],palace:'명궁'}},part,evidence),true);
 assert.equal(validPalacePart({body:'가'.repeat(20000),evidence:{...evidence,daeun:'invented'}},part,evidence),false);
 const text=('서로 같은 문장을 의미 없이 아주 길게 반복해서 분량을 채우면 제대로 생성된 상담이 아닙니다.').repeat(1000);
 assert.equal(validPalacePart({body:text,evidence},part,evidence),false);
});

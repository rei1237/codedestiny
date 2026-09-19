const test=require('node:test'),assert=require('node:assert/strict');
test('all twelve palace schemas retain their original sections with a 20000 body budget',async()=>{
 const {PALACE_KEYS,getPalaceConfig}=await import('../../worker/lib/island/consult/palace-prompts.js');
 const {palaceParts,palaceResult}=await import('../../worker/lib/island/consult/palace-delivery.js');
 for(const key of PALACE_KEYS){const parts=palaceParts(key);assert.ok(parts.reduce((n,p)=>n+p.minChars,0)>=20000);assert.equal(parts.length,getPalaceConfig(key).sections.length*2);assert.deepEqual(Object.keys(palaceResult({palaceKey:key},{},{}).sections),getPalaceConfig(key).sections.map(([k])=>k));}
 assert.equal(PALACE_KEYS.length,12);
});
test('19999/20000 body boundary excludes headings, whitespace and markup; evidence key order is immaterial',async()=>{
 const {validPalacePart}=await import('../../worker/lib/island/consult/palace-delivery.js');
 const evidence={palace:'명궁',mainStars:['자미'],daeun:''},part={minChars:20000},anchors=['자미'];
 assert.equal(validPalacePart({body:'# 제목\n자미'+ '가'.repeat(19997),evidence},part,evidence,{},anchors),false);
 assert.equal(validPalacePart({body:'# 제목\n자미'+ '가'.repeat(19998),evidence:{daeun:'',mainStars:['자미'],palace:'명궁'}},part,evidence,{},anchors),true);
 assert.equal(validPalacePart({body:'자미'+ '가'.repeat(19998),evidence:{...evidence,daeun:'invented'}},part,evidence,{},anchors),false);
 const text=('자미를 걸어두고 서로 같은 문장을 의미 없이 아주 길게 반복해서 분량을 채우면 제대로 생성된 상담이 아닙니다.').repeat(1000);
 assert.equal(validPalacePart({body:text,evidence},part,evidence,{},anchors),false);
});
// 인용할 계산 근거가 없으면 분량·중복 기준을 모두 만족해도 통과시키지 않는다. 예전에는 대상 궁 주성이 비면
// (실명반의 15.9%를 차지하는 무주성) 근거 대조가 통째로 꺼져, 명반에 없는 별만 쓴 본문도 유료 완주했다.
test('인용할 계산 근거가 없으면 분량을 채워도 통과하지 않는다(fail-closed)',async()=>{
 const {validPalacePart,palaceAnchorStars}=await import('../../worker/lib/island/consult/palace-delivery.js');
 const evidence={palace:'명궁',mainStars:[],daeun:''},part={minChars:20000};
 assert.equal(validPalacePart({body:'# 제목\n'+ '가'.repeat(20000),evidence},part,evidence,{},[]),false);
 assert.equal(validPalacePart({body:'# 제목\n천기'+ '가'.repeat(19998),evidence},part,evidence,{},['천기']),true);
 const chart={palaces:[{name:'명궁',mainStars:[]},{name:'재백궁',mainStars:['무곡']}],sanFangSiZheng:{byPalace:{명궁:{mainStars:['천기','천기','태음']}}}};
 assert.deepEqual(palaceAnchorStars('명궁',chart),['천기','태음']);
 assert.deepEqual(palaceAnchorStars('재백궁',chart),['무곡']);
 assert.deepEqual(palaceAnchorStars('관록궁',chart),[]);
});

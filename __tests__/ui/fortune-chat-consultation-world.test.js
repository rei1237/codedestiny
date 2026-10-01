const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('app/fortune-chat/consultation-world.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{}};vm.runInNewContext(source,context);
const {RESULT_ORDER,SECTION_LABEL,EMPTY_ROWS,showRow,refreshRow,DOMAIN_ART,MOMENT_ART,poseFor}=context.exports;
const yeoni={id:'y1',persona:'yeoni',state:'COMPLETED'};
const neo={id:'n1',persona:'neo',state:'GENERATING'};

test('yeoni keeps the stage 2 order; neo leads with the verdict, then what to do',()=>{
  assert.deepEqual([...RESULT_ORDER.yeoni],['core','summary','evidence','flow','timing','action']);
  assert.deepEqual([...RESULT_ORDER.neo],['core','action','timing','evidence','flow','summary']);
  assert.equal(SECTION_LABEL.neo.core,'핵심 판단');
  for(const who of ['yeoni','neo'])assert.deepEqual([...RESULT_ORDER[who]].sort(),['action','core','evidence','flow','summary','timing']);
});

test('switching persona keeps the other persona result',()=>{
  const rows=showRow(showRow(EMPTY_ROWS,yeoni),neo);
  assert.equal(rows.yeoni,yeoni);assert.equal(rows.neo,neo);
  assert.equal(EMPTY_ROWS.yeoni,null);
});

test('a late response never revives a closed or replaced consultation',()=>{
  const rows=showRow(EMPTY_ROWS,neo);
  const done={...neo,state:'COMPLETED'};
  assert.equal(refreshRow(rows,done).neo,done);
  assert.equal(refreshRow({...rows,neo:null},done).neo,null);
  assert.equal(refreshRow(rows,{...done,id:'n0'}),rows);
  assert.equal(refreshRow(rows,{...yeoni}).yeoni,null);
});

test('every persona has its own art for each fortune domain and room moment, and the files ship',()=>{
  const domains=['saju','ziwei','sukuyo','vedic','astrology'];
  for(const who of ['yeoni','neo']){
    assert.deepEqual(Object.keys(DOMAIN_ART[who]).sort(),[...domains].sort());
    assert.deepEqual(Object.keys(MOMENT_ART[who]).sort(),['empty','error','loading']);
    const srcs=[...Object.values(DOMAIN_ART[who]).map((a)=>a.src),...Object.values(MOMENT_ART[who])];
    for(const src of srcs)assert.ok(fs.existsSync('public'+src),src);
    for(const a of Object.values(DOMAIN_ART[who]))assert.ok(a.alt.length>0);
  }
  assert.notEqual(DOMAIN_ART.yeoni.saju.src,DOMAIN_ART.neo.saju.src);
});

test('the consultant pose follows the consultation stage',()=>{
  assert.equal(poseFor(null),'greet');
  assert.equal(poseFor(null,{drafting:true}),'listen');
  assert.equal(poseFor({state:'CREATED',paid:false}),'listen');
  assert.equal(poseFor({state:'GENERATING',paid:true}),'read');
  assert.equal(poseFor({state:'COMPLETED',paid:true}),'cheer');
  assert.equal(poseFor({state:'REFUNDED',paid:true}),'think');
  assert.equal(poseFor({state:'COMPLETED',paid:true},{failed:true}),'think');
});

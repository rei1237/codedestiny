const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('app/fortune-chat/consultation-world.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{}};vm.runInNewContext(source,context);
const {RESULT_ORDER,SECTION_LABEL,EMPTY_ROWS,showRow,refreshRow}=context.exports;
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

import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {recordService} from '../../lib/records/service-registry.js';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{build,transform}=require('esbuild'),ts=require('typescript');
const source=await readFile(new URL('../../app/fortune-tea-house/FortuneTeaHouseClient.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('FortuneTeaHouseClient.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const component=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='FortuneTeaHouseClient');assert.ok(component);
// Run the production selector/markup; replace only hooks and heavy scene leaves.
const helper=ts.transpileModule(await readFile(new URL('../../lib/fortune/yeoni-entry.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {teaHouseSurface,YEONI_TEA_HOUSE}=await import('data:text/javascript;base64,'+Buffer.from(helper).toString('base64'));
const built=await transform(`export function check(React,useState,useEffect,recordService,FortuneTeaHousePage,SavedTeaReading,FortuneChatEntry,teaHouseSurface,YEONI_TEA_HOUSE,ConsultationEntrance,props){const Suspense=React.Suspense,useLocale=()=>"ko",recordsCopy=()=>({hub:"상담",title:"보관함"}),styles={};${component.getText(ast).replace('export default ','')}return React.createElement(FortuneTeaHouseClient,props);}`,{loader:'tsx',format:'esm',jsx:'transform'});
const {check}=await import('data:text/javascript;base64,'+Buffer.from(built.code).toString('base64'));
const entranceSource=await readFile(new URL('../../app/fortune-chat/ConsultationEntrance.tsx',import.meta.url),'utf8');
const entranceAst=ts.createSourceFile('ConsultationEntrance.tsx',entranceSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const entranceComponent=entranceAst.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='ConsultationEntrance');
assert.ok(entranceComponent);
const welcomeSource=await readFile(new URL('../../app/fortune-chat/YeoniWelcome.tsx',import.meta.url),'utf8');
const welcomeAst=ts.createSourceFile('YeoniWelcome.tsx',welcomeSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const welcomeComponent=welcomeAst.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='YeoniWelcome');
assert.ok(welcomeComponent);
const artModule=ts.transpileModule(await readFile(new URL('../../lib/brand/yeoni-guide-art.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {YEONI_GUIDE_ART}=await import('data:text/javascript;base64,'+Buffer.from(artModule).toString('base64'));
// Render the real welcome markup and asset registry; only replace Next's image transport.
const entranceBuilt=await transform(`export function create(React,YEONI_GUIDE_ART){const styles={},Image=({priority,...props})=>React.createElement('img',props);${welcomeComponent.getText(welcomeAst).replace('export default ','')}${entranceComponent.getText(entranceAst).replace('export default ','')}return ConsultationEntrance;}`,{loader:'tsx',format:'esm',jsx:'transform'});
const {create}=await import('data:text/javascript;base64,'+Buffer.from(entranceBuilt.code).toString('base64'));
const ConsultationEntrance=create(React,YEONI_GUIDE_ART);
function render(state,props={}){let native=0,saved=0,chat=0;const element=check(React,state===undefined?React.useState:()=>[state,()=>{}],React.useEffect,recordService,()=>{native++;return React.createElement('h1',null,'New consultation');},({resultId})=>{saved++;return React.createElement('h1',null,resultId);},()=>{chat++;return React.createElement('h1',null,'Question consultation');},teaHouseSurface,YEONI_TEA_HOUSE,ConsultationEntrance,props);return {html:renderToStaticMarkup(element),native,saved,chat};}
test('SSR has one real service heading without mounting generation or a saved reader',()=>{const r=render();assert.equal((r.html.match(/<h1\b/g)||[]).length,1);assert.match(r.html,/<h1 id="yeoni-welcome-title">마음에 남은 이야기,/);assert.ok(r.html.includes(YEONI_GUIDE_ART.welcome.src));assert.match(r.html,/aria-busy="true"/);assert.equal(r.native,0);assert.equal(r.saved,0);});
test('resolved saved ID mounts only the saved result reader',()=>{const r=render('?resultId=owned-saved-fixture');assert.equal(r.native,0);assert.equal(r.saved,1);assert.equal(r.chat,0);assert.ok(r.html.includes('owned-saved-fixture'));});
test('resolved new entry mounts the existing consultation scene',()=>{const r=render('');assert.equal(r.native,1);assert.equal(r.saved,0);});
test('letter entry and old checkout URL mount only the shared chat',()=>{for(const [query,props] of [['?counsel=letter',{}],['?session=saved',{}],['?paymentId=paid',{legacyChat:true}]]){const r=render(query,props);assert.equal(r.chat,1);assert.equal(r.native,0);assert.equal(r.saved,0);}});
test('saved tea ID takes precedence over an old letter selection',()=>{const r=render('?resultId=owned-saved-fixture&counsel=letter');assert.equal(r.saved,1);assert.equal(r.chat,0);assert.equal(r.native,0);});

test('publisher guide is server rendered but omitted from chat and saved reading surfaces',()=>{
  const props={children:React.createElement('section',null,'Publisher guide fixture')};
  assert.match(render(undefined,props).html,/Publisher guide fixture/);
  assert.match(render('',props).html,/Publisher guide fixture/);
  for(const query of ['?counsel=letter','?session=saved','?resultId=owned-saved-fixture']){
    assert.doesNotMatch(render(query,props).html,/Publisher guide fixture/);
  }
});

test('the route-owned landing is selected only after a new landing URL is resolved',()=>{
  const props={landing:React.createElement('section',null,'Route-owned landing fixture')};
  assert.doesNotMatch(render(undefined,props).html,/Route-owned landing fixture/);
  assert.match(render('',props).html,/Route-owned landing fixture/);
  assert.equal(render('',props).native,0);
  for(const [query,extra] of [['?resultId=owned-saved-fixture',{}],['?counsel=letter',{}],['',{legacyChat:true}]]){
    assert.doesNotMatch(render(query,{...props,...extra}).html,/Route-owned landing fixture/);
  }
});

test('compatibility chat does not download the unused tea controller in its initial graph',async()=>{
  const {metafile}=await build({entryPoints:['app/fortune-chat/FortuneChatCompatibility.tsx'],bundle:true,splitting:true,outdir:'.tmp/tea-entry-payload-test',platform:'browser',format:'esm',packages:'external',write:false,metafile:true,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},logLevel:'silent'});
  const outputs=metafile.outputs,visited=new Set(),inputs=new Set();
  function visit(file){if(visited.has(file))return;visited.add(file);const output=outputs[file];assert.ok(output);Object.keys(output.inputs).forEach(input=>inputs.add(input));for(const dependency of output.imports)if(!dependency.external&&dependency.kind!=='dynamic-import')visit(dependency.path);}
  visit(Object.keys(outputs).find(file=>outputs[file].entryPoint==='app/fortune-chat/FortuneChatCompatibility.tsx'));
  const controller='src/features/fortune-tea-house/FortuneTeaHousePage.tsx';
  assert.equal(inputs.has(controller),false,'chat loads its own selected surface first');
  assert.ok(Object.values(outputs).some(output=>output.entryPoint===controller),'older tea-entry URLs still retain their on-demand controller');
});

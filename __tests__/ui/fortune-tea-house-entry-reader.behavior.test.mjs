import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {recordService} from '../../lib/records/service-registry.js';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{transform}=require('esbuild'),ts=require('typescript');
const source=await readFile(new URL('../../app/fortune-tea-house/FortuneTeaHouseClient.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('FortuneTeaHouseClient.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const component=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='FortuneTeaHouseClient');assert.ok(component);
// Run the production selector/markup; replace only hooks and heavy scene leaves.
const built=await transform(`export function check(React,useState,useEffect,recordService,FortuneTeaHousePage,SavedTeaReading){${component.getText(ast).replace('export default ','')}return React.createElement(FortuneTeaHouseClient);}`,{loader:'tsx',format:'esm',jsx:'transform'});
const {check}=await import('data:text/javascript;base64,'+Buffer.from(built.code).toString('base64'));
function render(state){let native=0,saved=0;const element=check(React,()=>[state,()=>{}],()=>{},recordService,()=>{native++;return React.createElement('h1',null,'New consultation');},({resultId})=>{saved++;return React.createElement('h1',null,resultId);});return {html:renderToStaticMarkup(element),native,saved};}
test('SSR has one real service heading without mounting generation or a saved reader',()=>{const r=render(null);assert.equal((r.html.match(/<h1\b/g)||[]).length,1);assert.ok(r.html.includes(recordService('tea').name));assert.equal(r.native,0);assert.equal(r.saved,0);});
test('resolved saved ID mounts only the saved result reader',()=>{const r=render('owned-saved-fixture');assert.equal(r.native,0);assert.equal(r.saved,1);assert.ok(r.html.includes('owned-saved-fixture'));});
test('resolved new entry mounts the existing consultation scene',()=>{const r=render('');assert.equal(r.native,1);assert.equal(r.saved,0);});

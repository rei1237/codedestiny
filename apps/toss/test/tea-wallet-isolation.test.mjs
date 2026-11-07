import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../package.json',import.meta.url)),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');

const file=path.resolve(import.meta.dirname,'../../../src/features/fortune-tea-house/FortuneTeaHousePage.tsx');
const tree=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='refreshHoneyDrops'&&ts.isCallExpression(node.initializer))callback=node.initializer.arguments[0].getText(tree);ts.forEachChild(node,visit);}
visit(tree);assert.ok(callback);
const source=ts.transpileModule('('+callback+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
test('Toss never reads the web honey balance while web retains its original request',async()=>{
 for(const surface of ['toss','web']){let calls=0;const context={paymentSurface:surface,authFetch:async()=>{calls++;return {ok:false};}};const refresh=vm.runInNewContext(source,context);assert.equal(await refresh(),false);assert.equal(calls,surface==='web'?1:0);}
});
test('the saved tea result does not display the web-only honey letter offer in Toss',()=>{
 const resultFile=path.resolve(import.meta.dirname,'../../../src/features/fortune-tea-house/components/TeaHouseResultSheet.tsx'),ast=ts.createSourceFile(resultFile,fs.readFileSync(resultFile,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 function find(node){if(ts.isJsxExpression(node)&&node.expression?.getText(ast).includes('styles.honeyLetterBlock'))expression=node.expression;else ts.forEachChild(node,find);}find(ast);assert.ok(expression);
 const code=ts.transpileModule(`function render(){return (${expression.getText(ast)});}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
 const render=paymentSurface=>{const context={React,paymentSurface,styles:{},copy:{honeyCount:'{count}개',honeyBalanceLine:'보유 꿀방울: {count}개',kykvjtg8:'편지'},result:{},honeyBalance:0,honeyLetter:null,honeyLetterMessage:'',AssetImage:()=>null,fortuneTeaHouseAssets:{rewards:{}}};vm.runInNewContext(code,context);return renderToStaticMarkup(context.render());};
 assert.match(render('web'),/꿀방울은/);assert.equal(render('toss'),'');
});

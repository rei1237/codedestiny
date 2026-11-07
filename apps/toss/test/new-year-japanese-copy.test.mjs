import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';
const file=path.resolve(import.meta.dirname,'../../../app/new-year-ai-consultation/NewYearAiClient.tsx'),src=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const declaration=ast.statements.flatMap(row=>ts.isVariableStatement(row)?row.declarationList.declarations:[]).find(row=>row.name.getText(ast)==='TOSS_NEW_YEAR_JA');assert.ok(declaration);
const code=ts.transpileModule('globalThis.copy = '+declaration.initializer.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx={};vm.runInNewContext(code,ctx);
test('Japanese input describes all eight original consultation themes and Korean result language',()=>{
 assert.deepEqual(Object.keys(ctx.copy.focusNames).sort(),['career','custom','health','love','money','overall','relationship','study']);
 for(const value of Object.values(ctx.copy.focusNames))assert.ok(value.trim());
 assert.match(ctx.copy.resultLanguage,/韓国語/);assert.ok(ctx.copy.question&&ctx.copy.calendar&&ctx.copy.invalid);
});

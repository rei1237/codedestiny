/** @jest-environment node */
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { jest } from '@jest/globals';
import { canonicalTeaSaju, withTeaSajuLongitude } from '../../worker/lib/tea-saju-facts.js';
import { buildFortuneTeaSajuSnapshotFromParts, buildSajuResultSection } from '../../lib/fortune-tea-house/saju-result-adapter.mjs';
const source = fs.readFileSync('worker/routes/fortune-tea-house.js', 'utf8');
const ast = ts.createSourceFile('tea.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declaration = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
const preparePair = declaration('handleConsult').body.statements.find(node => ts.isIfStatement(node) && node.expression.getText(ast).includes('consultRequest.consultationMode === "sajuCompatibility"'));
const birth = { birthDate:'1990-05-05',birthTime:'10:30',calendarType:'solar',timezone:'Asia/Seoul',gender:'female' };
function prepare(user = birth, partner = { ...birth, birthDate:'1992-03-12',gender:'male' }) {
  const context = { canonicalTeaSaju, withTeaSajuLongitude, buildFortuneTeaSajuSnapshotFromParts, buildSajuResultSection,
    serverDraft:{}, consultRequest:{consultationMode:'sajuCompatibility',consultationVersion:'tea-v2',sajuCompatibility:{user,partner,focus:'관계의 흐름',relationshipType:'연인'}} };
  vm.createContext(context);
  vm.runInContext(preparePair.getText(ast) + '\n' + declaration('assertSajuCalculationBasis').getText(ast), context);
  return context;
}
test('real server pair preparation passes the basis gate with two calculated natal charts', () => {
  const c = prepare();
  expect(c.serverDraft.sajuCompatibility.available).toBe(true);
  expect(c.serverDraft.sajuCompatibility.partner.saju.available).toBe(true);
  expect(()=>c.assertSajuCalculationBasis(c.consultRequest,c.serverDraft)).not.toThrow();
  c.serverDraft.sajuCompatibility.partner.saju.available=false;
  expect(()=>c.assertSajuCalculationBasis(c.consultRequest,c.serverDraft)).toThrow();
});
test('unknown birth time still permits a three-pillar compatibility reading', () => {
  const c=prepare({...birth,birthTime:undefined,birthTimeUnknown:true});
  expect(()=>c.assertSajuCalculationBasis(c.consultRequest,c.serverDraft)).not.toThrow();
});
test('refunded attempts retain their failure diagnostics and cannot acquire a fresh generation lease', async () => {
  const original={status:'generation_failed',generationError:{code:'FORTUNE_TEA_HOUSE_SAJU_BASIS_MISSING'},passRefund:{refundedAt:new Date()}};
  const updateOne=jest.fn();
  const c={honeyCollections:()=>({results:{findOne:async()=>original,updateOne}}),Date,
    cleanText:String,publicFortuneTeaStoredResult:()=>null,isFreshFortuneTeaGeneration:()=>false,randomUUID:()=> 'lock'};
  vm.createContext(c);vm.runInContext(declaration('beginFortuneTeaHouseGeneration').getText(ast),c);
  expect(await c.beginFortuneTeaHouseGeneration({auth:{userId:'fixture'},resultId:'result',requestId:'request'})).toMatchObject({passRefundedAt:original.passRefund.refundedAt});
  expect(updateOne).not.toHaveBeenCalled();
  expect(original.generationError.code).toBe('FORTUNE_TEA_HOUSE_SAJU_BASIS_MISSING');
});

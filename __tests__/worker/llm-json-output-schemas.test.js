/** @jest-environment node */
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { jsonSchemaFromExample, repairJsonFieldLocations } from '../../worker/lib/json-text-repair.js';
import { LOVE_SECRET_AI_GROUPS, buildLoveSecretGroupResponseSchema } from '../../worker/lib/love-secret-ai-prompt.js';
import { PALM_VISION_RESPONSE_SCHEMA } from '../../worker/lib/palm-vision.js';

function teaSchema(group) {
  const source = fs.readFileSync('worker/routes/fortune-tea-house.js', 'utf8');
  const ast = ts.createSourceFile('tea.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const context = vm.createContext({ jsonSchemaFromExample });
  for (const name of ['teaField', 'teaSet', 'fortuneTeaGroupResponseSchema']) {
    const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    vm.runInContext(fn.getText(ast).replace(/^export /, ''), context);
  }
  return context.fortuneTeaGroupResponseSchema(group);
}

test('tea chapters constrain only their purchased paths and preserve object-array types', () => {
  const schema = teaSchema({ paths: ['saju.deepSections'], fields: ['saju'] });
  expect(Object.keys(schema.properties)).toEqual(['saju']);
  expect(Object.keys(schema.properties.saju.properties)).toEqual(['deepSections']);
  expect(schema.properties.saju.properties.deepSections.items.properties.body.type).toBe('STRING');
  const original = { saju: { deepSections: [{ title: '해석', result: { body: '저장할 해설' } }] } };
  expect(repairJsonFieldLocations(original, schema).saju.deepSections[0]).toEqual({ title: '해석', body: '저장할 해설' });
  expect(teaSchema({ fields: ['emotionAnalysis'] }).properties.emotionAnalysis.items.properties.value.type).toBe('NUMBER');
});

test('love-secret schemas share the prompt example and keep section items as objects', () => {
  for (const group of LOVE_SECRET_AI_GROUPS) {
    const schema = buildLoveSecretGroupResponseSchema(group);
    expect(schema.properties.sections.items.properties).toMatchObject({ title: {type:'STRING'}, body: {type:'STRING'} });
    const misplaced = { result: { sections: [{title:'관계',body:'기존 해설'}] } };
    expect(repairJsonFieldLocations(misplaced, schema)).toEqual(misplaced.result);
    if (group.emits.includes('timing')) expect(schema.properties.luckyDates.items.type).toBe('OBJECT');
  }
});

test('palm schema preserves negative detection and numeric confidence without inventing observations', () => {
  expect(PALM_VISION_RESPONSE_SCHEMA.properties.palmDetected.type).toBe('BOOLEAN');
  expect(PALM_VISION_RESPONSE_SCHEMA.properties.majorLines.properties.lifeLine.properties.confidence.type).toBe('NUMBER');
  const source = { result: { palmDetected: false, notPalmReason: '손바닥이 보이지 않음' } };
  expect(repairJsonFieldLocations(source, PALM_VISION_RESPONSE_SCHEMA)).toEqual(source.result);
});

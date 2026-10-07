/** @jest-environment node */
import { jsonSchemaFromExample, repairJsonFieldLocations, repairStructuredJsonText } from '../../worker/lib/json-text-repair.js';
import { parseNarrativeResponse } from '../../worker/lib/paid-narrative-candidate.js';

const schema = jsonSchemaFromExample({ pastLife: { crossReadings: { selfToPartner: '', partnerToSelf: '' }, story: '', prescription: '', questions: [''] } });

test('repairs missing sibling locations without mutating the provider original', () => {
  const raw = { pastLife: { crossReadings: { selfToPartner: 'A', partnerToSelf: 'B', story: 'C', prescription: 'D', questions: ['E'] } } };
  const before = structuredClone(raw);
  expect(repairJsonFieldLocations(raw, schema)).toEqual({ pastLife: { crossReadings: { selfToPartner: 'A', partnerToSelf: 'B' }, story: 'C', prescription: 'D', questions: ['E'] } });
  expect(raw).toEqual(before);
});

test('preserves valid JSON byte-for-byte, including optional and unknown fields', () => {
  const raw = '{ "body": "내용", "optional":null, "unknown":[1,2] }';
  expect(repairStructuredJsonText(raw, jsonSchemaFromExample({ body: '' }))).toBe(raw);
});

test('repairs fenced raw newlines without rewriting the prose or truncation', () => {
  expect(JSON.parse(repairStructuredJsonText('```json\n{"body":"첫 문단\n다음 문단"}\n```'))).toEqual({ body: '첫 문단\n다음 문단' });
  const truncated = '{"body":"아직 완성되지 않은';
  expect(repairStructuredJsonText(truncated, jsonSchemaFromExample({ body: '' }))).toBe(truncated);
});

test('unwraps known transport envelopes and preserves mismatched evidence for rejection', () => {
  const raw = JSON.stringify({ result: { evidenceHash: 'wrong', body: '상담 본문입니다.' } });
  expect(repairJsonFieldLocations(JSON.parse(raw), jsonSchemaFromExample({ evidenceHash: '', body: '' }))).toEqual({ evidenceHash: 'wrong', body: '상담 본문입니다.' });
  expect(parseNarrativeResponse(raw, 'expected')).toBeNull();
  const good = { output: { evidenceHash: 'expected', body: '상담 본문입니다.', claims: [{ factId: 'a', value: 2 }] } };
  expect(parseNarrativeResponse(JSON.stringify(good), 'expected')).toMatchObject({ evidenceHash: 'expected', body: '상담 본문입니다.', claims: [{ factId: 'a', value: 2 }] });
});

test('restores a missing sections container only from unambiguous complete siblings', () => {
  const contract = jsonSchemaFromExample({ sections: { career: { title: '', body: '' }, love: { title: '', body: '' } } });
  const source = { career: { title: '일', body: '내용1' }, love: { title: '관계', body: '내용2' } };
  expect(repairJsonFieldLocations(source, contract)).toEqual({ sections: source });
  const partial = { career: source.career };
  expect(repairJsonFieldLocations(partial, contract)).toBe(partial);
});

test('never overwrites explicit invalid values, coerces objects, or chooses ambiguous candidates', () => {
  const contract = jsonSchemaFromExample({ body: '' });
  for (const source of [
    { body: '', result: { body: 'good' } },
    { body: null, result: { body: 'good' } },
    { result: { body: { text: 'good' } } },
    { result: { body: 'a' }, output: { body: 'b' } },
    { arbitrary: { body: 'a' } },
  ]) expect(repairJsonFieldLocations(source, contract)).toBe(source);
});

test('does not steal another valid field or move prose between array chapters', () => {
  const contract = jsonSchemaFromExample({ summary: '', chapters: [{ summary: '', body: '' }], detail: { summary: '' } });
  const source = { chapters: [{ body: 'first' }, { summary: 'second', body: 'second body' }], detail: { summary: 'detail' } };
  expect(repairJsonFieldLocations(source, contract)).toBe(source);
  const itemContract = jsonSchemaFromExample({ chapters: [{ body: '', evidence: { name: '' } }] });
  expect(repairJsonFieldLocations({ chapters: [{ evidence: { name: 'a', body: 'first' } }, { evidence: { name: 'b' } }] }, itemContract))
    .toEqual({ chapters: [{ evidence: { name: 'a' }, body: 'first' }, { evidence: { name: 'b' } }] });
});

test('unknown/union schemas and unsafe keys do not invent a contract or pollute prototypes', () => {
  const value = JSON.parse('{"result":{"body":"x","__proto__":{"polluted":true}}}');
  expect(repairJsonFieldLocations(value, null)).toBe(value);
  expect(repairJsonFieldLocations(value, { anyOf: [jsonSchemaFromExample({ body: '' })] })).toBe(value);
  repairJsonFieldLocations(value, jsonSchemaFromExample({ body: '' }));
  expect({}.polluted).toBeUndefined();
});

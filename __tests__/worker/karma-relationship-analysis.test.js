import { buildRelationshipAnalysis, buildRelationshipPrompt, normalizeRelationshipContext } from '../../worker/lib/karma-relationship-analysis.js';

test('excludes absent and omitted chart facts and preserves provisional evidence', () => {
  const analysis = buildRelationshipAnalysis({ scene: 'Repeated demands' }, {
    saju: { confidence: 'full', data: { dayMaster: '갑', strength: {}, unrelated: 'never export' } },
    western: { confidence: 'provisional', provisionalFields: ['moon'], omittedFields: ['corePlanets'], data: { moon: { sign: 'Cancer' }, corePlanets: ['not reliable'] } },
    vedic: { confidence: 'none', data: { nakshatra: 'must not appear' } },
  });
  expect(analysis.evidence.saju.basisPaths).toEqual(['dayMaster']);
  expect(analysis.evidence.western.basisPaths).toEqual(['moon']);
  expect(analysis.evidence.western.provisionalFields).toEqual(['moon']);
  expect(analysis.evidence.vedic).toBeUndefined();
  expect(analysis.partnerChartAvailable).toBe(false);
  const prompt = buildRelationshipPrompt(analysis, 'chapter-12');
  expect(prompt).toContain('7일');
  expect(prompt).toContain('지속·거리두기·정리');
  expect(prompt).not.toContain('not reliable');
  expect(buildRelationshipPrompt(analysis, 'chapter-07')).toBe('');
});

test('blank context is omitted and invalid input is rejected rather than silently lost', () => {
  expect(normalizeRelationshipContext({ person: '  ' })).toEqual({ ok: true, context: null });
  expect(normalizeRelationshipContext({ person: {}, scene: 'test' }).ok).toBe(false);
  expect(normalizeRelationshipContext([]).ok).toBe(false);
  expect(normalizeRelationshipContext({ wish: 'x'.repeat(241) }).ok).toBe(false);
  expect(normalizeRelationshipContext({ person: ' A ', secret: 'ignored' }).context).toEqual({ person: 'A' });
  expect(buildRelationshipPrompt(buildRelationshipAnalysis(null), 'chapter-05')).toContain('특정 상대의 자료가 없습니다');
});

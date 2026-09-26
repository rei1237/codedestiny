import { runWithPaidGenerationContext, getPaidGenerationContext } from '../../worker/lib/paid-generation-context.js';
test('concurrent paid generations cannot share customer or request context', async () => {
  const result = await Promise.all(['first','second'].map(requestId => runWithPaidGenerationContext({
    requestId, serviceId:'service', attempt:2, question:'private', birthDate:'private', token:'secret',
  }, async () => { await Promise.resolve(); return getPaidGenerationContext(); })));
  expect(result).toEqual(['first','second'].map(requestId => ({requestId,serviceId:'service',attempt:2})));
  expect(getPaidGenerationContext()).toBeUndefined();
});

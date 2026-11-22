import { readFileSync } from 'node:fs';
import { YeongnyangiRequest } from '../../worker/lib/yeongnyangi-models.js';

// autoIndex is off in the worker: this declaration only takes effect via scripts/yeongnyangi-indexes.mjs --apply.
test('completion-mail sweep has an index: equality fields first, then the range/sort field', () => {
  const sweep = YeongnyangiRequest.schema.indexes().find(([, options]) => options.name === 'completion_mail_sweep');
  expect(sweep).toBeDefined();
  expect(Object.keys(sweep[0])).toEqual(['state', 'completionMailSentAt', 'completedAt']);
  expect(sweep[1].unique).toBeFalsy();
  expect(sweep[1].expireAfterSeconds).toBeUndefined();
});

test('sweep query still matches the index shape', () => {
  const source = readFileSync(new URL('../../worker/yeongnyangi/completion-mail.js', import.meta.url), 'utf8');
  const find = source.slice(source.indexOf('YeongnyangiRequest.find({'));
  expect(find).toMatch(/^YeongnyangiRequest\.find\(\{\s*state: 'COMPLETED', completedAt: \{ \$gte:/);
  expect(find).toMatch(/completionMailSentAt: null/);
  expect(find).toMatch(/\.sort\(\{ completedAt: 1 \}\)/);
});

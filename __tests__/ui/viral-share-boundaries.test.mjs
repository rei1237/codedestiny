import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../../', import.meta.url));
const result = await build({ stdin: { contents: "export {dataUrlToBlob} from './lib/share-image.ts'; export {requestPaidDetails} from './app/saju/destiny-bias/lib/paidDetails.ts';", resolveDir: root, loader: 'ts' },
  bundle: true, write: false, format: 'iife', globalName: 'M', platform: 'node', alias: { '@': root }, logLevel: 'error',
  plugins: [{ name: 'no-network', setup(b) {
    b.onResolve({ filter: /auth-client$/ }, () => ({ path: 'auth', namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const authFetch=(...args)=>globalThis.__biasApi(...args);', loader: 'js' }));
  } }],
});
const api = new Function(result.outputFiles[0].text + ';return M;')();

test('image bytes are decoded locally and invalid input is rejected', async () => {
  const blob = api.dataUrlToBlob('data:image/png;base64,AAECA/8=');
  assert.equal(blob.type, 'image/png');
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [0, 1, 2, 3, 255]);
  assert.throws(() => api.dataUrlToBlob('https://example.invalid/image.png'));
  assert.throws(() => api.dataUrlToBlob('data:text/html;base64,PGgxPg=='));
});

test('purchase lookup sends only an opaque birth key and excludes preview report', async () => {
  let request;
  const before = globalThis.__biasApi;
  globalThis.__biasApi = async (url, init) => { request = { url, init }; return { ok: true, json: async () => ({ ok: true, found: false }) }; };
  try {
    assert.equal(await api.requestPaidDetails({ birthDate: '1990-05-17', calendarType: 'solar', partner: { kind: 'roster', id: 'member-a' }, report: { privatePreview: true } }), null);
    const body = JSON.parse(request.init.body);
    assert.match(body.inputHash, /^[a-f0-9]{64}$/);
    assert.equal(body.birthDate, undefined); assert.equal(body.report, undefined);
    assert.doesNotMatch(request.init.body, /1990-05-17|19900517/);
    assert.equal(request.init.cache, 'no-store');
  } finally { if (before === undefined) delete globalThis.__biasApi; else globalThis.__biasApi = before; }
});

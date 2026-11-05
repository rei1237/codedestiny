import '../../../scripts/lib/mock-network-guard.cjs';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { server as createBackend, wire, digest } from '../delivery-integration/harness.mjs';

const root = process.cwd(), require = createRequire(import.meta.url);
const folder = 'tools/oracle/browser-delivery';
const out = path.resolve(root, '.tmp/engine-audit-browser-delivery');
// Currency glyphs in lucide-react are unrelated to Swiss Ephemeris.
const forbidden = /swiss(?!-franc)|sweph|swisseph|jyotish/i;
export async function startBrowserFixture({ compileUi = true, extraMockApi, resultSections } = {}) {
  let compiled;
  if (compileUi) {
  fs.mkdirSync(out, { recursive: true });
  compiled = await build({ entryPoints: [`${folder}/browser.tsx`], outfile: `${out}/app.js`, bundle: true,
    jsx: 'automatic', loader: { '.module.css': 'local-css' }, metafile: true, write: true,
    alias: { '@': root }, define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' },
    plugins: [{ name: 'swiss-block-and-framework-host', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => { if (forbidden.test(args.path)) throw new Error(`Swiss blocked: ${args.path}`); });
      builder.onResolve({ filter: /^\/assets\// }, args => ({ path: args.path, external: true }));
      builder.onResolve({ filter: /^next\/(image|link|dynamic|navigation)$/ }, args => ({ path: args.path, namespace: 'framework-host' }));
      builder.onLoad({ filter: /.*/, namespace: 'framework-host' }, args => {
        const name = args.path.split('/')[1];
        const exports = name === 'navigation' ? 'export { usePathname, useSearchParams, useRouter }' : `export { ${name === 'image' ? 'Image' : name === 'link' ? 'Link' : 'dynamic'} as default }`;
        return { contents: `${exports} from ${JSON.stringify(path.resolve(root, `${folder}/next-shims.tsx`))};`, loader: 'tsx', resolveDir: root };
      });
    } }],
  });
  assert.ok(Object.keys(compiled.metafile.inputs).every(file => !forbidden.test(file)));
  fs.writeFileSync(`${out}/input.css`, '@tailwind base;\n@tailwind components;\n@tailwind utilities;');
  const css = spawnSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-i', `${out}/input.css`, '-o', `${out}/tailwind.css`, '--content', './app/ziwei-ai/**/*.{tsx,ts},./app/components/**/*.{tsx,ts},./components/fortune/**/*.{tsx,ts}'], { windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(css.status, 0, css.stderr);
  }
  const backend = createBackend();
  const requests = [], errors = [], pgReturns = [];
  const bodyText = resultSections ? Object.values(resultSections)[0].body : '합성 전달 검증 본문입니다. 준비한 명반과 기준 연도를 유지하며, 재열람 때 이 문장을 그대로 보여 줍니다.';
  backend.context.generateInitialConsultation = async (_env, options) => {
    backend.llmInputs.push(wire({ chart: options.chart, input: options.input, groups: options.groups }));
    if (backend.holdGeneration) await backend.holdGeneration;
    if (backend.mockGenerationDelay) await new Promise(resolve => setTimeout(resolve, backend.mockGenerationDelay));
    const groups = { foundation: resultSections || { structure_core: { title: '합성 명반 전달 검증', body: bodyText } } };
    const meta = { synthetic: true, chartDigest: digest(options.chart) };
    await options.checkpoint({ groups, attempts: { foundation: 1 }, meta, rawResponses: {} });
    const text = backend.context.enforceZiweiChartFacts(JSON.stringify({ meta, sections: groups.foundation }), options.chart).text;
    const complete = !backend.partialOnce; backend.partialOnce = false;
    return { complete, text, meta: { groups } };
  };
  const http = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-src 'none'; form-action 'self'");
      const json = (data, status = 200) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(data));
      let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 100000) throw new Error('Oversized mock request'); }
      const body = raw ? JSON.parse(raw) : {};
      if (url.pathname.startsWith('/api/') || url.pathname === '/__audit/pg') requests.push({ method: req.method, path: url.pathname, query: url.search, body: wire(body) });
      if (url.pathname === '/__audit/pg') {
        const order = backend.payments.find(p => p.idempotencyKey === body.requestId);
        assert.ok(order && body.resume?.args?.idempotencyKey === order.idempotencyKey, 'Prepared order required');
        backend.receipts.add(order.merchantUid);
        const proof = { featureKey: 'ziwei-ai-consultation', requestId: order.idempotencyKey, merchantUid: order.merchantUid,
          payload: { ok: true, status: 'paid', paymentId: order.merchantUid } };
        pgReturns.push(wire({ descriptor: body.resume, proof })); return json(proof);
      }
      if (url.pathname.startsWith('/api/ziwei-ai/')) {
        const result = await backend.request(url.pathname + url.search, body, req.method);
        return json(result.data, result.status);
      }
      if (extraMockApi && url.pathname.startsWith('/api/')) {
        const extra = await extraMockApi({ url, body, method: req.method, backend });
        if (extra) return json(extra.data, extra.status || 200);
      }
      if (url.pathname === '/api/auth/me') return json({ ok: true, user: { id: backend.userId, _id: backend.userId, nickname: '합성 검증' } });
      if (url.pathname === '/api/me/access-state') return json({ ok: true, userId: backend.userId, unlocks: [], subscription: null });
      if (url.pathname === '/api/billing/features') return json({ ok: true, features: { 'ziwei-ai-consultation': { coinPrice: 300, amountKRW: 30000 } } });
      if (url.pathname === '/api/billing/balance') return json({ ok: true, balance: 0, monthlyStoneBalance: 0 });
      if (url.pathname === '/api/billing/unlock-status') return json({ ok: true, unlocked: false, access: { granted: false }, paymentRequired: true });
      if (url.pathname === '/api/fortune/pig-coin/profile-subscription/status') return json({ ok: true, subscription: null });
      if (url.pathname === '/api/profile') return json({ ok: true, profiles: [] });
      if (req.method === 'GET' && ['/api/reviews/products', '/api/recommendations'].includes(url.pathname)) return json({ ok: true, items: [], reviews: [], recommendations: [] });
      if (url.pathname.startsWith('/api/')) return json({ ok: false, reason: 'MOCK_ROUTE_NOT_IMPLEMENTED' }, 501);
      if (['/app.js', '/app.css', '/tailwind.css'].includes(url.pathname)) return res.writeHead(200, { 'Content-Type': url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css' }).end(fs.readFileSync(path.join(out, url.pathname.slice(1))));
      if (url.pathname === '/__audit/return.js') return res.writeHead(200, { 'Content-Type': 'text/javascript' }).end("document.querySelector('button').onclick=()=>location.assign('/ziwei-ai/?auditReturn=1'+(sessionStorage.getItem('__audit_delayed_auth')?'&delayedAuth=1':''));");
      if (url.pathname === '/__audit/pg-return') return res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>합성 PG 복귀</title><p>가짜 결제 승인 완료 · 실제 청구 없음</p><button>서비스로 복귀</button><script src="/__audit/return.js"></script></html>');
      if (url.pathname === '/ziwei-ai/' || url.pathname === '/ziwei-ai') return res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>자미 전달 브라우저 검증 · mock</title><link rel="stylesheet" href="/tailwind.css"><link rel="stylesheet" href="/app.css"><body style="margin:0"><div id="root"></div><script src="/app.js"></script></body></html>');
      // Local non-code assets only. No legacy runtime/SDK/engine scripts.
      const asset = path.resolve(root, 'public', `.${decodeURIComponent(url.pathname)}`);
      if (asset.startsWith(path.resolve(root, 'public') + path.sep) && /\.(png|webp|jpg|svg|woff2?)$/i.test(asset) && fs.existsSync(asset)) {
        const mime = { '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff' }[path.extname(asset)];
        return res.writeHead(200, { 'Content-Type': mime }).end(fs.readFileSync(asset));
      }
      res.writeHead(404).end('Mock resource blocked');
    } catch (error) { errors.push(error.stack); res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: false, reason: 'MOCK_FIXTURE_FAILURE' })); }
  });
  await new Promise((resolve, reject) => { http.once('error', reject); http.listen(0, '127.0.0.1', resolve); });
  return { http, backend, requests, errors, pgReturns, bodyText, bundleInputs: Object.keys(compiled?.metafile.inputs || {}), out, origin: `http://127.0.0.1:${http.address().port}` };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const runtime = await startBrowserFixture(); console.log(JSON.stringify({ origin: runtime.origin, inputs: runtime.bundleInputs.length }));
}

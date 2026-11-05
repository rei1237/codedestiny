const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const http = require('node:http');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const SCRIPT = resolve('scripts/verify-deployed-assets.mjs');
const ASSET = '/_next/static/chunks/a.js';

/** 자산 응답을 respond 가 정하는 로컬 오리진에 artifact 모드로 검사를 돌린다. */
async function runAgainst(respond) {
  const dir = mkdtempSync(join(tmpdir(), 'cd-deployed-assets-'));
  mkdirSync(join(dir, 'login'), { recursive: true });
  mkdirSync(join(dir, '_next/static/chunks'), { recursive: true });
  writeFileSync(join(dir, 'login/index.html'), '');
  writeFileSync(join(dir, '_next/static/chunks/a.js'), '');

  let bareRequests = 0;
  const server = http.createServer((req, res) => {
    if (req.url === '/login/') {
      res.setHeader('content-type', 'text/html');
      res.end(`<script src="${ASSET}"></script>`);
      return;
    }
    const bypass = req.url.includes('cdcb=');
    if (!bypass) bareRequests += 1;
    respond({ bypass, bareRequests, res, req });
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));

  const env = { ...process.env };
  for (const key of ['CLOUDFLARE_CACHE_PURGE_TOKEN', 'CLOUDFLARE_PURGE_TOKEN', 'CLOUDFLARE_ZONE_ID', 'CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN']) delete env[key];
  Object.assign(env, {
    CD_DEPLOY_VERIFY_ORIGIN: `http://127.0.0.1:${server.address().port}`,
    CD_DEPLOY_ASSETS_MODE: 'artifact',
    CD_DEPLOY_EXPECTED_DIR: dir,
  });
  try {
    return await new Promise((done, fail) => {
      const child = spawn(process.execPath, [SCRIPT], { env });
      let output = '';
      child.stdout.on('data', (chunk) => { output += chunk; });
      child.stderr.on('data', (chunk) => { output += chunk; });
      child.on('error', fail);
      child.on('close', (code) => done({ code, output, bareRequests }));
    });
  } finally {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
    rmSync(dir, { recursive: true, force: true });
  }
}

test('응답을 못 받은 자산은 다시 물어 200 이면 통과한다', async () => {
  const result = await runAgainst(({ bareRequests, res, req }) => {
    if (bareRequests === 1) { req.socket.destroy(); return; }
    res.end('ok');
  });
  assert.equal(result.code, 0, result.output);
  assert.equal(result.bareRequests, 2);
  assert.match(result.output, /OK — 참조된 자산 전부 200/);
});

test('끝내 응답이 없고 우회가 200 이면 엣지 오염으로 분류하지 않는다', async () => {
  const result = await runAgainst(({ bypass, res, req }) => {
    if (!bypass) { req.socket.destroy(); return; }
    res.end('ok');
  });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /엣지 캐시 404 0/);
  assert.doesNotMatch(result.output, /엣지에 404 가 캐시된 자산/);
});

test('진짜 엣지 404 는 재요청 없이 하드 실패한다', async () => {
  const result = await runAgainst(({ bypass, res }) => {
    res.statusCode = bypass ? 200 : 404;
    res.end();
  });
  // Windows Node 24 는 process.exit 중 libuv assert 로 끝나 코드가 1 이 아닐 수 있다.
  assert.notEqual(result.code, 0, result.output);
  assert.equal(result.bareRequests, 1);
  assert.match(result.output, /엣지에 404 가 캐시된 자산 1건/);
});

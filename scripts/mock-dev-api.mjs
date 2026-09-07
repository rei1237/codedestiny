import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { sajuResponse, ziweiResponse, tarotResponse } from './fixtures/mock-dev-responses.mjs';

export function createMockApiServer() {
  // Process-local storage: restart clears sessions and profiles, never touches Mongo.
  const profiles = new Map();
  let loggedIn = false;
  return http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Code-Destiny-Mock': '1' });
      res.end(JSON.stringify({ ...body, mock: true }));
    };
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const path = url.pathname.replace(/\/$/, '');
      const scenario = url.searchParams.get('mockScenario') || req.headers['x-mock-scenario'] || 'normal';
      if (!['normal', 'error', 'delay'].includes(scenario)) return send(400, { ok: false, error: 'INVALID_MOCK_SCENARIO' });
      if (scenario === 'error') return send(503, { ok: false, error: 'MOCK_TEMPORARY_FAILURE', message: '잠시 후 다시 시도해 주세요.' });
      if (scenario === 'delay') await new Promise(resolve => setTimeout(resolve, 300));
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 1024 * 1024) return send(413, { ok: false, error: 'BODY_TOO_LARGE' });
      }
      const body = raw ? JSON.parse(raw) : {};
      const route = `${req.method} ${path}`;
      if (route === 'GET /api/health') return send(200, { ok: true, mode: 'mock' });
      if (route === 'POST /api/auth/login') loggedIn = true;
      if (route === 'POST /api/auth/logout') { loggedIn = false; return send(200, { ok: true }); }
      if (route === 'POST /api/auth/login' || route === 'GET /api/auth/me') {
        return send(loggedIn ? 200 : 401, loggedIn
          ? { ok: true, user: { id: 'mock-user', _id: 'mock-user', email: 'mock@example.invalid', nickname: '개발 사용자' } }
          : { ok: false, reason: 'LOGIN_REQUIRED' });
      }
      // Explicit development-only state API; not a replacement production schema.
      if (route === 'POST /api/mock/profiles') {
        const id = String(body.id || 'mock-profile');
        profiles.set(id, { ...body, id });
        return send(200, { ok: true, profile: profiles.get(id) });
      }
      if (route === 'GET /api/mock/profiles') return send(200, { ok: true, profiles: [...profiles.values()] });
      if (route === 'POST /api/fortune/saju/ai-prompt') return send(200, sajuResponse);
      if (['POST /api/ziwei-ai/start', 'POST /api/ziwei-ai/generate', 'GET /api/ziwei-ai/result'].includes(route)) return send(200, ziweiResponse);
      if (route === 'POST /api/tarot/crystal-soul') return send(200, tarotResponse);
      // PG is an error fixture: no SDK, transaction or unlock is simulated as paid.
      if (path.startsWith('/api/billing/') || path.startsWith('/api/payments/')) {
        return send(402, { ok: false, reason: 'MOCK_PAYMENT_REQUIRED', message: '개발용 결제 대역입니다. 실제 결제는 실행하지 않습니다.' });
      }
      return send(501, { ok: false, error: 'MOCK_ROUTE_NOT_IMPLEMENTED', path });
    } catch (error) {
      send(error instanceof SyntaxError ? 400 : 500, { ok: false, error: error instanceof SyntaxError ? 'INVALID_JSON' : 'MOCK_SERVER_ERROR' });
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.LOCAL_DEV_AUTH_API_PORT || 8790);
  const server = createMockApiServer();
  server.listen(port, '127.0.0.1', () => console.log(`[dev:mock-api] ready http://127.0.0.1:${port}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.closeAllConnections(); server.close(); });
}

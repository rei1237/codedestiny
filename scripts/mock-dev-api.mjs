import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { sajuResponse, ziweiResponse, tarotResponse, nakshatraAiResponse } from './fixtures/mock-dev-responses.mjs';

function mockNakshatraResolve(body) {
  const input = {
    year: Number(body.year) || 1992,
    month: Math.min(12, Math.max(1, Number(body.month) || 5)),
    day: Math.min(28, Math.max(1, Number(body.day) || 17)),
    hour: Math.min(23, Math.max(0, Number(body.hour) || 12)),
    minute: Math.min(59, Math.max(0, Number(body.minute) || 0)),
    timezone: Number(body.timezone) || 9,
    lat: Number(body.lat) || 37.5665,
    lon: Number(body.lon) || 126.978,
    timeUnknown: Boolean(body.timeUnknown),
  };
  const variant = Math.abs(input.year * 31 + input.month * 7 + input.day) % 5;
  const fixture = [
    { sukuyoKo: "수성", sukuyoHan: "昴", nakshatraKo: "로히니", nakshatraEn: "Rohini" },
    { sukuyoKo: "위수", sukuyoHan: "胃", nakshatraKo: "아슈비니", nakshatraEn: "Ashwini" },
    { sukuyoKo: "심수", sukuyoHan: "心", nakshatraKo: "푸샤", nakshatraEn: "Pushya" },
    { sukuyoKo: "기수", sukuyoHan: "箕", nakshatraKo: "푸르바 아샤다", nakshatraEn: "Purva Ashadha" },
    { sukuyoKo: "벽수", sukuyoHan: "壁", nakshatraKo: "샤타비샤", nakshatraEn: "Shatabhisha" },
  ][variant];
  return {
    ok: true,
    input,
    summary: { ...fixture, pada: input.timeUnknown ? null : 2 },
    dongyang: { nameKo: fixture.sukuyoKo, nameHan: fixture.sukuyoHan },
    india: { nameKo: fixture.nakshatraKo, nameEn: fixture.nakshatraEn, pada: input.timeUnknown ? null : 2 },
    unified: { fusionTitle: "개발 검수 fixture" },
  };
}

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
      // UI 검수 fixture: production 계산·결제·LLM을 호출하지 않는 고정 응답이다.
      if (route === 'POST /api/nakshatra/resolve') return send(200, mockNakshatraResolve(body));
      if (route === 'POST /api/nakshatra-ai/ensure-access') return send(200, nakshatraAiResponse);
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

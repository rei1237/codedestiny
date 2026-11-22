import { createHeukwolMock, HEUKWOL_MOCK_PROFILE, HEUKWOL_MOCK_SUBSCRIPTION } from './fixtures/mock-heukwol.mjs';
import {createBattlePracticeStore,handlePracticeBattle} from "./fixtures/mock-card-rpg-battles.mjs";
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createRecommendationMock, MOCK_RECOMMENDATION_TOKEN } from './fixtures/mock-recommendations.mjs';
import { createTeaMock } from './fixtures/mock-tea-house.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

export function createMockApiServer({rpgWalletFile}={}) {
  // Process-local storage: restart clears sessions and profiles, never touches Mongo.
  const profiles = new Map();
  let practiceBattles;
  const teaMock = createTeaMock();
  const recommendationMock = createRecommendationMock();
  let workshop;
  let rpgWallet;
  const rpgMockEnabled=process.env.CD_MOCK_DEV==="1"&&process.env.NODE_ENV==="development";
  const walletSessions = new Map();
  const walletCookie = 'cd_local_rpg_wallet';
  function walletToken(req) {
    return (req.headers.cookie || '').split(';').map(c => c.trim())
      .find(c => c.startsWith(walletCookie + '='))?.slice(walletCookie.length + 1);
  }
  function localWalletRequest(req) {
    const loopback = ['127.0.0.1','::1','::ffff:127.0.0.1'];
    if (!loopback.includes(req.socket.remoteAddress)) return false;
    if (!req.headers.origin) return true;
    try { return ['127.0.0.1','localhost','[::1]'].includes(new URL(req.headers.origin).hostname); }
    catch { return false; }
  }
  function setWalletSession(req, res, signedIn) {
    if (!rpgMockEnabled || !localWalletRequest(req)) return;
    const now = Date.now();
    walletSessions.delete(walletToken(req));
    for (const [key, expires] of walletSessions) if (expires <= now) walletSessions.delete(key);
    const token = signedIn ? randomUUID() : '';
    if (signedIn) walletSessions.set(token, now + 43200000);
    res.setHeader('Set-Cookie', `${walletCookie}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${signedIn ? 43200 : 0}`);
  }
  async function wallet() {
    rpgWallet??=import("./fixtures/mock-card-rpg.mjs").then(async({createMockRpgWallet,mockWalletId})=>{
      const file=fileURLToPath(new URL("../.tmp/mock-wallet-"+Number(process.env.LOCAL_DEV_AUTH_API_PORT||8790)+".json",import.meta.url));
      const store=createMockRpgWallet({file:rpgWalletFile===undefined?file:rpgWalletFile});
      await store.init(mockWalletId);return {store,uid:mockWalletId};
    }).catch(error=>{rpgWallet=undefined;throw error;});
    return rpgWallet;
  }
  const heukwolEnabled=process.env.CD_MOCK_HEUKWOL_FLOW==='1' && process.env.NODE_ENV!=='production';
  const heukwolMock=createHeukwolMock();
  let loggedIn = heukwolEnabled;
  if(heukwolEnabled)profiles.set(HEUKWOL_MOCK_PROFILE.id,structuredClone(HEUKWOL_MOCK_PROFILE));
  let currentProfileId = '';
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
      if (path.startsWith("/api/card-rpg-dev/battle/") && rpgMockEnabled && localWalletRequest(req)) {
        practiceBattles ??= createBattlePracticeStore();
        const signedIn = loggedIn && walletSessions.get(walletToken(req)) > Date.now();
        return handlePracticeBattle(req, res, route, body, signedIn, send, practiceBattles);
      }
      if (path === '/api/admin/editions' || path === '/api/editions/verify') {
        if (process.env.CD_EDITION_WORKSHOP !== '1' || process.env.NODE_ENV === 'production') return send(404,{message:'공방이 열리지 않았어요.'});
        const admin = path === '/api/admin/editions';
        if (admin && req.headers['x-admin-token'] !== MOCK_RECOMMENDATION_TOKEN) return send(401,{message:'관리자 로그인이 필요해요.'});
        if ((!admin && req.method !== 'GET') || (admin && !['GET','POST'].includes(req.method))) return send(405,{});
        try {
          workshop ??= import('../local/edition-workshop/workshop.mjs').then(({openWorkshop}) =>
            openWorkshop(process.env.CD_EDITION_LOCAL_DIR || fileURLToPath(new URL('../local/edition-workshop/.state/v1/',import.meta.url))));
          const w = await workshop;
          if (!admin) return send(200,await w.verify(url.searchParams.get('code') || ''));
          if (req.method === 'GET') return send(200,w.list());
          return send(200,body.action==='qr' ? await w.qr(body.code,body.origin) : await w.mutate(body,'local-flower-admin'));
        } catch (err) {
          return send(err.status || 503,{message:err.status ? err.message : '로컬 체인에 연결하지 못했어요. 기록을 다시 확인해 주세요.'});
        }
      }
      if(rpgMockEnabled && (path.startsWith("/api/mock/card-rpg/") || (route==="GET /api/billing/balance" && url.searchParams.get("moonlightStone")==="1"))){
        if (!localWalletRequest(req)) return send(403, {ok:false,reason:"LOCAL_ONLY"});
        if (!loggedIn || !(walletSessions.get(walletToken(req)) > Date.now()))
          return send(401, {ok:false,reason:"LOGIN_REQUIRED",message:"개발 계정에 다시 로그인하세요."});
        if (!["GET /api/billing/balance","GET /api/mock/card-rpg/catalog","POST /api/mock/card-rpg/summon"].includes(route))
          return send(404, {ok:false,reason:"UNKNOWN_MOCK_GAME_ROUTE"});
        if (req.method === 'POST' && (req.headers['content-type'] || '').split(';')[0].trim() !== 'application/json')
          return send(415, {ok:false,reason:"JSON_REQUIRED"});
        const {store,uid}=await wallet();
        if(route==="GET /api/billing/balance"){
          const {balance}=await store.view(uid);
          return send(200,{ok:true,data:{authenticated:true,authUserId:"mock-user",monthlyStoneBalance:balance}});
        }
        try{
          if(route==="GET /api/mock/card-rpg/catalog")return send(200,{ok:true,...await store.view(uid),accountId:"mock-user"});
          if(route==="POST /api/mock/card-rpg/summon")return send(200,{ok:true,accountId:"mock-user",receipt:await store.summon(uid,body)});
          return send(404,{ok:false,reason:"UNKNOWN_MOCK_GAME_ROUTE"});
        }catch(e){return send(e.status||503,{ok:false,reason:e.code||"STORAGE_UNAVAILABLE",message:e.status?e.message:"테스트 원장 저장에 실패했어요. 같은 요청을 다시 시도하세요."});}
      }
      if (recommendationMock(route, body, req.headers['x-admin-token'], send, url.searchParams)) return;
      if (await teaMock(route, body, loggedIn ? 'mock-user' : null, send)) return;
      if(heukwolEnabled && heukwolMock(route,body,loggedIn?'mock-user':null,send,url.searchParams))return;
      if (route === 'GET /api/payments/pass-offers') {
        const { listCurrentPassOffers } = await import('../worker/lib/pass-sale-policy.js');
        return send(200, { ok: true, offers: listCurrentPassOffers(url.searchParams.get('channel') === 'googlePlay' ? 'googlePlay' : 'web') });
      }
      if (route === 'GET /api/health') return send(200, { ok: true, mode: 'mock' });
      if (route === 'POST /api/rpg/character-preview') {
        const { profileCharacterPreview } = await import('../worker/lib/profile-character-preview.js');
        try { return send(200, { ok: true, ...profileCharacterPreview(body) }); }
        catch (error) { return send(400, { ok:false, code:error.code || 'PROFILE_INCOMPLETE', message:error.message }); }
      }
      if (route === 'GET /api/honey/catalog') {
        const { HONEY_UNLOCK_PRODUCTS } = await import('../worker/lib/honey-unlock-catalog.js');
        const { HONEY_ATTENDANCE_EVERY, HONEY_STREAK_EVERY, HONEY_STREAK_BONUS, PROMPT_HUB_HONEY_COST } = await import('../worker/lib/honey-wallet.js');
        return send(200, { ok:true, products:HONEY_UNLOCK_PRODUCTS, otherUses:[], attendance:{attendanceEvery:HONEY_ATTENDANCE_EVERY,streakEvery:HONEY_STREAK_EVERY,streakBonus:HONEY_STREAK_BONUS,promptCost:PROMPT_HUB_HONEY_COST} });
      }
      if (route === 'GET /api/honey/attendance') {
        if (!loggedIn) return send(401, { ok:false, reason:'LOGIN_REQUIRED' });
        const { HONEY_ATTENDANCE_EVERY, HONEY_STREAK_EVERY, HONEY_STREAK_BONUS, PROMPT_HUB_HONEY_COST, kstDay } = await import('../worker/lib/honey-wallet.js');
        return send(200, { ok:true, balance:16, attended:false, streak:2, day:kstDay(), nextBonusIn:HONEY_STREAK_EVERY-2, monthDays:[], attendanceEvery:HONEY_ATTENDANCE_EVERY, streakEvery:HONEY_STREAK_EVERY, streakBonus:HONEY_STREAK_BONUS, promptCost:PROMPT_HUB_HONEY_COST });
      }
      if (route === 'GET /api/honey/unlocks') return send(loggedIn ? 200 : 401, loggedIn ? {ok:true,featureKeys:[]} : {ok:false,reason:'LOGIN_REQUIRED'});
      if (route === 'POST /api/auth/login') { loggedIn = true; setWalletSession(req,res,true); }
      if (route === 'POST /api/auth/logout') { loggedIn = false; setWalletSession(req,res,false); return send(200, { ok: true }); }
      if (route === 'POST /api/auth/login' || route === 'GET /api/auth/me') {
        return send(loggedIn ? 200 : 401, loggedIn
          ? { ok: true, user: { id: 'mock-user', _id: 'mock-user', email: 'mock@example.invalid', nickname: '개발 사용자', ...(heukwolEnabled?{profileSubscription:HEUKWOL_MOCK_SUBSCRIPTION}:{}) } }
          : { ok: false, reason: 'LOGIN_REQUIRED' });
      }
      // Explicit development-only state API; not a replacement production schema.
      if (route === 'POST /api/mock/profiles') {
        const id = String(body.id || 'mock-profile');
        profiles.set(id, { ...body, id });
        return send(200, { ok: true, profile: profiles.get(id) });
      }
      if (route === 'GET /api/mock/profiles') return send(200, { ok: true, profiles: [...profiles.values()] });
      // Existing profile UI contract, held only in this mock process. No production fallback.
      if (path === '/api/profile' || path.startsWith('/api/profile/')) {
        if (!loggedIn) return send(401, { ok: false, reason: 'LOGIN_REQUIRED' });
        if (route === 'POST /api/profile') {
          const id = String(body.profileId || body.profile?.id || 'mock-profile');
          profiles.set(id, { ...body.profile, id, profileId: id, syncStatus: 'synced' });
          currentProfileId = id;
        } else if (route === 'PATCH /api/profile/current') {
          const id = String(body.profileId || body.currentId || '');
          if (!profiles.has(id)) return send(404, { ok: false });
          currentProfileId = id;
        } else if (route !== 'GET /api/profile') {
          return send(501, { ok: false, error: 'MOCK_ROUTE_NOT_IMPLEMENTED', path });
        }
        return send(200, { ok: true, profiles: [...profiles.values()], currentId: currentProfileId, profile: profiles.get(currentProfileId) || null });
      }
      if (route === 'GET /api/heukwol/pricing') {
        const { getBillingFeaturePricing } = await import('../worker/lib/billing-feature-registry.js');
        return send(200, { ok: true, pricing: getBillingFeaturePricing({ featureKey: 'heukwol-warning-consultation' }).pricing });
      }
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

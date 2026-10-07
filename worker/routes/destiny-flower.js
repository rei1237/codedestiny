/** Free Flower of Destiny: authenticated, server-calculated, no purchase or result storage. Historical flower-fc purchases remain in the payment ledger. */
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import {
  matchDestinyFlower,
  matchAstrologyFlower,
  matchJamidusuFlower,
  matchSukuyoFlower,
  updateFlowerTheme,
} from "../lib/destiny-flower-engine.js";

/** 아틀리에 전체 해금 키. `worker/lib/paid-feature-registry.js` 의 `unlock.flower_fc` 와 같은 값이다. */
export const FLOWER_UNLOCK_FEATURE_KEY = "flower-fc";

const SOURCES = Object.freeze(["saju", "astrology", "jamidusu", "sukuyo"]);

const MATCHER_BY_SOURCE = Object.freeze({
  saju: (payload) => matchDestinyFlower(payload, { limit: 5 }),
  astrology: (payload) => matchAstrologyFlower(payload, { source: "astrology" }),
  jamidusu: (payload) => matchJamidusuFlower(payload, { source: "jamidusu" }),
  sukuyo: (payload) => matchSukuyoFlower(payload, { source: "sukuyo" }),
});

function normalizeSources(value) {
  if (!Array.isArray(value) || !value.length) return SOURCES;
  const picked = value
    .map((item) => String(item || "").trim().toLowerCase())
    .filter((item) => SOURCES.includes(item));
  return picked.length ? Array.from(new Set(picked)) : SOURCES;
}

async function handleMatch(request, env) {
  const body = await readJson(request);
  const payload = body && typeof body.profile === "object" && body.profile ? body.profile : null;
  if (!payload) {
    return json({ ok: false, code: "BAD_REQUEST", message: "프로필 정보가 필요합니다." }, { status: 400 });
  }

  try {
    await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json(
        { ok: false, code: "UNAUTHORIZED", message: "로그인 후 운명의 꽃을 이용해 주세요." },
        { status: 401 },
      );
    }
    throw error;
  }

  const sources = {};
  for (const source of normalizeSources(body.sources)) {
    try {
      sources[source] = MATCHER_BY_SOURCE[source](payload) || null;
    } catch (error) {
      // 한 체계가 실패해도 나머지 셋은 내보낸다 — 넷을 한 화면에 그리는 4-up 이 통째로 비지 않게.
      console.warn("[destiny-flower] match failed", source, String(error?.message || error).slice(0, 200));
      sources[source] = null;
    }
  }

  let theme = null;
  try {
    theme = updateFlowerTheme(payload, {}) || null;
  } catch (_) {
    theme = null;
  }

  return json({ ok: true, sources, theme });
}

export async function handleDestinyFlowerRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (method !== "POST") return methodNotAllowed();

    const path = getRoutePath(request, "/api/destiny-flower");
    if (path !== "/match") return notFound();

    return await handleMatch(request, env);
  } catch (error) {
    return handleRouteError(error);
  }
}

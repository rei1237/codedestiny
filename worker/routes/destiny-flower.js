/**
 * 운명의 꽃 매칭 — 서버 전용.
 *
 * 2026-08-24 이전에는 매칭 엔진(89종 카탈로그 + 네 체계 점수 함수)이 브라우저에 통째로
 * 실려 있었다. 결제는 서버에서 차감되는데 **결과는 브라우저가 만들었다** — 콘솔에서
 * `matchDestinyFlower(payload)` 를 부르면 1만원짜리 결과가 공짜로 나왔다.
 *
 * 그래서 엔진을 `worker/lib/destiny-flower-engine.js` 로 옮기고(정적 호스팅에서는
 * `js/**` 아래 파일이 URL 로 그냥 열리므로 import 를 끊는 것만으로는 부족하다) 이 라우트를
 * 유일한 입구로 뒀다. 여기서 `flower-fc` 해금을 확인하지 못하면 결과가 나가지 않는다.
 *
 * 🔴 이 라우트를 우회하는 클라이언트 매칭 경로를 다시 만들지 말 것 —
 *    `__tests__/ui/destiny-flower-server-gate.static.test.js` 가 브라우저에 서빙되는
 *    JS 전체에서 매칭 로직의 부재를 단언한다.
 */
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { connectDb } from "../lib/db.js";
import { User } from "../lib/models.js";
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

/**
 * 해금 보유 여부. 사용자 문서의 `unlockedFeatures` 배열 하나만 본다.
 * 🔴 로컬 스냅샷을 신뢰 근거로 받지 않는다 — 그게 우회 경로였다.
 */
async function hasFlowerUnlock(userId) {
  await connectDb();
  const user = await User.findById(userId).select("unlockedFeatures").lean();
  const keys = Array.isArray(user?.unlockedFeatures) ? user.unlockedFeatures : [];
  for (let i = 0; i < keys.length; i += 1) {
    if (String(keys[i] || "").trim() === FLOWER_UNLOCK_FEATURE_KEY) return true;
  }
  return false;
}

async function handleMatch(request, env) {
  const body = await readJson(request);
  const payload = body && typeof body.profile === "object" && body.profile ? body.profile : null;
  if (!payload) {
    return json({ ok: false, code: "BAD_REQUEST", message: "프로필 정보가 필요합니다." }, { status: 400 });
  }

  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json(
        { ok: false, code: "UNAUTHORIZED", message: "로그인 후 운명의 꽃을 이용해 주세요." },
        { status: 401 },
      );
    }
    throw error;
  }

  if (!(await hasFlowerUnlock(auth.userId))) {
    return json(
      {
        ok: false,
        code: "PAYMENT_REQUIRED",
        featureKey: FLOWER_UNLOCK_FEATURE_KEY,
        message: "운명의 꽃 아틀리에 해금이 필요합니다.",
      },
      { status: 402 },
    );
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

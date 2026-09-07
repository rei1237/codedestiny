// /api/auth/me 전용 얇은 진입점.
//
// 자격증명 캐시는 Mongo보다 앞에서 판정되어야 한다. 기존 auth.js 전체를 먼저 lazy import하면
// 캐시 히트에서도 OAuth·WebAuthn·비밀번호 모듈을 평가하게 되므로, 미스일 때만 본 라우터를 연다.
import { readThroughCredentialCache } from "../lib/credential-scoped-cache.js";

export async function handleAuthMeRoute(request, env, ctx) {
  return readThroughCredentialCache({
    request,
    env,
    prefix: "auth-me:v1",
    handler: async () => {
      const { handleAuthRoutes } = await import("./auth.js");
      return handleAuthRoutes(request, env, ctx);
    },
    isCacheable: (body) => body.authenticated === true,
  });
}

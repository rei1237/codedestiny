// /api/profile 목록 전용 얇은 진입점.
// 캐시 히트가 프로필 카드 쓰기·보안·월정석 변경 모듈을 평가하지 않도록, 기존 라우터는 미스일 때만 연다.
import { readThroughCredentialCache } from "../lib/credential-scoped-cache.js";

export async function handleProfileListRoute(request, env) {
  return readThroughCredentialCache({
    request,
    env,
    prefix: "profile-list:v1",
    handler: async () => {
      const { handleProfileRoutes } = await import("./profile.js");
      return handleProfileRoutes(request, env);
    },
    isCacheable: (body) => body.ok === true && Array.isArray(body.profiles),
  });
}

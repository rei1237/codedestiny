// POST /api/paid-narrative/intent?featureKey=… — a page sends the exact route body it
// will send after checkout, through the same fetch helper, so wrapper rewrites (the
// React authFetch aligns a body locale) apply to both. Registration never proves,
// consumes or charges anything; the page ignores the reply
// (worker/lib/paid-narrative-intent.js).
import { isAuthDbInfraError, requireAuth } from "../lib/auth.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { enforceSensitiveEndpointSecurity } from "../lib/security/index.js";
import { registerPaidNarrativeIntent } from "../lib/paid-narrative-intent.js";

export async function handlePaidNarrativeIntentRoutes(request, env) {
  try {
    if (getRoutePath(request, "/api/paid-narrative") !== "/intent") return notFound();
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const auth = await requireAuth(request, env);
    const security = await enforceSensitiveEndpointSecurity({ env, request, userId: auth.userId, endpoint: "paid-narrative:intent",
      allowedMethods: ["POST"], requireJson: true, rateLimit: { limit: 20, windowSeconds: 600 },
      rateLimitKey: `paid-narrative-intent:${auth.userId}`, maxPayloadBytes: 64 * 1024 });
    if (!security.ok) return security.response;
    const featureKey = String(new URL(request.url).searchParams.get("featureKey") || "");
    const result = await registerPaidNarrativeIntent(env, { userId: auth.userId, featureKey, body: await readJson(request) });
    return json(result.body, { status: result.status });
  } catch (error) {
    if (isAuthDbInfraError(error)) return json({ ok: false, retryable: true, reason: "DB_DEGRADED" }, { status: 503 });
    return handleRouteError(error, { request, env });
  }
}

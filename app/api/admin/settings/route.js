import { proxyLegacyApiWithRewrite } from "../../_lib/legacyApiProxy";

export const runtime = "nodejs";

// GET /api/admin/settings -> Express GET /api/admin/settings/flower
export function GET(request) {
  return proxyLegacyApiWithRewrite(request, () => "/api/admin/settings/flower");
}

// PATCH /api/admin/settings -> Express PATCH /api/admin/settings/flower
export function PATCH(request) {
  return proxyLegacyApiWithRewrite(request, () => "/api/admin/settings/flower");
}
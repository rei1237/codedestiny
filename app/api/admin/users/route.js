import { proxyLegacyApiWithRewrite } from "@/app/api/_lib/legacyApiProxy";

export const runtime = "nodejs";

// GET /api/admin/users → Express GET /api/admin/users/flower-list
export function GET(request) {
  return proxyLegacyApiWithRewrite(request, () => "/api/admin/users/flower-list");
}

import { proxyLegacyApiWithRewrite } from "@/app/api/_lib/legacyApiProxy";

export const runtime = "nodejs";

// POST /api/admin/members/points → Express POST /api/admin/members/points/flower
export function POST(request) {
  return proxyLegacyApiWithRewrite(request, () => "/api/admin/members/points/flower");
}

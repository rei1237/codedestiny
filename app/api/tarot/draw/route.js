import { proxyLegacyApi } from "@/app/api/_lib/legacyApiProxy";

export const runtime = "nodejs";

export async function POST(request) {
  return proxyLegacyApi(request);
}

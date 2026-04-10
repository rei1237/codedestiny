import { proxyLegacyApi } from "../../_lib/legacyApiProxy";

export const runtime = "nodejs";

export async function POST(request) {
  return proxyLegacyApi(request);
}

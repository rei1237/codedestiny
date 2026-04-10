import { proxyLegacyApi } from "../../../_lib/legacyApiProxy";

export const runtime = "nodejs";

export async function GET(request) {
  return proxyLegacyApi(request);
}

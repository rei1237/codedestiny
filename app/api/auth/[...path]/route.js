import { proxyLegacyApi } from "../../../_lib/legacyApiProxy.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request) {
  return proxyLegacyApi(request);
}

export function POST(request) {
  return proxyLegacyApi(request);
}

export function PATCH(request) {
  return proxyLegacyApi(request);
}

export function DELETE(request) {
  return proxyLegacyApi(request);
}

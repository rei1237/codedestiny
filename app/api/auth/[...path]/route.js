import { proxyLegacyApi } from "@/app/api/_lib/legacyApiProxy";

export const runtime = "nodejs";

export async function GET(request) {
  return proxyLegacyApi(request);
}

export async function POST(request) {
  return proxyLegacyApi(request);
}

export async function PUT(request) {
  return proxyLegacyApi(request);
}

export async function PATCH(request) {
  return proxyLegacyApi(request);
}

export async function DELETE(request) {
  return proxyLegacyApi(request);
}

export async function OPTIONS(request) {
  return proxyLegacyApi(request);
}

export async function HEAD(request) {
  return proxyLegacyApi(request);
}

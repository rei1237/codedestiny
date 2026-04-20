import { proxyLegacyApi } from "../../_lib/legacyApiProxy";
import { handleDirectPayments, shouldUseDirectPayments } from "../_lib/directPayments";

export const runtime = "nodejs";

export async function GET(request) {
  if (shouldUseDirectPayments()) return handleDirectPayments(request, "/me");
  return proxyLegacyApi(request);
}

export async function POST(request) {
  if (shouldUseDirectPayments()) return handleDirectPayments(request, "/me");
  return proxyLegacyApi(request);
}

export async function PUT(request) {
  if (shouldUseDirectPayments()) return handleDirectPayments(request, "/me");
  return proxyLegacyApi(request);
}

export async function PATCH(request) {
  if (shouldUseDirectPayments()) return handleDirectPayments(request, "/me");
  return proxyLegacyApi(request);
}

export async function DELETE(request) {
  if (shouldUseDirectPayments()) return handleDirectPayments(request, "/me");
  return proxyLegacyApi(request);
}

export async function OPTIONS(request) {
  if (shouldUseDirectPayments()) return handleDirectPayments(request, "/me");
  return proxyLegacyApi(request);
}

export async function HEAD(request) {
  if (shouldUseDirectPayments()) return handleDirectPayments(request, "/me");
  return proxyLegacyApi(request);
}

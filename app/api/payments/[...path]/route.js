import { proxyLegacyApi } from "../../_lib/legacyApiProxy";
import { handleDirectPayments, shouldUseDirectPayments } from "../_lib/directPayments";

export const runtime = "nodejs";

export async function GET(request) {
  if (shouldUseDirectPayments()) {
    const pathname = new URL(request.url).pathname;
    const subPath = pathname.replace(/^\/api\/payments/, "") || "/";
    return handleDirectPayments(request, subPath);
  }
  return proxyLegacyApi(request);
}

export async function POST(request) {
  if (shouldUseDirectPayments()) {
    const pathname = new URL(request.url).pathname;
    const subPath = pathname.replace(/^\/api\/payments/, "") || "/";
    return handleDirectPayments(request, subPath);
  }
  return proxyLegacyApi(request);
}

export async function PUT(request) {
  if (shouldUseDirectPayments()) {
    const pathname = new URL(request.url).pathname;
    const subPath = pathname.replace(/^\/api\/payments/, "") || "/";
    return handleDirectPayments(request, subPath);
  }
  return proxyLegacyApi(request);
}

export async function PATCH(request) {
  if (shouldUseDirectPayments()) {
    const pathname = new URL(request.url).pathname;
    const subPath = pathname.replace(/^\/api\/payments/, "") || "/";
    return handleDirectPayments(request, subPath);
  }
  return proxyLegacyApi(request);
}

export async function DELETE(request) {
  if (shouldUseDirectPayments()) {
    const pathname = new URL(request.url).pathname;
    const subPath = pathname.replace(/^\/api\/payments/, "") || "/";
    return handleDirectPayments(request, subPath);
  }
  return proxyLegacyApi(request);
}

export async function OPTIONS(request) {
  if (shouldUseDirectPayments()) {
    const pathname = new URL(request.url).pathname;
    const subPath = pathname.replace(/^\/api\/payments/, "") || "/";
    return handleDirectPayments(request, subPath);
  }
  return proxyLegacyApi(request);
}

export async function HEAD(request) {
  if (shouldUseDirectPayments()) {
    const pathname = new URL(request.url).pathname;
    const subPath = pathname.replace(/^\/api\/payments/, "") || "/";
    return handleDirectPayments(request, subPath);
  }
  return proxyLegacyApi(request);
}

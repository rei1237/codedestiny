import { proxyLegacyApi } from "@/app/api/_lib/legacyApiProxy";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { GET as meGet } from "@/app/api/auth/me/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";

export const runtime = "nodejs";

function getRouteKey(request, context) {
  const method = String(request.method || "GET").toUpperCase();
  const rawPath = context?.params?.path;
  const path = Array.isArray(rawPath) && rawPath.length > 0 ? String(rawPath[0]).toLowerCase() : "";
  return `${method}:${path}`;
}

async function delegateNativeIfNeeded(request, context) {
  const routeKey = getRouteKey(request, context);

  if (routeKey === "POST:login") return loginPost(request);
  if (routeKey === "POST:register") return registerPost(request);
  if (routeKey === "GET:me") return meGet(request);
  if (routeKey === "POST:logout") return logoutPost(request);

  return null;
}

export async function GET(request, context) {
  const delegated = await delegateNativeIfNeeded(request, context);
  if (delegated) return delegated;
  return proxyLegacyApi(request);
}

export async function POST(request, context) {
  const delegated = await delegateNativeIfNeeded(request, context);
  if (delegated) return delegated;
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

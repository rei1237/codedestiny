import { proxyLegacyApi } from "../../_lib/legacyApiProxy";
import { POST as loginPost } from "../login/route";
import { POST as registerPost } from "../register/route";
import { GET as meGet } from "../me/route";
import { POST as logoutPost } from "../logout/route";

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

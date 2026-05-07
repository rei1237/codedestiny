import { getSwissVedicPlanets, getSwissWesternChart } from "../lib/swiss-ephemeris.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeChartInput(body = {}) {
  return {
    year: toNumber(body.year, NaN),
    month: toNumber(body.month, NaN),
    day: toNumber(body.day, NaN),
    hour: toNumber(body.hour, 12),
    minute: toNumber(body.minute, 0),
    timezone: toNumber(body.timezone, 9),
    lat: toNumber(body.lat, 37.5665),
    lon: toNumber(body.lon ?? body.lng, 126.978),
  };
}

async function handleAstroWesternChart(request, env) {
  const body = await readJson(request);
  const chart = await getSwissWesternChart(env, normalizeChartInput(body), { requestUrl: request.url });
  return json({ ok: true, ...chart });
}

async function handleVedicPlanets(request, env) {
  const body = await readJson(request);
  const result = await getSwissVedicPlanets(env, normalizeChartInput(body), { requestUrl: request.url });
  return json({ ok: true, ...result });
}

export async function handleAstroRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname;

    if (method === "POST") {
      await requireAuth(request, env);
    }

    if (pathname === "/api/astro" || pathname.startsWith("/api/astro/")) {
      const path = getRoutePath(request, "/api/astro");
      if (path === "/western-chart") {
        if (method !== "POST") return methodNotAllowed();
        return await handleAstroWesternChart(request, env);
      }
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    if (pathname === "/api/vedic" || pathname.startsWith("/api/vedic/")) {
      const path = getRoutePath(request, "/api/vedic");
      if (path === "/planets") {
        if (method !== "POST") return methodNotAllowed();
        return await handleVedicPlanets(request, env);
      }
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

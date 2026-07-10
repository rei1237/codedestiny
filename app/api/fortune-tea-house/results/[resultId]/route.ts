import { handleFortuneTeaHouseRoutes } from "@/worker/routes/fortune-tea-house.js";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

function isStaticExportBuild() {
  return process.env.NODE_ENV === "production";
}

export async function GET(request: Request) {
  if (isStaticExportBuild()) {
    return Response.json({ ok: false, reason: "WORKER_RUNTIME_ONLY" });
  }
  return handleFortuneTeaHouseRoutes(toPlainRequest(request), process.env);
}

// Next dev serves force-static GET routes with a proxied NextRequest whose
// undici internals can mismatch the runtime Request class ("Cannot read
// private member #state"). Rebuild a plain Request before handing it to the
// worker route handler.
function toPlainRequest(request: Request): Request {
  try {
    return new Request(request.url, { method: "GET", headers: request.headers });
  } catch {
    return new Request(request.url, { method: "GET" });
  }
}

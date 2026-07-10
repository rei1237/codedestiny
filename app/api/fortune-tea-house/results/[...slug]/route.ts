import { handleFortuneTeaHouseRoutes } from "@/worker/routes/fortune-tea-house.js";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

// Required (non-optional) catch-all so the export never needs a zero-segment
// entry: an optional [[...slug]] with {slug: []} still asks Next to write a
// file named exactly "results" while the nested entry needs "results/" as a
// directory — the same file-vs-directory collision as the old sibling
// route.ts + [resultId]/route.ts pair. Dropping the empty-slug param avoids
// that entirely; the bare /results path is never served from this static
// export anyway (dev rewrites all /api/* elsewhere, prod's Worker zone
// intercepts /api/* before Pages ever serves this output).
export function generateStaticParams() {
  return [{ slug: ["placeholder"] }];
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

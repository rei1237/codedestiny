import { handleFortuneTeaHouseRoutes } from "@/worker/routes/fortune-tea-house.js";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

function isStaticExportBuild() {
  return process.env.NODE_ENV === "production";
}

export async function GET(request: Request) {
  if (isStaticExportBuild()) {
    return Response.json({ ok: false, reason: "WORKER_RUNTIME_ONLY" });
  }
  return handleFortuneTeaHouseRoutes(request, process.env);
}

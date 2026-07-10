import { handleNeoOperationRoomRoutes } from "@/worker/routes/neo-operation-room.js";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

export function generateStaticParams() {
  return [
    { path: ["ensure-access"] },
    { path: ["start"] },
    { path: ["refine"] },
    { path: ["result"] },
    { path: ["badges"] },
    { path: ["badges", "balance"] },
    { path: ["badges", "unlock-benefits"] },
  ];
}

function isStaticExportBuild() {
  return process.env.NODE_ENV === "production";
}

export async function GET(request: Request) {
  if (isStaticExportBuild()) {
    return Response.json({ ok: false, reason: "WORKER_RUNTIME_ONLY" });
  }
  return handleNeoOperationRoomRoutes(request, process.env);
}

export async function POST(request: Request) {
  return handleNeoOperationRoomRoutes(request, process.env);
}

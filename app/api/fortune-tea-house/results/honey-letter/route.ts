import { handleFortuneTeaHouseRoutes } from "@/worker/routes/fortune-tea-house.js";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

export async function POST(request: Request) {
  return handleFortuneTeaHouseRoutes(request, process.env);
}

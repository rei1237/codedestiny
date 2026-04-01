import { requireAdminSecret } from "../../_admin/requireAdminSecret";
import { serveAdminFile } from "../../_admin/serveAdminFile";

export async function GET(
  request: Request,
  context: { params: Promise<{ adminHash: string }> },
) {
  const params = await context.params;
  const blocked = await requireAdminSecret(request, params, { requireAuth: true });
  if (blocked) return blocked;
  return serveAdminFile(["[hash]", "security.html"]);
}

export async function POST() {
  return new Response("Not found", { status: 404 });
}


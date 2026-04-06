import { requireAdminSecret } from "../../_admin/requireAdminSecret";
import { serveAdminFile } from "../../_admin/serveAdminFile";

export async function GET(request: Request, { params }: { params: Promise<{ adminHash: string }> }) {
  const { adminHash } = await params;
  const blocked = await requireAdminSecret(request, { adminHash }, { requireAuth: true });
  if (blocked) return blocked;
  return serveAdminFile(["[hash]", "security.html"]);
}

export async function POST() {
  return new Response("Not found", { status: 404 });
}


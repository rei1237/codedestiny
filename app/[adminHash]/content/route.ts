import { NextResponse } from "next/server";
import { requireAdminSecret } from "../../_admin/requireAdminSecret";
import { serveAdminFile } from "../../_admin/serveAdminFile";

export async function GET(request: Request, { params }: { params: { adminHash: string } }) {
  const blocked = await requireAdminSecret(request, params, { requireAuth: true });
  if (blocked) return blocked;
  return serveAdminFile(["[hash]", "content.html"]);
}

export async function POST() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}


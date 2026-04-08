import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Vedic PDF generation moved to client-side to keep deployment bundle size within Cloudflare limits.",
      code: "CLIENT_SIDE_PDF_REQUIRED",
    },
    { status: 410 },
  );
}

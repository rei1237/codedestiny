import { NextResponse } from "next/server";

import { getKasiAllowedMethods, hasKasiApiKeyConfigured } from "../../../../lib/server/kasi-proxy";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      methods: getKasiAllowedMethods(),
      env: {
        astronomyApiKeyConfigured: hasKasiApiKeyConfigured(),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

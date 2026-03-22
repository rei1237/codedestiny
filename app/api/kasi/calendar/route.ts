import { NextResponse } from "next/server";

import { requestKasiCalendar } from "../../../../lib/server/kasi-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { method?: unknown; params?: unknown } = {};

  try {
    body = (await request.json()) as { method?: unknown; params?: unknown };
  } catch {
    return NextResponse.json(
      {
        ok: false,
        maintenance: false,
        message: "Invalid JSON body",
      },
      { status: 400 },
    );
  }

  try {
    const result = await requestKasiCalendar(body.method, body.params || {});
    return NextResponse.json(
      {
        ok: true,
        method: result.method,
        rows: result.rows,
        cache: result.cache,
        diagnostics: result.diagnostics,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const e = error as Error & { status?: number; code?: string; detail?: string };
    const status = e?.status && e.status >= 400 ? e.status : 503;
    const isMissingEnv = e?.code === "KASI_API_KEY_MISSING";

    return NextResponse.json(
      {
        ok: false,
        maintenance: !isMissingEnv,
        fallbackRecommended: false,
        message: isMissingEnv
          ? "Server misconfiguration: ASTRONOMY_API_KEY is required."
          : "KASI upstream is unavailable. Please retry shortly.",
        detail: e?.message || "KASI request failed",
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

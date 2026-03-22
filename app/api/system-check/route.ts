import { NextResponse } from "next/server";
import { access } from "node:fs/promises";
import path from "node:path";

import { hasKasiApiKeyConfigured, requestKasiCalendar } from "../../../lib/server/kasi-proxy";

export const runtime = "nodejs";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function checkKasi() {
  const envOk = hasKasiApiKeyConfigured();
  if (!envOk) {
    return {
      ok: false,
      status: "missing-env",
      message: "ASTRONOMY_API_KEY/KASI_SERVICE_KEY is missing",
      env: {
        astronomyApiKeyConfigured: false,
      },
    };
  }

  const now = new Date();
  try {
    const ping = await requestKasiCalendar("get24DivisionsInfo", {
      solYear: now.getFullYear(),
      solMonth: String(now.getMonth() + 1).padStart(2, "0"),
      solDay: String(now.getDate()).padStart(2, "0"),
    });
    return {
      ok: true,
      status: "ok",
      rows: ping.rows.length,
      cache: ping.cache,
      diagnostics: ping.diagnostics,
    };
  } catch (error) {
    const e = error as Error;
    return {
      ok: false,
      status: "upstream-failed",
      message: e?.message || "KASI check failed",
      env: {
        astronomyApiKeyConfigured: true,
      },
    };
  }
}

async function checkSwissEph() {
  const cwd = process.cwd();
  const loaderPath = path.join(cwd, "public", "js", "swisseph-loader.js");
  const localEphePath = path.join(cwd, "public", "ephe");
  const nativePkgPath = path.join(cwd, "node_modules", "swisseph");
  const expectedModuleSources = [
    "/js/vendor/swisseph.js",
    "https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@main/src/swisseph.js",
    "https://unpkg.com/swisseph-wasm@latest/src/swisseph.js",
  ];

  const loaderExists = await exists(loaderPath);
  const localEpheExists = await exists(localEphePath);
  const nativeModuleInstalled = await exists(nativePkgPath);

  const ok = loaderExists && (!nativeModuleInstalled || localEpheExists);

  return {
    ok,
    status: ok ? "ok" : "degraded",
    message: ok
      ? "SwissEph loader is available"
      : "SwissEph loader/data path is incomplete",
    mode: "swisseph-wasm-strict",
    strictPrecisionDefault: true,
    details: {
      loaderExists,
      nativeModuleInstalled,
      localEpheExists,
      expectedLocalEphePath: "public/ephe",
      expectedModuleSources,
    },
  };
}

export async function GET() {
  const [kasi, swissEph] = await Promise.all([checkKasi(), checkSwissEph()]);
  const ok = kasi.ok && swissEph.ok;

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      engines: {
        kasi,
        swissEph,
      },
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

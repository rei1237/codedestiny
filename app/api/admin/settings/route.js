import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "@/app/_lib/flowerAdminToken";
import { getSettings, updateSettings } from "@/app/_lib/models/AppSettingsModel";

export const runtime = "nodejs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeSettings(raw) {
  return {
    maintenanceMode: !!raw?.maintenanceMode,
    maintenanceMessage: String(raw?.maintenanceMessage || ""),
    newUserCoins: Number(raw?.newUserCoins || 0),
    popupEnabled: !!raw?.popupEnabled,
    popupTitle: String(raw?.popupTitle || ""),
    popupContent: String(raw?.popupContent || ""),
    cacheTtlSeconds: Number(raw?.cacheTtlSeconds || 0),
  };
}

async function ensureAdmin(request) {
  const token = extractAdminTokenFromRequest(request);
  if (!(await verifyFlowerAdminToken(token))) {
    return json({ ok: false, message: "Unauthorized" }, 401);
  }
  return null;
}

export async function GET(request) {
  const blocked = await ensureAdmin(request);
  if (blocked) return blocked;

  try {
    const settings = await getSettings();
    return json({ ok: true, settings: normalizeSettings(settings) });
  } catch (err) {
    console.error("[admin/settings GET]", err?.message || err);
    return json({ ok: false, message: "Server error" }, 500);
  }
}

export async function PATCH(request) {
  const blocked = await ensureAdmin(request);
  if (blocked) return blocked;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return json({ ok: false, message: "Bad request" }, 400);

    const patch = {
      maintenanceMode: !!body?.maintenanceMode,
      maintenanceMessage: String(body?.maintenanceMessage || "").slice(0, 500),
      newUserCoins: Math.max(0, Number(body?.newUserCoins || 0)),
      popupEnabled: !!body?.popupEnabled,
      popupTitle: String(body?.popupTitle || "").slice(0, 120),
      popupContent: String(body?.popupContent || "").slice(0, 5000),
      cacheTtlSeconds: Math.max(0, Number(body?.cacheTtlSeconds || 0)),
    };

    const updated = await updateSettings(patch);
    return json({ ok: true, settings: normalizeSettings(updated) });
  } catch (err) {
    console.error("[admin/settings PATCH]", err?.message || err);
    return json({ ok: false, message: "Server error" }, 500);
  }
}

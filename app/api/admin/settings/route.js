// GET /api/admin/settings — 현재 설정 조회
// PATCH /api/admin/settings — 설정 업데이트
export const runtime = "nodejs";

import { dbConnect } from "../../../_lib/dbConnect.js";
import { getSettings, updateSettings } from "../../../_lib/models/AppSettingsModel.js";
import {
  verifyFlowerAdminToken,
  extractAdminTokenFromRequest,
} from "../../../_lib/flowerAdminToken.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    await dbConnect();
    const settings = await getSettings();
    // _id, singletonKey, __v 등 내부 필드 제거
    const { _id, singletonKey, __v, ...clean } = settings;
    return json({ ok: true, settings: clean });
  } catch (err) {
    console.error("[admin/settings GET]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

export async function PATCH(request) {
  try {
    const token = extractAdminTokenFromRequest(request);
    if (!(await verifyFlowerAdminToken(token))) return json({ message: "Unauthorized" }, 401);

    let body;
    try { body = await request.json(); }
    catch { return json({ message: "잘못된 요청 형식입니다." }, 400); }

    if (!body || typeof body !== "object") return json({ message: "설정 데이터가 필요합니다." }, 400);

    await dbConnect();

    // 허용 필드만 추출 (보안: 임의 DB 필드 수정 방지)
    const ALLOWED = [
      "maintenanceMode", "maintenanceMessage",
      "newUserCoins",
      "fortuneCosts",
      "coinPackages",
      "popupEnabled", "popupTitle", "popupContent",
      "cacheTtlSeconds",
      "abuseRules",
      "ipBlockList",
    ];

    const patch = {};
    for (const key of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        patch[key] = body[key];
      }
    }

    if (Object.keys(patch).length === 0) {
      return json({ message: "변경할 설정 필드가 없습니다." }, 400);
    }

    const updated = await updateSettings(patch);
    const { _id, singletonKey, __v, ...clean } = JSON.parse(JSON.stringify(updated));
    return json({ ok: true, settings: clean });
  } catch (err) {
    console.error("[admin/settings PATCH]", err?.message || err, err?.stack || "");
    return json({ message: `서버 오류: ${err?.message || "알 수 없는 오류"}` }, 500);
  }
}

// GET /api/admin/diag
// 관리자 스택 단계별 진단 — 인증 불필요 (반환값에 민감 정보 없음)
// 각 단계가 성공/실패인지 구체적인 에러와 함께 반환
export const runtime = "nodejs";

import { dbConnect } from "../../../_lib/dbConnect.js";
import { getUserModel } from "../../../_lib/models/UserModel.js";
import { verifyFlowerAdminToken, generateFlowerAdminToken } from "../../../_lib/flowerAdminToken.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  const steps = [];

  // ── 1. 환경변수 확인 ─────────────────────────────────────────────
  const mongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
  const flowerSecret = (process.env.FLOWER_ADMIN_SECRET || "").trim();
  steps.push({
    step: 1,
    name: "env-check",
    ok: mongoUri.length > 0,
    detail: {
      MONGO_URI_set: mongoUri.length > 0,
      MONGO_URI_prefix: mongoUri.slice(0, 20) || "(empty)",
      FLOWER_ADMIN_SECRET_set: flowerSecret.length > 0,
      NODE_ENV: process.env.NODE_ENV || "(not set)",
    },
  });

  // ── 2. dbConnect ─────────────────────────────────────────────────
  let mongoose;
  try {
    mongoose = await dbConnect();
    steps.push({
      step: 2,
      name: "dbConnect",
      ok: true,
      detail: {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host || "(none)",
        db: mongoose.connection.name || "(none)",
      },
    });
  } catch (e) {
    steps.push({ step: 2, name: "dbConnect", ok: false, error: String(e?.message || e) });
    return json({ ok: false, steps });
  }

  // ── 3. getUserModel ───────────────────────────────────────────────
  let User;
  try {
    User = await getUserModel();
    steps.push({ step: 3, name: "getUserModel", ok: true });
  } catch (e) {
    steps.push({ step: 3, name: "getUserModel", ok: false, error: String(e?.message || e) });
    return json({ ok: false, steps });
  }

  // ── 4. countDocuments ─────────────────────────────────────────────
  try {
    const count = await User.countDocuments({});
    steps.push({ step: 4, name: "countDocuments", ok: true, detail: { count } });
  } catch (e) {
    steps.push({ step: 4, name: "countDocuments", ok: false, error: String(e?.message || e) });
  }

  // ── 5. aggregate (stats와 동일 패턴) ─────────────────────────────
  try {
    const result = await User.aggregate([
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);
    steps.push({ step: 5, name: "aggregate-simple", ok: true, detail: { rows: result.length } });
  } catch (e) {
    steps.push({ step: 5, name: "aggregate-simple", ok: false, error: String(e?.message || e) });
  }

  // ── 6. $dateToString aggregate (stats에서 사용) ───────────────────
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const result = await User.aggregate([
      { $match: { joinedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$joinedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    steps.push({ step: 6, name: "aggregate-dateToString", ok: true, detail: { rows: result.length } });
  } catch (e) {
    steps.push({ step: 6, name: "aggregate-dateToString", ok: false, error: String(e?.message || e) });
  }

  // ── 6-b. FLOWER_ADMIN_SECRET 설정 여부 경고 ──────────────────────
  const flowerSecretOk = (process.env.FLOWER_ADMIN_SECRET || "").trim().length > 0;
  steps.push({
    step: "6b",
    name: "flower-admin-secret",
    ok: flowerSecretOk,
    detail: flowerSecretOk
      ? "FLOWER_ADMIN_SECRET 설정됨 — 정상"
      : "⚠️ FLOWER_ADMIN_SECRET 미설정 — 기본 플레이스홀더 사용 중. Cloudflare Pages 환경변수에 등록하세요.",
  });

  // ── 7. generateFlowerAdminToken ───────────────────────────────────
  let testToken;
  try {
    testToken = await generateFlowerAdminToken();
    steps.push({ step: 7, name: "generateFlowerAdminToken", ok: true, tokenLength: testToken.length });
  } catch (e) {
    steps.push({ step: 7, name: "generateFlowerAdminToken", ok: false, error: String(e?.message || e) });
  }

  // ── 8. verifyFlowerAdminToken (방금 만든 토큰 검증) ──────────────
  if (testToken) {
    try {
      const valid = await verifyFlowerAdminToken(testToken);
      steps.push({ step: 8, name: "verifyFlowerAdminToken", ok: valid, detail: { valid } });
    } catch (e) {
      steps.push({ step: 8, name: "verifyFlowerAdminToken", ok: false, error: String(e?.message || e) });
    }
  }

  // ── 9. 요청 헤더 echo (Authorization 마스킹) ─────────────────────
  const authHeader = request.headers.get("authorization") || "";
  const hasToken = authHeader.startsWith("Bearer ") && authHeader.length > 8;
  steps.push({
    step: 9,
    name: "request-headers",
    ok: true,
    detail: {
      hasAuthHeader: hasToken,
      authPreview: hasToken ? `Bearer ${authHeader.slice(7, 15)}…` : "(none)",
      contentType: request.headers.get("content-type") || "(none)",
    },
  });

  // ── 10. 제공된 Bearer 토큰 검증 ──────────────────────────────────
  if (hasToken) {
    const bearerToken = authHeader.slice(7).trim();
    try {
      const valid = await verifyFlowerAdminToken(bearerToken);
      steps.push({
        step: 10,
        name: "verify-provided-token",
        ok: valid,
        detail: { valid },
        note: valid
          ? "토큰 정상 — 이 토큰을 쓰면 인증이 통과해야 합니다."
          : "토큰 검증 실패 — 만료됐거나 FLOWER_ADMIN_SECRET이 변경됐습니다. 관리자 패널에서 로그아웃 후 재로그인하세요.",
      });
    } catch (e) {
      steps.push({ step: 10, name: "verify-provided-token", ok: false, error: String(e?.message || e) });
    }
  }

  const allOk = steps.every((s) => s.ok !== false);
  return json({ ok: allOk, stepCount: steps.length, steps });
}

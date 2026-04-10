import { proxyLegacyApi } from "../../../_lib/legacyApiProxy";
import { generateFlowerAdminToken } from "../../../../_lib/flowerAdminToken";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_ENTRY_PASSWORD_SHA256_LIST = [
  // 운영 기준 비밀번호
  "f76a173ef47f93eec43168e10fc32dcbefb2d32200c44cbd33e4f0324437fb4e", // kangta!7989
  // 임시 호환 비밀번호
  "29034f32ce15fe7e459fc1ab512847643b068dd2d297c7ce5ff77eac516fc09b", // angta!7989
];

function verifyAdminEntryPassword(rawInput) {
  const input = String(rawInput || "").trim();
  if (!input) return false;

  const inputHex = createHash("sha256").update(input, "utf8").digest("hex");
  const inputBuf = Buffer.from(inputHex, "hex");

  for (const expectedHex of ADMIN_ENTRY_PASSWORD_SHA256_LIST) {
    if (!/^[a-f0-9]{64}$/.test(expectedHex)) continue;
    const expectedBuf = Buffer.from(expectedHex, "hex");
    if (expectedBuf.length !== inputBuf.length) continue;
    if (timingSafeEqual(expectedBuf, inputBuf)) return true;
  }

  return false;
}

async function buildLocalSuccessResponse() {
  const adminToken = await generateFlowerAdminToken();
  const response = NextResponse.json({
    ok: true,
    nextUrl: "/admin",
    adminToken,
  });

  response.cookies.set("flower_admin_token", adminToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });

  return response;
}

export async function GET(request) {
  return proxyLegacyApi(request);
}

export async function POST(request) {
  let proxiedResponse = null;
  const fallbackRequest = request.clone();

  try {
    proxiedResponse = await proxyLegacyApi(request);
    if (proxiedResponse.ok) return proxiedResponse;
  } catch {
    // 프록시 실패 시 아래 로컬 폴백 검증을 진행한다.
  }

  try {
    const body = await fallbackRequest.json();
    if (verifyAdminEntryPassword(body?.password)) {
      return await buildLocalSuccessResponse();
    }
  } catch {
    // JSON 파싱 실패 또는 로컬 검증 실패 시 프록시 응답을 그대로 반환한다.
  }

  return proxiedResponse || NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
}

export async function PUT(request) {
  return proxyLegacyApi(request);
}

export async function PATCH(request) {
  return proxyLegacyApi(request);
}

export async function DELETE(request) {
  return proxyLegacyApi(request);
}

export async function OPTIONS(request) {
  return proxyLegacyApi(request);
}

export async function HEAD(request) {
  return proxyLegacyApi(request);
}

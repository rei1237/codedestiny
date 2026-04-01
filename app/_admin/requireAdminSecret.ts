import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
const ADMIN_SECURITY_LEVEL = String(process.env.ADMIN_SECURITY_LEVEL || "relaxed").toLowerCase();
const IS_STRICT_SECURITY = ADMIN_SECURITY_LEVEL === "strict";

function parseAllowedIps(raw) {
  return String(raw || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function getClientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    // x-forwarded-for: "client, proxy1, proxy2"
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const ip = request.headers.get("x-real-ip");
  if (ip) return ip;
  // fallback: Next may not give remoteAddress, but we can best-effort
  return request.headers.get("cf-connecting-ip") || "0.0.0.0";
}

function isIpAllowed(request, allowedIps) {
  if (!allowedIps || allowedIps.length === 0) {
    // relaxed 모드에서는 허용 목록 미설정 시 접근 허용
    return !IS_STRICT_SECURITY;
  }
  const ip = getClientIp(request);
  return allowedIps.includes(ip);
}

function decodeJwtRole(token, jwtSecret) {
  const payload = jwt.verify(token, jwtSecret);
  if (!payload || typeof payload !== "object") return undefined;
  // 2FA 우회 방지:
  // - 일반 로그인 토큰(issuer=code-destiny-api)과 구분하기 위해
  // - 관리자 세션 토큰(issuer=code-destiny-admin)만 허용한다.
  if (IS_STRICT_SECURITY && payload.iss !== "code-destiny-admin") return undefined;
  return payload.role;
}

export async function requireAdminSecret(
  request: Request,
  params: { adminHash?: string },
  options: { requireAuth?: boolean } = {},
) {
  const { adminHash } = params;
  const expected = String(process.env.ADMIN_SECRET_HASH || "").trim();
  const allowedIps = parseAllowedIps(process.env.ADMIN_ALLOWED_IPS);

  // 관리자 URL을 쓰지 않는 배포(해시 미설정)에서는 이 동적 라우트가 단일 세그먼트 경로를 잡아
  // 모든 요청에 JSON {"message":"Not found"}를 뿌리는 문제가 생긴다 → HTML 404(notFound)로 통일.
  if (!expected) {
    notFound();
  }

  // 1) 비밀 해시 경로 검증 (실제 해시 값은 env에만 존재)
  if (!adminHash || String(adminHash) !== expected) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // 2) IP 화이트리스트 검증 (허용되지 않으면 404로 위장)
  if (!isIpAllowed(request, allowedIps)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const requireAuth = !!options.requireAuth;
  if (!requireAuth) return null;

  // 3) 세션 인증(쿠키 기반) - 접근 전용
  const cookieStore = await cookies();
  const token = cookieStore.get("fortune_auth_token")?.value;
  if (!token) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const jwtSecret = process.env.JWT_SECRET || "dev-secret";
    const role = decodeJwtRole(token, jwtSecret);
    if (role !== "admin") return NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return null;
}


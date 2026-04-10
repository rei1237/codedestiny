/**
 * 네이티브 인증 헬퍼 — Cloudflare Workers (open-next) 환경에서 직접 MongoDB + JWT 사용
 * proxyLegacyApi 루프 우회용 네이티브 구현 레이어.
 * app/api/_lib의 자급자족형 유틸만 사용 (server/ 임포트 없음).
 */
import { dbConnect } from "../../_lib/dbConnect.js";
import AppUser from "../../_lib/AppUser.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export { dbConnect, AppUser as User, bcrypt };

/** JWT 서명 */
export function signToken(user) {
  return jwt.sign(
    {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "dev-secret",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      issuer: "code-destiny-api",
    },
  );
}

/** JWT 검증 */
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
}

/** 응답용 사용자 정보 정규화 */
export function normalizeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    gender: user.gender,
    role: user.role,
    points: user.points,
    joinedAt: user.joinedAt,
  };
}

/** Next.js Request에서 Bearer 토큰 또는 쿠키 토큰 추출 */
export function getTokenFromRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/fortune_auth_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

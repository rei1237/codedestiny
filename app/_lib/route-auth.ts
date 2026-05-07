import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

type AuthPayload = {
  userId?: string;
  id?: string;
};

function getTokenFromRequest(req: NextRequest): string {
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;
  return String(req.cookies.get("fortune_auth_token")?.value || "").trim();
}

function extractUserId(decoded: string | jwt.JwtPayload): string {
  if (!decoded || typeof decoded === "string") return "";
  const payload = decoded as AuthPayload;
  const userId = String(payload.userId || payload.id || "").trim();
  return /^[a-f0-9]{24}$/i.test(userId) ? userId : "";
}

export function requireRouteAuth(req: NextRequest): { ok: true; userId: string } | { ok: false; response: NextResponse } {
  const token = getTokenFromRequest(req);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "LOGIN_REQUIRED",
          message: "로그인 후 이용할 수 있습니다.",
        },
        { status: 401 },
      ),
    };
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || "dev-secret";
    const decoded = jwt.verify(token, secret);
    const userId = extractUserId(decoded);
    if (!userId) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            success: false,
            error: "LOGIN_REQUIRED",
            message: "로그인 후 이용할 수 있습니다.",
          },
          { status: 401 },
        ),
      };
    }
    return { ok: true, userId };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "LOGIN_REQUIRED",
          message: "로그인 후 이용할 수 있습니다.",
        },
        { status: 401 },
      ),
    };
  }
}

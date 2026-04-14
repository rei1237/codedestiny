import jwt from "jsonwebtoken";
import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "../../_lib/flowerAdminToken";

export function verifyJwtFromRequest(request) {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  } catch {
    return null;
  }
}

export async function isAdminRequest(request) {
  const adminToken = extractAdminTokenFromRequest(request);
  if (!adminToken) return false;
  return verifyFlowerAdminToken(adminToken);
}

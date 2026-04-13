import jwt from "jsonwebtoken";
import { extractAdminTokenFromRequest, verifyFlowerAdminToken } from "../../_lib/flowerAdminToken";

export const ADMIN_VIRTUAL_COINS = 9999;

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

export function withAdminVirtualPoints(userLike, adminMode) {
  if (!userLike || typeof userLike !== "object") return userLike;
  if (!adminMode) return userLike;
  return { ...userLike, points: ADMIN_VIRTUAL_COINS };
}

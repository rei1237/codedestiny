/**
 * requireAdminSecret
 *
 * Validates the adminHash URL segment against ADMIN_SECRET_HASH env var.
 * Optionally verifies the fortune_auth_token cookie when requireAuth=true.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyFlowerAdminToken } from "../_lib/flowerAdminToken.js";

interface RequireAdminOptions {
  requireAuth?: boolean;
}

/**
 * @returns null  if the request is allowed to proceed
 * @returns NextResponse  (404 or 401) if the request should be blocked
 */
export async function requireAdminSecret(
  _request: Request,
  params: { adminHash?: string } | null | undefined,
  options: RequireAdminOptions = {},
): Promise<NextResponse | null> {
  const hash = String(params?.adminHash || "");
  const expected = String(process.env.ADMIN_SECRET_HASH || "").trim();

  // If ADMIN_SECRET_HASH is configured, the URL segment must match exactly.
  if (expected && hash !== expected) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (options.requireAuth) {
    const cookieStore = await cookies();
    const token = cookieStore.get("fortune_auth_token")?.value ?? "";
    const valid = token ? await verifyFlowerAdminToken(token) : false;
    if (!valid) {
      // Return 401 as JSON so the SPA can redirect to login
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  return null;
}

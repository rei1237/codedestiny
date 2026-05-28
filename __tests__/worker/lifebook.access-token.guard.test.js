/**
 * @jest-environment node
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("lifebook access token guard", () => {
  test("handleLifebookSession forwards header premium token to access checker", () => {
    const filePath = path.resolve(__dirname, "../../worker/routes/premium.js");
    const src = fs.readFileSync(filePath, "utf8");

    expect(src.includes("const tokenFromHeader = String(request.headers.get(\"x-premium-access-token\") || \"\").trim();")).toBe(true);
    expect(src.includes("const premiumAccessToken = tokenFromBody || tokenFromCookie || tokenFromHeader;")).toBe(true);
    expect(src.includes("...(premiumAccessToken ? { premiumAccessToken } : {}),")).toBe(true);
  });

  test("lifebook access request body carries payment context for evidence binding", () => {
    const filePath = path.resolve(__dirname, "../../worker/routes/premium.js");
    const src = fs.readFileSync(filePath, "utf8");

    expect(src.includes("reportSessionId: accessGrant.sessionId,")).toBe(true);
    expect(src.includes("_paymentContext:")).toBe(true);
    expect(src.includes("payment:")).toBe(true);
  });
});

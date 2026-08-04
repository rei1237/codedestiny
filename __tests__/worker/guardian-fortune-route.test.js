/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import { handleFortuneRoutes } from "../../worker/routes/fortune.js";

describe("Guardian Fortune Worker routes", () => {
  it("returns a safe disabled usage response when the API flag is off", async () => {
    const response = await handleFortuneRoutes(
      new Request("https://example.test/api/fortune/guardian/usage"),
      {},
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      canGenerate: false,
      generationSource: "blocked",
    });
  });

  it("does not read a request body or call a provider while generation is disabled", async () => {
    const response = await handleFortuneRoutes(
      new Request("https://example.test/api/fortune/guardian/generate", { method: "POST" }),
      {},
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "GUARDIAN_FORTUNE_FEATURE_DISABLED",
    });
  });

  it("keeps the SSE chat route behind the existing Guardian feature flag", async () => {
    const response = await handleFortuneRoutes(
      new Request("https://example.test/api/fortune/guardian/chat", { method: "POST" }),
      {},
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "GUARDIAN_FORTUNE_FEATURE_DISABLED",
    });
  });
});

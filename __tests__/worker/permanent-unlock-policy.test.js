/**
 * @jest-environment node
 */

import { PermissionService } from "../../worker/lib/permission-service.js";
import {
  resolvePaidContentUnlockTarget,
  USER_SCOPE_PROFILE_ID,
} from "../../worker/lib/content-unlocks.js";

test("user-scoped unlock stays account-wide even when checkout includes a profile id", () => {
  const target = resolvePaidContentUnlockTarget({
    userId: "user-1",
    profileId: "profile-from-checkout",
    featureKey: "premium-sibyl-dominator",
  });

  expect(target.scope).toBe("USER");
  expect(target.profileId).toBe(USER_SCOPE_PROFILE_ID);
  expect(target.featureKey).toBe("premium-sibyl-dominator");
});

test("registry profile unlock keeps its requested profile boundary", () => {
  const target = resolvePaidContentUnlockTarget({
    userId: "user-1",
    profileId: "profile-1",
    featureKey: "section_summary",
  });

  expect(target.scope).toBe("PROFILE");
  expect(target.profileId).toBe("profile-1");
  expect(target.contentKey).toBe("saju.fullReading");
});

test("PermissionService separates permanent unlock from per-use access", () => {
  expect(PermissionService.canUse("section_summary", {
    unlockMap: { section_summary: true },
  })).toMatchObject({ allowed: true, reason: "permanent_unlock", accessModel: "unlock" });

  expect(PermissionService.canUse("life-book-ai-consultation", {
    unlockMap: { "life-book-ai-consultation": true },
  })).toMatchObject({ allowed: false, reason: "per_use_required", accessModel: "per_use" });
});

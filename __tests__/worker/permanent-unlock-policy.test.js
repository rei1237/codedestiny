/**
 * @jest-environment node
 */

import { PermissionService } from "../../worker/lib/permission-service.js";
import {
  resolvePaidContentUnlockTarget,
  USER_SCOPE_PROFILE_ID,
} from "../../worker/lib/content-unlocks.js";

test("birth-scoped unlock never falls back to the account even when checkout asks for USER scope", () => {
  const target = resolvePaidContentUnlockTarget({
    userId: "user-1",
    profileId: "profile-from-checkout",
    featureKey: "premium-sibyl-dominator",
    scope: "USER",
  });

  // 출생 기반 — 요청 scope 는 무시되고, 신원은 저장 프로필의 생년월일로 서버가 정한다.
  expect(target.scope).toBe("BIRTH");
  expect(target.requiresProfile).toBe(true);
  expect(target.profileId).toBe("profile-from-checkout");
  expect(target.featureKey).toBe("premium-sibyl-dominator");
});

test("birth-scoped unlock without a profile id stays profile-less (the resolver rejects it)", () => {
  const target = resolvePaidContentUnlockTarget({ userId: "user-1", profileId: USER_SCOPE_PROFILE_ID, featureKey: "section_summary" });
  expect(target.scope).toBe("BIRTH");
  expect(target.profileId).toBe("");
  expect(target.contentKey).toBe("saju.fullReading");
});

test("account-scoped unlock keeps its account boundary", () => {
  const target = resolvePaidContentUnlockTarget({
    userId: "user-1",
    profileId: "profile-1",
    featureKey: "flower-fc",
  });

  expect(target.scope).toBe("USER");
  expect(target.profileId).toBe(USER_SCOPE_PROFILE_ID);
});

test("PermissionService separates permanent unlock from per-use access", () => {
  expect(PermissionService.canUse("section_summary", {
    unlockMap: { section_summary: true },
  })).toMatchObject({ allowed: true, reason: "permanent_unlock", accessModel: "unlock" });

  expect(PermissionService.canUse("life-book-ai-consultation", {
    unlockMap: { "life-book-ai-consultation": true },
  })).toMatchObject({ allowed: false, reason: "per_use_required", accessModel: "per_use" });
});

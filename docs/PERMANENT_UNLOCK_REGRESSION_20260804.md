# Permanent unlock regression remediation

## Root cause evidence

1. `resolvePaidContentUnlockTarget()` selected PROFILE scope whenever checkout supplied a `profileId`. Account-wide unlock products were therefore written under an incidental checkout profile and disappeared after profile changes.
2. Login hydration and feature gates used different evidence. `/api/me/access-state` read `ContentEntitlement`, while `paid-feature-access.js` preferred `User` arrays and Payment fallback. Pass/monthly grants could exist in the entitlement ledger but still be reported as locked by another screen.
3. `/api/me/access-state` preferred the stored previous profile over the requested profile and also ran `PointHistory.distinct` on the display hot path.
4. Browser state was split between AccessStore, a 24-hour cache, a 72-hour verified ledger, optimistic state, and compatibility maps. A full or degraded snapshot could replace a locally confirmed payment grant.
5. Payment responses did not share one grant contract, so some verified payments never reached the common client store in the confirmation frame.

## Corrected invariant

- Registry `accessModel:"unlock"` is the only permanent-unlock classification.
- The first successful direct payment, monthly-credit use, or pass-covered open writes the same `ContentEntitlement` permanent grant. Payment method is evidence, not permission logic.
- Registry `accessModel:"per_use"` never becomes a permanent permission merely because a legacy User, Payment, or entitlement record exists.
- Authentication failure and permission/display degradation remain different states. A signed-in display read may degrade without returning 401 or erasing last-known-good unlocks.

## Data and API contract

- New canonical fields: `featureKey`, `grantType`, `evidenceId`, `grantedAt`.
- Canonical identity: `{ userId, profileId, featureKey, scope }` with a partial unique index for non-empty `featureKey`.
- Payment success: `unlockGrant: { id, featureKey, profileId, scope, grantType:"permanent_unlock", status:"active", grantedAt, version }`.
- Access snapshot: requested profile first; one authenticated User read plus one indexed ContentEntitlement read. Legacy User arrays remain read-only compatibility evidence for registry unlock keys.
- Display DB timeout: `200`, `degraded:true`, `authority:"none"`; no empty authoritative unlock map.

## Client behavior

- `CodeDestinyAccessStore` v4 owns confirmed, server snapshot, and optimistic projections.
- A verified `unlockGrant` is applied immediately and persisted without TTL per user/profile.
- Degraded or stale snapshots cannot revoke a confirmed grant. Revocation requires a full server snapshot with a version and explicit `revokedFeatureIds`.
- Logout clears the active in-memory view but retains the user-scoped local cache for the next verified login.
- React, root static shell, standalone static UI, compatibility `unlockedFeatureMap`, storage events, and BroadcastChannel consume the same Store projection.

## Performance and resilience result

- Removed `PointHistory.distinct` from login access-state hydration.
- Removed Payment lookup from the normal canonical entitlement hit; Payment remains a missing-record compatibility fallback only.
- AccessStore keeps one in-flight login/profile snapshot request, zero card-render unlock requests, no automatic 503 retry burst, and one explicit post-payment reconciliation.
- Mock regression coverage verifies signed-in degraded 200, requested-profile precedence, confirmed-grant persistence beyond cache TTL, logout/login restore, cross-tab propagation, and per-use separation.

## Rollout and rollback

- Apply `scripts/migrations/20260804-add-permanent-unlock-index.mjs --check` first. Production index creation requires separate approval; no legacy backfill or deletion is performed.
- Deploy Worker and Pages only through the approved main CI workflow after PR checks pass.
- Rollback is PR revert plus previous Worker/Pages version restore. Additive fields and the partial index can remain; no data deletion is required.

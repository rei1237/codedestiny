#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8").replace(/\r\n/g, "\n");
}

const publicClientPath = path.join(root, "public/js/destiny-profile.js");
const targets = {
  client: read("js/destiny-profile.js"),
  publicClient: fs.existsSync(publicClientPath) ? read("public/js/destiny-profile.js") : "",
  profileRoute: read("worker/routes/profile.js"),
  moonstoneProof: read("worker/lib/profile-moonstone-mutation.js"),
  authRoute: read("worker/routes/auth.js"),
  limits: read("worker/lib/profile-limits.js"),
  packageJson: read("package.json"),
};

const failures = [];

function expect(sourceKey, marker, label) {
  if (!targets[sourceKey].includes(marker)) {
    failures.push(`${label}: missing ${JSON.stringify(marker)} in ${sourceKey}`);
  }
}

function expectAbsent(sourceKey, marker, label) {
  if (targets[sourceKey].includes(marker)) {
    failures.push(`${label}: forbidden ${JSON.stringify(marker)} found in ${sourceKey}`);
  }
}

expect("limits", "export const PROFILE_POLICY_SNAPSHOT_TTL_MS = 10 * 60 * 1000", "policy snapshot TTL");
expect("limits", "export function buildProfilePolicySnapshot", "shared policy snapshot builder");
expect("limits", "maxProfileCount", "policy snapshot exposes maxProfileCount");
expect("authRoute", "profilePolicySnapshot: buildProfilePolicySnapshot", "auth response carries login-time policy");
expect("profileRoute", "profilePolicySnapshot: buildProfilePolicySnapshot", "profile APIs carry policy snapshot");
expect("profileRoute", "serverSyncedAt", "profile APIs expose sync timestamp");
expectAbsent("profileRoute", "PROFILE_LIMIT_RECONCILE_REQUIRED", "valid paid creation is not rejected by included slot limits");
expect("profileRoute", "countDocuments({ userId: auth.userId })", "server final create validation counts once");
expect("profileRoute", "findCompletedProfileMutationReplay", "delete replay lookup is present");
expect("profileRoute", "delete_replay", "delete replay returns a completed mutation state");
expect("profileRoute", "trace.stage = \"delete_mutation\"", "profile mutation trace records delete stage");
expectAbsent("profileRoute", "const createPolicy = await resolveProfileCardActionAccess", "create no longer performs server-first policy preflight");
// A request ID selects a server ledger entry; it is never sufficient proof by itself.
expect("profileRoute", "return findProfileMoonstoneEvidence({ userId: auth.userId, ...input })", "profile API validates scoped server evidence");
expect("moonstoneProof", "findMoonstoneSpendEvidence", "common settled spend verification");
expect("moonstoneProof", "row.sourceId !== requestId || row.profileId !== profileId || !PROFILE_CARD_ACCEPTED_MONTHLY_STONE_COSTS.includes(row.amount)", "request identity, profile and exact (current or pre-2026-10-10 legacy) price are verified");
expect("moonstoneProof", "storedAction !== action", "proof binds the mutation action");
expect("moonstoneProof", "moonstoneSpendRefundFilter()", "refunded proof is excluded");

expect("client", "KEY_POLICY_PREFIX", "client caches scoped policy snapshots");
expect("client", "PROFILE_POLICY_TTL_MS = 10 * 60 * 1000", "client policy cache has 10 minute TTL");
expect("client", "_dpApplyProfilePolicySnapshot", "client applies server/auth policy snapshots");
// 2026-10-11 카드 개수 상한·수수료 폐지: 클라이언트 선검사와 서버 재조정 분기는 남아 있으면 안 된다.
expectAbsent("client", "createRequiresPayment", "client no longer gates create on a local profile limit");
expect("client", "applyOptimisticCreate", "client applies optimistic create");
expect("client", "rollbackOptimisticCreate", "client rolls back failed create");
expect("client", "applyOptimisticDelete", "client applies optimistic delete after payment gate");
expect("client", "rollbackOptimisticDelete", "client rolls back failed delete");
expectAbsent("client", "PROFILE_LIMIT_RECONCILE_REQUIRED", "client no longer reconciles a server profile limit");
expect("client", "_dpVerifyLoginSession(false, { allowIndeterminate: true })", "client preserves a hinted session during transient auth failure");
expect("client", "_dpRunTransientRetry", "client retries bounded transient mutations");
expect("client", "maxTransientRetries: 2", "client caps transient retries at two");
expect("client", "retryTransient: true", "profile mutations opt into transient retry");
expect("client", "PROFILE_MUTATION_TRANSIENT_UNAVAILABLE", "client shows a degraded mutation fallback");
expect("client", "status === 503 || status === 504", "client retries only server transient statuses");
expect("client", "dp-delete-gate__warning", "delete gate explains irreversible deletion");
expect("client", "프로필 카드 \"' + String((profile && profile.name)", "delete success names the removed profile");
expectAbsent("client", "DP_PROFILE_DELETE_GATE_SPRITE_URL", "delete gate does not depend on sprite animation");
expectAbsent("client", "setInterval(applyFrame, 140)", "delete gate has no animated frame loop");
expect("packageJson", "verify:profile-client-first", "package exposes client-first verifier");
expect("profileRoute", "trace.stage", "profile 503 logs include mutation stage");
expect("authRoute", "profilePolicySnapshot", "auth response carries profile policy");

if (targets.publicClient && targets.publicClient !== targets.client) {
  failures.push("public/js/destiny-profile.js differs from js/destiny-profile.js; run npm run sync:public");
}

if (failures.length) {
  console.error("[verify-profile-client-first] failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[verify-profile-client-first] ok");

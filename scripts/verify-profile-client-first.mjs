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
expect("profileRoute", "PROFILE_LIMIT_RECONCILE_REQUIRED", "server hard validation asks client to reconcile");
expect("profileRoute", "countDocuments({ userId: auth.userId })", "server final create validation counts once");
expectAbsent("profileRoute", "const createPolicy = await resolveProfileCardActionAccess", "create no longer performs server-first policy preflight");
expectAbsent("profileRoute", "source.requestId", "request id is not treated as payment evidence");

expect("client", "KEY_POLICY_PREFIX", "client caches scoped policy snapshots");
expect("client", "PROFILE_POLICY_TTL_MS = 10 * 60 * 1000", "client policy cache has 10 minute TTL");
expect("client", "_dpApplyProfilePolicySnapshot", "client applies server/auth policy snapshots");
expect("client", "createRequiresPayment", "client checks local profile limit before create");
expect("client", "applyOptimisticCreate", "client applies optimistic create");
expect("client", "rollbackOptimisticCreate", "client rolls back failed create");
expect("client", "applyOptimisticDelete", "client applies optimistic delete after payment gate");
expect("client", "rollbackOptimisticDelete", "client rolls back failed delete");
expect("client", "PROFILE_LIMIT_RECONCILE_REQUIRED", "client handles hard validation reconcile");
expect("client", "_dpVerifyLoginSession(false)", "client avoids forced auth preflight before mutation");
expect("packageJson", "verify:profile-client-first", "package exposes client-first verifier");

if (targets.publicClient && targets.publicClient !== targets.client) {
  failures.push("public/js/destiny-profile.js differs from js/destiny-profile.js; run npm run sync:public");
}

if (failures.length) {
  console.error("[verify-profile-client-first] failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[verify-profile-client-first] ok");

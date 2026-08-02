#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

export function evaluatePagesPrContract({ baseSha, headSha, checkedSha, baseIsAncestor }) {
  const failures = [];

  if (!baseSha || !headSha) {
    failures.push("Pull request base/head SHA is missing.");
  }
  if (checkedSha && headSha && checkedSha !== headSha) {
    failures.push(`The checkout is ${checkedSha}, but the PR head is ${headSha}.`);
  }
  if (baseIsAncestor === false) {
    failures.push("The PR head does not include the latest base branch. Rebase onto the current main branch before Pages validation.");
  }

  return { ok: failures.length === 0, failures };
}

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return String(result.stdout || "").trim();
}

function runSelfTest() {
  const base = "base-sha";
  const head = "head-sha";
  const fresh = evaluatePagesPrContract({ baseSha: base, headSha: head, checkedSha: head, baseIsAncestor: true });
  const stale = evaluatePagesPrContract({ baseSha: base, headSha: head, checkedSha: head, baseIsAncestor: false });
  const wrongCheckout = evaluatePagesPrContract({ baseSha: base, headSha: head, checkedSha: "other-sha", baseIsAncestor: true });

  if (!fresh.ok) throw new Error("fresh PR contract should pass");
  if (stale.ok || !stale.failures.some((failure) => /Rebase/.test(failure))) throw new Error("stale PR contract should fail");
  if (wrongCheckout.ok || !wrongCheckout.failures.some((failure) => /checkout/.test(failure))) throw new Error("wrong checkout should fail");

  console.log("[verify-pages-pr-contract] self-test passed");
}

function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.log("[verify-pages-pr-contract] local run skipped: GITHUB_EVENT_PATH is not set.");
    return;
  }

  const event = JSON.parse(readFileSync(eventPath, "utf8"));
  const pullRequest = event.pull_request;
  if (!pullRequest?.base?.sha || !pullRequest?.head?.sha) {
    throw new Error("This guard requires a pull_request event with base.sha and head.sha.");
  }

  const checkedSha = git(["rev-parse", "HEAD"]);
  const baseIsAncestor = spawnSync("git", ["merge-base", "--is-ancestor", pullRequest.base.sha, pullRequest.head.sha]).status === 0;
  const result = evaluatePagesPrContract({
    baseSha: pullRequest.base.sha,
    headSha: pullRequest.head.sha,
    checkedSha,
    baseIsAncestor,
  });

  if (!result.ok) {
    console.error("::error::[verify-pages-pr-contract] Pages validation blocked.");
    for (const failure of result.failures) console.error(`::error::${failure}`);
    process.exit(1);
  }

  console.log(`[verify-pages-pr-contract] PASS: ${pullRequest.head.sha} includes base ${pullRequest.base.sha}.`);
}

main();

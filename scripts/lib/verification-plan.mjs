import { spawnSync } from "node:child_process";
import { riskOf, requiresDeepVerification } from "./change-risk.mjs";
import { NODE_TEST_PATTERNS, JEST_BASE_ARGS } from "./mock-test-config.mjs";

// Include both rename endpoints and deleted paths when assessing callers.
export function parseChangeRecords(output) {
  const parts = output.split("\0").filter(Boolean);
  const records = [];
  for (let i = 0; i < parts.length;) {
    const status = parts[i++];
    if (!/^[ACDMRTUXB][0-9]*$/.test(status) || !parts[i]) throw new Error("Invalid git name-status output");
    const files = [parts[i++]];
    if (/^[RC]/.test(status)) {
      if (!parts[i]) throw new Error("Missing rename/copy destination");
      files.push(parts[i++]);
    }
    records.push({ status, files });
  }
  return records;
}

export function parseNameStatus(output) {
  return [...new Set(parseChangeRecords(output).flatMap((record) => record.files))].sort();
}

export function collectChanges({ root = process.cwd(), base = "origin/main", head = "HEAD", working = true } = {}) {
  const git = (args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
    if (result.status !== 0) throw new Error(`git ${args[0]} failed; full verification required`);
    return result.stdout;
  };
  let baseSha = null;
  let headSha = null;
  const files = new Set();
  const deletedOrRenamedFiles = new Set();
  const include = (output) => {
    for (const record of parseChangeRecords(output)) {
      record.files.forEach((file) => files.add(file));
      if (/^[DR]/.test(record.status)) record.files.forEach((file) => deletedOrRenamedFiles.add(file));
    }
  };
  const errors = [];
  try {
    baseSha = git(["rev-parse", "--verify", `${base}^{commit}`]).trim();
    headSha = git(["rev-parse", "--verify", `${head}^{commit}`]).trim();
    include(git(["diff", "--name-status", "-z", "--find-renames", `${baseSha}...${headSha}`]));
  } catch (error) { errors.push(error.message); }
  if (working) {
    try {
      for (const args of [["diff", "--name-status", "-z"], ["diff", "--cached", "--name-status", "-z"]]) {
        include(git(args));
      }
      git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean).forEach((file) => files.add(file));
    } catch (error) { errors.push(error.message); }
  }
  return { baseSha, headSha, files: [...files].sort(), deletedOrRenamedFiles: [...deletedOrRenamedFiles].sort(), hasDeletionOrRename: deletedOrRenamedFiles.size > 0, complete: errors.length === 0, errors };
}

// Read the existing critical contract rather than duplicating its guard list.
export function criticalSteps(scripts) {
  const command = scripts["check:critical"];
  if (!command) throw new Error("Missing check:critical contract");
  return command.split(/\s*&&\s*/).map((part) => {
    const match = /^npm run ([\w:-]+)(?: -- ([\w -]+))?$/.exec(part);
    if (!match || !scripts[match[1]]) throw new Error(`Unsupported critical contract step: ${part}`);
    return { kind: "npm", name: match[1], args: match[2]?.split(/\s+/) || [] };
  });
}

// Reuse the workflow as the static-guard registry. Reject new shell/conditional
// syntax until the local executor explicitly supports its semantics.
function selectCiGuardSteps(workflow, scripts) {
  const job = workflow?.jobs?.guards;
  if (!job?.steps?.length || job.if || job.env) throw new Error("Missing or conditional CI guards job");
  const result = [];
  const excluded = [];
  const criticalCondition = "needs.classify.outputs.runs_critical == 'true'";
  for (const [jobName, current] of [["guards", job], ["critical", workflow.jobs.critical]]) {
    if (!current) continue;
    if (current.if || current.env || !current.steps?.length) throw new Error(`Unsupported CI ${jobName} job`);
    for (const step of current.steps) {
      if (!step.run) {
        excluded.push({ job: jobName, name: step.name || step.uses, reason: "CI setup/cache/action; not a local check" });
        continue;
      }
      if (step.run.trim() === "npm ci" || (jobName === "critical" && step.if === "needs.classify.outputs.runs_critical != 'true'" && /^echo /.test(step.run.trim()))) {
        excluded.push({ job: jobName, name: step.name, reason: "Dependency installation or non-critical notice; not executed locally" });
        continue;
      }
      const supportedCondition = jobName === "critical" ? !step.if || step.if === criticalCondition : !step.if;
      const tokenOnly = jobName === "critical" && Object.keys(step.env || {}).every((key) => key === "GITHUB_TOKEN");
      if (!supportedCondition || (step.env && !tokenOnly) || step.shell || step["working-directory"] || step["continue-on-error"]) throw new Error(`Unsupported CI guard execution settings: ${step.name}`);
      // Token-only workflow metadata is intentionally not inherited locally.
      for (const line of step.run.trim().split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"))) {
        if (jobName === "critical" && line === "npm test") {
          result.push({ kind: "npm", name: "test:jest", args: [] }, { kind: "npm", name: "test:node", args: [] });
          continue;
        }
      const npm = /^npm run ([\w:-]+)(?: -- ([\w -]+))?$/.exec(line);
      const node = /^node (scripts\/[\w./-]+\.m?js)(?: ([\w -]+))?$/.exec(line);
      if (npm && scripts[npm[1]]) {
        if (jobName === "critical") {
          const invocation = `${scripts[npm[1]]} ${npm[2] || ""}`;
          if (!npm[1].startsWith("verify:") || !/^node scripts\/(?:verify-[\w-]+|deploy-safe|ensure-ads-txt|env-parity)\.mjs(?: [\w -]+)?$/.test(invocation.trim()) || /--(?:live|production|repair)\b/.test(invocation)) throw new Error(`Unsupported local critical command: ${line}`);
          if (/scripts\/(?:deploy-safe|verify-deployed-sha|verify-pages-worker-parity)\.mjs\b/.test(invocation) && !/--self-test\b/.test(invocation)) throw new Error(`Network/deployment command requires --self-test: ${line}`);
          if (/scripts\/ensure-ads-txt\.mjs\b/.test(invocation) && !/--check\b/.test(invocation)) throw new Error(`Generated asset command requires --check: ${line}`);
        }
        result.push({ kind: "npm", name: npm[1], args: npm[2]?.split(/\s+/) || [] });
      }
      else if (node && !node[1].includes("..")) {
        if (jobName === "critical" && node[2] !== "--self-test") throw new Error(`Direct critical command requires --self-test: ${line}`);
        result.push({ kind: "node", file: node[1], args: node[2]?.split(/\s+/) || [] });
      }
      else throw new Error(`Unsupported CI guard command: ${line}`);
      }
    }
  }
  if (!result.length) throw new Error("CI guards selected no checks");
  return { steps: result, excluded };
}

export function ciGuardSteps(workflow, scripts) {
  return selectCiGuardSteps(workflow, scripts).steps;
}

export function expandCiGuards(plan, workflow, scripts) {
  if (!workflow?.jobs?.critical?.steps?.length) throw new Error("Missing CI critical checks job");
  const { steps: guards, excluded } = selectCiGuardSteps(workflow, scripts);
  // The existing mirror gate requires a committed worktree. Fail before the
  // expensive suites instead of discovering that precondition minutes later.
  const orderedGuards = [
    ...guards.filter((step) => step.name === "verify:public-mirror-fresh"),
    ...guards.filter((step) => step.name !== "verify:public-mirror-fresh"),
  ];
  const seen = new Set();
  return {
    ...plan,
    ciExcludedSteps: excluded,
    steps: plan.steps.flatMap((step) => step.kind === "ci-static-guards" ? orderedGuards : [step]).filter((step) => {
      const key = JSON.stringify(step);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}

export function fullSuitesCoverSmoke(scripts, jestConfig) {
  const jestCommand = scripts["test:jest"] === "node scripts/run-mock-tests.mjs jest" ? `jest ${JEST_BASE_ARGS.join(" ")}` : scripts["test:jest"] || "";
  if (!/(?:^|\s)jest --runInBand --testEnvironment node(?: --cacheDirectory=[\w./-]+)?$/.test(jestCommand)) return false;
  if (JSON.stringify(jestConfig?.roots) !== JSON.stringify(["<rootDir>/__tests__"]) || jestConfig.testMatch || jestConfig.testRegex || jestConfig.projects) return false;
  const match = /^npm run test:jest -- --runInBand ([\w./ -]+) && node --test ([\w./ -]+)$/.exec(scripts["smoke:core"] || "");
  const nodePatterns = scripts["test:node"] === "node scripts/run-mock-tests.mjs node" ? NODE_TEST_PATTERNS : scripts["test:node"]?.split(/\s--test\s/)[1]?.trim().split(/\s+/);
  if (!match || !nodePatterns?.length) return false;
  const jestFiles = match[1].trim().split(/\s+/);
  const nodeFiles = match[2].trim().split(/\s+/);
  const ignored = (jestConfig.testPathIgnorePatterns || []).map((pattern) => new RegExp(pattern));
  const patterns = nodePatterns.map((pattern) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*")}$`));
  return jestFiles.length > 0 && nodeFiles.length > 0
    && jestFiles.every((file) => /^__tests__\/.*\.test\.js$/.test(file) && !ignored.some((pattern) => pattern.test(`/${file}`)))
    && nodeFiles.every((file) => patterns.some((pattern) => pattern.test(file)));
}

export function createVerificationPlan(changes, { profile = "fast", skipBuild = false, forceCritical = false, scripts, jestConfig } = {}) {
  if (!["fast", "ui", "worker", "payment", "all"].includes(profile)) throw new Error(`Unknown profile: ${profile}`);
  const files = [...new Set(changes.files || [])];
  const sourceRemoval = changes.hasDeletionOrRename && (changes.deletedOrRenamedFiles || files).some((file) => /\.(?:[cm]?[jt]sx?|html|css|scss|json)$/i.test(file));
  const riskPaths = [...new Set(files.flatMap((file) => /^public\/(?:js|styles)\//.test(file) ? [file, file.slice(7)] : [file]))];
  const originalRisk = riskOf(files);
  const legacyTier = !changes.complete || !files.length || requiresDeepVerification(files).required || originalRisk.level === "high" || forceCritical
    ? "critical" : originalRisk.level === "medium" ? "standard" : "fast";
  const risk = riskOf(riskPaths);
  const deep = requiresDeepVerification(riskPaths);
  const unknown = risk.rows.some((row) => row.reason === "unclassified source/config change");
  const shared = files.some((file) => /^(?:lib\/|src\/|config\/|scripts\/|\.github\/|(?:package|tsconfig|next\.config|jest\.config)[^/]*$)/.test(file));
  const failClosed = !changes.complete || !files.length || unknown;
  const critical = failClosed || sourceRemoval || shared || forceCritical || deep.required || risk.level === "high" || ["payment", "all"].includes(profile);
  const docsOnly = !critical && profile === "fast" && files.every((file) => /(?:\.mdx?$|^docs\/)/i.test(file));
  const tier = critical ? "critical" : risk.level === "low" ? "fast" : "standard";
  const needsBuild = !docsOnly && tier !== "fast";
  const both = failClosed || sourceRemoval || shared || deep.required || ["payment", "all"].includes(profile) || forceCritical || files.some((file) => /(?:payment|billing|auth|login|entitlement|unlock|pass-verdict)/i.test(file));
  const targets = {
    frontend: needsBuild && (both || profile === "ui" || files.some((file) => !/^worker\//.test(file))),
    worker: needsBuild && (both || profile === "worker" || files.some((file) => /^worker\//.test(file))),
  };
  const steps = [];
  const add = (step) => {
    const key = JSON.stringify(step);
    if (!steps.some((item) => JSON.stringify(item) === key)) steps.push(step);
  };
  const npm = (name) => add({ kind: "npm", name, args: [] });
  add({ kind: "whitespace" });
  npm("verify:doc-freshness");
  if (profile === "all") add({ kind: "ci-static-guards" });
  if (!docsOnly) {
    add({ kind: "lint-changed" });
    if (critical) npm("lint");
    npm("verify:sitemap-drift");
    npm("typecheck");
    // Static guards read source as text, outside Jest's import graph.
    npm("test:node");
    if (critical) {
      for (const step of criticalSteps(scripts)) {
        if (step.name === "smoke:core" && fullSuitesCoverSmoke(scripts, jestConfig)) continue;
        add(step);
      }
      npm("test:jest");
    } else {
      if (risk.level !== "low") npm("smoke:core");
      add({ kind: "jest-related" });
    }
    // Preserve --skip-build compatibility; never remove critical Worker build.
    if (!skipBuild && targets.frontend) npm("build:cf");
    if (!skipBuild && targets.worker) npm("build:worker");
  }
  return {
    version: 1, profile, baseSha: changes.baseSha, headSha: changes.headSha,
    files, tier, legacyTier, failClosed, hasDeletionOrRename: Boolean(changes.hasDeletionOrRename), reasons: [...(changes.errors || []), ...risk.rows.map((row) => `${row.file}: ${row.reason}`), ...deep.matches.map((row) => `${row.file}: ${row.reason}`), ...(shared ? ["Shared source or verification configuration: full verification"] : []), ...(sourceRemoval ? ["Source deletion or rename: run full suites to cover surviving callers"] : [])],
    buildTargets: targets, buildDeferredToCi: skipBuild, steps,
  };
}

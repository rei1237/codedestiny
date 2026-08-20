#!/usr/bin/env node

/*
 * Cloudflare release pipeline: check -> preview -> smoke -> production -> rollback.
 *
 * 🔴 프로덕션 단계(production / rollback)는 GitHub Actions 안에서만 실행된다. 로컬에서는
 * check·preview·smoke 까지만 돌아가고, 승격을 시도하면 production-deploy-guard 가 막는다.
 * 프로덕션에 도달하는 경로는 하나뿐이다: PR → CI → main 머지 → 릴리스 워크플로.
 *
 * The pipeline never performs payment or LLM calls. It also never holds production DB
 * credentials itself (loadEnv() deliberately excludes MONGO_URI, AUTH_*, PORTONE_* so
 * build/lint/typecheck children never see them) — with one scoped exception: when
 * CD_PREVIEW_TEST_EMAIL/PASSWORD are set, openPreviewSignedIn() shells out to
 * scripts/seed-preview-test-account.mjs as an isolated child process (which loads its own
 * MONGO_URI) to guarantee that account has a FAMILY pass, moonstones, and a profile card
 * before every preview open. That write only ever touches the one seed account.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { classifyFile, riskOf, requiresDeepVerification } from "./lib/change-risk.mjs";
import { assertWorkerBaseIsFresh } from "./lib/worker-deploy-base-guard.mjs";
import { assertProductionDeployIsCi } from "./lib/production-deploy-guard.mjs";

const root = process.cwd();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/ig;

function git(args, options = {}) {
  const result = spawnSync("git", args, { cwd: options.cwd || root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error("git " + args.join(" ") + " failed: " + String(result.stderr || "").trim());
  }
  return String(result.stdout || "").trim();
}

function primaryWorktree() {
  return git(["worktree", "list", "--porcelain"], { allowFailure: true }).match(/^worktree (.+)$/m)?.[1] || root;
}

// 상태와 잠금의 범위가 다르다. 섞으면 병렬 워크트리가 조용히 서로를 망친다.
//
//   state.json  — 워크트리마다 하나. "내가 방금 만든 preview 아티팩트"의 기록이라 공유하면
//                 A 가 preview 하는 사이 B 의 preview 가 덮어써지고, 이어지는 승격이 엉뚱한
//                 아티팩트를 올린다. 지문 대조(assertArtifact)는 파일이 바뀐 것만 잡지
//                 "남의 릴리스 기록"은 못 잡는다.
//   promote.lock — 저장소 전체에 하나(주 워크트리). 프로덕션은 대상이 하나뿐이라 승격만은
//                 반드시 직렬화해야 한다. preview 는 서로 다른 URL 로 나가므로 잠그지 않는다.
const stateDir = path.join(root, ".deploy-state");
const stateFile = path.join(stateDir, "state.json");
const lockDir = path.join(primaryWorktree(), ".deploy-state");
// 실제 잠금 파일 이름은 배포 타깃이 정한다(TARGETS). 스테이징 배포가 프로덕션 릴리스를
// 대기시키면 안 되므로 두 타깃은 서로 다른 잠금을 잡는다. 정의는 타깃 해석 뒤로 미룬다.

const DEPLOY_KEY_RE = /^(CLOUDFLARE_|CF_|CD_)/;
// 파일 전체를 process.env 에 붓지 않는다. 배포에 쓰는 접두사만 통과시키고, 이미 값이 있으면
// 덮지 않는다(다른 env 파일과 같은 first-wins 규칙).
function adoptDeployKeys(file) {
  if (!fs.existsSync(file)) return;
  const scratch = {};
  dotenv.config({ path: file, processEnv: scratch, quiet: true });
  for (const [key, value] of Object.entries(scratch)) {
    if (!DEPLOY_KEY_RE.test(key)) continue;
    if (String(process.env[key] || "").trim()) continue;
    process.env[key] = value;
  }
}

function loadEnv() {
  const files = [];
  if (process.env.CD_DEPLOY_ENV_FILE) files.push(path.resolve(process.env.CD_DEPLOY_ENV_FILE));
  files.push(path.join(root, ".env.cloudflare.local"), path.join(root, ".env.cloudflare"));
  const primary = primaryWorktree();
  if (primary) files.push(path.join(primary, ".env.cloudflare.local"), path.join(primary, ".env.cloudflare"));
  for (const file of [...new Set(files)]) {
    if (fs.existsSync(file)) dotenv.config({ path: file, override: false, quiet: true });
  }
  // 자격증명이 이 두 파일에도 있다. 통째로 읽으면 안 된다 — 둘 다 MONGO_URI·AUTH_*·PORTONE_*
  // 를 함께 들고 있어서, 배포가 spawn 하는 빌드·테스트 프로세스에 운영 DB 접속 문자열까지
  // 흘러든다(.disabled-for-local-auth 라는 이름이 바로 그 사고를 피하려던 흔적이다).
  // 그래서 배포에 필요한 CLOUDFLARE_/CF_/CD_ 접두사 키만 골라 들인다.
  for (const dir of [...new Set([root, primaryWorktree()])]) {
    adoptDeployKeys(path.join(dir, ".env.cloudflare.local.disabled-for-local-auth"));
    adoptDeployKeys(path.join(dir, ".env.local"));
  }
  // 같은 값이 역사적으로 여러 이름으로 저장돼 있다. 정본 이름이 비어 있을 때만 채운다.
  for (const [canonical, aliases] of [
    ["CLOUDFLARE_API_TOKEN", ["CF_API_TOKEN", "CLOUDFLARE_APITOKEN", "CLOUDFLARE_PublishToken", "CLOUDFLARE_PUBLISH_TOKEN", "CLOUDFLARE_API_KEY"]],
    ["CLOUDFLARE_ACCOUNT_ID", ["CF_ACCOUNT_ID", "ACCOUNT_ID", "Account_ID"]],
  ]) {
    if (String(process.env[canonical] || "").trim()) continue;
    const hit = aliases.find((name) => String(process.env[name] || "").trim());
    if (hit) process.env[canonical] = process.env[hit];
  }
}
loadEnv();

function parseArgs(argv) {
  const flags = new Set();
  const values = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (["--allow-dirty", "--yes", "--self-test", "--allow-no-worker-preview", "--ci", "--preview-only", "--no-open", "--list", "--allow-stale", "--allow-redeploy", "--pages-only", "--allow-regression", "--no-push"].includes(arg)) flags.add(arg);
    else if (arg.startsWith("--") && arg.includes("=")) {
      const separator = arg.indexOf("=");
      values.set(arg.slice(2, separator), arg.slice(separator + 1));
    }
    else if (arg.startsWith("--") && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      values.set(arg.slice(2), argv[++i]);
    } else if (arg.startsWith("--")) flags.add(arg);
  }
  return { flags, values };
}
const cli = parseArgs(process.argv.slice(2));
const stage = cli.values.get("stage") || "";
const allowDirty = cli.flags.has("--allow-dirty");
const ciMode = cli.flags.has("--ci");
const autoYes = cli.flags.has("--yes");
const allowNoWorkerPreview = cli.flags.has("--allow-no-worker-preview");
const previewOnly = cli.flags.has("--preview-only");
const listOnly = cli.flags.has("--list");
const openPreview = !ciMode && !cli.flags.has("--no-open");
const skipPush = cli.flags.has("--no-push");
const allowEmptyChangeSet = ciMode && process.env.CD_ALLOW_EMPTY_CHANGESET === "true";
// 🔴 --pages-only 는 "이번 릴리스는 Worker 를 건드리지 않는다"를 명시한다.
//
// CI 는 CD_ALLOW_EMPTY_CHANGESET=true 로 변경 집합 판정을 비워 두는데, needsWorker() 가 그 값
// 하나로 무조건 true 를 낸다. 그래서 일일 운세 재발행처럼 **커밋은 그대로이고 빌드 산출물만
// 달라지는** 릴리스도 결제·인증 워커를 매일 재업로드하고 100% 로 다시 승격했고, 발행이 실패하면
// Worker 까지 함께 롤백됐다. 같은 코드를 다시 올리는 쓰기라 얻는 것이 없고 잃을 것만 있다.
// 이 플래그가 그 결합을 끊는다. 전제("라이브 Worker == 이번 커밋")는 context() 가 fail-closed 로
// 단언하므로, 전제가 깨지면 Pages 만 나가는 대신 배포 자체가 멈춘다.
const pagesOnly = cli.flags.has("--pages-only");

/**
 * 배포 타깃. `--stage` 하나가 정한다.
 *
 * 🔴 환경변수만으로 프로덕션/스테이징을 가르지 않는다. "어떤 변수가 남아 있는가"로 구분하면
 *    변수가 새거나 빠진 순간 반대쪽이 배포된다 — 그리고 그 사고는 조용하다. 타깃은 명시적
 *    stage 로만 결정되고, 아래 이름 해석기가 두 타깃의 자원이 겹치지 않는지 한 번 더 본다.
 */
const TARGETS = {
  production: {
    id: "production",
    label: "prod",
    workerConfig: "worker/wrangler.toml",
    lockName: "promote.lock",
    projectEnv: ["CF_PAGES_PROJECT_NAME", "CLOUDFLARE_PAGES_PROJECT_NAME"],
    workerEnv: ["CF_WORKER_NAME", "CLOUDFLARE_WORKER_NAME"],
    originEnv: ["CD_PRODUCTION_ORIGIN"],
    // 로컬 wrangler.toml 의 name 폴백. 프로덕션에서는 예전부터 있던 동작이라 유지한다.
    allowPagesNameFallback: true,
  },
  staging: {
    id: "staging",
    label: "staging",
    workerConfig: "worker/wrangler.staging.toml",
    lockName: "promote-staging.lock",
    projectEnv: ["CF_STAGING_PAGES_PROJECT_NAME"],
    workerEnv: ["CF_STAGING_WORKER_NAME"],
    originEnv: ["CD_STAGING_ORIGIN"],
    // 🔴 스테이징에는 폴백이 없다. 루트 wrangler.toml 의 name 은 프로덕션 Pages 프로젝트라,
    //    폴백을 허용하면 변수 하나가 비었을 때 스테이징 코드가 프로덕션에 나간다.
    allowPagesNameFallback: false,
  },
};
const target = TARGETS[stage === "staging" ? "staging" : "production"];
const lockFile = path.join(lockDir, target.lockName);

/** 타깃별 이름 해석. 폴백과 교차오염을 여기 한 곳에서 막는다. */
function resolveTargetNames(pagesLocal, workerLocal, activeTarget = target) {
  const firstEnv = (keys) => {
    for (const key of keys) {
      const value = String(process.env[key] || "").trim();
      if (value) return value;
    }
    return "";
  };
  const project = firstEnv(activeTarget.projectEnv) || (activeTarget.allowPagesNameFallback ? String(pagesLocal.name || "").trim() : "");
  const worker = firstEnv(activeTarget.workerEnv) || String(workerLocal.name || "").trim();
  if (!project) {
    throw new Error("Pages project name for target '" + activeTarget.id + "' is unset. Set " + activeTarget.projectEnv[0] + "."
      + (activeTarget.allowPagesNameFallback ? "" : "\n  스테이징에는 로컬 wrangler.toml 폴백이 없다 — 폴백을 허용하면 프로덕션 프로젝트로 떨어진다."));
  }
  if (!worker) throw new Error("Worker name for target '" + activeTarget.id + "' could not be detected.");
  if (activeTarget.id !== "production") {
    // 스테이징이 프로덕션 자원을 가리키는 경우를 여기서 끝낸다. 오늘 타깃이 둘뿐이라
    // 이 불일치 클래스는 스테이징 도입과 함께 생겼다.
    const productionProject = String(pagesLocal.name || "").trim();
    const productionWorker = tomlValue(path.join(root, "worker", "wrangler.toml"), "name");
    if (project === productionProject) throw new Error("Staging Pages project resolved to the production project '" + project + "'.");
    if (worker === productionWorker) throw new Error("Staging Worker resolved to the production Worker '" + worker + "'.");
  }
  return { project, worker };
}

/**
 * 승격 직전 최종 확인 — 요청한 타깃과 실제로 배포될 자원이 같은가.
 * resolveTargetNames 가 이미 막지만, 그 사이에 discover 결과가 다른 경로로 만들어졌을 가능성을
 * 남기지 않는다. 프로덕션 승격이 스테이징 이름을 들고 오는 경우도 여기서 끝난다.
 */
function assertResolvedTargetMatches(value) {
  const project = String(value?.cf?.project || "");
  const worker = String(value?.cf?.worker || "");
  const looksStaging = /staging/i.test(project) || /staging/i.test(worker);
  if (target.id === "staging" && !looksStaging) {
    throw new Error("Staging promotion resolved to non-staging resources (project=" + project + ", worker=" + worker + ").");
  }
  if (target.id === "production" && looksStaging) {
    throw new Error("Production promotion resolved to staging resources (project=" + project + ", worker=" + worker + ").");
  }
}

/** 타깃 오리진. 🔴 타깃끼리 폴백하지 않는다 — 스테이징이 프로덕션을 스모크하고 통과하면 안 된다. */
function originFromTargetEnv() {
  for (const key of target.originEnv) {
    const value = String(process.env[key] || "").trim();
    if (value) return value.replace(/\/+$/, "");
  }
  return "";
}

function envForChecks() {
  // 🔴 CD_DEPLOY_TARGET 은 **여기서** 넣는다. 워크플로 env 에만 두면 잡을 하나 더 만들 때
  //    빠뜨릴 수 있고, 그러면 스테이징 산출물이 색인 가능한 채로 나간다. 타깃은 --stage 가
  //    이미 정했으므로 같은 결정에서 파생시키면 어긋날 수 없다.
  //    소비처: scripts/run-postbuild.mjs → scripts/apply-staging-noindex.mjs.
  return { ...process.env, LLM_DRY_RUN: "true", WORKERS_AI_ENABLED: "false", DEPLOY_SAFE_MODE: "true", CD_DEPLOY_TARGET: target.id };
}
function npmCommand() { return process.platform === "win32" ? "npm.cmd" : "npm"; }
function npxCommand() { return process.platform === "win32" ? "npx.cmd" : "npx"; }
function wrangler(args) { return ["--no-install", "wrangler", ...args]; }
// Node 20+ refuses to spawn .cmd shims without a shell. CI runs on Linux so this never
// showed there, but the local preview path hits it. shell: true concatenates args, so
// quote anything containing whitespace (Pages commit messages do).
function shellFor(command) { return process.platform === "win32" && command.endsWith(".cmd"); }
function shellArgs(command, args) {
  return shellFor(command) ? args.map((arg) => (/\s/.test(String(arg)) ? '"' + arg + '"' : String(arg))) : args;
}

function run(label, command, args, options = {}) {
  console.log("[deploy-safe] " + label);
  const result = spawnSync(command, shellArgs(command, args), {
    cwd: root, env: options.env || envForChecks(), stdio: "inherit", shell: shellFor(command), windowsHide: true,
    input: options.input,
  });
  if (result.error) throw new Error(label + " could not start: " + result.error.message);
  if (result.status !== 0) throw new Error(label + " failed with exit " + String(result.status));
}
function capture(label, command, args, options = {}) {
  const result = spawnSync(command, shellArgs(command, args), {
    cwd: root, env: options.env || envForChecks(), encoding: "utf8", shell: shellFor(command), windowsHide: true,
  });
  const text = String(result.stdout || "") + String(result.stderr || "");
  if (text.trim()) process.stdout.write(text);
  if (result.error) throw new Error(label + " could not start: " + result.error.message);
  if (result.status !== 0) throw new Error(label + " failed with exit " + String(result.status));
  return text;
}

function ensureCredentials() {
  if (!String(process.env.CLOUDFLARE_API_TOKEN || "").trim()) throw new Error("CLOUDFLARE_API_TOKEN is missing.");
  if (!String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim()) throw new Error("CLOUDFLARE_ACCOUNT_ID is missing.");
}
function apiBase() { return process.env.CLOUDFLARE_API_BASE_URL || "https://api.cloudflare.com/client/v4"; }
async function cfFetch(url, options = {}) {
  ensureCredentials();
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", "Bearer " + process.env.CLOUDFLARE_API_TOKEN);
  headers.set("Accept", "application/json");
  const response = await fetch(url, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const detail = (body.errors || []).map((e) => e.message).filter(Boolean).join("; ");
    throw new Error("Cloudflare API " + response.status + ": " + (detail || "request failed"));
  }
  return body.result;
}

function tomlValue(file, key) {
  const text = fs.readFileSync(file, "utf8");
  const escaped = key.replace(/[.*+?^()|[\]\\]/g, "\\$&");
  return text.match(new RegExp("^\\s*" + escaped + "\\s*=\\s*[\"']([^\"']+)[\"']", "m"))?.[1] || "";
}
function localPages() {
  const file = path.join(root, "wrangler.toml");
  if (!fs.existsSync(file)) throw new Error("Missing wrangler.toml.");
  return {
    file: "wrangler.toml",
    name: tomlValue(file, "name"),
    outputDir: tomlValue(file, "pages_build_output_dir") || "dist",
    functions: fs.existsSync(path.join(root, "public", "_worker.js")),
    routes: fs.existsSync(path.join(root, "public", "_routes.json")),
  };
}
function localWorker() {
  const file = path.join(root, target.workerConfig);
  if (!fs.existsSync(file)) throw new Error("Missing " + target.workerConfig + ".");
  const text = fs.readFileSync(file, "utf8");
  return {
    file: target.workerConfig,
    name: tomlValue(file, "name"),
    main: tomlValue(file, "main"),
    bindings: [...text.matchAll(/^\s*binding\s*=\s*[\"']([^\"']+)[\"']/gm)].map((m) => m[1]),
    routes: [...text.matchAll(/^\s*\{\s*pattern\s*=\s*[\"']([^\"']+)[\"']/gm)].map((m) => m[1]),
    crons: (text.match(/crons\s*=\s*\[([^\]]*)\]/m)?.[1] || "").split(",").map((v) => v.replace(/[\"']/g, "").trim()).filter(Boolean),
    hasAi: /\[ai\]/.test(text),
    hasR2: /\[\[r2_buckets\]\]/.test(text),
  };
}

function changedFiles() {
  const deployBase = process.env.CD_DEPLOY_BASE_SHA || process.env.GITHUB_BEFORE || "";
  const deployHead = process.env.CD_DEPLOY_HEAD_SHA || process.env.GITHUB_SHA || "HEAD";
  const hasBase = /^[0-9a-f]{7,64}$/i.test(deployBase) && !/^0+$/.test(deployBase);
  const range = hasBase
    ? git(["diff", "--name-only", deployBase + "..." + deployHead], { allowFailure: true })
    : ciMode
      ? git(["diff", "--name-only", "HEAD^", "HEAD"], { allowFailure: true })
      : git(["diff", "--name-only", "origin/main...HEAD"], { allowFailure: true });
  const working = [
    git(["diff", "--name-only", "HEAD"], { allowFailure: true }),
    git(["diff", "--cached", "--name-only"], { allowFailure: true }),
    git(["ls-files", "--others", "--exclude-standard"], { allowFailure: true }),
  ].flatMap((value) => value ? value.split(/\r?\n/).filter(Boolean) : []);
  const committed = range ? range.split(/\r?\n/).filter(Boolean) : [];
  if (committed.length || working.length) return [...new Set([...committed, ...working])];
  if (allowEmptyChangeSet) return ["__release_redeploy__"];
  // main 에서 직접 작업하고 이미 push 한 뒤 배포하는 흐름에서는 origin/main...HEAD 가 비어 있다.
  // 그때는 마지막 커밋의 파일 목록을 쓴다. HEAD~1..HEAD 는 머지 커밋에서도 첫 부모 기준으로
  // 동작해 diff-tree 가 빈 결과를 내던 문제를 피한다.
  const head = git(["diff", "--name-only", "HEAD~1..HEAD"], { allowFailure: true })
    || git(["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "HEAD"], { allowFailure: true });
  return head ? head.split(/\r?\n/).filter(Boolean) : [];
}
// classifyFile / riskOf 는 scripts/lib/change-risk.mjs 가 정본이다.
// check-changed.mjs 도 같은 모듈을 쓴다.
function gitInfo(files) {
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const dirtyFiles = git(["status", "--porcelain"]).split(/\r?\n/).filter(Boolean);
  if (!branch && !ciMode) throw new Error("Detached HEAD is not deployable.");
  // main 은 이제 정상 작업 브랜치다(2026-08-08 PR 정책 폐기). 배포를 막는 것은 브랜치 이름이
  // 아니라 아래의 dirty 검사, 아티팩트 지문 대조, 그리고 승격 직전의 명시적 확인이다.
  // 무엇이 더러운지 함께 보여준다. 빌드가 만든 추적 파일 하나 때문에 막히는 경우가 있었는데,
  // 파일 이름이 없으면 "커밋하라" 는 안내가 오히려 HEAD 를 바꿔 상태 대조에서 또 막았다.
  if (dirtyFiles.length && !allowDirty) throw new Error("Working tree is dirty. Commit first or pass --allow-dirty.\n" + dirtyFiles.slice(0, 20).map((line) => "  " + line).join("\n") + (dirtyFiles.length > 20 ? "\n  ... and " + (dirtyFiles.length - 20) + " more" : ""));
  if (!ciMode && !git(["rev-parse", "--verify", "origin/main"], { allowFailure: true })) throw new Error("origin/main is unavailable.");
  const subject = git(["log", "-1", "--pretty=%s"], { allowFailure: true });
  return { branch, head, subject, dirty: dirtyFiles.length > 0, dirtyFiles, files };
}

async function discover(pagesLocal, workerLocal) {
  ensureCredentials();
  const { project, worker } = resolveTargetNames(pagesLocal, workerLocal);
  // 로컬 배포에서 가장 흔한 첫 실패다. 맨 "403 Authentication error" 만 던지면 토큰이
  // 죽은 건지 권한 한 종류가 빠진 건지 구분이 안 돼 한참 헤맨다.
  const pages = await cfFetch(apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID + "/pages/projects/" + encodeURIComponent(project))
    .catch((error) => {
      if (!/\b(401|403)\b/.test(error.message)) throw error;
      throw new Error(error.message + "\n  The API token cannot read Pages project '" + project + "'."
        + "\n  Add Account -> Cloudflare Pages -> Edit to the token (Workers Scripts -> Edit and Account Settings -> Read are also required),"
        + "\n  or check that CLOUDFLARE_ACCOUNT_ID matches the account that owns the project.");
    });
  const source = pages.source || {};
  const sourceConfig = source.config || {};
  const build = pages.build_config || {};
  if (source.type && source.type !== "github") throw new Error("Pages source drifted from GitHub: " + source.type);
  // 🔴 Git 연동 프로젝트와 직접 업로드 프로젝트는 프로덕션 브랜치를 **다른 자리**에 둔다.
  //
  // 프로덕션(codedestiny)은 GitHub 연동이라 source.config.production_branch 가 있다. 스테이징
  // (codedestiny-staging)은 연동을 일부러 끈 직접 업로드 프로젝트라 source 자체가 비어 있고,
  // 브랜치는 프로젝트 최상위 production_branch 에 있다. 앞쪽만 읽으면 스테이징 배포가
  // "Pages production branch is missing" 으로 죽는다(2026-08-20 실측).
  //
  // 폴백은 여기서 끝난다 — 둘 다 없으면 실패다. 임의로 "main" 을 가정하면 엉뚱한 브랜치를
  // 프로덕션 배포로 승격시킬 수 있다.
  const productionBranch = sourceConfig.production_branch || pages.production_branch || "";
  if (!productionBranch) {
    // 다음 실행이 "또 없다"로 끝나지 않도록, 응답에 실제로 어떤 키가 있는지 함께 보고한다.
    // (값이 아니라 키 이름만 — 응답에 자격증명은 없지만 습관을 지킨다.)
    throw new Error("Pages production branch is missing for project '" + project + "'."
      + "\n  Git 연동 프로젝트라면 source.config.production_branch 가, 직접 업로드 프로젝트라면"
      + "\n  프로젝트의 production_branch 가 있어야 한다."
      + "\n  응답 최상위 키: " + Object.keys(pages || {}).sort().join(", ")
      + "\n  source.config 키: " + Object.keys(sourceConfig || {}).sort().join(", "));
  }
  if (build.build_command && build.build_command !== "npm run build:cf") throw new Error("Pages build command drifted: " + build.build_command);
  if (build.destination_dir && build.destination_dir !== pagesLocal.outputDir) throw new Error("Pages output directory drifted.");
  return {
    project, worker,
    pages: {
      sourceType: source.type || "unknown",
      productionBranch,
      previewSetting: sourceConfig.preview_deployment_setting || "unknown",
      buildCommand: build.build_command || "unknown",
      outputDir: build.destination_dir || pagesLocal.outputDir,
      domains: pages.domains || [],
      subdomain: pages.subdomain || "",
    },
    workerConfig: workerLocal,
  };
}
function needsWorker(files) {
  return allowEmptyChangeSet || files.some((file) =>
    file.startsWith("worker/") || file.includes("wrangler") ||
    file === "app/_lib/billing-client.ts" || file === "js/core/access-store.js"
  );
}
/**
 * 이번 릴리스가 Worker 를 포함하는가에 대한 최종 판정.
 *
 * 🔴 순수 함수로 떼어 둔 이유는 --pages-only 가 **없을 때**의 결과가 예전과 1비트도 달라지면
 * 안 되기 때문이다. 여기서 틀리면 모든 릴리스가 Worker 를 조용히 빠뜨린다(2026-08-08 에 실제로
 * 그 직전까지 갔다). selfTest() 가 네 갈래를 전부 잠근다.
 */
function resolveNeedsWorker({ pagesOnly: only, files, staleWorkerCommit }) {
  if (only) return false;
  return needsWorker(files) || Boolean(staleWorkerCommit);
}
/**
 * 라이브 Worker 가 어느 커밋으로 떠 있는지 읽는다.
 *
 * 🔴 "못 읽었다" 와 "읽었더니 같더라" 는 호출자에게 다른 사실이다. workerBehindHead 는 못 읽으면
 * 기존 변경 집합 판정을 그대로 쓰지만(fail-open), --pages-only 는 반대로 못 읽으면 배포를 막아야
 * 한다(fail-closed) — 근거 없이 Worker 를 빼면 '새 클라이언트 + 옛 워커' 가 그대로 남는다.
 * 두 판정이 같은 응답을 서로 다르게 해석하므로 읽기만 여기로 모은다.
 */
async function liveWorkerCommit(cf) {
  // 🔴 오리진은 배포 타깃을 따른다(originFromTargetEnv). CD_PRODUCTION_ORIGIN 을 직접 읽으면
  // 스테이징 배포가 프로덕션 워커의 커밋으로 판정한다 — --pages-only 는 그 값으로 Worker 를
  // 뺄지 정하므로, 그대로 두면 스테이징이 프로덕션 SHA 를 근거로 Worker 를 빼게 된다.
  const domain = cf.pages.domains.find((item) => !item.includes(".pages.dev")) || cf.pages.domains[0];
  const origin = originFromTargetEnv()
    || (domain ? "https://" + domain.replace(/^https?:\/\//, "").replace(/\/+$/, "") : "");
  if (!origin) return { readable: false, commit: "" };
  try {
    const res = await fetch(origin + "/api/version", { signal: AbortSignal.timeout(10_000) });
    return { readable: true, commit: String((await res.json())?.commit || "").trim() };
  } catch {
    return { readable: false, commit: "" };
  }
}
/**
 * 🔴 변경 집합만으로는 "워커를 올려야 하는가"를 못 정한다.
 *
 * 변경 집합은 origin/main 기준이라 **push 하는 순간 줄어든다.** worker/ 를 고친 커밋을 push 한 뒤
 * 다른 커밋을 얹고 릴리스하면, 그 릴리스의 변경 집합에는 worker/ 가 없어 워커 preview 자체가
 * 업로드되지 않는다. 그러면 Pages 만 새 코드로 나가고 워커는 옛 커밋에 남는다.
 * 2026-08-08 에 실제로 그 상태로 승격 직전까지 갔다 — 초융합 워커 라우트가 라이브에 없는데
 * 새 초융합 UI 만 나갈 뻔했다.
 *
 * 그래서 기준을 "무엇이 바뀌었나"에서 **"지금 떠 있는 워커가 HEAD 와 같은가"**로 바꾼다.
 * 라이브 워커가 뒤처져 있고 그 사이에 워커 코드 변경이 있으면, 이번 변경 집합과 무관하게 함께 올린다.
 */
async function workerBehindHead(cf, head) {
  // 워커가 안 떠 있거나 응답이 없으면 판단 근거가 없다. 기존 변경 집합 판정을 그대로 쓴다.
  const { readable, commit: live } = await liveWorkerCommit(cf);
  if (!readable || !live || live === head) return "";
  const drift = git(["diff", "--name-only", live + ".." + head, "--", "worker/", "lib/"], { allowFailure: true });
  return drift.trim() ? live : "";
}
/**
 * --pages-only 의 전제를 단언한다: 지금 떠 있는 Worker 가 **이미 이번 릴리스의 커밋**이어야 한다.
 *
 * 전제가 참이면 Worker 재업로드·재승격은 같은 코드를 다시 올리는 쓰기일 뿐이라 빼도 안전하다.
 * 거짓이면 Pages 만 올리는 순간 '새 클라이언트 + 옛 워커' 가 된다 — 2026-08-07 에 라이브 /me/ 의
 * 청크 4개가 404 였던 그 형태다. 판단 근거가 없을 때도 막는다(fail-closed).
 */
async function assertWorkerIsAlreadyLiveAt(cf, head) {
  const { readable, commit } = await liveWorkerCommit(cf);
  if (!readable) throw new Error("--pages-only: 라이브 Worker 커밋(/api/version)을 읽지 못해 Worker 를 빼도 되는지 판단할 수 없습니다. 플래그 없이 릴리스하세요.");
  if (commit !== head) throw new Error("--pages-only: 라이브 Worker 는 " + (commit ? commit.slice(0, 12) : "(알 수 없음)") + " 인데 이번 릴리스는 " + head.slice(0, 12) + " 입니다. Worker 를 함께 올려야 하므로 플래그 없이 릴리스하세요.");
}

async function context() {
  const pagesLocal = localPages();
  const workerLocal = localWorker();
  const files = changedFiles();
  if (!files.length) throw new Error("No changes found against origin/main or the last commit.");
  const gitState = gitInfo(files);
  const risk = riskOf(files);
  const deep = requiresDeepVerification(files);
  const cf = await discover(pagesLocal, workerLocal);
  const staleWorkerCommit = await workerBehindHead(cf, gitState.head);
  if (pagesOnly) await assertWorkerIsAlreadyLiveAt(cf, gitState.head);
  return {
    pagesLocal, workerLocal, files, git: gitState, risk, deep, cf,
    staleWorkerCommit,
    needsWorker: resolveNeedsWorker({ pagesOnly, files, staleWorkerCommit }),
  };
}
function printContext(value) {
  console.log("[deploy-safe] branch=" + value.git.branch + " commit=" + value.git.head.slice(0, 12) + (value.git.dirty ? " dirty" : ""));
  console.log("[deploy-safe] risk=" + value.risk.level + " deep=" + value.deep.required + " changed=" + value.risk.rows.length);
  for (const row of value.risk.rows) console.log("  - " + row.level.toUpperCase() + " " + row.file + " (" + row.reason + ")");
  for (const match of value.deep.matches) console.log("  ! DEEP " + match.file + " (" + match.reason + ")");
  console.log("[deploy-safe] Pages project=" + value.cf.project + " source=" + value.cf.pages.sourceType + " production=" + value.cf.pages.productionBranch + " preview=" + value.cf.pages.previewSetting + " output=" + value.cf.pages.outputDir);
  console.log("[deploy-safe] Worker=" + value.cf.worker + " AI=" + value.workerLocal.hasAi + " R2=" + value.workerLocal.hasR2 + " cron=" + value.workerLocal.crons.length);
  console.log("[deploy-safe] Pages Functions=" + value.pagesLocal.functions + " _routes=" + value.pagesLocal.routes);
  if (value.staleWorkerCommit) {
    console.log("[deploy-safe] 라이브 Worker 가 " + value.staleWorkerCommit.slice(0, 12)
      + " 에 머물러 있고 그 뒤로 worker/·lib/ 변경이 있습니다 — 이번 릴리스에 Worker 를 함께 올립니다.");
  }
  if (pagesOnly) console.log("[deploy-safe] --pages-only: Worker 는 이미 " + value.git.head.slice(0, 12) + " 로 떠 있어 이번 릴리스에서 건드리지 않습니다.");
  console.log("[deploy-safe] Worker included in this release: " + value.needsWorker);
}

function walk(directory, relative = "") {
  const entries = fs.readdirSync(path.join(directory, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...walk(directory, rel));
    else if (entry.isFile()) files.push(rel);
  }
  return files;
}
function artifact(directory) {
  if (!fs.existsSync(path.join(directory, "index.html"))) throw new Error("Missing " + directory + "/index.html.");
  const hash = crypto.createHash("sha256");
  const files = walk(directory).sort();
  for (const rel of files) { hash.update(rel.replace(/\\/g, "/")); hash.update(fs.readFileSync(path.join(directory, rel))); }
  return { outputDir: path.relative(root, directory).replace(/\\/g, "/"), sha256: hash.digest("hex"), fileCount: files.length, builtAt: new Date().toISOString() };
}
function readState() {
  if (!fs.existsSync(stateFile)) return null;
  return JSON.parse(fs.readFileSync(stateFile, "utf8"));
}
function writeState(state) {
  fs.mkdirSync(stateDir, { recursive: true });
  // "\\n" 이었다. JSON 뒤에 리터럴 백슬래시+n 이 붙어 readState 의 JSON.parse 가 반드시
  // 터졌다. CI 는 preview 와 승격을 한 프로세스에서 메모리로 넘겨 드러나지 않았고,
  // deploy:preview -> deploy:production 두 명령으로 나눈 지금에야 경로가 열린다.
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", "utf8");
}
function assertArtifact(state) {
  if (!state?.artifact) throw new Error("No verified build artifact exists.");
  const actual = artifact(path.join(root, state.artifact.outputDir));
  if (actual.sha256 !== state.artifact.sha256 || actual.fileCount !== state.artifact.fileCount) throw new Error("Build artifact changed after validation.");
}
// 잠금은 이 프로세스가 실제로 잡았을 때만 푼다. 예전에는 최상위 catch 가 무조건 unlock 해서,
// 잠금을 못 잡고 실패한 워크트리가 **남의 승격 잠금을 지우고** 나갔다.
let lockHeld = false;
function lock() {
  fs.mkdirSync(lockDir, { recursive: true });
  try {
    const fd = fs.openSync(lockFile, "wx");
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, worktree: root, startedAt: new Date().toISOString() }, null, 2) + "\n");
    fs.closeSync(fd);
    lockHeld = true;
  } catch {
    let owner = "";
    try {
      const held = JSON.parse(fs.readFileSync(lockFile, "utf8"));
      owner = " Held by pid " + held.pid + " in " + held.worktree + " since " + held.startedAt + ".";
    } catch { owner = ""; }
    throw new Error("Another worktree is promoting to production." + owner
      + "\n  Production is a single target, so promotions are serialized. Wait for it to finish."
      + "\n  If that process is gone, delete " + lockFile + " after confirming nothing is deploying.");
  }
}
function unlock() {
  if (!lockHeld) return;
  try { fs.rmSync(lockFile, { force: true }); } catch {}
  lockHeld = false;
}

function pageDeploymentsUrl(cf, env = "production") {
  return apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID + "/pages/projects/" + encodeURIComponent(cf.project) + "/deployments?env=" + encodeURIComponent(env);
}
async function pageDeployments(cf, env = "production") {
  const result = await cfFetch(pageDeploymentsUrl(cf, env));
  return Array.isArray(result) ? result : [];
}
async function workerActive(cf) {
  const result = await cfFetch(apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID + "/workers/scripts/" + encodeURIComponent(cf.worker) + "/deployments");
  const deployment = (result.deployments || [])[0] || {};
  const active = (deployment.versions || []).find((v) => Number(v.percentage) === 100) || deployment.versions?.[0] || {};
  return { deploymentId: deployment.id || "", versionId: active.version_id || "", message: deployment.annotations?.["workers/message"] || "" };
}
async function workerVersions(cf) {
  const result = await cfFetch(apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID + "/workers/scripts/" + encodeURIComponent(cf.worker) + "/versions");
  return Array.isArray(result?.items) ? result.items : [];
}

/**
 * 로그인된 상태로 preview 를 연다.
 *
 * 무료 계정으로는 유료 화면이 전부 결제창에서 막혀 검증이 안 된다. FAMILY 이용권 계정
 * (scripts/seed-preview-test-account.mjs)으로 미리 로그인해 둔 창을 띄운다.
 *
 * 로그인은 DOM 폼이 아니라 페이지 안에서 /api/auth/login 을 직접 호출한다. 셀렉터가 바뀌어도
 * 안 깨지고, 인증 쿠키가 httpOnly 라 주입이 불가능한데 이 경로면 브라우저가 정상 수신한다.
 * 쿠키에 Domain 속성이 없어(worker/routes/auth.js appendAuthCookies) preview 호스트 전용으로
 * 붙으므로 프로덕션 세션과 섞이지 않는다.
 *
 * 🔴 로그인하지 못하면 창을 아예 띄우지 않고 URL 만 남긴다(사용자 지시 2026-08-11). 로그아웃
 * 상태의 창으로는 결제창·이용권·월정석 잔량·프로필 카드를 하나도 확인할 수 없어, 띄워 봐야
 * "확인했다"는 착각만 만든다. 예전에는 자격증명이 없거나 Playwright 가 못 뜨면 기본 브라우저로
 * 폴백해 로그아웃 창을 열었는데, 그게 정확히 그 착각이 나오던 자리다.
 *
 * 로그인 시도 전에 scripts/seed-preview-test-account.mjs 를 매번 재실행해, FAMILY 이용권·
 * 월정석·프로필 카드(생년월일)가 항상 최신 상태로 있음을 보장한다("무조건 적용되어 열려야
 * 한다" 요구사항). $set 멱등 upsert 라 재실행 비용은 낮다. 이 자식 프로세스만 자체적으로
 * .env.local 에서 MONGO_URI 를 읽으며(loadEnv() 는 그대로 필터링 유지), 실패해도 로그인
 * 시도 자체는 계속한다 — 계정이 이미 있으면 시딩 실패가 프리뷰를 막을 이유는 없다.
 */
async function openPreviewSignedIn(url) {
  if (!openPreview || !url) return null;
  const email = String(process.env.CD_PREVIEW_TEST_EMAIL || "").trim();
  const password = String(process.env.CD_PREVIEW_TEST_PASSWORD || "").trim();
  if (!email || !password) {
    console.log("[deploy-safe] CD_PREVIEW_TEST_EMAIL/PASSWORD not set; not opening a browser (a signed-out window verifies nothing).");
    console.log("[deploy-safe] set both to get a signed-in window, or inspect manually at " + url);
    return null;
  }
  console.log("[deploy-safe] ensuring preview test account has FAMILY pass + profile card (writes production DB via scripts/seed-preview-test-account.mjs)...");
  const seed = spawnSync(process.execPath, [path.join(root, "scripts", "seed-preview-test-account.mjs")], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    windowsHide: true,
  });
  if (seed.status !== 0) {
    console.log("[deploy-safe] seed-preview-test-account failed (continuing to attempt login anyway):");
    console.log(String(seed.stderr || seed.stdout || "").trim());
  } else {
    console.log("[deploy-safe] preview test account seeded.");
  }
  try {
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({ headless: false, args: ["--start-maximized"] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const status = await page.evaluate(async (creds) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: creds.email, password: creds.password }),
        credentials: "include",
      });
      return response.status;
    }, { email, password });
    if (status < 200 || status >= 300) {
      console.log("[deploy-safe] preview login returned HTTP " + status + "; the window is open but signed out.");
      console.log("[deploy-safe] run `npm run seed:preview-test-account` if the account does not exist yet.");
    } else {
      console.log("[deploy-safe] signed in as " + email + " on the preview.");
    }
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // 🔴 로그인 HTTP 200 은 "화면이 로그인 상태로 뜬다"와 다른 이야기다. 세션 쿠키는 httpOnly 라
    // 클라이언트가 못 읽고, 대신 힌트 쿠키(fortune_auth_role)를 보고 로그인 여부를 판단한다.
    // 힌트가 없으면 클라이언트는 **서버에 묻지도 않고** 게스트로 단정한다
    // (app/_lib/user-session-cache.ts 의 no_auth_hint 단축 · 셸의 __cdHasAuthToken).
    //
    // 2026-08-09 에 정확히 그 상태가 나갔다 — 서버가 로그인 응답에 힌트를 안 붙이던 시절이라
    // 이 스크립트는 "signed in as ..." 를 찍는데 창은 로그아웃 화면이었다. 로그인 성공을
    // **로그인 상태의 근거로 쓴 것**이 원인이었으므로, 이제 화면 쪽에서 확인한다.
    const session = await page.evaluate(async () => {
      const hint = /(^|;\s*)fortune_auth_role=/.test(document.cookie || "");
      try {
        // 캐시 우회 헤더를 줘서 클라이언트 세션 캐시가 아니라 서버 답을 받는다.
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          headers: { "x-code-destiny-cache-refresh": "1" },
        });
        const payload = await response.json().catch(() => ({}));
        return { hint, authenticated: payload?.authenticated === true };
      } catch (error) {
        return { hint, authenticated: false, error: String((error && error.message) || error) };
      }
    });
    if (status >= 200 && status < 300 && !(session.hint && session.authenticated)) {
      console.log(
        "[deploy-safe] WARNING: login succeeded but the preview is not rendering signed in"
        + " (hint cookie=" + session.hint + ", server session=" + session.authenticated + ")."
      );
      console.log("[deploy-safe] a missing hint cookie means the API this preview talks to does not issue fortune_auth_role on login (worker/routes/auth.js appendAuthRoleCookie).");
    } else if (status >= 200 && status < 300) {
      console.log("[deploy-safe] preview session verified: signed in and rendering as a logged-in user.");
    }
    console.log("[deploy-safe] preview window is open: " + url);
    return browser;
  } catch (error) {
    console.log("[deploy-safe] could not drive a browser (" + error.message + "); not falling back to a signed-out window.");
    console.log("[deploy-safe] inspect manually at " + url + " (run `npx playwright install chromium` if the browser is missing).");
    return null;
  }
}
function metadata(deployment) { return deployment?.deployment_trigger?.metadata || {}; }
function parseUrls(text) { return [...new Set((String(text).match(/https?:\/\/[^\s<>)]+/g) || []).map((v) => v.replace(/[),.;]+$/, "")))]; }
function lastUuid(text) { const matches = String(text).match(UUID_RE) || []; return matches[matches.length - 1] || ""; }
function eslintArgs(sourceFiles) { return ["exec", "--", "eslint", "--quiet", ...sourceFiles]; }

/**
 * 변경 목록에서 실제로 린트할 파일만 고른다.
 * 🔴 존재 여부를 반드시 확인한다. `git diff --name-only` 는 삭제된 파일도 이름을 내놓는데,
 * 없는 경로를 eslint 에 넘기면 "No files matching the pattern" 으로 exit 2 가 나고
 * 릴리스가 통째로 막힌다(파일을 지운 PR 마다 재현된다).
 */
function lintTargets(files) {
  return files
    .filter((file) => /\.(c|m)?js$|\.(c|m)?tsx?$/.test(file))
    .filter((file) => fs.existsSync(path.resolve(root, file)));
}

async function checks(value) {
  const env = envForChecks();
  const sourceFiles = lintTargets(value.files);
  if (sourceFiles.length) run("changed-file lint", npmCommand(), eslintArgs(sourceFiles), { env });
  run("TypeScript typecheck", npmCommand(), ["run", "typecheck"], { env });
  // 🔴 로그인·결제는 무엇을 고쳤든 매 프리뷰마다 상시 회귀한다(risk level·deepRequired 와 무관, 사용자
  // 명시 요청 2026-08-10). 계기: React 환경 단건결제 PG창 미노출 사고 — 원인 파일(billing-client.ts·
  // destiny-profile.js)은 결제 경로가 아니어도 자주 함께 바뀌는 공용 런타임이라, "이 변경은 결제와
  // 무관해 보인다"는 판단만으로는 놓칠 수 있다. deploy:critical(15개 스크립트) 전체를 매번 돌리면
  // 무관한 변경도 느려지므로, 여기서는 로그인+결제 핵심만 가볍게 유지한다. deepRequired 경로가
  // 걸리면 아래에서 deploy:critical 전체가 추가로 돈다(중복이 아니라 상위 게이트로 대체).
  run("login+payment regression (always-on): worker auth/payments", npmCommand(), ["run", "test:worker:auth-payments"], { env });
  run("login+payment regression (always-on): PortOne single-payment", npmCommand(), ["run", "verify:portone-single-payment"], { env });
  if (value.risk.level !== "low") run("core mock smoke tests", npmCommand(), ["run", "smoke:core"], { env });
  if (value.risk.level === "medium") run("Node regression tests", npmCommand(), ["run", "test:node"], { env });
  // deep 은 risk level 과 독립이다. 결제·인증·DB 스키마·배포 인프라는 preview 스모크가
  // 못 잡으므로 level 이 무엇이든 전체 회귀를 돌린다. PR 리뷰를 대체하는 자리다.
  if (value.risk.level === "high" || value.deep.required) {
    if (value.deep.required) {
      console.log("[deploy-safe] deep verification required:");
      for (const match of value.deep.matches) console.log("  ! " + match.file + " (" + match.reason + ")");
    }
    run("high-risk mock gates", npmCommand(), ["run", "deploy:critical"], { env });
    run("Node regression tests", npmCommand(), ["run", "test:node"], { env });
  }
}
function build(value) {
  run("single Cloudflare production build", npmCommand(), ["run", "build:cf"], { env: envForChecks() });
  const result = artifact(path.join(root, value.cf.pages.outputDir));
  console.log("[deploy-safe] artifact=" + result.sha256 + " files=" + result.fileCount);
  return result;
}

const LABEL_MAX = 72;
/**
 * Cloudflare 대시보드·`wrangler deployments list` 에 새길 라벨.
 *
 * 예전에는 `safe-production-<sha12>` 같은 기계 문자열만 새겨서, 대시보드만 보고는 그 배포가
 * 무슨 변경인지 알 수 없었다. 형식은 `<단계> <sha7> <커밋 제목>` 이고, 단계를 앞에 두는 이유는
 * Worker 목록에는 브랜치 컬럼이 없어 메시지만으로 preview/prod 를 갈라야 하기 때문이다.
 *
 * 🔴 제목을 그대로 넣지 않는다. win32 에서는 `.cmd` 를 shell:true 로 spawn 하므로(shellArgs)
 * 따옴표·셸 메타문자가 들어가면 인자가 쪼개져 뒷부분이 위치 인자로 오인된다. 공백은 shellArgs 가
 * 큰따옴표로 감싸 주므로 살려 둔다.
 */
function deployLabel(gitState, stage) {
  const subject = String(gitState.subject || "").replace(/["'`%^&|<>()\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  const head = stage + " " + String(gitState.head || "").slice(0, 7);
  const text = subject ? head + " " + subject : head;
  return text.length > LABEL_MAX ? text.slice(0, LABEL_MAX - 3).trim() + "..." : text;
}
/**
 * 프리뷰 Pages 브랜치명. SHA 를 유지해 워크트리마다 고유한 프리뷰 URL 을 갖는 성질을 지키되,
 * 실제 작업 브랜치를 이름에 넣어 대시보드에서 알아볼 수 있게 한다.
 */
function previewBranch(gitState, productionBranch) {
  const safeBranch = String(gitState.branch || "detached").replace(/[^A-Za-z0-9._-]/g, "-");
  const branch = ("preview-" + safeBranch + "-" + String(gitState.head || "").slice(0, 7)).slice(0, 120);
  if (branch === productionBranch) throw new Error("Preview branch collided with the production branch: " + branch);
  return branch;
}

async function deployPages(value, branch, production) {
  const message = deployLabel(value.git, production ? target.label : "preview");
  const args = wrangler(["pages", "deploy", value.cf.pages.outputDir, "--project-name", value.cf.project, "--branch", branch, "--commit-hash", value.git.head, "--commit-message", message]);
  if (!production) args.push("--skip-caching");
  const text = capture("Pages " + (production ? "production" : "preview") + " deployment", npxCommand(), args, { env: envForChecks() });
  const list = await pageDeployments(value.cf, production ? "production" : "preview");
  const deployment = list.find((item) => metadata(item).commit_hash === value.git.head && metadata(item).branch === branch);
  const urls = parseUrls(text);
  const url = urls.find((item) => item.includes(".pages.dev")) || deployment?.url || deployment?.aliases?.[0] || "";
  if (!url) throw new Error("Pages deploy returned no URL.");
  return { id: deployment?.id || "", url, branch, message };
}
async function uploadWorker(value) {
  const alias = "preview-" + value.git.head.slice(0, 12);
  const text = capture("Worker preview version upload", npxCommand(), wrangler(["versions", "upload", "--config", target.workerConfig, "--name", value.cf.worker, "--tag", alias, "--preview-alias", alias, "--message", deployLabel(value.git, "preview"), "--var", "COMMIT_SHA:" + value.git.head]), { env: envForChecks() });
  const versionId = lastUuid(text);
  const previewUrl = parseUrls(text).find((item) => /workers\.dev/i.test(item)) || process.env.CD_WORKER_PREVIEW_ORIGIN || "";
  if (!versionId) throw new Error("Worker preview upload returned no version ID.");
  if (!previewUrl && !allowNoWorkerPreview) throw new Error("Worker preview URL missing. Set CD_WORKER_PREVIEW_ORIGIN or pass --allow-no-worker-preview.");
  return { versionId, previewUrl, alias };
}
async function smoke(base, apiOrigin = "", skipApi = false) {
  const args = [path.join(scriptDir, "deploy-smoke.mjs"), "--base", base];
  if (apiOrigin) args.push("--api-origin", apiOrigin);
  // A Pages preview is static-only in this release path. Its /api routes are
  // intentionally absent; production smoke below remains API-strict.
  if (skipApi) args.push("--skip-api");
  run("read-only smoke test", process.execPath, args, { env: envForChecks() });
}
/**
 * 프로덕션 스모크 **전에** Pages 전환이 실제로 전파될 때까지 기다린다.
 *
 * 🔴 이게 없으면 릴리스가 배포마다 무작위로 실패한다. deployPages(production) 직후에는
 * 새 HTML 을 받은 엣지 PoP 가 아직 옛 배포를 가리켜, 그 HTML 이 참조하는
 * `_next/static/chunks/webpack-*.js` 가 404 로 내려온다. 브라우저 스모크는 그 404 를
 * console.error 로 잡아 릴리스를 실패시키고, 그러면 워커가 자동 롤백된다 —
 * 코드에는 아무 문제가 없는데도 배포가 되돌아간다(2026-08-07: 5연속 실패).
 *
 * scripts/verify-deployed-assets.mjs 가 정확히 이 구간을 위해 만들어져 있었지만
 * (자기 주석에 "배포 30초 뒤 bare/cdcb 모두 404 → 잠시 뒤 둘 다 200" 실측이 적혀 있다)
 * 어디에서도 호출되지 않아 죽은 도구였다. 5라운드 × 25초 재시도 예산이 곧 전파 대기다.
 *
 * 이건 검사를 무르게 하는 것이 아니다 — 전파가 끝난 뒤에도 자산이 죽어 있으면 그대로 실패하고,
 * 그 실패는 진짜 산출물 문제다. 순서만 바로잡는다.
 */
/**
 * 방금 만든 Pages 배포본 자체를 검사한다. `pages.url` 은 배포 고유 URL 이라 **하나의 불변 배포본만**
 * 서빙하므로 세대 혼입이 없다 — 여기서 404 가 나오면 기다린다고 생기지 않는 진짜 산출물 문제이고,
 * 그때는 롤백이 옳다. 판정을 결정적인 지점으로 옮겨 두면, 아래 별칭 검사를 무르게 해도
 * "자산이 진짜 빠진 배포"가 통과하지는 않는다.
 */
function verifyDeployedArtifact(value, deploymentUrl) {
  run(
    "deployed artifact completeness",
    process.execPath,
    [path.join(scriptDir, "verify-deployed-assets.mjs")],
    {
      env: {
        ...envForChecks(),
        CD_DEPLOY_VERIFY_ORIGIN: deploymentUrl,
        CD_DEPLOY_ASSETS_MODE: "artifact",
        CD_DEPLOY_EXPECTED_DIR: path.join(root, value.cf.pages.outputDir),
      },
    },
  );
}

/**
 * 프로덕션 별칭이 새 배포본으로 전환됐는지 기다린다. **실패해도 던지지 않는다.**
 *
 * 별칭은 전환 중에 두 세대를 동시에 서빙한다. 그 구간에 HTML 은 새 배포본에서, 자산은 옛 배포본에서
 * 오면 해시가 바뀐 청크만 404 로 내려온다. 이걸 실패로 처리하던 것이 2026-08-07~08 릴리스가
 * 반복 실패한 이유였고, 더 나쁜 것은 그 실패가 자동 롤백을 불러 **전환 구간을 하나 더 만들어**
 * 다음 릴리스까지 같은 이유로 실패시킨 점이다(어떤 실행의 롤백 대상이 직전 실패 실행이 만든
 * 배포본이었다). 롤백으로는 전파도 엣지 캐시 404 도 고쳐지지 않는다.
 *
 * 그래서 이 단계는 관측·경보 전용이다. 되돌릴 근거는 위 artifact 검사와 아래 스모크가 갖는다.
 */
function awaitProductionAssets(value, base) {
  try {
    run(
      "production asset propagation",
      process.execPath,
      [path.join(scriptDir, "verify-deployed-assets.mjs")],
      {
        env: {
          ...envForChecks(),
          CD_DEPLOY_VERIFY_ORIGIN: base,
          CD_DEPLOY_ASSETS_MODE: "alias",
          CD_DEPLOY_EXPECTED_DIR: path.join(root, value.cf.pages.outputDir),
        },
      },
    );
  } catch (error) {
    console.error("::error::프로덕션 별칭 자산 검사에서 문제가 보고됐습니다: " + error.message);
    console.error("::error::릴리스는 되돌리지 않습니다 — 배포본 자체는 artifact 검사에서 완전함이 확인됐고, 롤백은 전환 구간을 하나 더 만들 뿐입니다. 위 로그의 엣지 캐시 오염 여부를 확인하세요.");
  }
}

function targetOrigin(value) {
  const fromEnv = originFromTargetEnv();
  if (fromEnv) return fromEnv;
  const domain = value.cf.pages.domains.find((item) => !item.includes(".pages.dev")) || value.cf.pages.domains[0];
  return domain ? "https://" + domain.replace(/^https?:\/\//, "").replace(/\/+$/, "") : "";
}

// 배포 직후 확인. deploy-smoke 가 /api/health·/api/version 200 과 콘솔 에러를 이미 보고,
// 여기서는 그것만으로는 못 잡는 두 가지를 더 본다. 둘 다 이미 있던 스크립트인데 통합
// 릴리스로 개편될 때 호출부가 사라져 죽어 있었다.
async function postDeployHealth(value, workerPromoted) {
  const origin = targetOrigin(value);
  await smoke(origin);
  // verify-pages-worker-parity 는 "방금 배포한 커밋"을 GITHUB_SHA 로 읽는다. 로컬 배포에는
  // 그 변수가 없으므로 HEAD 를 넣어 준다.
  const env = { ...envForChecks(), CD_DEPLOY_VERIFY_ORIGIN: origin, CD_WORKER_VERSION_URL: origin + "/api/version", GITHUB_SHA: value.git.head };
  // Pages 와 Worker 가 같은 커밋인지. 결제·접근 상태처럼 양쪽이 맞물린 변경에서 어긋나면
  // 두 코드가 서로 다른 계약으로 대화한다.
  //
  // 🔴 --worker-promoted 를 반드시 넘긴다. 이 분기에 들어왔다는 것은 이번 릴리스가 Worker 를
  // 승격했다는 뜻이고, 그러면 두 계층은 무조건 같은 커밋이어야 한다. 넘기지 않으면 검사가
  // "팁 커밋이 결제 파일을 바꿨는가"로 스스로를 게이트하는데, 로컬 배포는 커밋을 묶어 내보내므로
  // 마지막 커밋만 보고 조용히 꺼진다(2026-08-11 릴리스가 그렇게 건너뛰었다). 여기서 승격 사실을
  // 아는데 추정에 맡기는 것은 871 줄의 needsWorker 와 같은 실수다.
  if (workerPromoted) run("Pages/Worker commit parity", process.execPath, [path.join(scriptDir, "verify-pages-worker-parity.mjs"), "--worker-promoted"], { env });
  // 자산 검사는 여기서 하지 않는다 — promote() 가 배포본(artifact)과 별칭(alias)을 나눠
  // 이미 확인했고, 여기서 한 번 더 돌리면 별칭의 전환 구간 404 가 다시 롤백을 부른다.
}

async function checkStage() {
  const value = await context();
  printContext(value);
  console.log("[deploy-safe] check passed; no deploy or data mutation.");
  return value;
}
async function previewStage() {
  const value = await checkStage();
  // wrangler 는 커밋이 아니라 워킹트리를 민다. 베이스가 낡으면 그 사이 origin/main 에
  // 들어온 worker/·lib/ 변경이 조용히 사라진다(2026-08-01 에 4건). 로컬이 주 배포 경로가
  // 된 지금은 이 검사가 CI 시절보다 더 중요하다. 우회는 --allow-stale.
  if (!ciMode) assertWorkerBaseIsFresh(root, { argv: process.argv.slice(2) });
  await checks(value);
  const built = build(value);
  const branch = previewBranch(value.git, value.cf.pages.productionBranch);
  const pages = await deployPages(value, branch, false);
  const worker = value.needsWorker ? await uploadWorker(value) : null;
  const state = {
    schema: 1, createdAt: new Date().toISOString(),
    git: { branch: value.git.branch, commit: value.git.head, dirty: value.git.dirty },
    risk: value.risk, deep: value.deep, files: value.files,
    cf: { project: value.cf.project, worker: value.cf.worker, productionBranch: value.cf.pages.productionBranch },
    artifact: built, preview: { pages, worker, smokePassed: false }, worker,
  };
  writeState(state);
  console.log("[deploy-safe] Pages preview URL: " + pages.url);
  if (worker?.previewUrl) console.log("[deploy-safe] Worker preview URL: " + worker.previewUrl);
  return { value, state };
}
/**
 * Pages 프로덕션 배포를 이전 배포로 되돌린다. rollbackStage 가 쓰던 것과 같은 API 다.
 */
async function rollbackPagesDeployment(project, deploymentId) {
  return cfFetch(
    apiBase() + "/accounts/" + process.env.CLOUDFLARE_ACCOUNT_ID
    + "/pages/projects/" + encodeURIComponent(project)
    + "/deployments/" + encodeURIComponent(deploymentId) + "/rollback",
    { method: "POST" },
  );
}

/**
 * 🔴 병렬 워크트리의 진짜 위험은 동시 실행이 아니라 **되돌리기**다.
 *
 * wrangler 는 커밋이 아니라 워킹트리를 민다. 워크트리 A 가 X 를 승격한 뒤, X 를 모르는 워크트리 B 가
 * 승격하면 프로덕션은 조용히 X 이전으로 돌아간다. B 의 트리는 깨끗하고 B 의 테스트는 통과하므로
 * 아무 신호도 없다 — 2026-08-01 에 이 방식으로 머지된 변경 4건이 사라졌다.
 *
 * origin/main 기준 검사(assertWorkerBaseIsFresh)로는 부족하다. 로컬 우선 배포에서는 **라이브가
 * origin/main 보다 앞설 수 있다**(배포했지만 아직 push 안 한 상태). 그래서 기준은 오직 라이브다:
 * 지금 프로덕션에 떠 있는 커밋을 내 HEAD 가 포함하고 있어야 승격할 수 있다.
 */
async function assertPromotionIsNotRegression(value) {
  if (cli.flags.has("--allow-regression")) {
    console.warn("[deploy-safe] --allow-regression: 라이브 커밋 포함 여부를 확인하지 않습니다. 남의 배포를 되돌릴 수 있습니다.");
    return;
  }
  const origin = targetOrigin(value);
  if (!origin) return;
  const read = async (pathname) => {
    try {
      const res = await fetch(origin + pathname, { signal: AbortSignal.timeout(10_000) });
      return String((await res.json())?.commit || "").trim();
    } catch {
      return "";
    }
  };
  const [pagesLive, workerLive] = await Promise.all([read("/version.json"), read("/api/version")]);
  const targets = [["Pages", pagesLive], ["Worker", workerLive]]
    .filter(([, commit]) => /^[0-9a-f]{7,64}$/i.test(commit) && commit !== value.git.head);
  const gitOk = (args) => spawnSync("git", args, { cwd: root, windowsHide: true }).status === 0;
  for (const [label, live] of targets) {
    // 로컬에 없는 커밋이면 포함 여부를 판단할 수 없다. 조용히 통과시키면 가드가 아니다.
    if (!gitOk(["cat-file", "-e", live + "^{commit}"])) {
      if (!gitOk(["fetch", "origin", "--no-tags", "--quiet"]) || !gitOk(["cat-file", "-e", live + "^{commit}"])) {
        throw new Error(label + " is live at " + live.slice(0, 12) + ", which does not exist in this checkout."
          + "\n  That commit was deployed from somewhere else and never pushed. Fetch or pull it before promoting,"
          + "\n  or pass --allow-regression if you are deliberately reverting to this HEAD.");
      }
    }
    if (!gitOk(["merge-base", "--is-ancestor", live, value.git.head])) {
      throw new Error(label + " is live at " + live.slice(0, 12) + ", and your HEAD does not contain it."
        + "\n  Promoting now would roll production back to before that deploy — another worktree shipped it."
        + "\n  Run: git fetch origin && git merge " + live.slice(0, 12)
        + "\n  Then re-run the release. Use --allow-regression only for a deliberate revert.");
    }
  }
}

/**
 * 승격 직전에 HEAD 를 origin 으로 올린다.
 *
 * 로컬이 주 배포 경로이므로 push 하지 않은 커밋도 그대로 프로덕션에 나간다. 그러면 Cloudflare 가
 * 표시하는 커밋이 GitHub 에 존재하지 않아 "지금 뜬 게 무슨 변경인가"를 대시보드에서도 GitHub 에서도
 * 확인할 수 없다. 승격 직전에 밀어 두면 라이브 커밋은 항상 GitHub 에서 열린다.
 *
 * push 가 실패하면 승격을 중단한다 — 대개 원격이 앞서 있다는 뜻이고, 그 상태로 밀면 다른 세션이
 * 올린 변경을 되돌릴 위험이 있다(프로덕션은 아직 아무것도 건드리지 않은 시점이라 중단이 안전하다).
 */
function pushHeadToOrigin(value) {
  if (ciMode) return;
  if (skipPush) {
    console.warn("[deploy-safe] --no-push: HEAD 를 origin 에 올리지 않습니다. 라이브 커밋이 GitHub 에 없을 수 있습니다.");
    return;
  }
  const branch = value.git.branch;
  if (!branch) return;
  const remote = git(["rev-parse", "--verify", "--quiet", "origin/" + branch], { allowFailure: true });
  const ahead = remote ? git(["rev-list", "--count", "origin/" + branch + "..HEAD"], { allowFailure: true }) : "";
  if (remote && ahead === "0") return;
  const args = remote ? ["push", "origin", "HEAD:" + branch] : ["push", "-u", "origin", branch];
  console.log("[deploy-safe] pushing HEAD to origin/" + branch + " so the live commit exists on GitHub.");
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    throw new Error("git " + args.join(" ") + " failed: " + String(result.stderr || "").trim()
      + "\n  Production was not touched. The remote is probably ahead — run: git pull --rebase origin " + branch
      + "\n  then re-run the release. Pass --no-push only if you deliberately ship without pushing.");
  }
}

async function promote(value, state, yes) {
  if (!yes) throw new Error("Production promotion requires --yes.");
  // 🔴 프로덕션 승격은 GitHub Actions 안에서만 일어난다. 로컬에서 부르면 여기서 끝난다.
  //    (preview·check·smoke 는 그대로 로컬에서 돌아간다 — 막는 것은 프로덕션 쓰기뿐이다.)
  // 🔴 조건부로 감싸지 않는다. `if (target.id === "production")` 로 감싸는 순간, 언젠가 부호가
  //    뒤집혀 로컬 프로덕션 배포가 열린다. 스테이징 승격도 CI 전용으로 두는 데 드는 비용이 없다.
  assertProductionDeployIsCi((target.id === "staging" ? "Staging" : "Production") + " promotion (Worker + Pages)");
  // 타깃과 실제로 해석된 자원이 일치하는지 승격 직전에 한 번 더 본다. 오늘 타깃이 둘이라
  // "요청한 타깃 ≠ 배포될 자원" 이라는 불일치 클래스가 존재한다.
  assertResolvedTargetMatches(value);
  await assertPromotionIsNotRegression(value);
  pushHeadToOrigin(value);
  assertArtifact(state);
  // gitleaks 는 GitHub 체크로만 돌았다. 로컬 승격에는 그 경로가 없으므로 레포에 이미 있는
  // 시크릿 스캐너를 승격 직전에 돌린다(외부 바이너리 불필요).
  run("secret leak scan", npmCommand(), ["run", "verify:no-secret-leak"], { env: envForChecks() });
  const oldPages = (await pageDeployments(value.cf, "production")).find((item) => metadata(item).branch === value.cf.pages.productionBranch);
  // 🔴 승격 대상은 preview 단계가 결정한다. 여기서 needsWorker 를 다시 계산하면 안 된다.
  //
  // needsWorker 는 "변경 파일 집합"에서 나오는데, 그 집합은 preview 이후 push 만으로도 줄어든다
  // (변경 범위가 origin/main 기준이라 push 하면 커밋분이 빠진다). 그러면 워커 preview 버전을
  // 멀쩡히 올려 두고도 승격을 건너뛰어 프로덕션이 '새 Pages + 옛 Worker' 로 어긋난다.
  // 2026-08-08 에 실제로 그렇게 나갔다 — Pages 는 12a969bca 인데 Worker 는 4583e3bb4fff 에
  // 남았고, 같은 이유로 Pages/Worker 패리티 검사까지 건너뛰어 아무도 잡지 못했다.
  // state.worker.versionId 가 있다는 것은 preview 가 "이 릴리스는 워커를 포함한다"고 판단했다는 뜻이다.
  const shouldPromoteWorker = Boolean(state.worker?.versionId);
  const oldWorker = shouldPromoteWorker ? await workerActive(value.cf) : null;
  let workerPromoted = false;
  let pagesPromoted = false;
  try {
    if (shouldPromoteWorker) {
      capture("Worker 100% promotion", npxCommand(), wrangler(["versions", "deploy", state.worker.versionId + "@100", "--name", value.cf.worker, "--message", deployLabel(value.git, target.label), "--yes"]), { env: envForChecks() });
      workerPromoted = true;
    }
    const pages = await deployPages(value, value.cf.pages.productionBranch, true);
    pagesPromoted = true;
    const next = {
      ...state,
      production: { deployedAt: new Date().toISOString(), pagesDeploymentId: pages.id, pagesUrl: targetOrigin(value), workerVersionId: state.worker?.versionId || "" },
      rollback: { pagesDeploymentId: oldPages?.id || "", workerVersionId: oldWorker?.versionId || "" },
    };
    writeState(next);
    // ① 배포본 자체가 완전한지. 불변 URL 이라 결정적이고, 여기서 깨지면 롤백이 옳다.
    verifyDeployedArtifact(value, pages.url);
    // ② 별칭이 전환됐는지. 관측 전용 — 전환 지연으로 릴리스를 되돌리지 않는다.
    awaitProductionAssets(value, targetOrigin(value));
    // ③ 그 다음에 스모크 + Pages/Worker 커밋 패리티(postDeployHealth 가 smoke 를 품는다).
    await postDeployHealth(value, workerPromoted);
    writeState({ ...next, production: { ...next.production, smokePassed: true } });
    console.log("[deploy-safe] production health check passed; commit=" + value.git.head);
  } catch (error) {
    console.error("[deploy-safe] production failed: " + error.message);

    // 🔴 Pages 와 Worker 는 **함께** 되돌린다.
    //
    // 예전에는 Worker 만 자동 롤백하고 Pages 는 롤백 대상 ID 만 출력한 뒤 사람이 확인하도록 두었다.
    // 그 결과 실패한 릴리스마다 프로덕션이 '새 클라이언트 + 옛 워커' 로 어긋난 채 남았고, 실패가
    // 반복되면서 어긋남이 누적됐다. 2026-08-07 에는 그 누적이 실제 장애로 드러났다 — 라이브
    // /me/ 가 참조하는 청크 4개가 404(bare·bypass 둘 다)였다. HTML 세대와 자산 세대가 서로
    // 다른 배포에서 온 것이다.
    //
    // 롤백 순서는 승격의 역순(Pages → Worker)이다. 승격은 Worker → Pages 였으므로 LIFO 로 되돌린다.
    // 중간 상태의 위험도도 이 순서가 낫다: '옛 클라이언트 + 새 워커'(워커 API 는 대개 하위호환)가
    // '새 클라이언트 + 옛 워커'(새 클라이언트가 없는 API 를 부른다)보다 안전하다.
    let pagesRolledBack = false;
    if (pagesPromoted && oldPages?.id) {
      try {
        await rollbackPagesDeployment(value.cf.project, oldPages.id);
        pagesRolledBack = true;
        console.error("[deploy-safe] Pages rollback completed. target=" + oldPages.id);
      } catch (rollbackError) {
        console.error("[deploy-safe] Pages rollback failed: " + rollbackError.message);
        console.error("[deploy-safe] Pages rollback target=" + oldPages.id + "; run deploy:rollback -- --yes manually.");
      }
    } else if (oldPages?.id) {
      console.error("[deploy-safe] Pages was not promoted; nothing to roll back.");
    }

    if (workerPromoted && oldWorker?.versionId) {
      try {
        capture("automatic Worker rollback", npxCommand(), wrangler(["versions", "deploy", oldWorker.versionId + "@100", "--name", value.cf.worker, "--message", "auto-rollback from " + value.git.head.slice(0, 7), "--yes"]), { env: envForChecks() });
        console.error("[deploy-safe] Worker rollback completed.");
      } catch (rollbackError) { console.error("[deploy-safe] Worker rollback failed: " + rollbackError.message); }
    }

    // 한쪽만 되돌아간 상태는 조용히 지나가면 안 된다 — 그게 이번 사고의 형태였다.
    if (pagesPromoted && !pagesRolledBack && workerPromoted) {
      console.error("::error::프로덕션이 세대 불일치 상태일 수 있습니다(Pages 새 세대 + Worker 옛 세대). 즉시 확인하세요.");
    }
    throw error;
  }
}
// preview 배포 + 스모크 + 브라우저 오픈까지. deploy:preview 와 deploy:safe 가 공유한다.
// 스모크를 여기 두는 이유: deploy:preview 만 돌리고 끝내면 smokePassed 가 false 로 남아
// 이어지는 deploy:production 이 무조건 거부된다.
async function previewAndSmoke() {
  const preview = await previewStage();
  // workers.dev preview aliases do not carry the Pages custom-domain routing
  // used by /api. Validate preview rendering here; production smoke below
  // remains the authoritative API health and guest-boundary check.
  await smoke(preview.state.preview.pages.url, "", true);
  const state = { ...preview.state, preview: { ...preview.state.preview, smokePassed: true, smokedAt: new Date().toISOString() } };
  writeState(state);
  const browser = await openPreviewSignedIn(state.preview.pages.url);
  return { value: preview.value, state, browser };
}
async function productionStage() {
  const state = readState();
  const value = await checkStage();
  if (!state || state.git?.commit !== value.git.head) throw new Error("Release state does not match HEAD. Run npm run deploy:preview first.");
  if (!state.preview?.smokePassed) throw new Error("Preview smoke has not passed. Run npm run deploy:preview first.");
  if (!(autoYes || await confirmProduction(value))) {
    console.log("[deploy-safe] declined; production is untouched.");
    return;
  }
  await promote(value, state, true);
}
async function confirmProduction(value) {
  // PR 리뷰를 대체하는 자리. 결제·인증·DB·배포 인프라가 걸렸으면 무엇이 왜 위험한지
  // 눈앞에 나열한 뒤 확인을 받는다.
  if (value?.deep?.required) {
    console.log("[deploy-safe] this release touches paths a preview smoke cannot validate:");
    for (const match of value.deep.matches) console.log("  ! " + match.file + " (" + match.reason + ")");
  }
  if (!input.isTTY || !output.isTTY) throw new Error("Pass --yes in a non-interactive terminal.");
  const rl = createInterface({ input, output });
  try { return /^y(es)?$/i.test((await rl.question("Inspect the preview in the browser, then answer. Promote this exact artifact to production? [y/N] ")).trim()); }
  finally { rl.close(); }
}
// deploy:preview 단독 실행. Playwright 창은 이 프로세스가 끝나면 함께 죽으므로, 사용자가
// 다 볼 때까지 기다렸다가 정리한다. deploy:safe 는 [y/N] 프롬프트가 그 역할을 대신한다.
async function previewStageStandalone() {
  const preview = await previewAndSmoke();
  if (preview.browser && input.isTTY && output.isTTY) {
    const rl = createInterface({ input, output });
    try { await rl.question("Preview window is open. Press Enter when you are done inspecting. "); }
    finally { rl.close(); }
  }
  await closePreviewBrowser(preview.browser);
  console.log("[deploy-safe] preview ready at " + preview.state.preview.pages.url);
  console.log("[deploy-safe] promote with: npm run deploy:production");
  return preview;
}
async function safeStage() {
  // 잠금은 preview 와 사용자 확인이 끝난 뒤 승격 직전에만 잡는다. 빌드와 스모크까지 잠그면
  // 다른 워크트리가 몇 분씩 대기하고, 사람이 [y/N] 을 붙들고 있는 시간까지 잠기게 된다.
  const preview = await previewAndSmoke();
  console.log("[deploy-safe] Preview passed. Production is the only remaining step.");
  if (previewOnly) {
    console.log("[deploy-safe] Preview-only mode; production was not attempted.");
    await closePreviewBrowser(preview.browser);
    return;
  }
  // 거절은 정상적인 답이다. 예전에는 promote() 가 "requires --yes" 로 던져서, 사용자가
  // preview 를 보고 "아니오" 를 고른 것이 실패처럼 보였다.
  const approved = autoYes || await confirmProduction(preview.value);
  // 브라우저는 결정을 받은 뒤에 닫는다. 그래야 사용자가 [y/N] 을 고민하는 동안 창이 살아 있다.
  await closePreviewBrowser(preview.browser);
  if (!approved) {
    console.log("[deploy-safe] declined; production is untouched. The preview stays at " + preview.state.preview.pages.url);
    return;
  }
  return withLock(() => promote(preview.value, preview.state, true));
}
async function listRollbackTargets(value) {
  const pages = await pageDeployments(value.cf, "production");
  console.log("[deploy-safe] Pages production deployments (newest first):");
  for (const item of pages.slice(0, 10)) {
    const meta = metadata(item);
    console.log("  " + (item.id || "?") + "  " + (item.created_on || "") + "  " + String(meta.commit_hash || "").slice(0, 12) + "  " + (meta.commit_message || ""));
  }
  const versions = await workerVersions(value.cf).catch((error) => {
    console.log("  (Worker versions unavailable: " + error.message + ")");
    return [];
  });
  const active = await workerActive(value.cf).catch(() => ({ versionId: "" }));
  console.log("[deploy-safe] Worker versions (newest first), active=" + (active.versionId || "unknown") + ":");
  for (const item of versions.slice(0, 10)) {
    console.log("  " + (item.id || "?") + "  " + (item.metadata?.created_on || "") + "  " + (item.annotations?.["workers/message"] || ""));
  }
  console.log("[deploy-safe] roll back with: npm run deploy:rollback -- --yes [--to=<pagesDeploymentId>] [--worker-version=<id>]");
}
async function rollbackStage() {
  const value = await checkStage();
  // 목록 조회는 프로덕션을 바꾸지 않으므로 가드 앞에 둔다. 어느 버전으로 되돌릴지 고르는 일은
  // 로컬에서 할 수 있어야 한다 — 되돌리는 실행만 GitHub Actions 로 보낸다.
  if (listOnly) return listRollbackTargets(value);
  if (!autoYes) throw new Error("Rollback requires --yes. Run npm run deploy:rollback -- --list to see the targets first.");
  assertProductionDeployIsCi("Production rollback");
  const state = readState();
  // --to / --worker-version 이 있으면 기록된 직전 버전 대신 그 버전으로 되돌린다.
  const pagesTarget = cli.values.get("to") || state?.rollback?.pagesDeploymentId || "";
  const workerTarget = cli.values.get("worker-version") || state?.rollback?.workerVersionId || "";
  if (!pagesTarget && !workerTarget) throw new Error("No rollback target. Pass --to=<id> / --worker-version=<id>, or run a production deploy first so " + stateFile + " records one.");
  const result = {};
  if (workerTarget) {
    capture("Worker rollback", npxCommand(), wrangler(["versions", "deploy", workerTarget + "@100", "--name", value.cf.worker, "--message", "manual-rollback to " + String(workerTarget).slice(0, 8), "--yes"]), { env: envForChecks() });
    result.workerVersionId = workerTarget;
  }
  // pagesTarget 을 쓴다(--to 오버라이드 + 기록된 직전 배포 폴백). 실제 호출은 공용 헬퍼로.
  if (pagesTarget) {
    const pages = await rollbackPagesDeployment(value.cf.project, pagesTarget);
    result.pagesDeploymentId = pages?.id || pagesTarget;
  }
  writeState({ ...(state || {}), lastRollback: { at: new Date().toISOString(), ...result } });
  console.log("[deploy-safe] rollback completed; verifying production.");
  // 롤백도 검증한다. 되돌린 상태가 멀쩡한지 확인하지 않으면 롤백이 두 번째 장애가 된다.
  await smoke(targetOrigin(value));
  console.log("[deploy-safe] rollback smoke passed.");
}
async function smokeOnlyStage() {
  const base = cli.values.get("base") || process.env.CD_SMOKE_BASE;
  if (!base) throw new Error("Usage: npm run deploy:smoke -- --base https://preview.example.pages.dev");
  await smoke(base, cli.values.get("api-origin") || process.env.CD_SMOKE_API_ORIGIN || "");
}
async function selfTest() {
  const cases = [
    ["style", classifyFile("styles/site.css").level, "low"],
    ["component", classifyFile("components/Button.tsx").level, "medium"],
    ["payment", classifyFile("worker/routes/payments.js").level, "high"],
    ["wrangler", classifyFile("wrangler.toml").level, "high"],
  ];
  for (const item of cases) if (item[1] !== item[2]) throw new Error(item[0] + " classification failed.");
  const lint = eslintArgs(["fixture.js"]);
  if (!lint.includes("--quiet") || lint.includes("--max-warnings=0")) throw new Error("release lint must block errors without promoting warnings.");
  // 파일을 지운 릴리스가 eslint exit 2 로 막히던 회귀를 잠근다.
  const targets = lintTargets(["scripts/deploy-safe.mjs", "app/does-not-exist/Deleted.tsx", "docs/readme.md"]);
  if (!targets.includes("scripts/deploy-safe.mjs")) throw new Error("changed-file lint must keep existing source files.");
  if (targets.some((file) => file.includes("Deleted.tsx"))) throw new Error("changed-file lint must skip deleted files; eslint exits 2 on missing paths.");
  if (targets.some((file) => file.endsWith(".md"))) throw new Error("changed-file lint must only take JS/TS sources.");
  const pagesListUrl = pageDeploymentsUrl({ project: "project name" }, "preview");
  if (!pagesListUrl.includes("/project%20name/deployments?env=preview") || /[?&](?:page|per_page)=/.test(pagesListUrl)) throw new Error("Pages deployment lookup must use Cloudflare default pagination.");
  if (parseUrls("https://a.pages.dev https://b.workers.dev").length !== 2) throw new Error("URL parser failed.");

  // 배포 라벨은 대시보드에서 "이 배포가 무슨 변경인가"를 답하는 유일한 단서다.
  const sample = { head: "b914081de8712345", branch: "main", subject: "fix(saju): give eokbu priority" };
  const label = deployLabel(sample, "prod");
  if (!label.startsWith("prod b914081 ") || !label.includes("give eokbu priority")) throw new Error("deploy label must carry stage, short SHA, and the commit subject.");
  // 🔴 win32 는 .cmd 를 shell:true 로 spawn 한다. 따옴표·셸 메타문자가 남으면 인자가 쪼개져 배포가 죽는다.
  const dirty = deployLabel({ ...sample, subject: 'fix: "quoted" & piped | %VAR% (paren)' }, "preview");
  if (/["'`%^&|<>()]/.test(dirty)) throw new Error("deploy label must strip shell metacharacters.");
  if (deployLabel({ ...sample, subject: "x".repeat(200) }, "prod").length !== LABEL_MAX) throw new Error("deploy label must be truncated.");
  if (previewBranch(sample, "main") !== "preview-main-b914081") throw new Error("preview branch name drifted.");
  let collided = false;
  try { previewBranch({ head: "abc1234", branch: "x" }, "preview-x-abc1234"); } catch { collided = true; }
  if (!collided) throw new Error("preview branch must never equal the production branch.");

  // 결제·인증·DB·배포 인프라는 risk level 과 무관하게 전체 회귀를 요구해야 한다.
  if (!requiresDeepVerification(["worker/routes/payments.js"]).required) throw new Error("payment paths must require deep verification.");
  if (requiresDeepVerification(["worker/routes/ziwei-ai.js"]).required) throw new Error("ordinary worker routes must not require deep verification.");

  // 🔴 --pages-only 가 없을 때의 판정은 예전과 완전히 같아야 한다. 여기가 틀리면 일일 운세
  // 발행 하나를 고치려다 **모든 릴리스**가 Worker 를 빠뜨린다.
  if (resolveNeedsWorker({ pagesOnly: false, files: ["worker/index.js"], staleWorkerCommit: "" }) !== true) throw new Error("worker changes must keep the Worker in the release.");
  if (resolveNeedsWorker({ pagesOnly: false, files: ["app/page.js"], staleWorkerCommit: "abc1234" }) !== true) throw new Error("a stale live Worker must keep the Worker in the release.");
  if (resolveNeedsWorker({ pagesOnly: false, files: ["app/page.js"], staleWorkerCommit: "" }) !== allowEmptyChangeSet) throw new Error("unrelated changes must follow the empty-changeset rule, nothing else.");
  // --pages-only 는 다른 모든 신호를 이긴다. 그 전제는 context() 의 fail-closed 단언이 지킨다.
  if (resolveNeedsWorker({ pagesOnly: true, files: ["worker/index.js"], staleWorkerCommit: "abc1234" }) !== false) throw new Error("--pages-only must exclude the Worker from the release.");

  // writeState 가 남기는 것이 실제로 다시 읽히는 JSON 인지. 예전에는 리터럴 "\\n" 을 붙여
  // readState 가 반드시 터졌고, 한 프로세스로 도는 CI 에서는 드러나지 않았다.
  const probe = path.join(root, ".deploy-state-selftest.json");
  try {
    fs.writeFileSync(probe, JSON.stringify({ schema: 1 }, null, 2) + "\n", "utf8");
    if (JSON.parse(fs.readFileSync(probe, "utf8")).schema !== 1) throw new Error("state round-trip failed.");
  } finally { fs.rmSync(probe, { force: true }); }

  // 잠금·상태는 주 워크트리 하나를 공유해야 병렬 워크트리에서 동시 승격을 막는다.
  // 상태는 워크트리별, 잠금은 저장소 전체 하나. 이 둘이 같은 범위가 되면 병렬 워크트리가
  // 서로의 preview 기록을 덮거나(상태 공유) 서로의 승격을 놓친다(잠금 분리).
  if (path.dirname(stateFile) !== stateDir) throw new Error("state file must live in the state directory.");
  if (path.resolve(stateDir) !== path.resolve(root, ".deploy-state")) throw new Error("state must be per-worktree.");
  if (path.resolve(lockDir) !== path.resolve(primaryWorktree(), ".deploy-state")) throw new Error("promote lock must live in the primary worktree.");
  // self-test 는 stage 없이 돌므로 타깃은 production 이다. 두 타깃의 잠금 이름이 서로 달라야
  // 스테이징 배포가 프로덕션 릴리스를 대기시키지 않는다 — 같아지면 여기서 잡힌다.
  if (path.basename(lockFile) !== "promote.lock") throw new Error("promote lock name drifted.");
  if (TARGETS.production.lockName === TARGETS.staging.lockName) throw new Error("staging must not share the production promote lock.");
  if (TARGETS.production.workerConfig === TARGETS.staging.workerConfig) throw new Error("staging must not share the production Worker config.");
  if (TARGETS.staging.originEnv.includes("CD_PRODUCTION_ORIGIN")) throw new Error("staging must never fall back to the production origin.");
  if (TARGETS.staging.allowPagesNameFallback) throw new Error("staging must not fall back to the local Pages project name.");
  // 타깃 해석기: 스테이징이 프로덕션 자원으로 떨어지는 경로를 각각 증명한다.
  // env 를 건드리므로 끝나면 반드시 되돌린다.
  const pagesSample = { name: "codedestiny" };
  const savedProject = process.env.CF_STAGING_PAGES_PROJECT_NAME;
  const savedWorker = process.env.CF_STAGING_WORKER_NAME;
  const expectReject = (label, work) => {
    let rejected = false;
    try { work(); } catch { rejected = true; }
    if (!rejected) throw new Error(label);
  };
  try {
    delete process.env.CF_STAGING_PAGES_PROJECT_NAME;
    delete process.env.CF_STAGING_WORKER_NAME;
    expectReject("staging must reject an unset Pages project instead of falling back.",
      () => resolveTargetNames(pagesSample, { name: "code-destiny-web-staging" }, TARGETS.staging));

    process.env.CF_STAGING_PAGES_PROJECT_NAME = "codedestiny";
    expectReject("staging must reject the production Pages project.",
      () => resolveTargetNames(pagesSample, { name: "code-destiny-web-staging" }, TARGETS.staging));

    process.env.CF_STAGING_PAGES_PROJECT_NAME = "codedestiny-staging";
    expectReject("staging must reject the production Worker name.",
      () => resolveTargetNames(pagesSample, { name: "code-destiny-web" }, TARGETS.staging));

    const resolved = resolveTargetNames(pagesSample, { name: "code-destiny-web-staging" }, TARGETS.staging);
    if (resolved.project !== "codedestiny-staging" || resolved.worker !== "code-destiny-web-staging") {
      throw new Error("staging target resolution drifted: " + JSON.stringify(resolved));
    }
  } finally {
    if (savedProject === undefined) delete process.env.CF_STAGING_PAGES_PROJECT_NAME;
    else process.env.CF_STAGING_PAGES_PROJECT_NAME = savedProject;
    if (savedWorker === undefined) delete process.env.CF_STAGING_WORKER_NAME;
    else process.env.CF_STAGING_WORKER_NAME = savedWorker;
  }
  // 승격 직전 타깃 대조도 양방향으로 증명한다.
  expectReject("production promotion must reject staging resources.",
    () => assertResolvedTargetMatches({ cf: { project: "codedestiny-staging", worker: "code-destiny-web-staging" } }));

  console.log("[deploy-safe] self-test passed.");
}

// return 만 하면 finally 가 프라미스를 기다리지 않고 즉시 unlock 해, 잠금이 작업 시작
// 직후 풀렸다. 보조 워크트리와 잠금을 공유하는 지금은 그 창이 곧 동시 승격이다.
// Playwright 로 띄운 창은 부모 프로세스가 끝나면 함께 죽는다. 그래서 승격 결정 전까지는
// 열어 두고, 결정이 난 뒤에만 정리한다. 기본 브라우저로 폴백했으면 닫을 대상이 없다.
async function closePreviewBrowser(browser) {
  if (!browser) return;
  try { await browser.close(); } catch {}
}
async function withLock(work) {
  lock();
  try { return await work(); } finally { unlock(); }
}
/**
 * 🔴 이미 라이브인 커밋을 다시 빌드해서 다시 올리지 않는다.
 *
 * Next.js 청크 해시는 환경 간 재현되지 않는다. 같은 커밋이라도 다른 머신에서 빌드하면 파일 이름이
 * 달라지므로, 로컬로 배포한 커밋을 CI 로 한 번 더 배포하면 **내용이 같은 자산을 다른 이름으로**
 * 프로덕션에 얹게 된다. 그 전환 틈새에 새 HTML 이 옛 이름의 청크를 참조하면 404 다.
 * 2026-08-08 에 실제로 그렇게 됐다 — 로컬이 8224-6ae569894fc5f1cb.js 를 올린 뒤 CI 가 같은 커밋을
 * 8224-267e0d60209cbad4.js 로 다시 빌드해 승격했고, 프로덕션 스모크가 404 를 잡아 롤백했다.
 *
 * 얻는 것이 없고 잃을 것만 있는 재배포이므로 시작 전에 정상 종료한다(실패가 아니다).
 * 롤백 뒤 되돌리기처럼 정말 같은 커밋을 다시 올려야 하면 --allow-redeploy 로 넘긴다.
 */
async function abortIfAlreadyLive() {
  if (cli.flags.has("--allow-redeploy")) return false;
  const head = git(["rev-parse", "HEAD"]);
  const value = await context();
  const origin = targetOrigin(value);
  if (!origin) return false;
  const read = async (path) => {
    try {
      const res = await fetch(origin + path, { signal: AbortSignal.timeout(10_000) });
      return String((await res.json())?.commit || "").trim();
    } catch {
      return "";
    }
  };
  const [pages, worker] = await Promise.all([read("/version.json"), read("/api/version")]);
  // 워커가 이번 릴리스에 포함되지 않으면 워커 커밋은 판단에서 뺀다(Pages 만 올리는 릴리스).
  const workerMatches = !value.needsWorker || worker === head;
  if (pages !== head || !workerMatches) return false;
  console.log("[deploy-safe] " + head.slice(0, 12) + " 는 이미 프로덕션에 라이브입니다(Pages"
    + (value.needsWorker ? " + Worker" : "") + "). 재빌드는 같은 내용을 다른 청크 이름으로 올려 전환 틈새 404 만 만듭니다.");
  console.log("[deploy-safe] 아무것도 배포하지 않고 종료합니다. 정말 다시 올려야 하면 --allow-redeploy 를 붙이세요.");
  return true;
}

async function main() {
  if (cli.flags.has("--self-test")) return selfTest();
  if (stage === "check") return checkStage();
  if (["preview", "production", "safe", "staging"].includes(stage) && await abortIfAlreadyLive()) return;
  // preview 는 잠그지 않는다. 워크트리마다 다른 URL 로 나가고 상태도 각자 것이라 서로를
  // 건드리지 않는다. 여기를 잠그면 병렬 세션이 서로의 빌드를 기다리기만 한다.
  if (stage === "preview") return previewStageStandalone();
  if (stage === "smoke") return smokeOnlyStage();
  if (stage === "production") return withLock(productionStage);
  // 목록 조회는 읽기 전용이라 잠금을 잡지 않는다. 배포가 도는 중에도 봐야 한다.
  if (stage === "rollback") return listOnly ? rollbackStage() : withLock(rollbackStage);
  if (stage === "safe") return safeStage();
  // 스테이징은 프로덕션과 **같은 흐름**을 탄다(preview → 스모크 → 승격). 다른 코드 경로를 만들면
  // 스테이징이 프로덕션의 리허설이기를 그만둔다 — 평소 안 도는 코드가 정작 필요할 때 처음 돈다.
  if (stage === "staging") return safeStage();
  throw new Error("Unknown stage. Use deploy:check, deploy:preview, deploy:smoke, deploy:production, deploy:rollback, deploy:staging, or deploy:safe.");
}
main().catch((error) => { unlock(); console.error("[deploy-safe] BLOCKED: " + (error?.stack || error)); process.exitCode = 1; });

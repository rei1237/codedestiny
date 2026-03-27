/**
 * Deploy static assets to Cloudflare Pages.
 * For API routes (e.g. /api/tarot/draw) to work, use deploy:cf:worker instead:
 *   npm run deploy:cf:worker
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

const rootDir = process.cwd();
const envFiles = [".env.cloudflare.local", ".env.cloudflare", ".env"];

for (const envFile of envFiles) {
  const envPath = resolve(rootDir, envFile);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

if (!process.env.CLOUDFLARE_API_TOKEN && process.env.CF_API_TOKEN) {
  process.env.CLOUDFLARE_API_TOKEN = process.env.CF_API_TOKEN;
}

const projectName =
  process.env.CF_PAGES_PROJECT_NAME ||
  process.env.CLOUDFLARE_PAGES_PROJECT_NAME ||
  process.env.CLOUDFLARE_PROJECT_NAME ||
  "code-destiny";

const branchArgIndex = process.argv.findIndex((arg) => arg === "--branch");
const branch =
  (branchArgIndex >= 0 && process.argv[branchArgIndex + 1]) ||
  process.env.CF_PAGES_BRANCH ||
  "main";

const isWindows = process.platform === "win32";
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const outputDir = resolve(process.cwd(), "dist");
const args = [
  "wrangler",
  "pages",
  "deploy",
  "dist",
  "--project-name",
  projectName,
  "--branch",
  branch,
];

console.log(`[deploy-pages] project=${projectName} branch=${branch}`);

function runDeploy(env) {
  const result = isWindows
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", `npx wrangler pages deploy dist --project-name ${projectName} --branch ${branch}`], {
        stdio: "inherit",
        shell: false,
        env,
      })
    : spawnSync("npx", args, {
        stdio: "inherit",
        shell: false,
        env,
      });

  if (result.error) {
    console.error(`[deploy-pages] Failed to start deploy command: ${result.error.message}`);
  }

  return result;
}

function runBuildIfMissingOutput() {
  if (existsSync(outputDir)) {
    return true;
  }

  console.log("[deploy-pages] dist not found. Running `npm run build:cf`...");
  const buildResult = spawnSync(npmCmd, ["run", "build:cf"], {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (buildResult.status !== 0) {
    return false;
  }

  return existsSync(outputDir);
}

const isPagesCi =
  process.env.CF_PAGES === "1" ||
  process.env.CF_PAGES === "true" ||
  process.env.CLOUDFLARE_PAGES === "1";
const forcePagesWranglerDeploy =
  process.env.CF_PAGES_FORCE_WRANGLER_DEPLOY === "1" ||
  process.env.CF_PAGES_FORCE_WRANGLER_DEPLOY === "true";

if (!isPagesCi && !process.env.CLOUDFLARE_API_TOKEN) {
  console.log("[deploy-pages] CLOUDFLARE_API_TOKEN not set. Falling back to Wrangler OAuth login flow.");
}

if (isPagesCi && !forcePagesWranglerDeploy) {
  if (!runBuildIfMissingOutput()) {
    console.error("[deploy-pages] Build output missing after build:cf. Cannot continue.");
    process.exit(1);
  }

  console.log(
    "[deploy-pages] CF Pages CI detected. Skipping `wrangler pages deploy` and relying on pages_build_output_dir auto-publish."
  );
  process.exit(0);
}

let result;

if (isPagesCi && process.env.CLOUDFLARE_API_TOKEN) {
  // Some CI setups inject a low-scope token that breaks Pages deploy.
  // First try without overriding token to allow platform/default auth.
  const envWithoutToken = { ...process.env };
  delete envWithoutToken.CLOUDFLARE_API_TOKEN;
  console.log("[deploy-pages] CF Pages CI detected. Trying deploy without CLOUDFLARE_API_TOKEN override...");
  result = runDeploy(envWithoutToken);

  if (result.status !== 0) {
    console.log("[deploy-pages] Retry with CLOUDFLARE_API_TOKEN...");
    result = runDeploy(process.env);
  }
} else {
  result = runDeploy(process.env);

  if (!isPagesCi && process.env.CLOUDFLARE_API_TOKEN && result.status !== 0) {
    const envWithoutToken = { ...process.env };
    delete envWithoutToken.CLOUDFLARE_API_TOKEN;
    console.log("[deploy-pages] Token-based deploy failed. Retrying with Wrangler OAuth login...");
    result = runDeploy(envWithoutToken);
  }
}

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);

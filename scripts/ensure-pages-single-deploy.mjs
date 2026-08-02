#!/usr/bin/env node
/**
 * Keep Cloudflare Pages Git automatic deployments disabled.
 *
 * Production deployment is performed explicitly by the main-branch workflow.
 * Preview and legacy Git deployments must also stay disabled so a PR cannot
 * create a second Pages deployment or leave a stale external check pending.
 */

const CHECK_ONLY = process.argv.includes("--check");
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const PROJECT = process.env.CF_PAGES_PROJECT_NAME || "codedestiny";
const IS_CI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

const API = process.env.CLOUDFLARE_API_BASE_URL || "https://api.cloudflare.com/client/v4";

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function getEnabledAutomaticDeployments(config) {
  const enabled = [];

  if (config.deployments_enabled === true) {
    enabled.push("legacy deployments_enabled=true");
  }
  if (config.production_deployments_enabled === true) {
    enabled.push("production production_deployments_enabled=true");
  }

  // Cloudflare's preview setting is enabled for every value except "none".
  // Treat a missing value as drift so the desired state is explicit.
  if (String(config.preview_deployment_setting || "").toLowerCase() !== "none") {
    enabled.push(`preview preview_deployment_setting=${String(config.preview_deployment_setting || "<missing>")}`);
  }

  return enabled;
}

function describeConfig(config) {
  return [
    `deployments_enabled=${String(config.deployments_enabled)}`,
    `production_deployments_enabled=${String(config.production_deployments_enabled)}`,
    `preview_deployment_setting=${String(config.preview_deployment_setting)}`,
  ].join(", ");
}

async function cf(path, init) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.success) {
    const detail = (json?.errors || []).map((error) => error.message).join(", ") || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return json.result;
}

async function main() {
  if (!TOKEN || !ACCOUNT_ID) {
    const message = "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required to verify Pages settings.";
    if (IS_CI) {
      fail(`${message} CI must fail closed.`);
    }
    console.log(`[ensure-pages-single-deploy] ${message} Local check skipped.`);
    return;
  }

  let project;
  try {
    project = await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`);
  } catch (error) {
    const message = `[ensure-pages-single-deploy] Cloudflare Pages project lookup failed: ${error.message}`;
    if (IS_CI) {
      fail(`${message} CI must fail closed.`);
    }
    console.log(`::warning::${message} Local check skipped.`);
    return;
  }

  const source = project?.source;
  const config = source?.config;
  if (!config) {
    console.log("[ensure-pages-single-deploy] No Git source.config was returned; no Git automatic deployment was changed.");
    return;
  }

  const enabled = getEnabledAutomaticDeployments(config);
  if (enabled.length === 0) {
    console.log(`[ensure-pages-single-deploy] OK: all automatic deployment paths are disabled (${describeConfig(config)}).`);
    return;
  }

  const warning =
    `Cloudflare Pages automatic deployment drift detected: ${enabled.join("; ")}. ` +
    "PR preview builds can create duplicate/canceled deployments and leave an external check pending.";

  if (CHECK_ONLY) {
    fail(`${warning} Run npm run ensure:pages-single-deploy to repair it.`);
  }

  console.log(`::warning::${warning} Repairing the full source.config while preserving unrelated fields.`);
  try {
    await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`, {
      method: "PATCH",
      body: JSON.stringify({
        source: {
          ...source,
          config: {
            ...config,
            deployments_enabled: false,
            production_deployments_enabled: false,
            preview_deployment_setting: "none",
          },
        },
      }),
    });
  } catch (error) {
    fail(
      `[ensure-pages-single-deploy] Failed to disable Cloudflare Pages automatic deployments: ${error.message}. ` +
        "Repair the Pages project settings manually or rerun this command with Pages Write access.",
    );
  }

  let after;
  try {
    after = await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`);
  } catch (error) {
    fail(`[ensure-pages-single-deploy] PATCH succeeded but verification failed: ${error.message}.`);
  }

  const afterConfig = after?.source?.config;
  if (!afterConfig) {
    fail("[ensure-pages-single-deploy] PATCH completed but source.config was missing during verification.");
  }

  const remaining = getEnabledAutomaticDeployments(afterConfig);
  if (remaining.length > 0) {
    fail(
      `[ensure-pages-single-deploy] Automatic deployment settings remain enabled after PATCH: ${remaining.join("; ")}. ` +
        "Check the Pages dashboard directly.",
    );
  }

  console.log(`[ensure-pages-single-deploy] Repaired and verified: ${describeConfig(afterConfig)}.`);
}

main().catch((error) => {
  console.error(`::error::ensure-pages-single-deploy failed: ${error?.stack || error}`);
  process.exit(1);
});

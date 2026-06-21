import { spawnSync } from "node:child_process";

const steps = [
  "scripts/prepare-cloudflare-dist.mjs",
  "scripts/write-version-json.mjs",
  "scripts/promote-static-shell-to-root.mjs",
  "scripts/verify-adsense-readiness.mjs",
];

for (const scriptPath of steps) {
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

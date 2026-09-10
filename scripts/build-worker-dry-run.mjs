#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const command = process.execPath;
const args = [resolve("node_modules/wrangler/bin/wrangler.js"), "deploy", "--config", "worker/wrangler.toml", "--dry-run", "--outdir", "../build-cache/worker-bundle"];
const result = spawnSync(command, args, {
  encoding: "utf8",
  windowsHide: true,
  env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
});

// Wrangler 4.85/unenv 2.0 emits this known esbuild diagnostic while bundling
// whatwg-url. It is dependency noise: the dry-run still succeeds and the
// generated bundle is checked by verify:worker-size. Keep every other warning.
function stripKnownWhatwgUrlWarning(stderr) {
  const plain = String(stderr || "").replace(/\u001b\[[0-9;]*m/g, "");
  const lines = plain.split(/\r?\n/);
  const kept = [];
  let dropping = false;
  for (const line of lines) {
    if (!dropping && /Import "default" will always be undefined because there is no matching export in .*whatwg-url[\\/]index\.mjs/.test(line)) {
      dropping = true;
      continue;
    }
    if (dropping) {
      if (!line.trim() || /^\s/.test(line)) continue;
      dropping = false;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

if (result.stdout) process.stdout.write(result.stdout);
const stderr = stripKnownWhatwgUrlWarning(result.stderr);
if (stderr.trim()) process.stderr.write(stderr);
if (result.error) {
  console.error(`[build:worker] ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);

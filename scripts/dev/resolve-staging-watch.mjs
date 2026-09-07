#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { requiresStagingWatch } from "../lib/change-risk.mjs";

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : fallback;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", windowsHide: true }).trim();
}

async function stagingSha(origin) {
  if (!origin) return "";
  const response = await fetch(`${origin.replace(/\/$/, "")}/version.json`, {
    signal: AbortSignal.timeout(10_000),
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`staging version probe returned HTTP ${response.status}`);
  const payload = await response.json();
  return String(payload.gitSha || payload.commit || "").trim();
}

function writeOutputs(result) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, [
    `run=${result.run}`,
    `base_sha=${result.baseSha}`,
    `head_sha=${result.headSha}`,
    `fail_closed=${result.failClosed}`,
  ].join("\n") + "\n");
}

async function main() {
  const origin = argValue("origin", process.env.CD_STAGING_ORIGIN || "");
  let baseSha = argValue("base", process.env.STAGING_WATCH_BASE || "");
  const headInput = argValue("head", process.env.STAGING_WATCH_HEAD || "HEAD");

  try {
    if (!baseSha) baseSha = await stagingSha(origin);
    baseSha = git(["rev-parse", "--verify", `${baseSha}^{commit}`]);
    const headSha = git(["rev-parse", "--verify", `${headInput}^{commit}`]);
    const files = baseSha === headSha
      ? []
      : git(["diff", "--name-only", "--no-renames", `${baseSha}...${headSha}`]).split(/\r?\n/).filter(Boolean);
    const scope = requiresStagingWatch(files);
    const result = { run: scope.required, baseSha, headSha, failClosed: false };
    writeOutputs(result);

    console.log(`[staging-watch-scope] run=${result.run} files=${files.length}`);
    for (const match of scope.matches) console.log(`  ${match.file} — ${match.reason}`);
  } catch (error) {
    const result = { run: true, baseSha: baseSha || "unknown", headSha: headInput, failClosed: true };
    writeOutputs(result);
    console.error(`[staging-watch-scope] 범위를 확정하지 못해 감시를 실행합니다: ${error.message}`);
  }
}

await main();

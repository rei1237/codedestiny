#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("[with-utf8-console] Usage: node scripts/with-utf8-console.mjs <command> [args...]");
  process.exit(2);
}

const [rawCommand, ...commandArgs] = args;
const command = process.platform === "win32" && rawCommand === "npm" ? "npm.cmd" : rawCommand;

if (process.platform !== "win32") {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (result.error) {
    console.error(`[with-utf8-console] Failed to run ${command}: ${result.error.message}`);
  }

  process.exit(typeof result.status === "number" ? result.status : 1);
}

const quotedCommand = [command, ...commandArgs]
  .map((arg) => JSON.stringify(String(arg)))
  .join(" ");

const pwshCommand = [
  '$ErrorActionPreference = "Stop"',
  '$OutputEncoding = New-Object System.Text.UTF8Encoding($false)',
  "[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)",
  "[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)",
  '$env:PYTHONIOENCODING = "utf-8"',
  '$env:LC_ALL = "en_US.UTF-8"',
  '$env:LANG = "en_US.UTF-8"',
  "chcp 65001 | Out-Null",
  `& ${quotedCommand}`,
].join("; ");

const result = spawnSync("powershell", ["-NoProfile", "-NoLogo", "-NonInteractive", "-Command", pwshCommand], {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    PYTHONIOENCODING: "utf-8",
    LC_ALL: "en_US.UTF-8",
    LANG: "en_US.UTF-8",
  },
});

if (result.error) {
  console.error(`[with-utf8-console] Failed to start PowerShell: ${result.error.message}`);
  process.exit(1);
}

process.exit(typeof result.status === "number" ? result.status : 1);

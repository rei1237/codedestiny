import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const npmCli = process.env.npm_execpath || resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const canRunNpmCliWithNode = npmCli && existsSync(npmCli);
const npmCommand = canRunNpmCliWithNode ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const npmArgs = (args) => (canRunNpmCliWithNode ? [npmCli, ...args] : args);

const steps = [
  [npmCommand, npmArgs(["run", "clean:build"])],
  [npmCommand, npmArgs(["run", "sync:public"])],
  [npmCommand, npmArgs(["run", "sitemap:generate"])],
  [npmCommand, npmArgs(["run", "verify:public-parity"])],
  [npmCommand, npmArgs(["run", "i18n:check"])],
  [npmCommand, npmArgs(["run", "verify:locale-main-sync"])],
  [npmCommand, npmArgs(["run", "verify:runtime-cache-sync"])],
  [npmCommand, npmArgs(["run", "verify:adsense-route-policy"])],
  [process.execPath, ["scripts/print-build-context.mjs"]],
  [process.execPath, ["scripts/next-build-with-pages-manifest.mjs"]],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    windowsHide: true,
    env: process.env,
  });

  if (result.error) {
    console.error(`[build-cf-main] Failed to run ${command} ${args.join(" ")}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(typeof result.status === "number" ? result.status : 1);
  }
}

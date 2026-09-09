import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const aptSourceDir = "/etc/apt/sources.list.d";

if (process.platform !== "linux" || !existsSync(aptSourceDir)) {
  console.log("[verify-playwright-apt-source] non-Linux runner — no APT source change needed");
  process.exit(0);
}

const sources = readdirSync(aptSourceDir)
  .filter(name => /^google-chrome[^/]*\.list$/.test(name))
  .map(name => join(aptSourceDir, name));

for (const source of sources) {
  const disabled = `${source}.disabled`;
  const result = spawnSync("sudo", ["mv", source, disabled], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`could not disable flaky APT source: ${source}`);
  }
}

console.log(`[verify-playwright-apt-source] disabled ${sources.length} Google Chrome APT source(s) for this ephemeral runner`);

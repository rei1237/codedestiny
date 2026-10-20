// Release-only refresh, explicitly requested from the CMS. No production calls in
// local development or ordinary checks. Failure stops release instead of erasing copy.
import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { listBuildNamespaceIds } from "../lib/cms/registry.mjs";
import { applyDailyProse } from "../lib/fortune/daily-cms.mjs";

export function splitPublishedCms(payload) {
  if (payload?.ok !== true || payload.version !== 1 || !payload.entries || typeof payload.entries !== "object" || Array.isArray(payload.entries)) {
    throw new Error("Invalid published CMS bundle");
  }
  const allowed = new Set(listBuildNamespaceIds());
  const entries = {};
  for (const [ns, rows] of Object.entries(payload.entries)) {
    if (!allowed.has(ns) || !rows || typeof rows !== "object" || Array.isArray(rows)) throw new Error("Unexpected CMS namespace");
    entries[ns] = rows;
  }
  const { "light-novel": episodes = {}, "famous-saju": items = {}, ...common } = entries;
  return { episodes, items, entries: common };
}

async function main() {
  if (process.env.CI !== "true" || process.env.CD_CMS_REFRESH !== "true") throw new Error("Published CMS refresh requires an explicit CI release");
  const response = await fetch("https://code-destiny.com/api/cms/build-bundle", { signal: AbortSignal.timeout(30000), redirect: "error" });
  if (!response.ok) throw new Error(`CMS export failed (${response.status})`);
  const data = splitPublishedCms(await response.json());
  const outputs = {
    "app/_content/cms.generated.json": { version: 1, entries: data.entries },
    "public/cms-static-overrides.json": { version: 1, entries: data.entries },
    "lib/stories/vn/overrides.generated.json": { version: 1, episodes: data.episodes },
    "lib/famous-saju/overrides.generated.json": { version: 1, items: data.items },
  };
  for (const [file, value] of Object.entries(outputs)) {
    const target = resolve(file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(value, null, 2) + "\n");
  }
  // prebuild generated these packages before the release snapshot was fetched.
  // Keep server source pristine: daily-data applies the same snapshot at render.
  for (const directory of ["public/fortune/data"]) {
    if (!existsSync(directory)) continue;
    for (const file of readdirSync(directory).filter((name) => /^daily-\d{4}-\d{2}-\d{2}\.json$/.test(name))) {
      const path = resolve(directory, file);
      const original = JSON.parse(readFileSync(resolve("fortune/data", file), "utf8"));
      const patched = applyDailyProse(original, data.entries["daily-fortune"]);
      if (patched !== original) writeFileSync(path, JSON.stringify(patched, null, 2), "utf8");
    }
  }
  console.log(`[cms-release] loaded ${Object.keys(data.entries).length} public namespaces, ${Object.keys(data.episodes).length} novel episodes`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => { console.error(`[cms-release] ${error.message}`); process.exitCode = 1; });
}

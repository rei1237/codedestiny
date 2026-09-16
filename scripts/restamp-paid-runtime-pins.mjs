import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Independent static pages use the same content-derived pin as payment-choice-parity.
const asset = "js/destiny-profile.js";
const normalized = readFileSync(asset, "utf8").replace(/\?v=[a-zA-Z0-9_-]+/g, "?v=__CACHE_KEY__").replace(/\r\n/g, "\n");
const pin = `build-${createHash("sha1").update(`${asset}\n${normalized}\n---\n`).digest("hex").slice(0, 12)}`;
const files = execFileSync("git", ["grep", "-l", "-F", `${asset}?v=build-`, "--", "*.html", "*.ts", "*.tsx", "*.js", "*.mjs"], { encoding: "utf8" }).trim().split("\n");
let changed = 0;
for (const file of files) {
  // The shell loader graph uses per-asset hashes owned by sync:public.
  if (/(^|\/)index\.html$/.test(file)
    || /^(?:public\/)?js\/(?:app\.js|core\/(?:index-inline-runtime|uiBindings|init)\.js|mobile-interaction-patch\.js)$/.test(file)) continue;
  const before = readFileSync(file, "utf8"), after = before.replace(/js\/destiny-profile\.js\?v=build-[A-Za-z0-9_-]+/g, `${asset}?v=${pin}`);
  if (before !== after) { writeFileSync(file, after); changed++; }
}
console.log(`[restamp-paid-runtime-pins] ${pin}: ${changed} references updated`);

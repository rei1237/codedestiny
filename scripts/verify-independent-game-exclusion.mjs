import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// The standalone RPG and its development server are outside this Pages project.
const dist = resolve("dist");
const game = "games/kkulkkul-card-rpg";
for (const path of [game, game + ".html", game + ".txt", "images/card-rpg", "_next/static/chunks/app/" + game]) {
  assert(!existsSync(resolve(dist, path)), `Independent RPG found in Pages output: ${path}`);
}

for (const page of ["index.html", "ggulggul/index.html", "yeongnyangi/index.html", "mini-games/index.html", "sitemap.xml"]) {
  const content = readFileSync(resolve(dist, page), "utf8");
  assert(!content.includes("/" + game), `Independent RPG linked from ${page}`);
}

assert(existsSync(resolve(dist, "404.html")), "Pages needs a top-level 404 page for unknown routes");
console.log("[pages] Standalone card RPG excluded from routes, navigation and assets.");

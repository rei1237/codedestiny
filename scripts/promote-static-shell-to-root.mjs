import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const rootDir = process.cwd();
const publicIndexPath = resolve(rootDir, "public", "index.html");
const publicStaticIndexPath = resolve(rootDir, "public", "static", "index.html");
const distIndexPath = resolve(rootDir, "dist", "index.html");
const distStaticIndexPath = resolve(rootDir, "dist", "static", "index.html");

function stripLeadingBom(buffer) {
  let offset = 0;
  while (
    offset + 2 < buffer.length &&
    buffer[offset] === 0xef &&
    buffer[offset + 1] === 0xbb &&
    buffer[offset + 2] === 0xbf
  ) {
    offset += 3;
  }
  return offset > 0 ? buffer.subarray(offset) : buffer;
}

function assertShellLooksReady(html, options = {}) {
  const { allowStaticSelfRedirect = false } = options;
  const requiredMarkers = [
    'id="codeSplash"',
    "openHwatuModal",
    "openTarotHealingModal",
  ];

  for (const marker of requiredMarkers) {
    if (!html.includes(marker)) {
      throw new Error(`[promote-static-shell] Missing required shell marker: ${marker}`);
    }
  }

  const hasRouterEntrypoint = html.includes("/static/js/router.js") || html.includes("/js/router.js");
  if (!hasRouterEntrypoint) {
    throw new Error("[promote-static-shell] Missing required shell marker: router entrypoint");
  }

  const hasStaticRedirect = html.includes("forceRootToStatic")
    || (!allowStaticSelfRedirect && html.includes("window.location.replace('/static/"));

  if (hasStaticRedirect) {
    throw new Error("[promote-static-shell] Root shell still contains a /static redirect.");
  }
}

function writeHtml(sourcePath, destinationPath, label, options = {}) {
  if (!existsSync(sourcePath)) {
    throw new Error(`[promote-static-shell] Missing source: ${sourcePath}`);
  }

  const buffer = stripLeadingBom(readFileSync(sourcePath));
  const html = buffer.toString("utf8");
  assertShellLooksReady(html, options);
  mkdirSync(dirname(destinationPath), { recursive: true });
  writeFileSync(destinationPath, buffer);
  console.log(`[promote-static-shell] ${label}: ${sourcePath} -> ${destinationPath}`);
}

if (!existsSync(resolve(rootDir, "dist"))) {
  throw new Error("[promote-static-shell] dist/ does not exist. Run this after next build.");
}

writeHtml(publicIndexPath, distIndexPath, "root");

if (existsSync(publicStaticIndexPath)) {
  writeHtml(publicStaticIndexPath, distStaticIndexPath, "legacy static", { allowStaticSelfRedirect: true });
}

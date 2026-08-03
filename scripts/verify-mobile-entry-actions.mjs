import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "MOBILE_FEATURE_REGISTRY.md");
const registryText = readRequired(registryPath);

const sourceFiles = [
  "index.html",
  "js/mobile-interaction-patch.js",
  "js/core/index-inline-runtime.js",
  "js/core/uiBindings.js",
  "app/_lib/serviceFeatureRegistry.ts",
  "app/components/FeatureLandingPage.tsx",
  "app/components/HomeServiceSections.tsx",
  "app/components/SiteFooterHub.jsx",
  "app/page.js",
];

const sourceCorpus = sourceFiles.map((file) => readOptional(path.join(root, file))).join("\n");
const rows = parseRows(registryText);
const routeFailures = [];
const actionFailures = [];

for (const row of rows) {
  const tokens = extractBacktickTokens(row.entry);
  for (const token of tokens) {
    if (isRouteToken(token) && !routeHasImplementation(token)) {
      routeFailures.push(`${row.name} :: ${token}`);
    }
    if (isActionToken(token) && !actionHasImplementation(token)) {
      actionFailures.push(`${row.name} :: ${token}`);
    }
  }
}

const mobileActionButtons = [
  ["mobile tarot preview CTA", ".moon-preview-card", 'href="/tarot/mingri"'],
  ["mobile membership guide CTA", "#honeyMembershipMini", 'data-membership-cta="benefits"'],
  ["bottom nav all-fortunes CTA", "#cdMobileBottomNav", "cdOpenAllFortunes"],
];

const mobileFailures = mobileActionButtons
  .filter(([, scope, token]) => !(sourceCorpus.includes(scope) && sourceCorpus.includes(token)))
  .map(([label]) => label);

if (routeFailures.length || actionFailures.length || mobileFailures.length) {
  console.error("Mobile entry action verification failed.");
  printList("Missing route/static/API implementation", routeFailures);
  printList("Missing action implementation", actionFailures);
  printList("Missing mobile action wiring", mobileFailures);
  process.exitCode = 1;
} else {
  console.log("Mobile entry action verification OK");
  console.log(`- Registry rows checked: ${rows.length}`);
  console.log(`- Route tokens checked: ${countRoutes(rows)}`);
  console.log(`- Action tokens checked: ${countActions(rows)}`);
  console.log(`- Mobile action wiring: ${mobileActionButtons.length}/${mobileActionButtons.length}`);
}

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

function readOptional(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function parseRows(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("기능명 |"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 7)
    .map((cells) => ({ name: cells[0], entry: cells[2] }));
}

function extractBacktickTokens(text) {
  return [...text.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function isRouteToken(token) {
  return token.startsWith("/") || token.startsWith("#");
}

function isActionToken(token) {
  return /^(open|goto|go|navigateTo|share|unlock|start|close|reveal|toggle|set|copy|save|clear|reset|dp)[A-Za-z0-9_]+$/.test(token);
}

function routeHasImplementation(token) {
  if (token === "/") return fileExists("index.html");
  if (token.startsWith("#")) {
    const id = token.slice(1);
    return sourceCorpus.includes(`id="${id}"`) || sourceCorpus.includes(`id='${id}'`) || sourceCorpus.includes(token);
  }
  if (token.startsWith("/api/")) {
    return sourceCorpus.includes(token) || routeFileExists(path.join("app", token.slice(1))) || workerRouteMentions(token);
  }

  const routePath = token.split("?")[0].split("#")[0].replace(/^\/+|\/+$/g, "");
  if (!routePath) return true;

  if (sourceCorpus.includes(`href="${token}"`) || sourceCorpus.includes(`href='${token}'`) || sourceCorpus.includes(`"${token}"`) || sourceCorpus.includes(`'${token}'`)) {
    if (staticOrAppRouteExists(routePath) || routeAliasExists(token)) return true;
  }

  return staticOrAppRouteExists(routePath) || routeAliasExists(token);
}

function staticOrAppRouteExists(routePath) {
  if (routePath.includes("[") && routePath.includes("]")) {
    return appDynamicRouteExists(routePath);
  }
  const candidates = [
    routePath,
    `${routePath}.html`,
    path.join("public", routePath),
    path.join("public", `${routePath}.html`),
    path.join("public", routePath, "index.html"),
    path.join("app", routePath, "page.tsx"),
    path.join("app", routePath, "page.ts"),
    path.join("app", routePath, "page.jsx"),
    path.join("app", routePath, "page.js"),
  ];
  return candidates.some(fileExists);
}

function appDynamicRouteExists(routePath) {
  const appPath = path.join(root, "app");
  if (!fs.existsSync(appPath)) return false;
  const segments = routePath.split("/");
  return dynamicWalk(appPath, segments, 0);
}

function dynamicWalk(current, segments, index) {
  if (index >= segments.length) {
    return ["page.tsx", "page.ts", "page.jsx", "page.js"].some((file) => fs.existsSync(path.join(current, file)));
  }
  const segment = segments[index];
  const direct = path.join(current, segment);
  if (fs.existsSync(direct) && dynamicWalk(direct, segments, index + 1)) return true;
  const dirs = fs.readdirSync(current, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const dir of dirs) {
    if (/^\[.*\]$/.test(dir.name) && dynamicWalk(path.join(current, dir.name), segments, index + 1)) return true;
  }
  return false;
}

function routeAliasExists(token) {
  const normalized = token.replace(/\/+$/, "");
  const aliases = {
    "/today": ["#destinyCardForm", "/static/#destinyCardForm"],
    "/services/face-reading": ["/palm-reading"],
    "/services/animal-totem": ["openAnimalTotemModal"],
    "/services/palm-reading": ["/palm-reading"],
    "/services/tarot": ["openTarotModal", "/tarot/mingri"],
    "/flower/destiny": ["openDestinyFlowerStudio"],
    "/flower/astrology": ["openAstrologyFlowerStudio"],
    "/flower/jamidusu": ["openJamidusuFlowerStudio"],
    "/flower/sukuyo": ["openSukuyoFlowerStudio"],
    "/dream/tarot": ["openDreamModal"],
    "/dream/psycho": ["openPsychoDreamModal"],
    "/oracle/hwatu": ["openHwatuModal", "/index.html?action=openHwatuModal"],
    "/oracle/kemet": ["openKemetModal", "/index.html?action=openKemetModal"],
    "/oracle/juyuk": ["openJuyukModal", "/index.html?action=openJuyukModal"],
    "/saju/lifebook": ["/life-book-ai"],
    "/saju-picture": ["sajuPicture", "sajuFourCut"],
  };
  return (aliases[normalized] || []).some((alias) => sourceCorpus.includes(alias) || routeHasImplementation(alias));
}

function workerRouteMentions(token) {
  const workerDir = path.join(root, "worker");
  if (!fs.existsSync(workerDir)) return false;
  const files = collectFiles(workerDir, /\.(js|mjs|ts)$/);
  return files.some((file) => fs.readFileSync(file, "utf8").includes(token));
}

function actionHasImplementation(action) {
  const patterns = [
    `function ${action}`,
    `window.${action}`,
    `window['${action}']`,
    `window["${action}"]`,
    `${action}:`,
    `case '${action}'`,
    `case "${action}"`,
    `action === '${action}'`,
    `action === "${action}"`,
    `[data-action="${action}"]`,
  ];
  return patterns.some((pattern) => sourceCorpus.includes(pattern));
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function collectFiles(dir, pattern) {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...collectFiles(full, pattern));
    else if (pattern.test(entry.name)) output.push(full);
  }
  return output;
}

function countRoutes(parsedRows) {
  return parsedRows.reduce((sum, row) => sum + extractBacktickTokens(row.entry).filter(isRouteToken).length, 0);
}

function countActions(parsedRows) {
  return parsedRows.reduce((sum, row) => sum + extractBacktickTokens(row.entry).filter(isActionToken).length, 0);
}

function printList(title, items) {
  if (!items.length) return;
  console.error(`\n${title}:`);
  for (const item of items) console.error(`- ${item}`);
}

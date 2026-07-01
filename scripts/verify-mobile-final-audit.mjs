import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reportFiles = [
  "MOBILE_FULL_SITE_AUDIT.md",
  "MOBILE_FEATURE_REGISTRY.md",
  "MOBILE_HOME_UX_IMPLEMENTATION_REPORT.md",
  "MOBILE_CARD_SYSTEM_IMPLEMENTATION_REPORT.md",
  "MOBILE_HOME_MODAL_SPLIT_REPORT.md",
  "MOBILE_FEATURE_DETAIL_TEMPLATE_REPORT.md",
  "MOBILE_TOUCH_ROUTING_MODAL_AUDIT.md",
  "MOBILE_PERFORMANCE_OPTIMIZATION_REPORT.md",
  "MOBILE_SCREEN_LENGTH_REDUCTION_REPORT.md",
  "MOBILE_NAVIGATION_REPORT.md",
  "MOBILE_STATIC_REACT_PAYMENT_AUDIT.md",
  "MOBILE_COLLECTION_CARD_AUDIT.md",
  "MOBILE_FINAL_COMPLETION_AUDIT.md",
];

const npmScripts = [
  "verify:mobile-feature-coverage",
  "verify:mobile-entry-actions",
  "verify:mobile-runtime-readiness",
  "verify:mobile-cdp-smoke",
  "verify:mobile-final-audit",
  "verify:paid-gate-ui",
  "verify:locale-main-sync",
  "verify:runtime-cache-sync",
  "verify:entry-encoding",
  "typecheck",
];

const directVerifierFiles = [
  "scripts/verify-mobile-original-requirements.mjs",
  "scripts/verify-mobile-live-deployment.mjs",
];

const shellFiles = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];

const shellMarkers = [
  "cd-mobile-bottom-navigation-v20260701",
  "cd-mobile-payment-lock-ux-v20260701",
  "id=\"cdMobileDestinyHub\"",
  "id=\"cdMobileBottomNav\"",
  "data-action=\"openGoldenGrainCharge\"",
  "document.body.appendChild(nav)",
  "openGoldenGrainCharge: ['goldenGrainChargeModalRoot', 'sajuLoaderOverlay']",
  "id=\"authQuickLinks\"",
  ".cd-user-card__avatar-ring::before",
  "animation:cdPlanetRingDrift 5.4s ease-in-out infinite",
  "id=\"cdAuthLogoutBtn\" class=\"auth-btn auth-btn--logout\"",
];

const finalAuditRequiredText = [
  "npm run verify:mobile-feature-coverage",
  "npm run verify:mobile-entry-actions",
  "npm run verify:mobile-runtime-readiness",
  "npm run verify:mobile-cdp-smoke",
  "npm run verify:mobile-final-audit",
  "npm run verify:locale-main-sync",
  "npm run verify:runtime-cache-sync",
  "npm run verify:entry-encoding -- --strict-core",
  "npm run typecheck -- --pretty false",
  "npm run build",
  "node scripts/verify-mobile-original-requirements.mjs",
  "node scripts/verify-mobile-live-deployment.mjs",
  "sandbox",
  "verify:test-account-payment-flow",
  "verify:test-account-all-paid-services",
  "verify:paid-gate-ui",
  "verify:billing-pass-policy",
  "verify:portone-single-payment",
  "cdMobileDestinyHub",
  "배포 후 live marker 재검증이 필요하다",
];

const failures = [];

for (const file of reportFiles) {
  if (!exists(file)) failures.push(`missing report: ${file}`);
}

for (const file of directVerifierFiles) {
  if (!exists(file)) failures.push(`missing direct verifier: ${file}`);
}

const packageJson = JSON.parse(read("package.json"));
for (const script of npmScripts) {
  if (!packageJson.scripts?.[script]) failures.push(`missing package script: ${script}`);
}

for (const file of shellFiles) {
  const text = read(file);
  for (const marker of shellMarkers) {
    if (!text.includes(marker)) failures.push(`missing shell marker in ${file}: ${marker}`);
  }
}

const finalAudit = read("MOBILE_FINAL_COMPLETION_AUDIT.md");
for (const text of finalAuditRequiredText) {
  if (!finalAudit.includes(text)) failures.push(`missing final audit text: ${text}`);
}

const cacheKeys = shellFiles.map((file) => {
  const match = read(file).match(/build-[a-f0-9]{12}/);
  return [file, match?.[0] || ""];
});
const uniqueCacheKeys = new Set(cacheKeys.map(([, key]) => key).filter(Boolean));
if (uniqueCacheKeys.size !== 1 || cacheKeys.some(([, key]) => !key)) {
  failures.push(`static shell cache keys are not aligned: ${JSON.stringify(cacheKeys)}`);
}

const registryRows = read("MOBILE_FEATURE_REGISTRY.md").split(/\r?\n/).filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("기능명 |"));
if (registryRows.length < 107) failures.push(`registry rows below required count: ${registryRows.length}`);

const mojibakeHits = scanCoreMojibake([
  "MOBILE_FINAL_COMPLETION_AUDIT.md",
  "MOBILE_FEATURE_REGISTRY.md",
  "scripts/verify-mobile-final-audit.mjs",
  "scripts/verify-mobile-original-requirements.mjs",
]);
if (mojibakeHits.length) failures.push(`core mojibake patterns found: ${mojibakeHits.join(", ")}`);

if (failures.length) {
  console.error("Mobile final audit verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Mobile final audit verification OK");
  console.log(`- Reports: ${reportFiles.length}/${reportFiles.length}`);
  console.log(`- Package scripts: ${npmScripts.length}/${npmScripts.length}`);
  console.log(`- Direct verifiers: ${directVerifierFiles.length}/${directVerifierFiles.length}`);
  console.log(`- Shell marker files: ${shellFiles.length}/${shellFiles.length}`);
  console.log(`- Cache key: ${[...uniqueCacheKeys][0]}`);
  console.log(`- Registry rows: ${registryRows.length}`);
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${file}`);
  return fs.readFileSync(filePath, "utf8");
}

function scanCoreMojibake(files) {
  const checks = [
    ["U+FFFD", String.fromCodePoint(0xfffd)],
    ["literal " + "\\" + "uFFFD", "\\" + "uFFFD"],
    ["U+00C3", String.fromCodePoint(0x00c3)],
    ["U+00C2", String.fromCodePoint(0x00c2)],
    ["U+00EC", String.fromCodePoint(0x00ec)],
    ["U+00EA", String.fromCodePoint(0x00ea)],
    ["U+00EB", String.fromCodePoint(0x00eb)],
    ["U+00F0", String.fromCodePoint(0x00f0)],
  ];
  const hits = [];
  for (const file of files) {
    const text = read(file);
    for (const [label, needle] of checks) {
      if (text.includes(needle)) hits.push(`${file}:${label}`);
    }
  }
  return hits;
}

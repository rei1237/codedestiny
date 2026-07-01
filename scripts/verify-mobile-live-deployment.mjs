import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const url = process.argv.find((arg) => arg.startsWith("http")) || "https://code-destiny.com/";
const localIndex = read("index.html");
const expectedCacheKey = process.env.CD_MOBILE_EXPECTED_CACHE_KEY
  || localIndex.match(/build-[a-f0-9]{12}/)?.[0]
  || "";

const requiredMarkers = [
  "cdMobileDestinyHub",
  "cd-mobile-bottom-navigation-v20260701",
  "MobileFeatureBottomSheet",
  "data-action=\"openGoldenGrainCharge\"",
  "openGoldenGrainCharge",
  expectedCacheKey,
].filter(Boolean);

const response = await fetch(url, {
  headers: {
    "user-agent": "CodeDestinyMobileDeploymentVerifier/1.0",
    "cache-control": "no-cache",
  },
});

const html = await response.text();
const failures = [];

if (!response.ok) failures.push(`HTTP ${response.status} ${response.statusText}`);
if (!/name=["']viewport["'][^>]*viewport-fit=cover/i.test(html)) failures.push("missing viewport-fit=cover");

for (const marker of requiredMarkers) {
  if (!html.includes(marker)) failures.push(`missing live marker: ${marker}`);
}

if (failures.length) {
  console.error("Mobile live deployment verification failed.");
  console.error(`- URL: ${url}`);
  console.error(`- Expected cache key: ${expectedCacheKey || "(not found)"}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Mobile live deployment verification OK");
  console.log(`- URL: ${url}`);
  console.log(`- Expected cache key: ${expectedCacheKey}`);
  console.log(`- Markers: ${requiredMarkers.length}/${requiredMarkers.length}`);
}

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${file}`);
  return fs.readFileSync(filePath, "utf8");
}

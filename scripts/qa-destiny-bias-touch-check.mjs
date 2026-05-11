#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [
  {
    name: "safe area inset for sticky CTA",
    file: "app/saju/destiny-bias/destiny-bias.module.css",
    includes: ["env(safe-area-inset-bottom)", ".stickyCtaSafe"],
  },
  {
    name: "touch guard hook wired",
    file: "app/saju/destiny-bias/DestinyBiasClient.tsx",
    includes: ["useDestinyBiasTouchGuard", "shouldBlockClick", "guardHandlers"],
  },
  {
    name: "reduced motion support",
    file: "app/saju/destiny-bias/destiny-bias.module.css",
    includes: ["prefers-reduced-motion", "animation: none"],
  },
  {
    name: "mobile sticky CTA exists",
    file: "app/saju/destiny-bias/DestinyBiasClient.tsx",
    includes: ["fixed inset-x-0 bottom-0", "md:hidden"],
  },
  {
    name: "sticker editor present",
    file: "app/saju/destiny-bias/DestinyBiasClient.tsx",
    includes: ["스티커 커스텀 에디터", "cardStickers", "텍스트 스티커"],
  },
];

function readText(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

let failCount = 0;
console.log("[qa:destiny-bias-touch] Static checks");
for (const check of checks) {
  const text = readText(check.file);
  if (!text) {
    failCount += 1;
    console.log(`  FAIL ${check.name}: missing file ${check.file}`);
    continue;
  }

  const missing = check.includes.filter((token) => !text.includes(token));
  if (missing.length > 0) {
    failCount += 1;
    console.log(`  FAIL ${check.name}: missing tokens -> ${missing.join(", ")}`);
  } else {
    console.log(`  PASS ${check.name}`);
  }
}

console.log("\n[qa:destiny-bias-touch] Manual device checklist");
const manual = [
  "iOS Safari: open /saju/destiny-bias and scroll step forms with keyboard open; bottom CTA must remain tappable.",
  "iOS Safari: during vertical scroll drag, CTA buttons should not trigger accidental click.",
  "Android Chrome: verify sticky CTA is above nav bar and not clipped by gesture area.",
  "Android Chrome: run step 1 to result and save image; no double-charge or duplicate analyze submit.",
  "Both devices: enable reduced motion and verify major animations are minimized.",
];
manual.forEach((item, index) => {
  console.log(`  ${index + 1}. ${item}`);
});

if (failCount > 0) {
  console.log(`\nResult: FAIL (${failCount} static check issues)`);
  process.exit(1);
}

console.log("\nResult: PASS (static checks clear, run manual checklist on devices)");

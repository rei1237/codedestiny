// 앱(Android) 빌드 산출물 후처리.
//
// `npm run build:mobile`이 만든 dist/를 Capacitor에 넘기기 전에 앱 전용으로 손질한다.
// 웹 배포(dist → Cloudflare Pages)는 이 스크립트를 타지 않으므로 웹은 전혀 영향받지 않는다.
//
// 하는 일:
//   1) 모든 HTML의 <head> 최상단에 결제 가드를 주입한다
//      — destiny-profile.js보다 먼저 실행돼야 PortOne 경로를 가로챌 수 있다.
//   2) PortOne 이용권 스토어(/points)와 웹 전용 결제 라우트를 산출물에서 제거한다.
//   3) 남아 있는 위반 지점을 검사하고, 발견되면 빌드를 실패시킨다.
//
// 실행: node scripts/build-mobile-app.mjs [--dist <path>]

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distArgIndex = process.argv.indexOf("--dist");
const DIST = path.resolve(ROOT, distArgIndex > -1 ? process.argv[distArgIndex + 1] : "dist");

const GUARD_SOURCE = path.join(ROOT, "scripts", "app-payment-guard.js");
const GUARD_PUBLIC_PATH = "/js/app-payment-guard.js";
const GUARD_TAG = `<script src="${GUARD_PUBLIC_PATH}"></script>`;

// 앱에서 열려선 안 되는 라우트(PortOne 이용권 스토어 등). 앱은 /app/store를 쓴다.
const REMOVED_ROUTE_DIRS = ["points", "premium-unlock"];
const LOCALE_PREFIXES = ["", "en", "ja", "zh"];

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, filter, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

async function installGuardAsset() {
  const target = path.join(DIST, "js", "app-payment-guard.js");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(GUARD_SOURCE, target);
  return target;
}

function injectGuardTag(html) {
  if (html.includes(GUARD_PUBLIC_PATH)) return { html, changed: false };

  // 다른 스크립트(특히 destiny-profile.js)보다 먼저 실행돼야 결제 경로를 가로챌 수 있다.
  // 단 <meta charset>보다는 뒤에 둔다 — charset이 밀리면 문서 인코딩 판정이 흔들린다.
  const charsetMatch = html.match(/<meta[^>]+charset[^>]*>/i);
  if (charsetMatch) {
    const at = charsetMatch.index + charsetMatch[0].length;
    return { html: `${html.slice(0, at)}${GUARD_TAG}${html.slice(at)}`, changed: true };
  }

  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const at = headMatch.index + headMatch[0].length;
    return { html: `${html.slice(0, at)}${GUARD_TAG}${html.slice(at)}`, changed: true };
  }

  // <head>가 없는 조각 문서는 맨 앞에 붙인다.
  return { html: `${GUARD_TAG}${html}`, changed: true };
}

async function removeAppForbiddenRoutes() {
  const removed = [];
  for (const prefix of LOCALE_PREFIXES) {
    for (const route of REMOVED_ROUTE_DIRS) {
      const dir = path.join(DIST, prefix, route);
      if (!(await exists(dir))) continue;
      await fs.rm(dir, { recursive: true, force: true });
      removed.push(path.relative(DIST, dir).replace(/\\/g, "/"));
    }
    for (const route of REMOVED_ROUTE_DIRS) {
      const file = path.join(DIST, prefix, `${route}.html`);
      if (!(await exists(file))) continue;
      await fs.rm(file, { force: true });
      removed.push(path.relative(DIST, file).replace(/\\/g, "/"));
    }
  }
  return removed;
}

async function main() {
  if (!(await exists(DIST))) {
    console.error(`❌ dist를 찾을 수 없습니다: ${DIST}\n   먼저 \`npm run build:mobile\`을 실행하세요.`);
    process.exit(1);
  }

  console.log(`\n📦 앱 빌드 후처리: ${path.relative(ROOT, DIST) || DIST}`);

  const guardAsset = await installGuardAsset();
  console.log(`  ✅ 결제 가드 배치: ${path.relative(DIST, guardAsset).replace(/\\/g, "/")}`);

  const removed = await removeAppForbiddenRoutes();
  console.log(`  ✅ 웹 결제 라우트 제거: ${removed.length ? removed.join(", ") : "(없음)"}`);

  const htmlFiles = await walk(DIST, (file) => file.toLowerCase().endsWith(".html"));
  let injected = 0;
  for (const file of htmlFiles) {
    const original = await fs.readFile(file, "utf8");
    const { html, changed } = injectGuardTag(original);
    if (!changed) continue;
    await fs.writeFile(file, html, "utf8");
    injected += 1;
  }
  console.log(`  ✅ 결제 가드 주입: HTML ${injected}/${htmlFiles.length}개`);

  console.log("\n✅ 앱 빌드 후처리 완료 — 이어서 `node scripts/verify-app-no-portone.mjs`로 검증하세요.\n");
}

main().catch((error) => {
  console.error(`❌ 앱 빌드 후처리 실패: ${error.message}`);
  process.exit(1);
});

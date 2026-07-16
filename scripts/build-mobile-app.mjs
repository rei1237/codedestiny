// 앱(Android) 빌드 산출물 후처리.
//
// `npm run build:mobile`이 만든 dist/를 Capacitor에 넘기기 전에 앱 전용으로 손질한다.
// 웹 배포(dist → Cloudflare Pages)는 이 스크립트를 타지 않으므로 웹은 전혀 영향받지 않는다.
//
// 하는 일:
//   1) 모든 HTML의 <head> 최상단에 앱 가드를 주입한다
//      — destiny-profile.js보다 먼저 실행돼야 PortOne 경로를 가로챌 수 있다.
//   2) 앱에 없는 라우트를 산출물에서 제거한다(웹 결제 스토어 + SEO 전용 문서).
//   3) 죽은 자산을 제거한다(참조 0건 디렉터리 + webp 쌍이 있는 PNG 원본).
//   4) 남아 있는 위반 지점을 검사하고, 발견되면 빌드를 실패시킨다.
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

// 앱에 없는 라우트. scripts/app-payment-guard.js의 PRUNED_ROUTES와 짝을 이룬다 —
// 여기서 파일을 지우고, 가드가 남은 링크를 제거한다. 한쪽만 하면 404가 난다.
//
//   points / premium-unlock : 웹 결제 스토어(PortOne). 앱은 /app/store를 쓴다.
//   insights / famous-saju  : SEO 전용 문서. 앱 사용자는 도달할 일이 없는데
//                             압축 후 28MB를 차지한다.
const REMOVED_ROUTE_DIRS = ["points", "premium-unlock", "insights", "famous-saju"];
const LOCALE_PREFIXES = ["", "en", "ja", "zh"];

// 자산은 목록으로 지우지 않는다 — 반드시 참조 검사를 거친다.
//
// (한때 fuctionassets/tadagochi*를 "참조 0건"으로 보고 목록에 넣었다가 다마고치
//  기능이 깨질 뻔했다. tadagochi.html이 그 이미지들을 쓰고 index.html이 /tadagochi로
//  링크한다. 목록 방식은 이런 오판을 걸러낼 방법이 없다.)

// 참조 검사 대상 — 자산 파일명이 이 확장자들 안에 한 번도 안 나오면 죽은 것으로 본다.
const REFERENCE_TEXT_EXTENSIONS = new Set([".html", ".js", ".mjs", ".css", ".json", ".txt", ".xml", ".webmanifest"]);

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

/**
 * dist의 모든 텍스트 파일을 한 번만 읽어 "참조된 파일명" 색인을 만든다.
 * (파일마다 grep하면 1080개라 못 쓴다)
 *
 * 파일명만 본다 — 경로 전체가 아니라. 동적으로 디렉터리를 조립하는 코드
 * (`'/images/' + dir + '/' + name`)가 있어도 파일명 리터럴은 남기 때문이다.
 */
export async function buildReferencedNameIndex(dist = DIST) {
  const files = await walk(dist, (file) => REFERENCE_TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const referenced = new Set();
  for (const file of files) {
    let text = "";
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    // 파일명처럼 생긴 토큰만 뽑는다(확장자 포함). URL 인코딩된 것도 풀어서 함께 넣는다.
    for (const match of text.matchAll(/[A-Za-z0-9_%.\-가-힣 ]+\.(?:png|webp|jpg|jpeg|gif|svg)/gi)) {
      const raw = match[0];
      referenced.add(raw);
      try {
        referenced.add(decodeURIComponent(raw));
      } catch {
        /* 잘못된 인코딩은 무시 */
      }
    }
  }
  return referenced;
}

/**
 * webp 쌍이 있는 죽은 PNG 원본 제거.
 *
 * `X.png`와 `X.webp`가 같은 디렉터리에 있고 `X.png` 파일명이 dist 어디에도
 * 안 나오면, 그 PNG는 webp로 변환하고 남은 원본이다(-photoroom 등).
 * 웹 사용자에게도 그냥 나가고 있었지만, 여기서는 앱 번들만 손댄다.
 *
 * fail-safe: 참조가 하나라도 잡히면 남긴다. 지운 목록은 호출부가 출력한다.
 */
async function removeDeadPngOriginals(referenced) {
  const pngFiles = await walk(DIST, (file) => file.toLowerCase().endsWith(".png"));
  const removed = [];
  for (const png of pngFiles) {
    const webpTwin = `${png.slice(0, -4)}.webp`;
    if (!(await exists(webpTwin))) continue;
    const name = path.basename(png);
    if (referenced.has(name)) continue;
    const bytes = (await fs.stat(png)).size;
    await fs.rm(png, { force: true });
    removed.push({ path: path.relative(DIST, png).replace(/\\/g, "/"), bytes });
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
  console.log(`  ✅ 앱에 없는 라우트 제거: ${removed.length ? removed.join(", ") : "(없음)"}`);

  // 라우트를 지운 뒤에 색인을 만든다 — 지워진 SEO 페이지가 참조하던 자산까지 죽은 것으로 잡히게.
  const referenced = await buildReferencedNameIndex();
  const removedPngs = await removeDeadPngOriginals(referenced);
  const freedMB = removedPngs.reduce((sum, item) => sum + item.bytes, 0) / 1048576;
  console.log(`  ✅ 죽은 PNG 원본 제거: ${removedPngs.length}개 (${freedMB.toFixed(1)} MB)`);
  // 무엇이 사라졌는지 보이게 남긴다 — 이미지가 깨지면 여기부터 본다.
  for (const item of removedPngs.slice(0, 30)) {
    console.log(`       - ${item.path} (${(item.bytes / 1048576).toFixed(2)} MB)`);
  }
  if (removedPngs.length > 30) console.log(`       … 외 ${removedPngs.length - 30}개`);

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

// 직접 실행할 때만 돈다. verify-app-no-portone.mjs가 buildReferencedNameIndex를
// 재사용하려고 import하는데(판정 규칙을 두 벌 두지 않으려고), 그때 후처리가 돌면 안 된다.
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(`❌ 앱 빌드 후처리 실패: ${error.message}`);
    process.exit(1);
  });
}

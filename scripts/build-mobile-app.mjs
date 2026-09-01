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
import { createHash } from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distArgIndex = process.argv.indexOf("--dist");
const DIST = path.resolve(ROOT, distArgIndex > -1 ? process.argv[distArgIndex + 1] : "dist");

const GUARD_SOURCE = path.join(ROOT, "scripts", "app-payment-guard.js");
const GUARD_PUBLIC_PATH = "/js/app-payment-guard.js";
// 네이티브 브릿지(window.CodeDestinyNative). 가드가 결제할 때 이걸 찾는다.
// React /app 레이아웃에만 있으면 클래식 셸에서 결제가 전부 죽으므로 전 HTML에 함께 주입한다.
const BRIDGE_SOURCE = path.join(ROOT, "scripts", "app-native-bridge.js");
const BRIDGE_PUBLIC_PATH = "/js/app-native-bridge.js";
// 앱 번들은 https://localhost 출처에서 서빙되나 그 출처엔 서버가 없다. 모든 /api/* 호출이
// 프로덕션 워커로 가도록 API base 를 가장 먼저 확정한다(가드·api-config 가 이 값을 읽음).
const API_BASE_INLINE = `<script>window.CODE_DESTINY_API_BASE_URL=window.CODE_DESTINY_API_BASE_URL||"https://code-destiny.com";</script>`;
// 앱은 https://localhost 출처라, assets.code-destiny.com 의 호트링크 보호(Cloudflare)가
// Referer=https://localhost 인 프리미엄 캐릭터 컷아웃 요청을 403(error 1011)으로 막는다.
// (webp·리사이즈 등 대부분은 통과하지만, 대형 -Photoroom.png 컷아웃과 노벨 CDN 자산이 걸린다.)
// Referer 를 아예 안 보내면(no-referer) 그 Worker 가 전부 200 으로 통과시킨다 — 실측 확인.
// 이 meta 는 앱 번들 후처리에서만 주입되므로 웹(code-destiny.com Referer 유지)엔 영향 없다.
// 앱은 Referer 의존 로직이 없다(API=Bearer 헤더, OAuth=딥링크).
const REFERRER_META = `<meta name="referrer" content="no-referrer">`;
// 브릿지가 가드보다 먼저다 — 브릿지가 런타임 타깃 플래그를 심고 window.CodeDestinyNative를
// 설치한다. (가드는 결제 시점에 지연 조회하므로 순서에 엄격하진 않지만, 명시적으로 둔다.)
const GUARD_TAG = `${REFERRER_META}${API_BASE_INLINE}<script src="${BRIDGE_PUBLIC_PATH}"></script><script src="${GUARD_PUBLIC_PATH}"></script>`;

// 앱에 없는 라우트. scripts/app-payment-guard.js의 PRUNED_ROUTES와 짝을 이룬다 —
// 여기서 파일을 지우고, 가드가 남은 링크를 제거한다. 한쪽만 하면 404가 난다.
//
//   points / premium-unlock : 웹 결제 스토어(PortOne). 앱은 /app/store를 쓴다.
//   insights / famous-saju  : SEO 전용 문서. 앱 사용자는 도달할 일이 없는데
//                             압축 후 28MB를 차지한다.
const REMOVED_ROUTE_DIRS = ["points", "premium-unlock", "insights", "famous-saju"];
const LOCALE_PREFIXES = ["", "en", "ja", "zh", "zh-tw"];

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
  const targets = [];
  for (const [source, publicPath] of [[GUARD_SOURCE, GUARD_PUBLIC_PATH], [BRIDGE_SOURCE, BRIDGE_PUBLIC_PATH]]) {
    const target = path.join(DIST, publicPath.replace(/^\//, ""));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
    targets.push(target);
  }
  return targets;
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

// 루트 단독 HTML(예: destiny-island.html)은 확장자 없는 링크(`/destiny-island`)로도 참조된다.
// Capacitor 로컬 서버·RouteProcessor 는 그 경로를 destiny-island/index.html 로 해석하는데,
// 별칭 파일이 없으면 RouteProcessor 폴백이 홈 셸을 돌려줘 "홈으로 튕김"이 된다.
// 별칭을 만들어 두면 classifyRoute 도 "real"로 판정해 링크 재작성까지 함께 동작한다.
const STANDALONE_HTML_ROUTE_ALIASES = ["destiny-island"];

async function aliasStandaloneHtmlRoutes() {
  const aliased = [];
  for (const route of STANDALONE_HTML_ROUTE_ALIASES) {
    const source = path.join(DIST, `${route}.html`);
    if (!(await exists(source))) continue;
    const dir = path.join(DIST, route);
    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(source, path.join(dir, "index.html"));
    aliased.push(`${route}/index.html`);
  }
  return aliased;
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

// ── 앱 전용: 이미지 축소 ─────────────────────────────────────────────────────
// 폰에 1080px 넘는 원본을 담을 이유가 없다. 2026-08-29 실측(`unzip -v` 로 압축 크기 집계):
// AAB 110.7MB 중 이미지가 72.4MB(65%)였고 텍스트·코드는 전부 합쳐 32.4MB였다.
// 선명해야 하는 자산(스프라이트 시트·컷아웃·타로 카드)의 분류는 scripts/optimize-images.mjs
// 의 HERO_PATTERNS 와 같은 정책이다 — 그 모듈은 import 하면 run()이 돌아 여기에 다시 적는다.
const IMAGE_MAX_WIDTH = 1080;
const IMAGE_QUALITY_DEFAULT = 82;
const IMAGE_QUALITY_CRISP = 90;
const CRISP_PATTERNS = ["sprite", "photoroom", "mascot", "pig", "tarot", "tea-cups", "ten-gods"];
const RESIZABLE_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg"]);

/**
 * 바이트가 같은 이미지 사본 중 참조 0건인 것 제거.
 *
 * fail-safe 둘: 참조가 하나라도 잡히면 남긴다. 한 묶음이 전부 참조 0건이면 한 벌은
 * 남긴다 — 파일명을 동적으로 조립하는 코드를 색인이 놓쳤을 수 있다(tadagochi 사고와 같은 축).
 */
export async function removeRedundantImageCopies(referenced, dist = DIST) {
  const images = await walk(dist, (file) => RESIZABLE_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const byDigest = new Map();
  for (const image of images) {
    const digest = createHash("sha1").update(await fs.readFile(image)).digest("hex");
    if (!byDigest.has(digest)) byDigest.set(digest, []);
    byDigest.get(digest).push(image);
  }
  const removed = [];
  for (const copies of byDigest.values()) {
    if (copies.length < 2) continue;
    const dead = copies.filter((file) => !referenced.has(path.basename(file)));
    const drop = dead.length === copies.length ? dead.slice(1) : dead;
    for (const file of drop) {
      const bytes = (await fs.stat(file)).size;
      await fs.rm(file, { force: true });
      removed.push({ path: path.relative(dist, file).replace(/\\/g, "/"), bytes });
    }
  }
  return removed;
}

/**
 * 폭이 상한을 넘는 이미지를 줄이고 다시 인코딩한다. 앱 번들(dist 사본)만 손대므로
 * public/ 원본과 웹 배포본은 그대로다.
 *
 * fail-safe 셋: 결과가 원본보다 크면 버리고 원본을 남긴다. 인코딩이 실패해도 원본을 남긴다.
 * 여러 프레임(애니메이션 webp/gif)은 건너뛴다 — 재인코딩하면 첫 장으로 눌린다.
 * 확대는 하지 않는다(상한 이하는 폭을 그대로 두고 재인코딩만 시도한다).
 */
export async function shrinkOversizedImages(dist = DIST) {
  // verify-app-no-portone.mjs 가 이 모듈에서 색인 함수만 가져다 쓴다 —
  // 그 경로까지 네이티브 모듈(sharp)을 물리지 않도록 여기서만 불러온다.
  const { default: sharp } = await import("sharp");
  const images = await walk(dist, (file) => RESIZABLE_EXTENSIONS.has(path.extname(file).toLowerCase()));
  let rewritten = 0;
  let skipped = 0;
  let freed = 0;
  for (const image of images) {
    const input = await fs.readFile(image);
    const before = input.length;
    const ext = path.extname(image).toLowerCase();
    const base = path.basename(image).toLowerCase();
    const quality = CRISP_PATTERNS.some((p) => base.includes(p)) ? IMAGE_QUALITY_CRISP : IMAGE_QUALITY_DEFAULT;
    let output;
    try {
      // 버퍼로 넘긴다 — 경로를 주면 sharp 가 핸들을 쥔 채라 같은 파일 쓰기가 윈도우에서 막힌다.
      const source = sharp(input);
      const meta = await source.metadata();
      if ((meta.pages ?? 1) > 1) {
        skipped += 1;
        continue;
      }
      const sized = meta.width > IMAGE_MAX_WIDTH ? source.resize({ width: IMAGE_MAX_WIDTH }) : source;
      if (ext === ".png") output = await sized.png({ compressionLevel: 9 }).toBuffer();
      else if (ext === ".webp") output = await sized.webp({ quality, effort: 6, smartSubsample: true }).toBuffer();
      else output = await sized.jpeg({ quality }).toBuffer();
    } catch {
      skipped += 1;
      continue;
    }
    if (output.length >= before) {
      skipped += 1;
      continue;
    }
    await fs.writeFile(image, output);
    rewritten += 1;
    freed += before - output.length;
  }
  return { rewritten, skipped, freed, total: images.length };
}

// ── 앱 전용: 실제-페이지 라우트 링크를 /route/index.html 로 해석 ──────────────
// Capacitor 로컬 서버는 확장자 없는 URL을 html5mode SPA 폴백으로 루트 홈 셸에 넘긴다
// (WebViewLocalServer html5mode=true, 경로단위 RouteProcessor 없음). 이 사이트는 다중
// 페이지 정적 export(각 라우트=route/index.html)라서, "실제 페이지" 라우트(로그인/회원가입/
// 프리미엄 AI 등)로 가는 확장자 없는 링크가 홈 셸로 가로채져 "메인으로 돌아가는" 것처럼 보인다.
// → 앱 번들에서 실제 페이지로 가는 링크만 /route/index.html 로 바꿔 폴백을 우회한다.
//   셸로 덮어쓴 기능 라우트(/saju/basic 등)는 그대로 둬 셸+자동열기가 동작하게 한다.
// 웹 빌드(build:cf)는 이 스크립트를 타지 않으므로 웹은 영향 없음.

// promote-static-shell-to-root.mjs의 assertShellLooksReady와 동일한 셸 판별 마커.
const SHELL_MARKERS = ['id="authQuickLinks"', "openHwatuModal"];

const routeClassCache = new Map(); // route(clean) → 'real' | 'shell' | 'missing' | 'ext' | 'root'
async function classifyRoute(routePath) {
  const clean = String(routePath || "").replace(/\/+$/, "");
  if (!clean || clean === "/") return "root";
  const last = clean.slice(clean.lastIndexOf("/") + 1);
  if (last.includes(".")) return "ext"; // 이미 확장자 있음(직접 서빙됨)
  if (routeClassCache.has(clean)) return routeClassCache.get(clean);
  const indexFile = path.join(DIST, clean.replace(/^\//, ""), "index.html");
  let cls;
  if (!(await exists(indexFile))) {
    cls = "missing";
  } else {
    let content = "";
    try {
      content = await fs.readFile(indexFile, "utf8");
    } catch {
      content = "";
    }
    cls = SHELL_MARKERS.every((m) => content.includes(m)) ? "shell" : "real";
  }
  routeClassCache.set(clean, cls);
  return cls;
}

// 정규식 매치(group3=경로)에서 실제-페이지 라우트만 골라 rewrite 맵을 만든다.
async function buildRealRouteRewriteMap(text, re) {
  const paths = new Set();
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    const p = m[3];
    if (!p || p.startsWith("//")) continue; // 프로토콜상대/외부 제외
    paths.add(p);
  }
  const map = new Map();
  for (const p of paths) {
    if ((await classifyRoute(p)) === "real") map.set(p, p.replace(/\/+$/, "") + "/index.html");
  }
  return map;
}

// <a href="/route"> → <a href="/route/index.html">  (실제 페이지만; #hash·?query 보존)
// 대용량 VN·음원 자산을 번들에서 빼고 CDN 으로 참조한다(게임 앱의 자산 스트리밍 방식).
//
// codedestinyassets 는 앱 번들 최대 블록(102MB)이다. 그중 CDN 에 실재하는 remote 80개만 빼고,
// CDN 에 없는 bundledLocalOnly 17개(캐릭터 스프라이트 webp)는 반드시 남긴다 — 빼면 캐릭터가 깨진다.
// 목록은 scripts/app-remote-assets.json 이 정본이다. 🔴 CDN 실재를 검증하는 스크립트는 없다 —
// 목록을 고칠 때는 CDN(assets.code-destiny.com)에서 해당 경로를 손으로 확인할 것.
//
// 참조 재작성은 VN 의 `var X = PROD ? "<CDN>" : "<로컬>";` 삼항에서 베이스를 **파싱해서** 쓴다.
// 하드코딩하면 CDN 주소가 바뀔 때 조용히 어긋난다.
const REMOTE_ASSET_MANIFEST = path.join(ROOT, "scripts", "app-remote-assets.json");

async function readRemoteAssetManifest() {
  try {
    return JSON.parse(await fs.readFile(REMOTE_ASSET_MANIFEST, "utf8"));
  } catch {
    return null;
  }
}

// `var NOVEL=PROD?"https://assets…/CodeDestinyNovel/":"/codedestinyassets/CodeDestinyNovel/";`
// → { NOVEL: { cdn: "https://assets…/CodeDestinyNovel/", prefix: "CodeDestinyNovel/" } }
function parseVnAssetBases(html) {
  const bases = {};
  const re = /var\s+([A-Z][A-Z0-9_]*)\s*=\s*PROD\s*\?\s*"([^"]+)"\s*:\s*"\/codedestinyassets\/([^"]*)"/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    bases[match[1]] = { cdn: match[2], prefix: match[3] };
  }
  return bases;
}

function rewriteVnAssetsToCdn(html, remoteSet) {
  const bases = parseVnAssetBases(html);
  const names = Object.keys(bases);
  if (!names.length) return { html, changed: false, rewritten: 0 };

  let rewritten = 0;
  const re = new RegExp(`\\b(${names.join("|")})\\s*\\+\\s*enc\\("([^"]+)"\\)`, "g");
  const out = html.replace(re, (full, varName, rest) => {
    const base = bases[varName];
    if (!base) return full;
    // CDN 에 없는 파일은 로컬 참조를 그대로 둔다(번들에도 남긴다).
    if (!remoteSet.has(base.prefix + rest)) return full;
    rewritten += 1;
    return `"${base.cdn}"+enc("${rest}")`;
  });
  return { html: out, changed: rewritten > 0, rewritten };
}

async function removeRemoteAssetFiles(remoteList) {
  let removed = 0;
  let bytes = 0;
  for (const rel of remoteList) {
    const target = path.join(DIST, "codedestinyassets", rel);
    try {
      const stat = await fs.stat(target);
      await fs.rm(target, { force: true });
      removed += 1;
      bytes += stat.size;
    } catch {
      // 이미 없는 파일은 넘어간다(재빌드 시 정상).
    }
  }
  return { removed, bytes };
}

// 연이/네오 토글은 앱에서도 그대로 둔다.
//
// 한동안 앱 빌드에서 이 토글 마크업을 들어냈다. 그런데 셸의 마지막 테마 적용(js/share.js 의
// window.load 핸들러)이 #themeCheckbox 존재 여부로 감싸여 있어, 마크업이 없으면 <html> 과 <body> 의
// 테마 상태가 어긋난 채 남는다 — 이 프로젝트가 금지한 "반쪽 오버라이드" 상태다.
// 그 결과 로딩 중 다크→연이로 뒤집혀 보였고, 여기에 테마 강제까지 겹치자 홈이 흰 화면이 됐다.
// 상단이 상태바에 가리는 문제는 마크업 삭제가 아니라 safe-area 보정으로 푼다(styles/app-shell.css).

// 자사 절대 URL 앵커 → 상대경로.
//
// Capacitor 는 앱 출처와 다른 호스트를 웹뷰에 로드하지 않고 외부 Chrome 으로 던진다
// (Bridge.launchIntent). 그래서 <a href="https://code-destiny.com/…"> 를 한 번만 눌러도
// 사용자가 앱 밖 웹사이트에 갇히고, 그 페이지엔 결제 가드가 없어 Play 안티스티어링
// 위반 소지까지 생긴다.
//
// ⚠️ 앵커만 바꾼다. canonical·og:image·PWA 아이콘·JSON-LD 는 절대 URL 이어야 정상이라
//    같이 바꾸면 공유 카드와 아이콘이 깨진다(dist 기준 절대 URL 2,499건 중 대부분이 그쪽이다).
const OWN_ABSOLUTE_ANCHOR_RE = /(<a\s[^>]*?href=)(["'])https?:\/\/(?:www\.)?code-destiny\.com([^"']*)\2/gi;

function rewriteOwnAbsoluteAnchors(html) {
  let changed = false;
  const out = html.replace(OWN_ABSOLUTE_ANCHOR_RE, (full, prefix, quote, rest) => {
    changed = true;
    const relative = rest && rest.startsWith("/") ? rest : `/${rest || ""}`;
    return `${prefix}${quote}${relative}${quote}`;
  });
  return { html: out, changed };
}

async function rewriteRealPageLinks(html) {
  const HREF_RE = /(\bhref=)(["'])(\/[^"'#?]+)([#?][^"']*)?\2/g;
  const map = await buildRealRouteRewriteMap(html, HREF_RE);
  if (map.size === 0) return { html, changed: false };
  const out = html.replace(HREF_RE, (full, pre, q, p, suffix) => {
    const target = map.get(p);
    return target ? `${pre}${q}${target}${suffix || ""}${q}` : full;
  });
  return { html: out, changed: out !== html };
}

// location.assign('/route') / location.href='/route' / window.open('/route', …)
// → 실제 페이지면 /route/index.html 로. 완결된 문자열 리터럴만 대상(연결식은 매치 안 됨).
async function rewriteRealPageJsNav(js) {
  const NAV_RE = /((?:window\.)?location\.(?:assign|replace)\(\s*|(?:window\.)?location\.href\s*=\s*|window\.open\(\s*)(["'])(\/[^"'#?]+)([#?][^"']*)?\2/g;
  const map = await buildRealRouteRewriteMap(js, NAV_RE);
  if (map.size === 0) return { js, changed: false };
  const out = js.replace(NAV_RE, (full, pre, q, p, suffix) => {
    const target = map.get(p);
    return target ? `${pre}${q}${target}${suffix || ""}${q}` : full;
  });
  return { js: out, changed: out !== js };
}

// 동일 오리진 Cloudflare Image Resizing 접두어 제거.
//
// `/cdn-cgi/image/<opts>/<path>` 는 Cloudflare **존(zone) 기능**이라 앱에는 존재하지 않는다 —
// 앱은 https://localhost 출처이고 번들에 cdn-cgi/ 디렉터리가 없으며, MainActivity 의
// RouteProcessor 는 마지막 세그먼트에 "." 이 있으면 자산 요청으로 그대로 흘려보내므로 전부 404 다.
// 홈의 "당신에게 맞는 운세를 선택하세요" 카드 6장이 실기기에서 깨진 이미지로 뜨던 원인(2026-08-30).
// 마크업의 인라인 onerror 폴백은 재현 하네스에서는 구제하는데 실기기에서는 구제하지 못했다 —
// 그래서 폴백을 손보는 대신 죽은 URL 자체를 앱 번들에서 없앤다.
//
// ⚠️ 두 가지는 건드리지 않는다:
//   - 교차 오리진(https://assets.code-destiny.com/cdn-cgi/…) — 별개 존이라 앱에서도 정상이다.
//     정규식이 구분자(따옴표·공백·괄호·= ·,)로 시작하도록 강제해 호스트 뒤의 경로는 매치되지 않는다.
//   - 뒤에 경로가 없는 조각 리터럴("/cdn-cgi/image/width=220,quality=82,format=auto") — 런타임에
//     조립되므로 잘라내면 접합이 깨진다. 옵션 뒤의 `/<path>.<ext>` 를 요구해 자연히 제외된다.
const SAME_ORIGIN_RESIZE_RE = /([\s"'(=,])\/cdn-cgi\/image\/[^/"'()\s]+\/(?=[^"'()\s]*\.[A-Za-z0-9]{2,5})/g;

export function stripSameOriginResizePrefixes(text) {
  let rewritten = 0;
  const out = text.replace(SAME_ORIGIN_RESIZE_RE, (full, delimiter) => {
    rewritten += 1;
    return `${delimiter}/`;
  });
  return { text: out, rewritten };
}

const RESIZE_SCAN_EXTENSIONS = /\.(?:html|css|js|mjs|json|webmanifest|xml|txt)$/i;

export async function stripSameOriginImageResizing(dist = DIST) {
  const files = await walk(dist, (file) => RESIZE_SCAN_EXTENSIONS.test(file));
  let touched = 0;
  let rewritten = 0;
  for (const file of files) {
    const original = await fs.readFile(file, "utf8");
    if (!original.includes("/cdn-cgi/image/")) continue;
    const result = stripSameOriginResizePrefixes(original);
    if (!result.rewritten) continue;
    await fs.writeFile(file, result.text, "utf8");
    touched += 1;
    rewritten += result.rewritten;
  }

  // fail-closed ①: 대상이 0건이면 통과가 아니라 실패다 — 정본이 바뀌었거나 이 재작성기가 죽은 것이다.
  // (rewriteVnAssetsToCdn 이 매칭 0건으로 조용히 통과하며 죽어 있던 전례가 있다.)
  if (rewritten === 0) {
    throw new Error(
      "동일 오리진 /cdn-cgi/image/ 참조를 한 건도 찾지 못했다 — 정본이 바뀌었거나 이 재작성기가 죽었다.\n" +
        "   참조가 정말 사라졌다면 이 패스를 테스트와 함께 제거할 것."
    );
  }

  // fail-closed ②: 재작성 뒤에도 남아 있으면 앱에서 그 이미지는 404 다.
  const remaining = [];
  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    const left = stripSameOriginResizePrefixes(text).rewritten;
    if (left) remaining.push(`${path.relative(dist, file).split(path.sep).join("/")} (${left}건)`);
  }
  if (remaining.length) {
    throw new Error(`동일 오리진 /cdn-cgi/image/ 참조가 남았다:\n   - ${remaining.join("\n   - ")}`);
  }

  return { files: touched, rewritten };
}

async function main() {
  if (!(await exists(DIST))) {
    console.error(`❌ dist를 찾을 수 없습니다: ${DIST}\n   먼저 \`npm run build:mobile\`을 실행하세요.`);
    process.exit(1);
  }

  console.log(`\n📦 앱 빌드 후처리: ${path.relative(ROOT, DIST) || DIST}`);

  const guardAssets = await installGuardAsset();
  const guardAssetNames = guardAssets.map((target) => path.relative(DIST, target).replace(/\\/g, "/"));
  console.log(`  ✅ 결제 가드·네이티브 브릿지 배치: ${guardAssetNames.join(", ")}`);

  const removed = await removeAppForbiddenRoutes();
  console.log(`  ✅ 앱에 없는 라우트 제거: ${removed.length ? removed.join(", ") : "(없음)"}`);

  const aliased = await aliasStandaloneHtmlRoutes();
  console.log(`  ✅ 단독 HTML 라우트 별칭: ${aliased.length ? aliased.join(", ") : "(없음)"}`);

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

  const removedCopies = await removeRedundantImageCopies(referenced);
  const copiesMB = removedCopies.reduce((sum, item) => sum + item.bytes, 0) / 1048576;
  console.log(`  ✅ 중복 이미지 사본 제거: ${removedCopies.length}개 (${copiesMB.toFixed(1)} MB)`);

  const htmlFiles = await walk(DIST, (file) => file.toLowerCase().endsWith(".html"));
  let injected = 0;
  let linkRewritten = 0;
  let absoluteRewritten = 0;
  let vnAssetRewrites = 0;
  const remoteManifest = await readRemoteAssetManifest();
  const remoteSet = new Set(remoteManifest?.remote || []);
  if (!remoteSet.size) {
    console.warn("  ⚠️ scripts/app-remote-assets.json 을 읽지 못했다 — 대용량 자산이 번들에 그대로 들어간다");
  }
  for (const file of htmlFiles) {
    const original = await fs.readFile(file, "utf8");
    const guarded = injectGuardTag(original);
    const vnAssets = remoteSet.size ? rewriteVnAssetsToCdn(guarded.html, remoteSet) : { html: guarded.html, changed: false, rewritten: 0 };
    const absolute = rewriteOwnAbsoluteAnchors(vnAssets.html);
    const linked = await rewriteRealPageLinks(absolute.html);
    if (!guarded.changed && !vnAssets.changed && !absolute.changed && !linked.changed) continue;
    await fs.writeFile(file, linked.html, "utf8");
    vnAssetRewrites += vnAssets.rewritten;
    if (guarded.changed) injected += 1;
    if (absolute.changed) absoluteRewritten += 1;
    if (linked.changed) linkRewritten += 1;
  }
  console.log(`  ✅ 결제 가드 주입: HTML ${injected}/${htmlFiles.length}개`);
  if (remoteSet.size) {
    const purged = await removeRemoteAssetFiles(remoteManifest.remote);
    console.log(`  ✅ VN·음원 자산 CDN 참조 전환: 참조 ${vnAssetRewrites}건 재작성`);
    console.log(`     번들에서 제외: ${purged.removed}개 / ${(purged.bytes / 1024 / 1024).toFixed(1)} MB (CDN 미보유 ${remoteManifest.bundledLocalOnly?.length || 0}개는 유지)`);
  }
  console.log(`  ✅ 자사 절대 URL 앵커 → 상대경로: HTML ${absoluteRewritten}개`);
  console.log(`  ✅ 실제-페이지 링크(html5mode 우회) 재작성: HTML ${linkRewritten}개`);

  // JS 내 정적 네비게이션(location.assign/replace/href, window.open)도 실제 페이지는
  // /route/index.html 로 — 프리미엄 AI 등 클릭 시 홈 셸로 튕기는 문제 우회.
  const jsFiles = await walk(path.join(DIST, "js"), (file) => file.toLowerCase().endsWith(".js"));
  let jsNavRewritten = 0;
  for (const file of jsFiles) {
    const original = await fs.readFile(file, "utf8");
    const { js, changed } = await rewriteRealPageJsNav(original);
    if (!changed) continue;
    await fs.writeFile(file, js, "utf8");
    jsNavRewritten += 1;
  }
  console.log(`  ✅ JS 정적 네비(html5mode 우회) 재작성: ${jsNavRewritten}개`);

  const resized = await stripSameOriginImageResizing();
  console.log(`  ✅ 동일 오리진 이미지 리사이징 접두어 제거: ${resized.rewritten}건 / ${resized.files}개 파일`);

  const shrunk = await shrinkOversizedImages();
  console.log(`  ✅ 이미지 축소: ${shrunk.rewritten}/${shrunk.total}개 재인코딩 (${(shrunk.freed / 1048576).toFixed(1)} MB 절감, 건너뜀 ${shrunk.skipped}개)`);

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

/*
  폰트 자산 게이트. 두 종류를 본다.

  A. 오프라인(네트워크 무관, 항상 하드 실패)
     1) 코드가 선언한 모든 @font-face src 오리진이 CSP font-src 세 정의 전부에 있는지.
        → CSP 가 막는 오리진의 폰트를 선언하는 것 자체를 배포 전에 차단한다.
     2) styles/fonts-serif.css 가 매니페스트와 정합한지(생성물 수동 편집·부분 커밋 방지).

  B. 온라인(R2 실제 존재)
     404 / MIME 불일치 / CORS 불허는 하드 실패 — 커밋 b26d29de1 처럼 "선언만 배포되고
     파일은 안 올라간" 사고를 여기서 잡는다.
     네트워크 자체 실패나 5xx 는 경고로만 둔다 — 배포 게이트가 R2 일시 블립에 인질이 되지 않도록.
*/

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");

const assetOrigin = process.env.CODE_DESTINY_ASSET_ORIGIN || "https://assets.code-destiny.com";
const appOrigin = process.env.CODE_DESTINY_APP_ORIGIN || "https://code-destiny.com";

const failures = [];
const warnings = [];

const readIfExists = (relativePath) => {
  const absolute = resolve(rootDir, relativePath);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
};

/* ─────────────── A-1. @font-face 오리진 ↔ CSP font-src 대조 ─────────────── */

// @font-face 를 선언하는 소스 전부. 셸은 크리티컬 인라인 CSS 안에 직접 선언한다.
const FONT_FACE_SOURCES = [
  "styles/globals.css",
  "styles/fonts-serif.css",
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];

// CSP 정의 3곳. 하나만 넓히고 나머지를 빠뜨리면 경로에 따라 폰트가 죽으므로 전부 본다.
const CSP_SOURCES = ["_headers", "public/_headers", "middleware.ts"];

function collectFontFaceOrigins() {
  const origins = new Map();
  for (const relativePath of FONT_FACE_SOURCES) {
    const source = readIfExists(relativePath);
    if (!source) continue;
    const blockRe = /@font-face\s*\{[^}]*\}/g;
    let block = blockRe.exec(source);
    while (block) {
      const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
      let url = urlRe.exec(block[0]);
      while (url) {
        const raw = url[1].trim();
        if (/^https?:\/\//i.test(raw)) {
          const origin = new URL(raw).origin;
          if (!origins.has(origin)) origins.set(origin, new Set());
          origins.get(origin).add(relativePath);
        }
        url = urlRe.exec(block[0]);
      }
      block = blockRe.exec(source);
    }
  }
  return origins;
}

function collectFontSrcDirectives() {
  const directives = [];
  for (const relativePath of CSP_SOURCES) {
    const source = readIfExists(relativePath);
    if (!source) {
      failures.push(`CSP source missing: ${relativePath}`);
      continue;
    }
    // 세미콜론(_headers 구분자) / 큰따옴표(middleware.ts 문자열 끝) / 줄바꿈까지가 한 디렉티브.
    // 작은따옴표는 값 자체('self')에 쓰이므로 종료문자로 넣으면 안 된다.
    const matches = source.match(/font-src[^;"\n]*/g) || [];
    if (!matches.length) {
      failures.push(`${relativePath}: no font-src directive found`);
      continue;
    }
    for (const match of matches) directives.push({ file: relativePath, value: match });
  }
  return directives;
}

const declaredOrigins = collectFontFaceOrigins();
const fontSrcDirectives = collectFontSrcDirectives();

for (const [origin, sources] of declaredOrigins) {
  for (const directive of fontSrcDirectives) {
    if (!directive.value.includes(origin)) {
      failures.push(
        `CSP font-src in ${directive.file} does not allow ${origin} (declared in ${[...sources].join(", ")})`,
      );
    }
  }
}
console.log(
  `csp-check  @font-face origins: ${[...declaredOrigins.keys()].join(", ") || "(none)"} vs ${fontSrcDirectives.length} font-src directive(s)`,
);

/* ─────────────── A-2. 생성물 정합 (fonts-serif.css ↔ 매니페스트) ─────────────── */

const manifestPath = "scripts/data/serif-font-manifest.json";
const manifestRaw = readIfExists(manifestPath);
let manifest = null;
if (!manifestRaw) {
  failures.push(`${manifestPath} is missing — run: node scripts/build-serif-font-assets.mjs`);
} else {
  manifest = JSON.parse(manifestRaw);
  const generatedCss = readIfExists("styles/fonts-serif.css");
  if (!generatedCss) {
    failures.push("styles/fonts-serif.css is missing — run: node scripts/build-serif-font-assets.mjs");
  } else {
    for (const family of manifest.families || []) {
      for (const chunk of family.chunks || []) {
        if (!generatedCss.includes(chunk.url)) {
          failures.push(`styles/fonts-serif.css is out of sync with manifest: missing ${chunk.key}`);
        }
      }
    }
    const publicCss = readIfExists("public/styles/fonts-serif.css");
    if (publicCss && publicCss !== generatedCss) {
      failures.push("public/styles/fonts-serif.css differs from styles/fonts-serif.css — run: npm run sync:public");
    }
    if (!publicCss) {
      failures.push("public/styles/fonts-serif.css is missing — run: npm run sync:public");
    }
  }
}

/* ─────────────── B. R2 실제 존재 검사 ─────────────── */

// 고정 이름으로 서빙되는 기존 폰트들.
//
// 🔴 The Jamsil OTF 4 Medium.otf / netmarbleM.ttf 는 여기서 뺐다. 두 폰트의 라이선스가
//    "수정·다른 포맷으로의 변환"을 금지해 woff2 로도 서브셋으로도 줄일 수 없었고(각각
//    935KB·846KB 원본을 그대로 내려보내고 있었다), netmarble 은 임베디드 사용에 사전
//    허가까지 요구한다. 둘 다 OFL 폰트로 교체했다 — premium 은 CodeDestinySerifKR,
//    playful 은 Gowun Dodum(같은 CodeDestinyPlayful 이름으로 청크 미러링).
//    R2 오브젝트 자체는 아직 남아 있지만 어떤 @font-face 도 참조하지 않으므로,
//    여기서 존재를 강제하면 정리할 수 없는 자산이 된다.
const fixedFonts = [
  { file: "Mulmaru.woff2", role: "display", formats: ["font/woff2"] },
  { file: "Galmuri11-Bold.woff2", role: "decorative", formats: ["font/woff2"] },
];

// 브랜드 세리프는 내용 해시 키의 청크 묶음이라 매니페스트가 목록의 정본이다.
const serifChunks = [];
for (const family of manifest?.families || []) {
  const seen = new Set();
  for (const chunk of family.chunks || []) {
    if (seen.has(chunk.key)) continue;
    seen.add(chunk.key);
    serifChunks.push({ file: chunk.key, role: family.family, formats: ["font/woff2"], expectedSize: chunk.size });
  }
}

const encodePath = (file) => file.split("/").map(encodeURIComponent).join("/");
const makeUrl = (file) => new URL(encodePath(file), `${assetOrigin.replace(/\/+$/, "")}/`).href;
const normalizeType = (value) => (value || "").split(";")[0].trim().toLowerCase();

async function checkFont(font, { verbose }) {
  const url = makeUrl(font.file);
  let response;
  try {
    response = await fetch(url, { method: "HEAD", headers: { Origin: appOrigin } });
  } catch (error) {
    // 네트워크 도달 실패는 자산 결함이 아니다 → 경고.
    warnings.push(`${font.file}: HEAD request failed (${error?.message || error})`);
    return;
  }

  const type = normalizeType(response.headers.get("content-type"));
  const cors = response.headers.get("access-control-allow-origin") || "";
  const cacheControl = response.headers.get("cache-control") || "";
  const size = response.headers.get("content-length") || "unknown";

  if (response.status >= 500) {
    warnings.push(`${font.file}: HTTP ${response.status} (upstream blip, not treated as missing)`);
    return;
  }

  if (!response.ok) failures.push(`${font.file}: HTTP ${response.status}`);
  if (response.ok && !font.formats.includes(type)) {
    failures.push(`${font.file}: unexpected MIME "${type || "missing"}"`);
  }
  if (response.ok && !(cors === "*" || cors.includes(appOrigin))) {
    failures.push(`${font.file}: CORS does not allow ${appOrigin}`);
  }
  if (response.ok && font.expectedSize && Number(size) && Number(size) !== font.expectedSize) {
    failures.push(`${font.file}: size ${size} does not match manifest ${font.expectedSize}`);
  }

  if (!cacheControl) {
    warnings.push(`${font.file}: Cache-Control header is missing`);
  } else if (!/max-age=31536000/i.test(cacheControl) || !/immutable/i.test(cacheControl)) {
    warnings.push(`${font.file}: Cache-Control is not immutable long-cache (${cacheControl})`);
  }

  if (verbose) console.log(`${String(font.role).padEnd(22)} ${font.file} ${response.status} ${type} ${size} bytes`);
}

for (const font of fixedFonts) {
  await checkFont(font, { verbose: true });
}

// 청크는 94개라 한 줄씩 찍으면 로그가 길다 — 병렬로 돌리고 요약만 남긴다.
const CHUNK_CONCURRENCY = 8;
let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(CHUNK_CONCURRENCY, serifChunks.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= serifChunks.length) return;
      await checkFont(serifChunks[index], { verbose: false });
    }
  }),
);
console.log(`serif-chunks           ${serifChunks.length} objects checked on ${assetOrigin}`);

if (warnings.length > 0) {
  console.warn("\nWarnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length > 0) {
  console.error("\nFailures:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nR2 font asset verification passed.");

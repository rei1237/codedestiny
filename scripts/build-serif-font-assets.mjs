#!/usr/bin/env node

/*
  브랜드 세리프(CodeDestinySerifLatin / CodeDestinySerifKR) 실물 자산 파이프라인.

  왜 이 스크립트가 필요한가:
  커밋 b26d29de1 이 @font-face 선언만 배포하고 실제 woff2 를 R2 에 올리지 않아
  assets.code-destiny.com/CodeDestinySerif{KR,Latin}.woff2 가 상시 404 였다.
  CSP(font-src)가 'self' 와 assets.code-destiny.com 만 허용하므로 Google Fonts 를
  직접 참조할 수는 없다 → OFL 폰트를 우리 R2 로 미러링해 같은 오리진에서 서빙한다.

  한글 전체 woff2 는 약 1.9MB 라 단일 파일로 올리면 홈 첫 방문 비용이 과하다.
  그래서 Google 과 동일한 unicode-range 청크 구조를 그대로 미러링한다 —
  브라우저가 실제 제목에 필요한 청크만 받으므로 실다운로드는 20~60KB 수준이다.

  키는 내용 해시로 만든다. 폰트 버전이 올라가 내용이 바뀌면 새 키가 되므로,
  immutable(1년) 캐시를 깨지 않고 재생성할 수 있다.

  라이선스: Cinzel / Nanum Myeongjo 모두 OFL. OFL 은 서브셋(=수정)한 폰트에
  Reserved Font Name 사용을 금지하므로, family 를 CodeDestinySerif* 로 개명하는
  것이 요구사항을 충족한다. OFL 원문은 fonts/OFL.txt 로 함께 업로드한다.

  사용법:
    node scripts/build-serif-font-assets.mjs            # dry-run (생성물만 씀, 업로드 없음)
    node scripts/build-serif-font-assets.mjs --apply    # R2 업로드까지
    node scripts/build-serif-font-assets.mjs --apply --force   # 이미 있는 키도 재업로드

  업로드 후 캐시 헤더는 기존 도구가 담당한다:
    npm run r2:cache-metadata:apply -- --bucket-kind assets --prefix fonts/
*/

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", quiet: true });
loadDotenv({ quiet: true });

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");

const ASSET_ORIGIN = "https://assets.code-destiny.com";
const BUCKET = "codedestinyassets";
const DOWNLOAD_CONCURRENCY = 6;

// Google Fonts CSS API 는 요청 UA 에 따라 포맷을 바꾼다(구형 UA → ttf 단일 파일).
// woff2 + unicode-range 청크를 받으려면 최신 Chrome UA 가 필요하다.
const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/*
  Latin 은 Cinzel 가변(400..700) — 원래 선언의 font-weight: 400 700 과 일치.
  KR 은 Nanum Myeongjo 700 만 — 원래 선언(font-weight: 700)을 그대로 따른다.
  소비 지점 4곳이 모두 700 계열 제목이라 굵기를 늘릴 이유가 없다(청크 수가 배가 된다).
*/
const FONT_SOURCES = Object.freeze([
  {
    family: "CodeDestinySerifLatin",
    googleQuery: "Cinzel:wght@400..700",
    keyPrefix: "fonts/serif-latin",
    upstream: "Cinzel (OFL)",
  },
  {
    family: "CodeDestinySerifKR",
    googleQuery: "Nanum+Myeongjo:wght@700",
    keyPrefix: "fonts/serif-kr",
    upstream: "Nanum Myeongjo (OFL)",
  },
  /*
    CodeDestinyPlayful 은 원래 netmarbleM.ttf(846KB, 비압축 TTF)였다. 넷마블체 라이선스가
    "수정, 변형, 임대, 재판매를 금지"하므로 woff2 변환도 서브셋도 할 수 없어, 줄이는 길이
    아예 없었다(3자 폰트 아카이브들이 OFL 로 표기하지만 공식 CI 페이지와 폰트 name 테이블
    모두 OFL 이 아니다). 같은 성격의 둥근 고딕인 고운돋움으로 갈아탄다.
    family 이름을 그대로 두는 것이 핵심이다 — 이 이름을 직접 참조하는 20여 곳이 손대지 않고
    새 폰트를 쓰게 되고, OFL 이 요구하는 Reserved Font Name 회피도 동시에 충족된다.
  */
  {
    family: "CodeDestinyPlayful",
    googleQuery: "Gowun+Dodum",
    keyPrefix: "fonts/playful",
    upstream: "Gowun Dodum (OFL)",
  },
]);

const OFL_NOTICE = `Code Destiny brand serif webfonts
================================

The woff2 files under fonts/serif-latin/, fonts/serif-kr/ and fonts/playful/ are
subsets of:

  - Cinzel          (c) Natanael Gama,  SIL Open Font License 1.1
  - Nanum Myeongjo  (c) NAVER Corp.,    SIL Open Font License 1.1
  - Gowun Dodum     (c) Yanghee Ryu,    SIL Open Font License 1.1

They are redistributed here under the terms of the SIL Open Font License 1.1
(https://openfontlicense.org). Because these files are modified (subset) copies,
they are renamed to "CodeDestinySerifLatin", "CodeDestinySerifKR" and
"CodeDestinyPlayful" so that the Reserved Font Names "Cinzel", "Nanum Myeongjo"
and "Gowun Dodum" are not used, as the license requires.

Full license text: https://openfontlicense.org/open-font-license-official-text/
`;

function parseArgs(argv) {
  const options = { apply: false, force: false, help: false };
  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function clean(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function resolveCloudflareAuth() {
  const accountId = clean(
    process.env.Account_ID
      || process.env.ACCOUNT_ID
      || process.env.R2_ACCOUNT_ID
      || process.env.CLOUDFLARE_ACCOUNT_ID,
  );
  const apiToken = clean(
    process.env.R2_Edit
      || process.env.R2_EDIT
      || process.env.CLOUDFLARE_APITOKEN
      || process.env.CLOUDFLARE_API_TOKEN,
  );
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

async function fetchGoogleFontCss(googleQuery) {
  const url = `https://fonts.googleapis.com/css2?family=${googleQuery}&display=swap`;
  const response = await fetch(url, { headers: { "User-Agent": CHROME_UA } });
  if (!response.ok) throw new Error(`Google Fonts CSS ${response.status} for ${googleQuery}`);
  return response.text();
}

/* Google 이 돌려준 @font-face 블록을 그대로 구조화한다. unicode-range 는
   전달 효율의 핵심이므로 한 글자도 바꾸지 않고 보존한다. */
function parseFontFaceBlocks(css) {
  const blocks = [];
  const blockRe = /@font-face\s*\{([^}]*)\}/g;
  let match = blockRe.exec(css);
  while (match) {
    const body = match[1];
    const pick = (property) => {
      const found = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i").exec(body);
      return found ? found[1].trim() : "";
    };
    const srcUrl = /url\(([^)]+)\)/.exec(pick("src") || "");
    if (srcUrl) {
      blocks.push({
        url: srcUrl[1].trim().replace(/^["']|["']$/g, ""),
        fontStyle: pick("font-style") || "normal",
        fontWeight: pick("font-weight") || "400",
        unicodeRange: pick("unicode-range"),
      });
    }
    match = blockRe.exec(css);
  }
  return blocks;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function downloadChunk(block, keyPrefix) {
  const response = await fetch(block.url, { headers: { "User-Agent": CHROME_UA } });
  if (!response.ok) throw new Error(`chunk download ${response.status}: ${block.url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    ...block,
    bytes,
    size: bytes.length,
    sha256,
    key: `${keyPrefix}/${sha256.slice(0, 12)}.woff2`,
  };
}

function publicUrlForKey(key) {
  return `${ASSET_ORIGIN}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function r2ObjectEndpoint(auth, key) {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `https://api.cloudflare.com/client/v4/accounts/${auth.accountId}/r2/buckets/${BUCKET}/objects/${encodedKey}`;
}

async function r2ObjectExists(auth, key) {
  const response = await fetch(r2ObjectEndpoint(auth, key), {
    method: "HEAD",
    headers: { Authorization: `Bearer ${auth.apiToken}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`R2 HEAD ${response.status} for ${key}`);
  return { size: Number(response.headers.get("content-length") || 0) };
}

async function r2PutObject(auth, key, bytes, contentType) {
  const response = await fetch(r2ObjectEndpoint(auth, key), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${auth.apiToken}`,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: bytes,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`R2 PUT ${response.status} for ${key}: ${detail.slice(0, 300)}`);
  }
}

function buildFontsCss(families) {
  const lines = [
    "/* 자동 생성 — 직접 편집하지 말 것.",
    "   재생성: node scripts/build-serif-font-assets.mjs",
    "",
    "   브랜드 세리프 웹폰트. Google Fonts 와 동일한 unicode-range 청크 구조를",
    "   R2(assets.code-destiny.com)로 미러링해, CSP font-src 를 넓히지 않고도",
    "   브라우저가 실제 필요한 청크만 받게 한다.",
    "   출처/라이선스(OFL): fonts/OFL.txt */",
    "",
  ];

  for (const family of families) {
    lines.push(`/* ${family.family} — ${family.upstream}, ${family.chunks.length} chunks */`);
    for (const chunk of family.chunks) {
      lines.push("@font-face {");
      lines.push(`\tfont-family: "${family.family}";`);
      lines.push(`\tsrc: url("${publicUrlForKey(chunk.key)}") format("woff2");`);
      lines.push(`\tfont-weight: ${chunk.fontWeight};`);
      lines.push(`\tfont-style: ${chunk.fontStyle};`);
      lines.push("\tfont-display: swap;");
      if (chunk.unicodeRange) lines.push(`\tunicode-range: ${chunk.unicodeRange};`);
      lines.push("}");
    }
    lines.push("");
  }

  return `${lines.join("\n")}`;
}

function buildManifest(families) {
  return {
    generator: "scripts/build-serif-font-assets.mjs",
    assetOrigin: ASSET_ORIGIN,
    bucket: BUCKET,
    families: families.map((family) => ({
      family: family.family,
      upstream: family.upstream,
      googleQuery: family.googleQuery,
      keyPrefix: family.keyPrefix,
      chunkCount: family.chunks.length,
      totalBytes: family.chunks.reduce((sum, chunk) => sum + chunk.size, 0),
      chunks: family.chunks.map((chunk) => ({
        key: chunk.key,
        url: publicUrlForKey(chunk.key),
        size: chunk.size,
        sha256: chunk.sha256,
        fontWeight: chunk.fontWeight,
        fontStyle: chunk.fontStyle,
        unicodeRange: chunk.unicodeRange,
      })),
    })),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node scripts/build-serif-font-assets.mjs [--apply] [--force]");
    return;
  }

  const auth = resolveCloudflareAuth();
  if (options.apply && !auth) {
    throw new Error("R2 업로드에는 Account_ID 와 R2_Edit(또는 CLOUDFLARE_APITOKEN) 이 필요합니다.");
  }

  const families = [];
  for (const source of FONT_SOURCES) {
    const css = await fetchGoogleFontCss(source.googleQuery);
    const blocks = parseFontFaceBlocks(css);
    if (!blocks.length) throw new Error(`no @font-face parsed for ${source.googleQuery}`);

    const chunks = await mapWithConcurrency(
      blocks,
      DOWNLOAD_CONCURRENCY,
      (block) => downloadChunk(block, source.keyPrefix),
    );

    // 같은 woff2 가 여러 weight 블록에 재사용될 수 있다(가변 폰트) → 키는 중복 제거하되
    // @font-face 블록은 unicode-range/weight 조합별로 그대로 유지한다.
    const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const uniqueKeys = new Set(chunks.map((chunk) => chunk.key));
    console.log(
      `${source.family}: ${chunks.length} blocks / ${uniqueKeys.size} unique objects / ${(totalBytes / 1024).toFixed(0)}KB total`,
    );

    families.push({ ...source, chunks });
  }

  const cssPath = resolve(rootDir, "styles/fonts-serif.css");
  const manifestPath = resolve(rootDir, "scripts/data/serif-font-manifest.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(cssPath, `${buildFontsCss(families)}\n`, "utf8");
  await writeFile(manifestPath, `${JSON.stringify(buildManifest(families), null, 2)}\n`, "utf8");
  console.log(`wrote ${cssPath}`);
  console.log(`wrote ${manifestPath}`);

  if (!options.apply) {
    console.log("\ndry-run — R2 업로드는 하지 않았습니다. 올리려면 --apply 를 붙이세요.");
    return;
  }

  const uploads = [];
  const seen = new Set();
  for (const family of families) {
    for (const chunk of family.chunks) {
      if (seen.has(chunk.key)) continue;
      seen.add(chunk.key);
      uploads.push(chunk);
    }
  }

  let uploaded = 0;
  let skipped = 0;
  await mapWithConcurrency(uploads, DOWNLOAD_CONCURRENCY, async (chunk) => {
    if (!options.force) {
      const existing = await r2ObjectExists(auth, chunk.key);
      if (existing && existing.size === chunk.size) {
        skipped += 1;
        return;
      }
    }
    await r2PutObject(auth, chunk.key, chunk.bytes, "font/woff2");
    uploaded += 1;
  });

  await r2PutObject(auth, "fonts/OFL.txt", Buffer.from(OFL_NOTICE, "utf8"), "text/plain; charset=utf-8");

  console.log(`\nR2 업로드 완료: ${uploaded} uploaded, ${skipped} already present (+ fonts/OFL.txt)`);
  console.log("캐시 헤더 확정: npm run r2:cache-metadata:apply -- --bucket-kind assets --prefix fonts/");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

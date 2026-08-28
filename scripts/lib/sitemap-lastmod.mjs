/**
 * 사이트맵 lastmod 콘텐츠 서명 원장.
 *
 * 문제 (2026-08-16 실측): generate-sitemap.mjs 의 `route.lastmod || today` 때문에 429개 URL 중
 * 315개가 **빌드할 때마다 "오늘 수정됨"** 으로 나갔다. 사이트맵을 커밋에 담으면 316줄이 날짜만
 * 바뀌는 churn 이 되고(#718·#720 이 사이트맵을 커밋에서 뺀 이유가 이것), 무엇보다 구글이
 * lastmod 신호를 통째로 신뢰하지 않게 된다.
 *
 * 해법: 라우트마다 **렌더에 실제로 쓰이는 소스**의 서명을 계산해 config/sitemap-lastmod.json 에
 * 적어 둔다. 서명이 같으면 저장된 날짜를 그대로 쓰고, 다르거나 처음 보는 라우트만 오늘로 올린다.
 *
 * 🔴 이 모듈이 지키는 것 (하나라도 어기면 조용히 무의미해진다)
 *
 * 1. **캐시키 정규화가 먼저다.** build-cf-main.mjs 에서 `sync:public`(:25)이 `sitemap:generate`(:26)
 *    **앞**에 돌면서 index.html 의 `?v=` 토큰 87개를 매 빌드 다시 쓴다. 정규화 없이 해싱하면
 *    index.html 을 쓰는 라우트가 매번 "바뀜"으로 잡혀 지금과 똑같이 전부 오늘 날짜가 된다.
 *    정규화기를 새로 만들지 않고 이미 있는 공유 정의(scripts/lib/cachebust-pattern.mjs)를 쓴다.
 *
 * 2. **페이지 파일 하나만 해싱하면 안 된다.** app/saju/page.js 는 16줄이고 본문은
 *    lib/seo-landing-pages.js 에 있다. 페이지만 보면 문구를 고쳐도 서명이 그대로라
 *    "안 바뀌었다"고 **틀린 방향으로** 단언하게 된다. 전이 import 를 닫아서 함께 해싱한다.
 *
 * 3. **import 그래프에 안 잡히는 데이터 의존을 미분류로 두지 않는다.** 라우트 그래프에 들어온
 *    파일 중 런타임에 파일을 읽는 모듈을 전수 발견하고, RUNTIME_DATA_MODULES 에 없으면 실패시킨다
 *    (CLAUDE.md 원칙 10 — 손으로 쓴 목록은 가드가 아니다).
 *
 * 4. **git log 는 쓸 수 없다.** .github/workflows/pr-ci.yml 의 build 잡에 fetch-depth 지정이 없어
 *    shallow(=1) 다. `git log -1 -- <file>` 이 빈 값을 내고 `|| today` 로 되돌아간다.
 *    release 워크플로는 fetch-depth: 0 이라 두 환경이 **다른 값**을 낸다는 점이 더 나쁘다.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { normalizeCacheBust } from "./cachebust-pattern.mjs";
import { sliceFunction } from "./js-source-slice.mjs";

const LEDGER_REL_PATH = "config/sitemap-lastmod.json";

// 확장자 없는 import 를 풀 때 시도하는 순서. .css 는 렌더 결과에 영향이 있으므로 포함한다.
const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"];

const PAGE_FILE_RE = /^page\.(?:js|jsx|ts|tsx)$/;

// import 지정자 추출. 정적 import·재export·동적 import()·require 를 모두 본다.
const SPECIFIER_PATTERNS = [
  /\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\bimport\s+["']([^"']+)["']/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];

/**
 * 정적 셸(index.html)이 본문인 라우트.
 *
 * CLAUDE.md: "홈 `/` 은 정적 셸 index.html 의 승격본이다 — 홈 콘텐츠·메타는 app/page.js 가 아니라
 * 정적 셸에 둔다." 로케일 루트도 같다 — sync-legacy-static-to-public.mjs 가 index.html 을 복제하고
 * applyLocaleSeoMeta 로 head 를 갈아 끼운 것이 /ja·/zh·/zh-tw·/en 의 실체다.
 * app 페이지 파일만 해싱하면 셸 본문이 통째로 바뀌어도 서명이 그대로다.
 */
const SHELL_BACKED_PAGES = new Set(["app/page.js", "app/[locale]/page.js"]);

/**
 * App Router 페이지가 **아예 없고** 정적 셸 하나가 본문 전부인 라우트.
 *
 * `/` 와는 다르다 — 홈은 `app/page.js` 가 존재하고 셸이 그것을 덮는 구조라 위
 * `SHELL_BACKED_PAGES` 로 다룬다. `/fortune` 은 라우트 자체가 없고 `fortune/index.html`
 * 이 곧 페이지다. 그래서 `matchAppPage` 가 해석에 실패하고 fail-closed 로 빌드를 세운다.
 *
 * 🔴 셸 파일만 해싱하면 안 된다. 이 셸은 `scripts/build-fortune-hub-shell.mjs` 가
 * `lib/fortune/{sign-profiles,periods}` 에서 생성한 산출물이라, 소스가 바뀌었는데 셸을
 * 다시 만들지 않은 상태에서는 lastmod 가 조용히 멈춘다. 생성기와 그 입력을 함께 넣는다
 * (셸을 다시 만들지 않은 것 자체는 `verify:fortune-hub-shell` 가 따로 막는다).
 */
const STANDALONE_SHELL_ROUTES = new Map([
  [
    "/fortune",
    [
      "fortune/index.html",
      "lib/fortune/periods.ts",
      "lib/fortune/sign-profiles.ts",
      "scripts/build-fortune-hub-shell.mjs",
    ],
  ],
]);

/**
 * 런타임에 파일을 읽어 import 그래프에 안 잡히는 데이터 의존.
 * `id` 는 그 의존을 가리키는 **안정적인** 서명 조각이고, `volatile` 은 그 데이터가 날마다
 * 바뀐다는 표시다.
 *
 * lib/fortune/daily-data.ts 는 fortune/data/daily-<시드 날짜>.json 을 읽는다. 시드는 기간마다
 * 다르다 — today/tomorrow 는 그날, weekly 는 주 시작일, monthly 는 그 달 1일이다(2026-08-28).
 * today·tomorrow 는 매일 바뀌고, weekly·monthly 는 시드 날짜가 바뀔 때 바뀐다. 다만 이 표는
 * **모듈 단위**라 라우트별로 가를 수 없어 네 기간을 모두 volatile 로 둔다 — 주간·월간의 lastmod 가
 * 실제 변경보다 자주 올라간다는 뜻이다(라우트별 volatile 은 별건).
 *
 * 🔴 다만 그 사실을 **서명에 날짜로 섞지 않는다**(2026-08-25 정정). 예전 값은
 * `fortune-daily-package:${kstYmdToday()}` 였는데, 그러면 원장에 저장되는 서명이 KST 자정마다
 * 통째로 바뀐다. 2026-08-24 에 PR CI 로 들어온 verify:sitemap-drift 는 원장을 **바이트로**
 * 비교하므로, 원장을 마지막으로 재생성한 다음 자정부터 **모든 PR** 이 사이트맵과 무관한 이유로
 * 빨간불이 됐다(실측: /fortune/today/* 계열 50개 서명이 매일 어긋났다). assertNoDrift 의
 * "재생성은 결정적이다" 주석은 lastmod 만 보고 쓴 것이라 서명에 대해서는 거짓이었다.
 *
 * 이제 ① 원장의 서명은 소스가 실제로 바뀔 때만 움직이고(= 진짜 변경은 여전히 잡힌다)
 * ② 매일 바뀌는 것은 lastmod 뿐이며 그건 드리프트 비교에서 정규화된다(generate-sitemap.mjs).
 */
const RUNTIME_DATA_MODULES = new Map([
  ["lib/fortune/daily-data.ts", { id: "fortune-daily-package", volatile: true }],
]);

const RUNTIME_READ_RE = /\breadFileSync\s*\(/;

/**
 * 값 집합을 제한해야 하는 동적 세그먼트.
 *
 * 🔴 `app/[locale]/page.js` 는 최상위 한 세그먼트짜리 라우트를 **전부** 삼킨다. 그대로 두면
 * app 페이지가 없는 새 라우트가 조용히 로케일 홈으로 오인돼 엉뚱한 소스의 서명을 달게 된다
 * (미분류가 today 로 새는 걸 막자는 이 원장의 목적이 통째로 무너진다).
 * 값은 손으로 적지 않고 lib/i18n/locales.ts 의 pathPrefix 에서 파생한다.
 */
const CONSTRAINED_SEGMENTS = new Map([["[locale]", readLocaleSegments]]);

function readLocaleSegments(rootDir) {
  const source = readFileSync(resolve(rootDir, "lib/i18n/locales.ts"), "utf8");
  const segments = [...source.matchAll(/pathPrefix:\s*"([^"]*)"/g)]
    .map((match) => match[1].replace(/^\//, ""))
    .filter(Boolean);
  if (segments.length === 0) {
    throw new Error(
      "[sitemap-lastmod] lib/i18n/locales.ts 에서 pathPrefix 를 찾지 못했습니다 — " +
        "파일 구조가 바뀌었다면 이 추출기를 함께 고쳐야 합니다.",
    );
  }
  return new Set(segments);
}

function toPosix(value) {
  return String(value).split("\\").join("/");
}

function relFromRoot(rootDir, absPath) {
  return toPosix(absPath.slice(rootDir.length + 1));
}

/**
 * 해시 전에 지우는 것: 캐시버스트 토큰 · BOM · CRLF.
 * 🔴 줄바꿈 정규화를 빼면 안 된다 — 윈도우 로컬은 CRLF, CI(리눅스)는 LF 로 같은 파일을 읽어
 *    서명이 갈리고, 원장이 로컬과 CI 에서 서로를 덮어쓰며 사이트맵이 계속 흔들린다.
 */
function normalizeForSignature(text) {
  return normalizeCacheBust(String(text).replace(/^\uFEFF+/, ""))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function collectAppPages(rootDir) {
  const pages = [];
  const walk = (absDir, segments) => {
    for (const name of readdirSync(absDir).sort()) {
      const abs = join(absDir, name);
      if (statSync(abs).isDirectory()) {
        // _ 로 시작하는 폴더는 라우트가 아니고, api 는 사이트맵 대상이 아니다.
        if (name.startsWith("_") || name === "api") continue;
        // (group) 은 URL 에 나타나지 않는다.
        walk(abs, /^\(.*\)$/.test(name) ? segments : [...segments, name]);
        continue;
      }
      if (PAGE_FILE_RE.test(name)) pages.push({ segments, file: relFromRoot(rootDir, abs) });
    }
  };
  walk(resolve(rootDir, "app"), []);
  return pages;
}

/** 정적 세그먼트가 동적 세그먼트를 이긴다(Next 의 우선순위와 같다). */
function matchAppPage(pages, pathname, constrainedValues) {
  const parts = pathname.split("/").filter(Boolean);
  let best = null;

  for (const page of pages) {
    const { segments } = page;
    const catchAllAt = segments.findIndex((segment) => segment.startsWith("[..."));
    if (catchAllAt < 0) {
      if (segments.length !== parts.length) continue;
    } else if (parts.length < catchAllAt) {
      continue;
    }

    let score = 0;
    let matched = true;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (segment.startsWith("[...")) break;
      if (segment.startsWith("[")) {
        const allowed = constrainedValues.get(segment);
        if (allowed && !allowed.has(parts[i])) {
          matched = false;
          break;
        }
        score += 1;
        continue;
      }
      if (segment === parts[i]) {
        score += 10;
        continue;
      }
      matched = false;
      break;
    }

    if (!matched) continue;
    if (!best || score > best.score) best = { page, score };
  }

  return best ? best.page : null;
}

function resolveLocalSpecifier(rootDir, fromRel, specifier) {
  // 쿼리·프래그먼트가 붙은 자산 지정자는 경로 부분만 본다.
  const clean = specifier.split("?")[0].split("#")[0];
  let base;
  if (clean.startsWith("@/")) base = resolve(rootDir, clean.slice(2));
  else if (clean.startsWith("./") || clean.startsWith("../")) base = resolve(rootDir, dirname(fromRel), clean);
  else return { kind: "external" };

  const candidates = [
    base,
    ...RESOLVE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...RESOLVE_EXTENSIONS.map((ext) => join(base, `index${ext}`)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return { kind: "local", rel: relFromRoot(rootDir, candidate) };
    }
  }
  return { kind: "unresolved" };
}

export function createSitemapLastmodLedger({ rootDir, today, volatileToday = today, previousSitemapPath }) {
  const appPages = collectAppPages(rootDir);
  const constrainedValues = new Map(
    [...CONSTRAINED_SEGMENTS].map(([segment, read]) => [segment, read(rootDir)]),
  );
  const textCache = new Map();
  const depsCache = new Map();
  const decided = new Map();
  // 매일 바뀌는 런타임 데이터를 읽는 라우트. 드리프트 검사가 이 라우트의 lastmod 를 정규화한다.
  const volatileRoutes = new Set();
  const unresolvedImports = [];
  // 라우트 그래프에 실제로 들어온 파일의 합집합. 런타임 데이터 의존 검사가 이 범위만 본다.
  const visitedFiles = new Set();

  function readNormalized(rel) {
    if (textCache.has(rel)) return textCache.get(rel);
    const text = normalizeForSignature(readFileSync(resolve(rootDir, rel), "utf8"));
    textCache.set(rel, text);
    return text;
  }

  function directDeps(rel) {
    if (depsCache.has(rel)) return depsCache.get(rel);
    const deps = [];
    if (!rel.endsWith(".json") && !rel.endsWith(".css")) {
      const source = readNormalized(rel);
      const seen = new Set();
      for (const pattern of SPECIFIER_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(source)) !== null) {
          const specifier = match[1];
          if (!specifier || seen.has(specifier)) continue;
          seen.add(specifier);
          const resolved = resolveLocalSpecifier(rootDir, rel, specifier);
          if (resolved.kind === "local") deps.push(resolved.rel);
          else if (resolved.kind === "unresolved") unresolvedImports.push(`${rel} → ${specifier}`);
        }
      }
    }
    const unique = [...new Set(deps)].sort();
    depsCache.set(rel, unique);
    return unique;
  }

  function closureOf(seeds) {
    const seen = new Set();
    const queue = [...seeds];
    while (queue.length > 0) {
      const rel = queue.shift();
      if (seen.has(rel)) continue;
      seen.add(rel);
      visitedFiles.add(rel);
      for (const dep of directDeps(rel)) if (!seen.has(dep)) queue.push(dep);
    }
    return [...seen].sort();
  }

  // 🔴 미분류 런타임 데이터 의존을 실패시킨다. 손으로 적은 RUNTIME_DATA_MODULES 가
  // 목록이 아니라 **분류표**로 남게 하는 장치다(CLAUDE.md 원칙 10).
  //
  // 검사 대상은 실제로 어떤 라우트의 그래프에 들어온 파일뿐이다 — 어느 페이지도 import 하지 않는
  // 모듈의 파일 읽기는 사이트맵 서명에 영향이 없는데 그것까지 막으면 관계없는 변경이 빌드를 세운다.
  function assertRuntimeDataModulesAreClassified() {
    const undeclared = [];
    for (const rel of visitedFiles) {
      if (RUNTIME_DATA_MODULES.has(rel)) continue;
      if (!/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(rel)) continue;
      if (RUNTIME_READ_RE.test(readNormalized(rel))) undeclared.push(rel);
    }

    if (undeclared.length > 0) {
      throw new Error(
        "[sitemap-lastmod] 런타임에 파일을 읽는데 분류되지 않은 모듈이 있습니다:\n" +
          undeclared.sort().map((rel) => `  - ${rel}`).join("\n") +
          "\nimport 그래프로는 이 데이터 의존을 볼 수 없어, 내용이 바뀌어도 서명이 그대로입니다. " +
          "scripts/lib/sitemap-lastmod.mjs 의 RUNTIME_DATA_MODULES 에 서명 조각을 등록하세요.",
      );
    }
  }

  function shellSignatureParts() {
    const shellSource = readNormalized("scripts/sync-legacy-static-to-public.mjs");
    const localeSeo = sliceFunction(shellSource, "const LOCALE_SHELL_SEO = {", "[sitemap-lastmod] LOCALE_SHELL_SEO");
    return { files: ["index.html"], extras: [`locale-shell-seo:${localeSeo}`] };
  }

  function sourcesFor(pathname) {
    const standaloneShell = STANDALONE_SHELL_ROUTES.get(pathname.replace(/\/+$/, "") || "/");
    if (standaloneShell) {
      return { pageFile: standaloneShell[0], files: [...standaloneShell].sort(), extras: [] };
    }

    const page = matchAppPage(appPages, pathname, constrainedValues);
    if (!page) {
      // 루트 정적 셸 라우트: app 페이지가 없고 저장소 루트의 `<route>.html` 하나가 실체다.
      // Cloudflare Pages 가 확장자를 떼고 `/destiny-poker` 로 서빙한다(`/destiny-poker.html` 은 308).
      // 🔴 존재 확인을 반드시 거친다 — 없는 파일을 받아 주면 "미분류가 today 로 새는 것을 막는다"는
      // 이 원장의 목적이 무너진다. 파일이 없으면 아래 throw 로 그대로 떨어진다.
      const flatShell = `${pathname.replace(/^\/+|\/+$/g, "")}.html`;
      if (flatShell !== ".html" && existsSync(resolve(rootDir, flatShell))) {
        return { pageFile: flatShell, files: [flatShell], extras: [] };
      }
      throw new Error(
        `[sitemap-lastmod] 사이트맵 라우트 ${pathname} 를 app/**/page.* 로 해석하지 못했습니다. ` +
          "라우트 계열이 늘었다면 scripts/lib/sitemap-lastmod.mjs 의 해석기를 함께 고쳐야 합니다.",
      );
    }

    const files = closureOf([page.file]);
    const extras = [];

    if (SHELL_BACKED_PAGES.has(page.file)) {
      const shell = shellSignatureParts();
      for (const rel of shell.files) if (!files.includes(rel)) files.push(rel);
      extras.push(...shell.extras);
      files.sort();
    }

    let volatileSource = false;
    for (const [rel, entry] of RUNTIME_DATA_MODULES) {
      if (!files.includes(rel)) continue;
      extras.push(entry.id);
      if (entry.volatile) volatileSource = true;
    }

    return { pageFile: page.file, files, extras, volatileSource };
  }

  function signatureFor(pathname) {
    const { files, extras, volatileSource } = sourcesFor(pathname);
    if (volatileSource) volatileRoutes.add(pathname);
    const hash = createHash("sha256");
    for (const rel of files) {
      hash.update(rel);
      hash.update("\n");
      hash.update(readNormalized(rel));
      hash.update("\n--\n");
    }
    for (const extra of extras.sort()) {
      hash.update(extra);
      hash.update("\n--\n");
    }
    return hash.digest("hex").slice(0, 16);
  }

  const ledgerPath = resolve(rootDir, LEDGER_REL_PATH);
  let stored = {};
  if (existsSync(ledgerPath)) {
    const parsed = JSON.parse(readFileSync(ledgerPath, "utf8"));
    stored = parsed && typeof parsed.routes === "object" && parsed.routes ? parsed.routes : {};
  }

  // 원장 항목이 없을 때만 참고한다 — 최초 도입과 원장 유실을 지금 커밋된 사이트맵에서 복구하기
  // 위한 것이다. 서명이 어긋난 경우에는 보지 않는다(그건 진짜로 바뀐 것이므로 오늘이 맞다).
  const previousLastmod = new Map();
  if (previousSitemapPath && existsSync(previousSitemapPath)) {
    const xml = readFileSync(previousSitemapPath, "utf8");
    const entryRe = /<loc>[^<]*?:\/\/[^/]+([^<]*)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>/g;
    let match;
    while ((match = entryRe.exec(xml)) !== null) previousLastmod.set(match[1] || "/", match[2].trim());
  }

  const stats = { kept: 0, updated: 0, seeded: 0 };

  return {
    /** 이 라우트에 쓸 lastmod. 해석 불가 라우트는 던진다(fail-closed). */
    lastmodFor(pathname) {
      if (decided.has(pathname)) return decided.get(pathname).lastmod;

      const signature = signatureFor(pathname);
      const previous = stored[pathname];
      let lastmod;
      // 🔴 매일 바뀌는 데이터를 읽는 라우트는 서명이 그대로여도 내용이 달라졌다. 예전에는 서명에
      // 날짜를 섞어 이 분기를 우회했는데, 그 부작용이 원장의 매일 드리프트였다. 이제 명시적으로 판단한다.
      if (volatileRoutes.has(pathname)) {
        // 🔴 휘발성 라우트만 **KST** 달력 날짜를 쓴다. 이 라우트의 콘텐츠 날짜는 운세 발행이
        // 정하고 그 기준은 KST 다(scripts/lib/fortune-date.mjs). 발행 빌드는 00:20 KST
        // = 15:20 UTC 전날에 도는데 여기서 UTC 를 쓰면, 08-28 자 본문을 실은 사이트맵이
        // lastmod=08-27 로 신고한다 — 매일 하루 낡은 신선도를 구글에 보내는 셈이다(2026-08-28 실측).
        // 나머지 라우트는 "콘텐츠 날짜" 라는 개념이 없으므로 그대로 today(UTC)를 쓴다.
        lastmod = volatileToday;
        stats.updated += 1;
      } else if (previous && previous.signature === signature && /^\d{4}-\d{2}-\d{2}$/.test(previous.lastmod || "")) {
        lastmod = previous.lastmod;
        stats.kept += 1;
      } else if (!previous && previousLastmod.has(pathname)) {
        lastmod = previousLastmod.get(pathname);
        stats.seeded += 1;
      } else {
        lastmod = today;
        stats.updated += 1;
      }

      decided.set(pathname, { signature, lastmod });
      return lastmod;
    },

    /**
     * 매일 바뀌는 런타임 데이터를 읽어 lastmod 가 날마다 올라가는 라우트.
     * 드리프트 검사가 이 라우트의 lastmod 만 정규화해 비교한다(서명은 그대로 비교한다).
     */
    volatileRoutes() {
      return new Set(volatileRoutes);
    },

    /** 사이트맵에 실제로 실린 라우트만 남겨 원장을 다시 쓴다. */
    /**
     * 원장을 확정한다.
     * @param {{ dryRun?: boolean }} [options] dryRun 이면 파일을 쓰지 않고 내용만 돌려준다 —
     *   generate-sitemap 의 --check 모드가 작업 트리를 건드리지 않고 비교하기 위해 쓴다.
     *   검사(미분류 런타임 데이터·풀리지 않는 import)는 dryRun 에서도 그대로 돈다.
     */
    save(options) {
      assertRuntimeDataModulesAreClassified();

      if (unresolvedImports.length > 0) {
        throw new Error(
          "[sitemap-lastmod] 로컬 import 를 풀지 못했습니다(서명이 조용히 부실해집니다):\n" +
            [...new Set(unresolvedImports)].map((line) => `  - ${line}`).join("\n"),
        );
      }

      const routes = {};
      for (const pathname of [...decided.keys()].sort()) {
        const { signature, lastmod } = decided.get(pathname);
        routes[pathname] = { signature, lastmod };
      }

      const payload = {
        version: 1,
        note:
          "사이트맵 lastmod 원장. scripts/lib/sitemap-lastmod.mjs 가 라우트별 소스 서명을 계산해 " +
          "다시 쓴다. 손으로 고치지 말고 npm run sitemap:generate 로 갱신할 것.",
        routes,
      };
      const serialized = `${JSON.stringify(payload, null, 2)}\n`;
      if (!options?.dryRun) writeFileSync(ledgerPath, serialized, "utf8");
      return { path: LEDGER_REL_PATH, count: Object.keys(routes).length, serialized };
    },

    summary() {
      return { ...stats };
    },

    /** 진단용 — 특정 라우트가 어떤 소스로 해석됐는지 본다. */
    explain(pathname) {
      return sourcesFor(pathname);
    },
  };
}

/**
 * 정적 셸 자산의 캐시 키(?v=)를 **자산별 내용 해시**로 계산하는 정본.
 *
 * 왜 (2026-09-12 실측) — 그 전까지 sync-legacy-static-to-public.mjs 는 `?v=` **전부**를
 * 전역 키 하나로 덮었고, 그 키는 `index.html` + `js/**` + `styles/**` **전체**의 해시였다.
 * 그래서 js 파일 한 줄만 고쳐도 index.html 의 토큰 94개가 동시에 바뀌었다:
 *   · index.html 최근 25커밋 중 **10건(40%)이 실내용 0줄인데 92줄 변경**
 *   · 내용이 있는 커밋도 매번 92줄이 덤으로 얹혔다(실내용 6줄 → raw 98줄)
 *   · 미러 7개가 같이 흔들려 커밋당 약 736줄
 * 리뷰에서 진짜 변경이 묻히고, 리베이스마다 충돌이 났다.
 *
 * 게다가 캐시 정합 면에서도 손해였다 — 무관한 파일 한 줄 때문에 **전 자산의 엣지·브라우저
 * 캐시가 통째로 무효화**됐다.
 *
 * 해법은 이 레포에 이미 두 번 있던 것을 일반화한 것이다(CLAUDE.md 원칙 6·15):
 *   · scripts/lib/root-asset-cache-keys.mjs — 루트 bare 자산(`h<hex>`)
 *   · resolveMobileInteractionPatchCacheKey — mobile-interaction-patch.js 한 개
 * 둘 다 "바뀔 때만 URL 을 바꾼다"는 같은 이유로 내용 해시를 쓴다.
 *
 * 🔴 정규화 후 해싱하는 이유(순환 차단)는 root-asset-cache-keys.mjs 와 같다. 참조를 다시 쓰면
 *    그 파일의 해시가 바뀌고, 그러면 그 파일을 가리키는 참조가 또 바뀌는 무한 루프가 된다.
 *    `?v=` 값을 자리표시자로 치환한 뒤 해싱하면 고리가 끊긴다 — 그래서 결과가 고정점이고
 *    `verify:public-mirror-fresh` 의 멱등성 전제가 유지된다.
 *
 * 🔴 루트 정본으로 통일해 해싱한다. `public/js/core/uiBindings.js` 를 처리할 때도 `/js/foo.js`
 *    는 루트의 `js/foo.js` 로 푼다. 그래야 루트와 미러가 **같은 키**를 얻어
 *    `verify:runtime-cache-sync` 의 "같은 자산은 모든 셸에서 같은 값" 검사를 만족한다.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { posix, resolve } from "node:path";
import { normalizeAssetForHash } from "./root-asset-cache-keys.mjs";

/**
 * 내용 해시를 계산할 수 있어야 하는 확장자. 이 확장자인데 레포에서 파일을 못 찾으면
 * **세운다** — 조용히 전역 키로 흘려보내면 이 모듈이 없애려는 요동이 그대로 돌아온다
 * (CLAUDE.md 원칙 10: 미분류를 조용히 통과시키지 않는다).
 */
const MUST_RESOLVE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".css", ".json"]);

/**
 * 레포에 파일이 없는 것이 정상인 확장자 — 이미지는 R2/CDN 배포분이라 소스 트리에 없다.
 *
 * 🔴 이미지의 `?v=` 회전은 **의도된 장치**다. index.html 주석이 "새 일러스트가 오면 같은
 *    경로에 덮어쓰고 sync:public 만 돌린다(?v= 는 sync 가 build 키로 다시 쓴다)" 라고
 *    못 박았다. 그래서 이미지는 고정하지 않고 지금처럼 전역 빌드 키를 그대로 쓴다.
 */
const CDN_ASSET_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".avif", ".ico"]);

/** 참조 경로에서 확장자를 뽑는다(소문자). 쿼리·프래그먼트는 호출부가 이미 뗀 상태다. */
function extensionOf(refPath) {
  const match = /\.[A-Za-z0-9]+$/.exec(refPath);
  return match ? match[0].toLowerCase() : "";
}

function stripBom(text) {
  return String(text).replace(/^\uFEFF+/, "");
}

/**
 * 참조 경로를 레포 상대 경로 후보로 바꾼다.
 *
 * 반환 kind:
 *   external — 프로토콜 상대(`//`)·절대 URL. 레포 파일이 아니다.
 *   bare     — 디렉터리 없는 파일명. 루트 bare 자산이라 syncRootAssetCacheKeys 가 소유한다.
 *   path     — 레포에서 찾아볼 경로 후보들.
 */
function classifyRef(refPath, fromRel) {
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(refPath)) return { kind: "external" };

  if (refPath.startsWith("/")) {
    const rel = refPath.slice(1);
    // 웹 루트는 배포 시 public/ 이지만 레포 정본은 루트다. 루트를 먼저 본다.
    return { kind: "path", candidates: [rel, posix.join("public", rel)] };
  }

  if (refPath.startsWith("./") || refPath.startsWith("../")) {
    // 상대 지정자는 자기 파일 기준이다. fromRel 은 루트 정본 기준 경로다.
    const joined = posix.normalize(posix.join(posix.dirname(toPosix(fromRel)), refPath));
    const stripped = joined.startsWith("public/") ? joined.slice("public/".length) : joined;
    return { kind: "path", candidates: [stripped, joined] };
  }

  return { kind: "bare" };
}

function toPosix(value) {
  return String(value).split("\\").join("/");
}

/**
 * 자산별 캐시 키 계산기.
 *
 * @param {string} rootDir 레포 루트
 * @returns {{ resolve(refPath: string, fromRel: string): { kind: string, key?: string } }}
 */
export function createAssetCacheKeys(rootDir) {
  const keyCache = new Map();

  function keyForRepoRel(rel) {
    if (keyCache.has(rel)) return keyCache.get(rel);
    const normalized = normalizeAssetForHash(stripBom(readFileSync(resolve(rootDir, rel), "utf8")));
    const key = `build-${createHash("sha256").update(normalized).digest("hex").slice(0, 12)}`;
    keyCache.set(rel, key);
    return key;
  }

  return {
    /**
     * 이 참조에 쓸 캐시 키를 정한다.
     *
     * kind:
     *   resolved — `key` 를 쓴다(자산 내용 해시).
     *   fallback — 전역 빌드 키를 쓴다(이미지·외부 URL). 지금까지의 동작 그대로다.
     *   keep     — 값을 건드리지 않는다(루트 bare 자산 — syncRootAssetCacheKeys 소유).
     *
     * 내용 해시가 **가능해야 하는** 확장자인데 파일을 못 찾으면 던진다.
     */
    resolve(refPath, fromRel) {
      const classified = classifyRef(refPath, fromRel);
      if (classified.kind === "bare") return { kind: "keep" };
      if (classified.kind === "external") return { kind: "fallback" };

      for (const candidate of classified.candidates) {
        if (existsSync(resolve(rootDir, candidate))) {
          return { kind: "resolved", key: keyForRepoRel(candidate) };
        }
      }

      const ext = extensionOf(refPath);
      if (CDN_ASSET_EXTENSIONS.has(ext)) return { kind: "fallback" };
      if (MUST_RESOLVE_EXTENSIONS.has(ext)) {
        throw new Error(
          `[asset-cache-keys] ${fromRel} 의 참조 ${refPath} 를 레포 파일로 풀지 못했습니다.\n` +
            `  찾아본 경로: ${classified.candidates.join(", ")}\n` +
            "  이 확장자는 내용 해시로 캐시 키를 계산해야 합니다. 파일이 옮겨졌다면 참조를 고치고,\n" +
            "  레포 밖(R2/CDN)에서 서빙하는 자산이라면 scripts/lib/asset-cache-keys.mjs 의\n" +
            "  분류표에 등록하세요 — 미분류를 조용히 통과시키면 캐시 키가 무의미해집니다.",
        );
      }

      throw new Error(
        `[asset-cache-keys] ${fromRel} 의 참조 ${refPath} 는 확장자 "${ext || "(없음)"}" 가 ` +
          "분류되지 않았습니다. scripts/lib/asset-cache-keys.mjs 의 MUST_RESOLVE_EXTENSIONS 또는 " +
          "CDN_ASSET_EXTENSIONS 에 등록하세요.",
      );
    },
  };
}

/**
 * 소스의 `?v=` 값을 자산별 키로 다시 쓴다.
 *
 * 🔴 값이 빈 `?v=`(예: `src.indexOf('index-inline-runtime.js?v=')` 같은 **탐지 코드**)는
 *    `[a-zA-Z0-9_-]+` 가 요구하는 최소 1자를 만족하지 못해 구조적으로 매치되지 않는다.
 *    예전 전역 치환도 같은 형태라 동작이 바뀌지 않는다.
 *
 * 경로는 `?v=` 바로 앞에서 따옴표·공백·괄호·꺾쇠를 만날 때까지 뒤로 훑는다. 한글 파일명이
 * 있으므로 문자 클래스를 화이트리스트로 좁히지 않는다(좁히면 경로가 중간에서 잘린다).
 *
 * @param {string} source 원본 텍스트
 * @param {string} fromRel 이 소스의 루트 정본 기준 경로(상대 지정자 해석용)
 * @param {string} fallbackKey 이미지·외부 URL 에 쓸 전역 빌드 키
 * @param {{ resolve(refPath: string, fromRel: string): { kind: string, key?: string } }} keys
 */
export function restampAssetCacheRefs(source, fromRel, fallbackKey, keys) {
  return String(source || "").replace(
    /([^"'`\s<>()]+?)\?v=([a-zA-Z0-9_-]+)/g,
    (match, refPath, currentValue) => {
      const verdict = keys.resolve(refPath, fromRel);
      if (verdict.kind === "keep") return `${refPath}?v=${currentValue}`;
      const next = verdict.kind === "resolved" ? verdict.key : fallbackKey;
      return `${refPath}?v=${next}`;
    },
  );
}

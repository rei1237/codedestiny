/**
 * 루트 bare 정적 자산의 캐시 키(?v=) 계산·재작성 정본.
 *
 * 왜 필요한가 — 2026-08-08 장애:
 *   `AnalysisEngine.js` 는 디렉터리 없는 **bare 파일명**으로 로더에 박혀 있는데,
 *   sync-legacy-static-to-public.mjs 의 캐시버스트 정규식 두 개는 각각 `\/js\/` 와
 *   `js\/` 를 강제해서 bare 참조에 **구조적으로 매치되지 않았다**. 그래서 파일을 고쳐
 *   배포해도 URL 이 그대로였고, `_headers` 의 `/*.js` 가 엣지에 max-age=604800(7일)을
 *   걸어 두어 전생 관상이 4시간 넘게 깨진 구버전 엔진을 받았다
 *   (`TypeError: this.analyzeFaceShape is not a function`).
 *
 * 왜 빌드 SHA 가 아니라 파일 내용 해시인가:
 *   빌드 SHA 를 쓰면 커밋마다 URL 이 바뀌어 210KB 짜리 엔진 캐시가 매 배포마다
 *   무의미하게 날아간다. 내용 해시는 **바뀔 때만** URL 을 바꾼다.
 *
 * 왜 정규화 후 해싱하는가 (순환 차단):
 *   PhysiognomyUI.js 가 PastLifeFaceUI.js?v= 를 참조한다. 정규화 없이 해싱하면
 *   참조를 다시 쓸 때 PhysiognomyUI.js 의 해시가 바뀌고, 그러면 그 파일을 가리키는
 *   다른 참조가 또 바뀌는 무한 루프가 된다. `?v=` 값을 placeholder 로 치환한 뒤
 *   해싱하면 이 고리가 끊긴다.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** 웹 루트에서 bare 파일명으로 로드되는 자산. 순서는 보고 출력용. */
export const ROOT_BARE_CACHE_ASSETS = [
  "AnalysisEngine.js",
  "PhysiognomyUI.js",
  "PastLifeFaceUI.js",
  "HwatuFortune.js",
];

/** 이 파일들 안의 참조가 캐시 키 재작성 대상이다. 루트 기준 상대 경로. */
export const ROOT_ASSET_REF_FILES = [
  "js/core/uiBindings.js",
  "js/core/index-inline-runtime.js",
  "js/mobile-interaction-patch.js",
  "js/mobile-performance-bootstrap.js",
  "PhysiognomyUI.js",
  "public/js/core/uiBindings.js",
  "public/js/core/index-inline-runtime.js",
  "public/js/mobile-interaction-patch.js",
  "public/js/mobile-performance-bootstrap.js",
  "public/PhysiognomyUI.js",
];

const CACHE_QUERY_RE = /\?v=[a-zA-Z0-9_-]+/g;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripBom(buffer) {
  let offset = 0;
  while (offset + 2 < buffer.length && buffer[offset] === 0xef && buffer[offset + 1] === 0xbb && buffer[offset + 2] === 0xbf) {
    offset += 3;
  }
  return offset > 0 ? buffer.subarray(offset) : buffer;
}

/** `?v=` 값과 개행을 정규화해 캐시 키 계산이 자기 자신에 영향받지 않게 한다. */
export function normalizeAssetForHash(content) {
  return String(content || "")
    .replace(CACHE_QUERY_RE, "?v=__CACHE_KEY__")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

/** 파일 내용 해시로 캐시 키를 만든다. 파일이 없으면 빈 문자열. */
export function computeRootAssetCacheKey(rootDir, fileName) {
  const abs = resolve(rootDir, fileName);
  if (!existsSync(abs)) return "";
  const normalized = normalizeAssetForHash(stripBom(readFileSync(abs)).toString("utf8"));
  return `h${createHash("sha256").update(normalized).digest("hex").slice(0, 12)}`;
}

/** 자산명 → 캐시 키 맵. */
export function computeRootAssetCacheKeys(rootDir) {
  const keys = {};
  for (const name of ROOT_BARE_CACHE_ASSETS) {
    const key = computeRootAssetCacheKey(rootDir, name);
    if (key) keys[name] = key;
  }
  return keys;
}

/**
 * 참조 매칭 정규식.
 *
 * **따옴표로 완전히 감싼 문자열 리터럴만** 대상으로 한다. 처음에는 파일명만 느슨하게
 * 매치했더니 주석 안의 "PastLifeFaceUI.js 를 먼저 로드했을 수 있다" 같은 산문에도
 * `?v=` 를 붙여 버렸다. 로더는 예외 없이 `'AnalysisEngine.js?v=…'` 형태의 완결된
 * 문자열로 참조하므로 따옴표를 앵커로 쓰면 산문이 구조적으로 배제된다.
 *
 * 선행 `/` 는 허용한다(`'/HwatuFortune.js'`). 그 앞에 다른 경로 세그먼트가 붙은
 * `'public/AnalysisEngine.js'` 는 여는 따옴표 바로 뒤가 아니므로 매치되지 않는다.
 */
function refPattern(fileName) {
  return new RegExp(`(['"\`])(\\/?${escapeRegExp(fileName)})(\\?v=[a-zA-Z0-9_-]+)?\\1`, "g");
}

/** 소스 안의 자산 참조를 최신 캐시 키로 다시 쓴다. `?v=` 가 없던 참조에는 새로 붙인다. */
export function rewriteRootAssetCacheRefs(source, keys) {
  let output = String(source || "");
  for (const name of ROOT_BARE_CACHE_ASSETS) {
    const key = keys[name];
    if (!key) continue;
    output = output.replace(refPattern(name), (_match, quote, path) => `${quote}${path}?v=${key}${quote}`);
  }
  return output;
}

/**
 * 소스에서 자산 참조와 그 `?v=` 값을 수집한다(검증용).
 * @returns {Array<{asset: string, version: string}>}
 */
export function collectRootAssetCacheRefs(source) {
  const found = [];
  const text = String(source || "");
  for (const name of ROOT_BARE_CACHE_ASSETS) {
    for (const match of text.matchAll(refPattern(name))) {
      found.push({ asset: name, version: match[3] ? match[3].slice(3) : "" });
    }
  }
  return found;
}

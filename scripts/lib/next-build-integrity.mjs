/**
 * next build 를 감싸는 매니페스트 가드가 **Next 가 방금 쓴 매니페스트를 덮어쓰지 않도록**
 * 하는 판정과, export 결과가 커스텀 404 인지 보는 판정. 둘 다 순수 함수라 테스트된다.
 *
 * ── 왜 이 파일이 생겼는가 (2026-08-22 run 32584030242) ─────────────────────────
 * 스테이징 배포가 `[adsense-readiness] out/404.html: framework default 404 was exported
 * instead of the custom page` 로 죽었다. 같은 커밋의 PR CI 는 **트리가 완전히 동일한데**
 * (76aef063d) 초록불이었다 — 즉 코드 결함이 아니라 빌드 레이스다.
 *
 * `404: This page could not be found` 라는 문자열은 리포 어디에도 없고, Next 의
 * `pages/_error.js` 가 `<title>{statusCode}: {title}</title>` 로 만드는 것뿐이다. 즉
 * `out/404.html` 이 `pages/404.tsx` 가 아니라 `_error` 로 렌더된 것이다.
 *
 * 그 일이 벌어지는 경로:
 *   - Next 는 `.next/server/pages-manifest.json` 을 webpack 컴파일 직후 **딱 한 번**
 *     읽어(next/dist/build/index.js 의 `let pagesManifest = await readManifest(...)`)
 *     빌드가 끝날 때까지 메모리에 들고 간다. 다시 디스크에 쓰는 것은 export 가 **끝난 뒤**다.
 *   - 그 매니페스트에 `/404` 가 없으면 404 페이지는 `/_error` 로 렌더된다.
 *   - 그런데 Next 도 우리 가드도 이 파일을 `writeFile`(= truncate 후 쓰기)로 쓴다.
 *     25ms 폴링 가드가 그 truncate 창에서 읽으면 JSON 파싱이 깨지는데, 예전 코드는
 *     그것을 **빈 객체로 접었다.** 빈 객체를 기준으로 merged 를 만들면 `/404` 가 빠진
 *     부분 매니페스트가 되고, 가드가 그것을 디스크에 도로 써서 Next 의 정본을 덮는다.
 *   - 그 상태로 위의 "딱 한 번 읽기" 가 지나가면 그 빌드는 끝까지 `/404` 를 모른다.
 *
 * 창이 좁아(다음 25ms 틱이 대개 복구한다) 100런에 1건 꼴로만 터졌고, 그래서 원인이 아니라
 * "가끔 나는 배포 실패" 로 남아 있었다.
 */

const FRAMEWORK_DEFAULT_NOT_FOUND = "404: This page could not be found";

/** 매니페스트를 못 읽은 상태. 🔴 이것을 "비어 있다" 와 같게 다루면 위의 사고가 그대로 난다. */
export const MANIFEST_UNREADABLE = Symbol("manifest-unreadable");

/**
 * 매니페스트 JSON 을 읽되 **없음 / 못 읽음 / 정상** 세 가지를 구분해 돌려준다.
 *
 * - 파일이 없다  → `{}`  (가드가 씨앗을 심어도 되는 상태. 아직 아무도 안 썼다)
 * - 못 읽었다    → `MANIFEST_UNREADABLE` (쓰는 중일 수 있다. **이번 틱은 손대지 않는다**)
 * - 정상         → 파싱된 객체
 *
 * @param {string} filePath
 * @param {{ exists: (p: string) => boolean, read: (p: string) => string }} io
 */
export function readManifestObject(filePath, io) {
  if (!io.exists(filePath)) return {};
  let raw;
  try {
    raw = io.read(filePath);
  } catch {
    return MANIFEST_UNREADABLE;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    return MANIFEST_UNREADABLE;
  } catch {
    return MANIFEST_UNREADABLE;
  }
}

/**
 * export 된 404 가 프레임워크 기본 404 인가.
 *
 * 판정 문자열은 verify-adsense-readiness.mjs 의 게이트와 **같은 것**을 쓴다. 여기서 다른
 * 문자열을 쓰면 빌드는 통과시키고 배포 게이트만 막는, 가장 늦게 알게 되는 조합이 된다.
 */
export function isFrameworkDefaultNotFound(html) {
  return String(html || "").includes(FRAMEWORK_DEFAULT_NOT_FOUND);
}

export function selfTestNextBuildIntegrity() {
  const io = (files) => ({
    exists: (p) => Object.prototype.hasOwnProperty.call(files, p),
    read: (p) => {
      const value = files[p];
      if (value instanceof Error) throw value;
      return value;
    },
  });

  const cases = [
    [readManifestObject("/a.json", io({})), "absent", "파일이 없으면 빈 객체"],
    [readManifestObject("/a.json", io({ "/a.json": '{"/404":"pages/404.js"}' })), "ok", "정상 JSON 은 그대로"],
    // 🔴 이 세 줄이 이 모듈의 존재 이유다. 전부 예전에는 {} 로 접혀서 Next 의 매니페스트를 덮었다.
    [readManifestObject("/a.json", io({ "/a.json": '{"/404":"pages/4' })), "unreadable", "쓰는 중이라 잘린 JSON 은 '못 읽음'"],
    [readManifestObject("/a.json", io({ "/a.json": "" })), "unreadable", "빈 파일(truncate 직후)도 '못 읽음'"],
    [readManifestObject("/a.json", io({ "/a.json": "[]" })), "unreadable", "배열은 매니페스트가 아니다"],
    [readManifestObject("/a.json", io({ "/a.json": "null" })), "unreadable", "null 도 매니페스트가 아니다"],
    [readManifestObject("/a.json", io({ "/a.json": new Error("EBUSY") })), "unreadable", "읽기 자체가 실패해도 '못 읽음'"],
  ];

  const label = (value) => {
    if (value === MANIFEST_UNREADABLE) return "unreadable";
    if (value && typeof value === "object" && Object.keys(value).length === 0) return "absent";
    return "ok";
  };
  for (const [actual, expected, reason] of cases) {
    if (label(actual) !== expected) throw new Error(`next-build-integrity self-test 실패: ${reason}`);
  }

  const notFoundCases = [
    [isFrameworkDefaultNotFound("<title>404: This page could not be found</title>"), true, "기본 404 를 잡는다"],
    [isFrameworkDefaultNotFound("<title>페이지를 찾을 수 없습니다 | Code Destiny</title>"), false, "커스텀 404 는 통과"],
    [isFrameworkDefaultNotFound(""), false, "빈 문자열은 기본 404 가 아니다"],
    [isFrameworkDefaultNotFound(null), false, "null 도 던지지 않는다"],
  ];
  for (const [actual, expected, reason] of notFoundCases) {
    if (actual !== expected) throw new Error(`next-build-integrity self-test 실패: ${reason}`);
  }

  return cases.length + notFoundCases.length;
}

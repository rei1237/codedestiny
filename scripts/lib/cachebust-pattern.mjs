/**
 * 캐시버스트 토큰 정규화 — merge driver·수동 해결기·가드가 공유하는 단일 정의.
 *
 * sync:public 이 찍는 형식이 둘이다:
 *   1) `build-<hex>`  — 대부분의 /js/** 자산 (resolveDeterministicCacheKey)
 *   2) `?v=h<hex>`    — 루트 bare 자산(HwatuFortune.js, AnalysisEngine.js 등,
 *                       syncRootAssetCacheKeys. 디렉터리가 없어 1번 규칙에 안 걸린다)
 *
 * 하나만 덮으면 나머지 형식의 충돌이 "실제 내용 차이"로 오인돼 그대로 남는다.
 * 실제로 2번을 빠뜨려 HwatuFortune.js 한 줄 때문에 훅 전체가 수동 해결 대상이 됐다.
 *
 * 🔴 자리표시자는 **접두사를 보존**한다(`build-` / `?v=h`). 접두사까지 지우면 복원할 때
 * `/HwatuFortune.js` + `build-xxxx` 처럼 붙어 파일이 깨진다.
 *
 * 판정은 보수적이다 — 16진수 6자리 이상만 캐시버스트로 본다. 사람이 쓴 `?v=2` 같은 값은
 * 건드리지 않으므로 의미 있는 차이를 삼킬 수 없다.
 */

const TOKEN = "CDCACHEBUSTPLACEHOLDER";
const FALLBACK_HEX = "000000000000";

/** [정규화 정규식, 접두사] — 접두사는 자리표시자 앞에 그대로 남는다. */
const SHAPES = [
  { find: /build-[0-9a-f]{6,}/g, prefix: "build-" },
  { find: /\?v=h[0-9a-f]{6,}/g, prefix: "?v=h" },
];

/** 비교용 정규화. 캐시버스트 값만 자리표시자로 바꾸고 접두사는 남긴다. */
export function normalizeCacheBust(text) {
  let out = String(text);
  for (const { find, prefix } of SHAPES) {
    find.lastIndex = 0;
    out = out.replace(find, `${prefix}${TOKEN}`);
  }
  return out;
}

/**
 * 정규화된 텍스트의 자리표시자를 실제 토큰으로 되돌린다.
 * donors 순서대로 같은 모양의 실제 토큰을 찾아 쓴다(보통 ours → theirs).
 * 어디에도 없으면 고정 hex 로 채운다 — 다음 `npm run sync:public` 이 내용 기준으로 다시 찍는다.
 */
export function restampCacheBust(text, donors = []) {
  let out = String(text);
  for (const { find, prefix } of SHAPES) {
    let replacement = null;
    for (const donor of donors) {
      find.lastIndex = 0;
      const found = String(donor || "").match(find);
      if (found && found.length) {
        replacement = found[0];
        break;
      }
    }
    out = out.split(`${prefix}${TOKEN}`).join(replacement || `${prefix}${FALLBACK_HEX}`);
  }
  return out;
}

/** 텍스트에 캐시버스트 토큰이 있는지. */
export function hasCacheBust(text) {
  return SHAPES.some(({ find }) => {
    find.lastIndex = 0;
    return find.test(String(text));
  });
}

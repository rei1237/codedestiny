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

/** 정규식 특수문자 이스케이프 — 자리표시자 접두사 `?v=h` 에 `?` 가 들어 있다. */
function escapeForRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 실제 토큰을 형식 구분 없이 등장 순서대로 훑는다. */
const TOKEN_SCAN = new RegExp(SHAPES.map(({ find }) => find.source).join("|"), "g");

/** 자리표시자를 등장 순서대로 훑는다. TOKEN_SCAN 과 형식 순서가 같다. */
const PLACEHOLDER_SCAN = new RegExp(
  SHAPES.map(({ prefix }) => escapeForRegExp(`${prefix}${TOKEN}`)).join("|"),
  "g",
);

function tokensInOrder(line) {
  TOKEN_SCAN.lastIndex = 0;
  return line.match(TOKEN_SCAN) || [];
}

/**
 * 정규화된 텍스트의 자리표시자를 실제 토큰으로 되돌린다.
 *
 * 🔴 **자리마다 제 토큰을 되돌린다 — 형식별로 하나를 골라 덮어쓰지 않는다.** 예전에는
 * 형식마다 donor 에서 토큰 하나(`found[0]`)를 골라 그 형식의 자리표시자 전부에 썼다.
 * 그래서 한 파일에 서로 다른 해시가 여럿이면(`PhysiognomyUI.js?v=hfe1d…` ·
 * `HwatuFortune.js?v=h9ee7…`) 전부 첫 값으로 붕괴했고, 관상·전생·화투 스크립트가 틀린
 * 캐시키로 요청됐다. 2026-09-02 에 rebase 5건에서 매번 12건씩 재현됐고
 * `npm run verify:static-asset-cache-keys` 가 잡아 냈다(그 가드는 CI 미배선이었다).
 *
 * 방식: **정규화된 줄이 열쇠다.** donor 에서 같은 줄을 찾아 그 줄의 토큰을 자리 순서대로
 * 되돌린다. 열쇠가 줄 전체라 자리 수가 항상 맞는다. donors 는 앞선 것이 이긴다
 * (보통 ours → theirs → base).
 *
 * 줄을 못 찾으면 그 형식의 첫 토큰으로, 그것도 없으면 고정 hex 로 채운다 — 어차피 다음
 * `npm run sync:public` 이 내용 기준으로 다시 찍는다.
 */
export function restampCacheBust(text, donors = []) {
  const out = String(text);
  if (!out.includes(TOKEN)) return out;

  // 정규화된 줄 → 그 줄의 실제 토큰(등장 순서).
  const byLine = new Map();
  for (const donor of donors) {
    for (const line of String(donor || "").split("\n")) {
      const tokens = tokensInOrder(line);
      if (!tokens.length) continue;
      const key = normalizeCacheBust(line);
      if (!byLine.has(key)) byLine.set(key, tokens);
    }
  }

  // 줄을 못 찾았을 때만 쓰는 형식별 대비값.
  const fallbackByPrefix = new Map();
  for (const { find, prefix } of SHAPES) {
    let first = null;
    for (const donor of donors) {
      find.lastIndex = 0;
      const found = String(donor || "").match(find);
      if (found && found.length) {
        first = found[0];
        break;
      }
    }
    fallbackByPrefix.set(prefix, first || `${prefix}${FALLBACK_HEX}`);
  }

  return out
    .split("\n")
    .map((line) => {
      if (!line.includes(TOKEN)) return line;
      const donorTokens = byLine.get(line) || [];
      let slot = 0;
      PLACEHOLDER_SCAN.lastIndex = 0;
      return line.replace(PLACEHOLDER_SCAN, (placeholder) => {
        const token = donorTokens[slot++];
        if (token) return token;
        const prefix = placeholder.slice(0, placeholder.length - TOKEN.length);
        return fallbackByPrefix.get(prefix) || `${prefix}${FALLBACK_HEX}`;
      });
    })
    .join("\n");
}

/** 텍스트에 캐시버스트 토큰이 있는지. */
export function hasCacheBust(text) {
  return SHAPES.some(({ find }) => {
    find.lastIndex = 0;
    return find.test(String(text));
  });
}

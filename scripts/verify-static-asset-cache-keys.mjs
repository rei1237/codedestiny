/**
 * 루트 bare 정적 자산의 캐시 키(?v=) 정합 검증.
 *
 * 막으려는 사고 — 2026-08-08 전생 관상 장애:
 *   AnalysisEngine.js 의 내용을 고쳐 배포했는데 로더의 `?v=20260606-physio-accuracy`
 *   가 그대로라 URL 이 안 바뀌었다. `_headers` 의 `/*.js` 가 엣지에 max-age=604800(7일)을
 *   걸어 두어 4시간 넘게 깨진 구버전이 서빙됐고, 사용자는
 *   `TypeError: this.analyzeFaceShape is not a function` 만 봤다.
 *
 *   원인은 사람의 실수가 아니라 구조였다 — 이 자산들은 디렉터리 없는 bare 파일명이라
 *   sync 스크립트의 `\/js\/`·`js\/` 정규식에 애초에 매치되지 않았다. 배포 후 검증
 *   (verify-deployed-assets.mjs)도 HTTP 200 여부만 보므로 "엣지 캐시된 stale 200" 은
 *   설계상 대상 밖이었다. 즉 어떤 게이트도 이걸 못 잡았다.
 *
 * 이 스크립트가 그 빈틈이다: 파일 내용 해시와 모든 참조의 ?v= 값이 어긋나면 실패한다.
 * 고치는 법은 `npm run sync:public` 한 줄이다(자동으로 맞춰 준다).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT_ASSET_REF_FILES,
  ROOT_BARE_CACHE_ASSETS,
  collectRootAssetCacheRefs,
  computeRootAssetCacheKeys,
} from "./lib/root-asset-cache-keys.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const keys = computeRootAssetCacheKeys(root);

// 자산 파일 자체가 존재해야 한다 — 이름이 바뀌면 이 목록도 같이 고쳐야 한다는 신호.
for (const asset of ROOT_BARE_CACHE_ASSETS) {
  assert.ok(
    existsSync(resolve(root, asset)),
    `${asset} 이 웹 루트에 없습니다. 파일을 옮겼다면 scripts/lib/root-asset-cache-keys.mjs 의 ROOT_BARE_CACHE_ASSETS 도 함께 고치세요.`,
  );
  assert.ok(keys[asset], `${asset} 의 캐시 키를 계산하지 못했습니다.`);
}

const mismatches = [];
let checkedRefs = 0;

for (const relPath of ROOT_ASSET_REF_FILES) {
  const abs = resolve(root, relPath);
  if (!existsSync(abs)) continue;
  const source = readFileSync(abs, "utf8");

  for (const ref of collectRootAssetCacheRefs(source)) {
    checkedRefs += 1;
    const expected = keys[ref.asset];
    if (ref.version === expected) continue;
    mismatches.push(
      `${relPath}: ${ref.asset} 의 ?v=${ref.version || "(없음)"} 가 실제 내용 해시 ?v=${expected} 와 다릅니다`,
    );
  }
}

assert.ok(checkedRefs > 0, "자산 참조를 하나도 찾지 못했습니다 — ROOT_ASSET_REF_FILES 가 낡았을 수 있습니다.");

assert.equal(
  mismatches.length,
  0,
  [
    "정적 자산의 내용이 바뀌었는데 ?v= 캐시 키가 따라가지 않았습니다.",
    "이대로 배포하면 엣지가 최대 7일(_headers 의 /*.js max-age=604800) 동안 옛 파일을 서빙합니다.",
    "고치는 법: npm run sync:public",
    "",
    ...mismatches.map((line) => `  - ${line}`),
  ].join("\n"),
);

// 루트/public 사본의 참조가 동일해야 한다 — 한쪽만 갱신되면 배포본이 갈린다.
for (const relPath of ROOT_ASSET_REF_FILES) {
  if (relPath.startsWith("public/")) continue;
  const publicPath = `public/${relPath}`;
  const rootAbs = resolve(root, relPath);
  const publicAbs = resolve(root, publicPath);
  if (!existsSync(rootAbs) || !existsSync(publicAbs)) continue;
  assert.deepEqual(
    collectRootAssetCacheRefs(readFileSync(rootAbs, "utf8")),
    collectRootAssetCacheRefs(readFileSync(publicAbs, "utf8")),
    `${relPath} 와 ${publicPath} 의 자산 참조가 다릅니다. npm run sync:public 을 실행하세요.`,
  );
}

console.log(
  `[verify-static-asset-cache-keys] PASS — 자산 ${ROOT_BARE_CACHE_ASSETS.length}종, 참조 ${checkedRefs}건 정합 ` +
    `(${ROOT_BARE_CACHE_ASSETS.map((n) => `${n}=${keys[n]}`).join(", ")})`,
);

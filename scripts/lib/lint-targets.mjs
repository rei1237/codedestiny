/**
 * "변경 파일 중 eslint 에 넘길 것" 을 고르는 정본.
 *
 * 🔴 왜 모듈로 뺐는가 — 이 규칙이 두 곳에서 각자 살아 있으면 **PR CI 와 머지 후 배포가 서로
 * 다른 범위를 린트하게 된다.** 실제로 그랬다: PR CI 는 `npm run lint`(= `next lint`)만 돌아
 * `pages/ app/ components/ lib/ src/` 밖은 아예 보지 않는데, deploy-safe 는 변경 파일에 eslint 를
 * 직접 걸어서 `__tests__/ scripts/ worker/ js/` 까지 본다. 그래서 PR 은 초록불로 머지되고
 * 스테이징 배포가 "changed-file lint failed" 로 죽었다 (2026-08-22 run 32584789263,
 * __tests__/worker/fpti-deep-report.quality.test.js 의 no-assign-module-variable).
 *
 * 사람이 볼 수 있는 증상은 그 다음 스텝의 "SHA 불일치" 하나뿐이라, 원인까지 도달하는 데
 * 로그를 한참 거슬러 올라가야 했다.
 */

import fs from "node:fs";
import path from "node:path";

const LINTABLE = /\.(c|m)?js$|\.(c|m)?tsx?$/;

/**
 * @param {string[]} files 변경 파일 목록(리포 루트 기준 상대 경로)
 * @param {{ root?: string, exists?: (absolutePath: string) => boolean }} [options]
 * @returns {string[]} eslint 에 그대로 넘길 수 있는 경로들
 *
 * 🔴 존재 여부를 반드시 확인한다. `git diff --name-only` 는 삭제된 파일도 이름을 내놓는데,
 * 없는 경로를 eslint 에 넘기면 "No files matching the pattern" 으로 exit 2 가 나고
 * 게이트가 통째로 막힌다(파일을 지운 PR 마다 재현된다).
 */
export function lintTargets(files, options = {}) {
  const root = options.root || process.cwd();
  const exists = options.exists || ((absolutePath) => fs.existsSync(absolutePath));
  return (files || [])
    .map((file) => String(file || "").trim())
    .filter(Boolean)
    .filter((file) => LINTABLE.test(file))
    .filter((file) => exists(path.resolve(root, file)));
}

export function selfTestLintTargets() {
  // 🔴 존재 여부 판정은 절대 경로로 한다. win32 에서 path.resolve("/repo", …) 는 드라이브
  // 문자를 붙이므로, 픽스처도 같은 방식으로 만들어야 플랫폼마다 결과가 갈리지 않는다.
  const root = "/repo";
  const present = new Set(
    ["a.ts", "b.tsx", "c.js", "d.mjs", "e.cjs"].map((file) => path.resolve(root, file)),
  );
  const exists = (absolutePath) => present.has(absolutePath);
  const run = (files) => lintTargets(files, { root, exists });

  const cases = [
    [run(["a.ts", "b.tsx", "c.js", "d.mjs", "e.cjs"]).length === 5, "린트 가능한 확장자는 전부 남는다"],
    [run(["docs/guide.md", "styles/site.css", "public/hero.webp"]).length === 0, "린트 대상이 아닌 확장자는 걸러진다"],
    [run(["deleted.ts"]).length === 0, "삭제된 파일은 eslint 에 넘기지 않는다"],
    [run(["", null, undefined]).length === 0, "빈 값은 무시한다"],
    [run(null).length === 0, "목록 자체가 없어도 던지지 않는다"],
    // 🔴 이 케이스가 이 모듈이 존재하는 이유다. next lint 가 보지 않는 경로도 대상이어야 한다.
    [lintTargets(["__tests__/x.test.js"], { root, exists: () => true }).length === 1, "__tests__ 도 린트 대상이다"],
    [lintTargets(["scripts/x.mjs"], { root, exists: () => true }).length === 1, "scripts 도 린트 대상이다"],
    [lintTargets(["worker/routes/x.js"], { root, exists: () => true }).length === 1, "worker 도 린트 대상이다"],
  ];
  for (const [ok, label] of cases) {
    if (!ok) throw new Error(`lint-targets self-test 실패: ${label}`);
  }
  return cases.length;
}

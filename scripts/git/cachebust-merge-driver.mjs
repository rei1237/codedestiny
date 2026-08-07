#!/usr/bin/env node
/**
 * 캐시버스트 해시 전용 git merge driver.
 *
 * 왜 필요한가:
 *   sync:public 이 정적 셸과 로더 JS 에 `?v=build-<content-hash>` 를 박는다. 내용이 조금이라도
 *   달라지면 해시가 통째로 바뀌므로, 서로 다른 브랜치가 같은 파일을 건드리면 그 파일의 해시 참조
 *   전부가 충돌로 잡힌다. 실제로 240개 훅이 한꺼번에 충돌했는데 내용 차이는 0건이었다.
 *   해시는 생성물이라 사람이 판단할 것이 없으므로, 여기서 정규화한 뒤 3-way 병합한다.
 *
 * 동작:
 *   1) base/ours/theirs 사본에서 build-<hex> 를 같은 자리표시자로 치환한다.
 *   2) 그 사본들로 `git merge-file` 3-way 병합을 돌린다.
 *   3) 깨끗하게 병합되면 ours 쪽 해시로 되돌려 결과를 쓰고 성공(0)으로 끝낸다.
 *      어차피 다음 `npm run sync:public` 이 내용 기준으로 다시 찍는다.
 *   4) 해시를 걷어내고도 충돌이 남으면 진짜 내용 충돌이다 — 원본으로 다시 병합해
 *      정상적인 충돌 마커를 남기고 실패(1)로 끝낸다. 즉 실제 충돌은 절대 삼키지 않는다.
 *
 * 등록: node scripts/setup-git-merge-drivers.mjs (npm install 시 prepare 로 자동 실행)
 * 사용처 지정: .gitattributes 의 `merge=cachebust`
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeCacheBust, restampCacheBust } from "../lib/cachebust-pattern.mjs";

const [basePath, oursPath, theirsPath] = process.argv.slice(2);

if (!basePath || !oursPath || !theirsPath) {
  console.error("[cachebust-merge] usage: cachebust-merge-driver.mjs <base> <ours> <theirs>");
  process.exit(1);
}

/** merge-file 은 --stdout 없이 첫 인자를 덮어쓴다. 사본을 만들어 원본을 보호한다. */
function mergeFiles(current, base, other) {
  return spawnSync("git", ["merge-file", "-L", "ours", "-L", "base", "-L", "theirs", current, base, other], {
    encoding: "utf8",
  });
}

const workDir = mkdtempSync(join(tmpdir(), "cd-cachebust-"));

try {
  const oursRaw = readFileSync(oursPath, "utf8");
  const baseRaw = readFileSync(basePath, "utf8");
  const theirsRaw = readFileSync(theirsPath, "utf8");

  const norm = {
    ours: join(workDir, "ours"),
    base: join(workDir, "base"),
    theirs: join(workDir, "theirs"),
  };
  writeFileSync(norm.ours, normalizeCacheBust(oursRaw));
  writeFileSync(norm.base, normalizeCacheBust(baseRaw));
  writeFileSync(norm.theirs, normalizeCacheBust(theirsRaw));

  const normalized = mergeFiles(norm.ours, norm.base, norm.theirs);

  if (normalized.status === 0) {
    // 캐시버스트를 뺀 상태에서 충돌이 없다 = 사람이 볼 차이가 없다.
    // ours 의 토큰으로 되돌린다(어느 쪽이든 다음 sync:public 이 내용 기준으로 다시 찍는다).
    const merged = restampCacheBust(readFileSync(norm.ours, "utf8"), [oursRaw, theirsRaw, baseRaw]);
    writeFileSync(oursPath, merged);
    process.exit(0);
  }

  // 진짜 내용 충돌 — 원본으로 다시 병합해 정상적인 충돌 마커를 남긴다.
  const real = mergeFiles(oursPath, basePath, theirsPath);
  if (real.stderr) process.stderr.write(real.stderr);
  console.error(`[cachebust-merge] 캐시버스트를 제외해도 충돌이 남았습니다: ${oursPath}`);
  process.exit(real.status === 0 ? 0 : 1);
} catch (error) {
  console.error(`[cachebust-merge] 실패: ${error && error.message}`);
  // 드라이버가 죽었다고 조용히 통과시키면 안 된다. git 기본 병합으로 넘긴다.
  const fallback = mergeFiles(oursPath, basePath, theirsPath);
  process.exit(fallback.status === 0 ? 0 : 1);
} finally {
  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch {
    /* 임시 디렉터리 정리 실패는 병합 결과에 영향이 없다 */
  }
}

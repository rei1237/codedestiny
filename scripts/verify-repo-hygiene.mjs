#!/usr/bin/env node
/**
 * 저장소 위생 가드 — 검수 산출물이 다시 추적되거나 루트에 쌓이는 것을 push 전에 막는다.
 *
 * 왜 필요한가 (2026-11-02 진단): `docs/product-details/verification/` 의 검수 PNG 가 추적돼
 * 1.16GB 를 차지했고, 루트 `outputs/` 는 무시 목록에 없어 check:fast 가 매번 미분류 critical 이
 * 됐다. 둘 다 "한 번 커밋되면 이력에 영구히 남는다"는 점에서 사후 정리로는 되돌릴 수 없다.
 *
 * 무엇을 막는가:
 *   ① 추적 중인 5MB 초과 바이너리(이미지·영상·음원·압축)
 *   ② 아직 push 하지 않은 커밋(origin/main 과의 merge-base 이후)이 docs/ 아래 PNG 를 20개 넘게 추가
 *   ③ 루트의 산출물 폴더(outputs·tmp·screenshots 등)가 무시되지 않은 채 미추적 파일을 갖고 있음
 *
 * fail-closed: git 명령이 실패하거나 비교 기준을 못 찾으면 통과시키지 않는다.
 *
 * 실행: npm run verify:repo-hygiene
 */
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";

const MAX_BINARY_BYTES = 5 * 1024 * 1024;
const MAX_NEW_DOC_PNGS = 20;
const BINARY = /\.(?:png|jpe?g|webp|gif|avif|bmp|tiff?|psd|mp4|mov|webm|mkv|avi|mp3|wav|flac|ogg|m4a|zip|7z|rar|gz|tgz)$/i;
const OUTPUT_DIR = /^(?:\.?tmp|outputs?|screenshots?|captures?|test-results|playwright-report|coverage)\/$/i;

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const failures = [];

// 크기는 작업 트리 파일로 잰다. `git ls-tree -l` 은 객체를 하나씩 풀어 15초가 걸렸다(2026-11-02 실측).
// pre-push 는 커밋 직후에 돌기 때문에 추적 파일의 작업 트리 내용은 HEAD 와 같다.
const largeBinaries = git("ls-files", "-z").split("\0").filter((file) => BINARY.test(file)).flatMap((file) => {
  let size = 0;
  try { size = statSync(file).size; } catch { return []; } // 작업 트리에서 지운 파일은 다음 커밋에서 빠진다.
  return size > MAX_BINARY_BYTES ? [`${file} (${(size / 1048576).toFixed(1)}MB)`] : [];
});
if (largeBinaries.length) failures.push(`5MB 초과 바이너리가 추적된다 — 저장소 밖(D:\\ 또는 R2)에 두고 경로만 남긴다:\n  ${largeBinaries.join("\n  ")}`);

let base;
try { base = git("merge-base", "HEAD", "origin/main").trim(); } catch (error) {
  failures.push(`origin/main 과의 merge-base 를 구하지 못했다 — git fetch origin 뒤 다시 실행한다 (${error.message.split("\n")[0]})`);
}
if (base) {
  const added = git("diff", "--name-only", "--diff-filter=A", `${base}..HEAD`, "--", "docs").split("\n").filter((file) => /\.png$/i.test(file));
  if (added.length > MAX_NEW_DOC_PNGS) failures.push(`push 전 커밋이 docs/ 아래 PNG ${added.length}개를 추가한다(한도 ${MAX_NEW_DOC_PNGS}) — 검수 스크린샷은 .tmp/ 또는 D:\\ 외부 폴더에 둔다. 예: ${added.slice(0, 3).join(", ")}`);
}

const strayDirs = git("ls-files", "--others", "--exclude-standard", "--directory").split("\n").filter((entry) => OUTPUT_DIR.test(entry));
if (strayDirs.length) failures.push(`루트 산출물 폴더가 .gitignore 에 없다 — 무시 목록에 올리거나 지운다: ${strayDirs.join(", ")}`);

if (failures.length) {
  console.error(`[repo-hygiene] FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`[repo-hygiene] PASS: 5MB 초과 바이너리 0, push 전 docs PNG 추가 ${MAX_NEW_DOC_PNGS}개 이하, 무시되지 않은 루트 산출물 폴더 0`);

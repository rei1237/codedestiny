/**
 * 소스 스캐너가 훑으면 안 되는 디렉터리 — 빌드 산출물과 의존성.
 *
 * 왜 공용 상수인가:
 *   `worker/` 를 훑는 정적 가드가 12곳인데 제외 목록을 각자 복붙해 갖고 있었고, 그 드리프트가
 *   그대로 버그였다. 산출물을 `worker/` 안에 한 번 떨구면(예: wrangler 의 --outdir 를 상대경로로
 *   쓰면 설정 파일 기준이라 `worker/build-cache/` 에 떨어진다) 13 MiB 번들을 진짜 소스로 읽어
 *   가드 여러 개가 한꺼번에 **거짓 실패**한다. 2026-08-13 실측으로 6곳이 그렇게 깨졌다:
 *   db.transaction-budget · verify:worker-no-undef · verify:no-nested-retry ·
 *   verify:mongo-reset-callers · verify:cf:migration · verify:no-timestamp-conflict.
 *
 *   거짓 실패는 거짓 통과만큼 나쁘다 — 가드를 의심하는 대신 코드를 의심하게 만든다.
 *
 * 🔴 쓰는 법: 기존 제외 목록을 이것으로 **교체하지 말 것.** 스캐너마다 자기만의 정당한 제외가
 *   있다(i18n 스캔의 `apps`·`reports`, user-model 스캔의 `docs`·`.claude` 등). 합집합으로 더한다.
 *
 * 판정은 **디렉터리 이름 정확 일치**로만 한다. 경로 부분일치를 쓰면 `worker/lib/distance.js`
 * 같은 진짜 소스가 조용히 검사에서 빠진다.
 */
export const BUILD_ARTIFACT_DIRS = Object.freeze([
  "node_modules",
  ".git",
  ".next",
  ".open-next",
  ".wrangler",
  "build-cache",
  "build",
  "dist",
  "out",
  "coverage",
]);

/** 디렉터리 **이름**(경로가 아니다)이 빌드 산출물·의존성인가. */
export function isBuildArtifactDir(name) {
  return BUILD_ARTIFACT_DIRS.includes(name);
}

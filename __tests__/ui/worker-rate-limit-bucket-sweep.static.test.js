/**
 * 레이트리밋 버킷 맵은 전부 청소 로직을 가져야 한다.
 *
 * 이 패턴은 `worker/routes/animal-totem.js` 에서 시작해 라우트 4곳으로 복사됐는데,
 * **복사본 4개에서 청소 부분만 빠져 있었다**(2026-08-23 실측). 키가 클라이언트 IP 라
 * 아이솔레이트가 오래 살수록 서로 다른 IP 수만큼 단조 증가한다.
 *
 * 🔴 파일명을 배열에 열거하지 않는다. `worker/**` 에서 버킷 선언을 **전수 발견**해
 *    미분류를 실패시킨다 — 다음에 같은 패턴을 또 복사해도 여기서 걸린다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const workerDir = path.join(root, "worker");

function collectJsFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectJsFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) found.push(full);
  }
  return found;
}

const declaringFiles = collectJsFiles(workerDir)
  .map((file) => ({ file, source: fs.readFileSync(file, "utf8") }))
  .filter((entry) => entry.source.includes("requestBuckets = new Map()"))
  .map((entry) => ({ ...entry, relative: path.relative(root, entry.file).split(path.sep).join("/") }));

test("버킷 선언을 실제로 찾아냈다 (검사 대상 0 이면 가드가 아니다)", () => {
  assert.ok(
    declaringFiles.length >= 5,
    `requestBuckets 선언 파일을 못 찾았다 (${declaringFiles.length}개). 발견 규칙이 깨졌는지 확인할 것`,
  );
});

test("버킷을 선언한 모든 워커 파일이 만료 청소를 갖는다", () => {
  const missing = declaringFiles
    .filter((entry) => !(entry.source.includes("requestBuckets.size >") && entry.source.includes("requestBuckets.delete(")))
    .map((entry) => entry.relative);
  assert.deepEqual(
    missing,
    [],
    `청소 없는 레이트리밋 버킷 — 아이솔레이트 수명 동안 IP 수만큼 자란다: ${missing.join(" | ")}`,
  );
});

/**
 * @jest-environment node
 *
 * User 스키마는 정본이 하나여야 한다.
 *
 * 사고 배경: 예전에는 같은 `users` 컬렉션에 스키마가 3벌 있었다 —
 *   worker/lib/models.js(프로덕션 정본) · server/models/User.js(레거시 Express) ·
 *   app/_lib/models/UserModel.js(스크립트 전용).
 * 제약이 서로 달라서 조용한 손상이 났다. 워커는 gender:""·birthDate:"" 로 유저를 만드는데
 * 나머지 둘은 그 셋을 required + enum 으로 막았고, phoneNumber·legalConsents·
 * membershipCreditLots 는 워커 스키마에만 있어서 다른 모델로 저장하면 strict 모드가
 * 그 필드들을 말없이 버렸다. 시드·검증 스크립트가 실제로 그 경로로 유저 문서를 썼다.
 *
 * 세 벌 모두 `mongoose.models.User || mongoose.model("User", ...)` 가드를 쓰기 때문에
 * **먼저 import 된 쪽이 이기고 나머지 제약은 조용히 사라진다** — 실행 순서에 따라 결과가
 * 달라지므로 테스트로도 재현이 어렵다. 그래서 선언 자체를 하나로 고정한다.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", ".wrangler", "dist", "out", "coverage",
  "reports", "docs", ".claude", "apps",
]);
const SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"]);

function listSourceFiles(dir = root, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".github") continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(full, out);
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

// 이 파일 자신은 제외한다 — 위 주석과 아래 정규식이 찾으려는 문자열을 그대로 담고 있어
// 스스로에게 걸린다.
const SELF = "user-model-single-source.static.test.js";
const sourceFiles = listSourceFiles().filter((file) => !file.endsWith(SELF));

describe("User 스키마 단일 정본", () => {
  test("mongoose.model(\"User\", ...) 선언은 worker/lib/models.js 한 곳뿐이다", () => {
    const declarations = [];
    for (const file of sourceFiles) {
      const text = fs.readFileSync(file, "utf8");
      if (/mongoose\.model\(\s*["']User["']/.test(text)) {
        declarations.push(path.relative(root, file).split(path.sep).join("/"));
      }
    }

    expect(declarations).toEqual(["worker/lib/models.js"]);
  });

  test("삭제된 User 모델 모듈을 다시 import 하지 않는다", () => {
    const offenders = [];
    for (const file of sourceFiles) {
      const relative = path.relative(root, file).split(path.sep).join("/");
      const text = fs.readFileSync(file, "utf8");
      if (/models\/UserModel|getUserModel|server\/models\/User/.test(text)) offenders.push(relative);
    }

    expect(offenders).toEqual([]);
  });
});

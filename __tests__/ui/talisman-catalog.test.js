const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash, webcrypto } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const sharp = require("sharp");
const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "app/app/talismans/catalog.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, {
  exports: exportsObject, crypto: webcrypto,
  require: (name) => {
    assert.equal(name, "@/public/assets/talismans/catalog.json");
    return require("../../public/assets/talismans/catalog.json");
  },
});
const { approvedAssets, verifyOriginal } = exportsObject;
const asset = {
  id: "test-only", approval: "approved", scene: "yeoni-teahouse", category: "peace", composition: "lock",
  src: "/assets/talismans/originals/test-only.png", width: 1440, height: 3120, sha256: "a".repeat(64),
};
test("공개 카탈로그에 미승인 시안을 싣지 않는다", () => {
  assert.equal(approvedAssets().length, 0);
  assert.equal(approvedAssets({ version: 1, assets: [{ ...asset, approval: "draft" }] }).length, 0);
  assert.equal(approvedAssets({ version: 1, assets: [asset] }).length, 1);
});
for (const override of [
  { src: "https://untrusted.example/art.png" }, { src: "/assets/talismans/originals/../draft.png" },
  { width: 1080 }, { height: 10000 }, { scene: "third-invented-character" }, { sha256: "" },
]) test("원본 경로·캐릭터·해상도·무결성 조건: " + JSON.stringify(override), () => {
  assert.equal(approvedAssets({ version: 1, assets: [{ ...asset, ...override }] }).length, 0);
});
test("테스트용 PNG의 원본 해시와 크기를 검증하고 변조를 거부한다", async () => {
  const png = await sharp({ create: { width: 1440, height: 3120, channels: 3, background: "#112233" } }).png().toBuffer();
  const expected = { ...asset, sha256: createHash("sha256").update(png).digest("hex") };
  const bytes = Uint8Array.from(png).buffer;
  await verifyOriginal(bytes, expected);
  await assert.rejects(verifyOriginal(bytes, { ...expected, width: 1441 }), /INVALID_IMAGE/);
  await assert.rejects(verifyOriginal(bytes, { ...expected, sha256: "b".repeat(64) }), /IMAGE_HASH_MISMATCH/);
});

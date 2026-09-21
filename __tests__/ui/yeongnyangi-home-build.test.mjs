import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

test("both Pages preparation steps preserve generated Yeongnyangi root and flower shell", () => {
  const root = mkdtempSync(resolve(tmpdir(), "cd-home-build-"));
  const generatedHome = '<html><head><title>Yeongnyangi</title></head><body>generated home</body></html>';
  const flowerHome = '<html><head><title>Flower</title></head><body>flower home</body></html>';
  try {
    for (const path of ["out", "public/ggulggul"]) mkdirSync(resolve(root, path), { recursive: true });
    writeFileSync(resolve(root, "out/index.html"), generatedHome);
    writeFileSync(resolve(root, "public/index.html"), flowerHome);
    writeFileSync(resolve(root, "public/ggulggul/index.html"), flowerHome);
    for (const script of ["prepare-cloudflare-dist.mjs", "promote-static-shell-to-root.mjs"]) {
      const result = spawnSync(process.execPath, [resolve("scripts", script)], { cwd: root, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(readFileSync(resolve(root, "dist/index.html"), "utf8"), generatedHome);
      assert.equal(readFileSync(resolve(root, "dist/ggulggul/index.html"), "utf8"), flowerHome);
    }
  } finally {
    assert.ok(root.startsWith(resolve(tmpdir()) + sep + "cd-home-build-"));
    rmSync(root, { recursive: true, force: true });
  }
});

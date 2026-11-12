const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const sharp = require("sharp");
const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "src/features/fortune-tea-house/data/readingPresentation.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { resolveDayMaster, dayMasterProfiles, tenGodPresentation } = context.exports;

test("ten stems accept Korean, Hanja and labelled forms without guessing from prose", () => {
  const names = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const hanja = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  assert.equal(Object.keys(dayMasterProfiles).length, 10);
  names.forEach((name, i) => {
    const id = resolveDayMaster(name);
    assert.ok(id);
    assert.equal(resolveDayMaster(hanja[i]), id);
    assert.equal(resolveDayMaster(dayMasterProfiles[id].label), id);
    assert.ok(dayMasterProfiles[id].description && dayMasterProfiles[id].advice);
  });
  assert.equal(dayMasterProfiles[resolveDayMaster("신")].label, "신금(辛金)");
  for (const value of [undefined, "", "확인 전", "신강", "신약", "경쟁", "1991-02-20"]) assert.equal(resolveDayMaster(value), undefined);
});

test("each ten-god ID has an independent complete image with transparent safety margins", async () => {
  assert.equal(Object.keys(tenGodPresentation).length, 10);
  for (const id of Object.keys(tenGodPresentation)) {
    assert.ok(!/손님|경쟁자/.test(tenGodPresentation[id].title));
    const file = path.join(root, "public/images/fortune-tea-house/reading/ten-gods", id + ".webp");
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 512); assert.equal(info.height, 512);
    let opaque = 0;
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const alpha = data[(y * 512 + x) * 4 + 3];
      if (x < 20 || x >= 492 || y < 20 || y >= 492) assert.equal(alpha, 0, id + " has clipped artwork");
      if (alpha > 128) opaque++;
    }
    assert.ok(opaque > 12000, id + " must not be an empty image");
  }
});

test("all 16 animation frames preserve exactly the same teapot and tray pixels", async () => {
  const dir = path.join(root, "public/images/fortune-tea-house/reading");
  const sheet = sharp(path.join(dir, "tea-brewing-sheet.webp"));
  const base = await sheet.clone().extract({ left: 0, top: 200, width: 320, height: 120 }).ensureAlpha().raw().toBuffer();
  for (let frame = 0; frame < 16; frame++) {
    const tile = await sheet.clone().extract({ left: frame % 4 * 320, top: Math.floor(frame / 4) * 320 + 200, width: 320, height: 120 }).ensureAlpha().raw().toBuffer();
    // Steam is confined above the cup; lower porcelain/tray is never redrawn.
    for (let pixel = 0; pixel < base.length; pixel += 4) {
      assert.equal(tile[pixel + 3], base[pixel + 3], "unstable outline frame " + frame);
      // RGB beneath zero alpha is invisible and may be rewritten by the WebP codec.
      if (base[pixel + 3]) for (let channel = 0; channel < 3; channel++) assert.equal(tile[pixel + channel], base[pixel + channel], "unstable porcelain frame " + frame);
    }
  }
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { buildSync } = require("esbuild");

const bundle = buildSync({
  entryPoints: ["app/games/kkulkkul-card-rpg/campaign-data.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
}).outputFiles[0].text;
const moduleForData = { exports: {} };
new Function("module", "exports", bundle)(moduleForData, moduleForData.exports);
const {
  scenes,
  sceneById,
  campaignQuests,
  sourceHash,
  initialCampaign,
  restoreCampaign,
  advanceScene,
  questLock,
  settleBattle,
  questById,
} = moduleForData.exports;
const bytes = fs.readFileSync("content/novel/episodes.source.json");
const canonical = JSON.parse(bytes).episodes.flatMap((ep) =>
  ep.beats.map((b) => b.id),
);
assert.equal(
  crypto.createHash("sha256").update(bytes).digest("hex"),
  sourceHash,
);
for (const s of scenes) {
  const [a, b] = s.source.map((id) => canonical.indexOf(id));
  assert(a >= 0 && b >= a, s.id);
  assert(
    fs.existsSync(path.join("public/images/novel/mobile", s.bg + ".webp")),
  );
  if (s.next) assert(sceneById[s.next]);
  if (s.gate) assert.equal(questById[s.gate].gate, s.id);
}
for (const alternative of ["notice", "later"]) {
  const p = initialCampaign();
  assert(questLock(p, questById["study.growth"]));
  while (!p.cleared) {
    const s = sceneById[p.node];
    if (s.gate) {
      assert.throws(() => advanceScene(p, s.id));
      assert.throws(() => settleBattle(p, s.gate, "no-ticket", true));
      p.pending = s.gate;
      const failure = settleBattle(p, s.gate, s.gate + "-lost", false);
      assert.equal(failure.reward, 0);
      assert.equal(p.node, s.id);
      p.pending = s.gate;
      const id = s.id + "-won";
      const result = settleBattle(p, s.gate, id, true);
      const bookmark = p.node;
      assert.deepEqual(result, settleBattle(p, s.gate, id, true));
      assert.equal(p.node, bookmark);
      assert.throws(() => settleBattle(p, s.gate, id, false));
    } else advanceScene(p, s.id, s.choices ? alternative : undefined);
    assert.deepEqual(restoreCampaign(JSON.parse(JSON.stringify(p))), p);
  }
  assert(p.read.includes(alternative));
  assert(!p.read.includes(alternative === "notice" ? "later" : "notice"));
  assert.equal(p.node, "corridor");
  for (const q of campaignQuests.filter((q) => !q.gate)) {
    assert.equal(questLock(p, q), "", q.id);
    p.pending = q.id;
    const receipt = settleBattle(p, q.id, q.id, true);
    assert.equal(receipt.reward, q.first);
    if (q.repeat) {
      p.pending = q.id;
      assert.equal(
        settleBattle(p, q.id, q.id + "-again", true).reward,
        q.repeat,
      );
    } else assert(questLock(p, q));
  }
  assert.equal(
    restoreCampaign({ ...p, version: 0, node: "retired", pending: "unknown" })
      .node,
    "corridor",
  );
}
console.log(
  "Campaign PASS: source hash, " +
    scenes.length +
    " scene references, both choices, mandatory battles, retry/restore, duplicate settlements and " +
    campaignQuests.length +
    " reachable encounters.",
);

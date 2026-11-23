const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildSync } = require("esbuild");
const compiled = { exports: {} };
new Function(
  "module",
  "exports",
  "require",
  buildSync({
    entryPoints: ["app/games/kkulkkul-card-rpg/battle.ts"],
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
  }).outputFiles[0].text,
)(compiled, compiled.exports, require);
const { createBattle, resolveTurn, getActions } = compiled.exports;
function play(ticket) {
  let b = createBattle(ticket.snapshot, ticket.encounter, ticket.seed);
  while (b.status === "playing") {
    const cards = getActions(b).sort(
      (a, c) => Number(c.type === "Buster") - Number(a.type === "Buster"),
    );
    b = resolveTurn(
      b,
      cards.slice(0, 3).map((c) => c.id),
      b.enemies.find((e) => e.hp > 0).id,
    );
  }
  assert.equal(b.status, "victory");
  return b.inputs;
}
test("서버 대여 편성·시드, 합법 입력 재현, 계정 분리 및 중복 없는 최초 보상", async () => {
  const { createBattlePracticeStore } = await import(
    "./fixtures/mock-card-rpg-battles.mjs"
  );
  const store = createBattlePracticeStore(":memory:");
  try {
    const t = store.start("alice", "chapter1.lesson");
    assert.deepEqual(
      t.snapshot.filter(Boolean).map((x) => x.baseCharacterId),
      ["yeon", "neo"],
    );
    assert.throws(() => store.complete("bob", t.id, []));
    assert.throws(() => store.complete("alice", t.id, []), /끝나지/);
    assert.throws(() =>
      store.complete("alice", t.id, [
        { kind: "turn", ids: ["fake"], targetId: "enemy:1:0" },
      ]),
    );
    assert.throws(() => store.start("alice", "study.growth"));
    const first = store.complete("alice", t.id, play(t));
    assert.deepEqual(store.complete("alice", t.id, []), first);
    const second = store.start("alice", "chapter1.mirror");
    store.complete("alice", second.id, play(second));
    const one = store.start("alice", "study.growth"),
      two = store.start("alice", "study.growth");
    assert.ok(store.complete("alice", one.id, play(one)).reward > 0);
    assert.equal(store.complete("alice", two.id, play(two)).reward, 0);
    assert.throws(() => store.start("alice", "study.growth"));
  } finally {
    store.close();
  }
});

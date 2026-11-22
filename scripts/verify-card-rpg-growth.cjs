const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { buildSync } = require("esbuild");
const { outputFiles } = buildSync({
  stdin: {
    contents:
      'export * from "./app/games/kkulkkul-card-rpg/growth"; export * from "./app/games/kkulkkul-card-rpg/formation"; export * from "./app/games/kkulkkul-card-rpg/battle"',
    resolveDir: path.resolve(__dirname, ".."),
  },
  platform: "node",
  format: "cjs",
  bundle: true,
  write: false,
});
const bundle = { exports: {} };
new Function("module", "exports", "require", outputFiles[0].text)(
  bundle,
  bundle.exports,
  require,
);
const {
  applyGrowth,
  quoteGrowth,
  materialChoices,
  gearStats,
  unitStats,
  definitions,
  availableCostumes,
  buildBattleSnapshot,
  createBattle,
  resolveTurn,
  activateSkill,
  skillDefinitions,
} = bundle.exports;
function fixture() {
  const names = ["moka", "ln", "yun", "pje"];
  return {
    units: names.map((name, i) => ({
      ownedUnitId: "u" + i,
      battleVariantId: name + "-base",
      costumeId: "default",
      level: 1,
      xp: 0,
    })),
    items: ["alarm", "window", "lotus", "alarm"].map(
      (equipmentDefinitionId, i) => ({
        ownedEquipmentId: "g" + i,
        equipmentDefinitionId,
      }),
    ),
    formations: [
      {
        tutorial: false,
        slots: [
          { unit: "u0", gear: "g0" },
          { unit: "u1" },
          { unit: "u2" },
          null,
          null,
          null,
        ],
      },
      {
        tutorial: true,
        slots: [{ unit: "u1", gear: "g1" }, null, null, null, null, null],
      },
    ],
    campaign: {
      completed: { "study.growth": 1, "study.skill": 1, "study.gear": 1 },
    },
    shards: 300,
  };
}
const train = (c, r) =>
  applyGrowth(c, crypto.randomUUID(), r, quoteGrowth(c, r).revision);
const sn = (c) => buildBattleSnapshot(c, c.formations[0]);
test("구 저장 형식에 기본 성장값을 적용하고 레벨 수련의 실제 피해를 반영", () => {
  const c = fixture(),
    r = { kind: "level", ownedId: "u0" },
    q = quoteGrowth(c, r);
  const before = sn(c)[0];
  assert.equal(q.cost, 3);
  assert.equal(before.atk, 270);
  train(c, r);
  const after = sn(c)[0];
  assert.equal(after.hp, 1080);
  assert.equal(after.atk, 280);
  assert.equal(after.ownedEquipmentId, "g0");
  assert.equal(c.units[0].xp, 100);
  function damage(member) {
    const b = createBattle(
      [member, null, null, null, null, null],
      "single",
      331,
    );
    return resolveTurn(b, [b.hand[0].id], b.enemies[0].id).events.find(
      (e) => e.kind === "attack",
    ).amount;
  }
  assert.ok(damage(after) > damage(before));
});
test("재시도 동일 요청 단일 차감, 인자 바꾼 키 및 오래된 강화 미리보기 거절", () => {
  const c = fixture(),
    r = { kind: "level", ownedId: "u0" },
    q = quoteGrowth(c, r);
  applyGrowth(c, "request", r, q.revision);
  const funds = c.shards;
  applyGrowth(c, "request", r, q.revision);
  assert.equal(c.shards, funds);
  assert.equal(c.units[0].level, 2);
  assert.throws(() =>
    applyGrowth(c, "request", { kind: "level", ownedId: "u1" }, q.revision),
  );
  assert.throws(() => applyGrowth(c, "outdated", r, q.revision));
  assert.equal(c.shards, funds);
});
test("잠금·즐겨찾기·모든 저장 편성의 장착 예장 보호, 미리보기 뒤 장착된 재료 재검증", () => {
  const c = fixture();
  c.items[0].level = 3;
  c.items[2].favorite = true;
  c.items[3].locked = true;
  assert.deepEqual(materialChoices(c, "g0"), []);
  const r = { kind: "gear-break", ownedId: "g0", materialId: "g3" };
  assert.throws(() => train(c, r));
  assert.equal(c.items.length, 4);
  assert.equal(c.shards, 300);
  c.items[3].locked = false;
  const q = quoteGrowth(c, r);
  assert.equal(q.lock, "");
  c.formations[1].slots[1] = { unit: "u0", gear: "g3" };
  assert.throws(() => applyGrowth(c, "stale", r, q.revision));
  assert.equal(c.shards, 300);
  c.formations[1].slots[1] = null;
  train(c, r);
  assert.equal(c.items.length, 3);
  assert.equal(c.shards, 296);
  assert.equal(c.items[0].breaks, 1);
  const start = createBattle(sn(c), "single", 18);
  assert.equal(start.allies[0].gauge, 10);
  assert.equal(start.allies[0].atk, 240 + gearStats(c.items[0]).atk);
});
test("수업·각성·훈련 조각과 레벨 상한, 예장 돌파의 대체 비용", () => {
  const c = fixture();
  const r = { kind: "level", ownedId: "u0" };
  delete c.campaign.completed["study.growth"];
  assert.throws(() => train(c, r));
  c.campaign.completed["study.growth"] = 1;
  c.shards = 1;
  assert.throws(() => train(c, r));
  c.shards = 300;
  c.units[0].level = 5;
  assert.throws(() => train(c, r));
  train(c, { kind: "awaken", ownedId: "u0" });
  train(c, r);
  assert.equal(c.units[0].level, 6);
  c.items[0].level = 3;
  const n = c.items.length;
  train(c, { kind: "gear-break", ownedId: "g0" });
  assert.equal(c.items.length, n);
  c.units[0].level = 10;
  assert.throws(() => train(c, r));
});
test("순수 의상의 성능 유지, 별도 전투 버전의 덱·스킬·게이지 계수", () => {
  const c = fixture();
  for (const [ownedId, id] of [
    ["u1", "ln-festival"],
    ["u2", "yun-traveler"],
    ["u3", "pje-rain"],
  ]) {
    const before = sn(c);
    train(c, { kind: "costume", ownedId, costumeId: id });
    const u = c.units.find((u) => u.ownedUnitId === ownedId);
    assert.ok(availableCostumes(u).includes(id));
    u.costumeId = id;
    const after = sn(c);
    assert.deepEqual(
      after.map((x, i) =>
        x ? { ...x, costumeId: before[i].costumeId } : null,
      ),
      before,
    );
  }
  train(c, { kind: "variant", ownedId: "u0" });
  assert.throws(() => train(c, { kind: "variant", ownedId: "u0" }));
  const stage = c.units.find((u) => u.battleVariantId === "moka-stage");
  c.formations[0].slots[1] = { unit: stage.ownedUnitId };
  const snapshot = sn(c);
  assert.notDeepEqual(snapshot[0].deck, snapshot[1].deck);
  assert.notEqual(snapshot[0].combatantId, snapshot[1].combatantId);
  const b = createBattle(snapshot, "single", 585),
    buffed = activateSkill(b, stage.ownedUnitId, 0, b.enemies[0].id);
  assert.equal(buffed.allies[0].gauge - b.allies[0].gauge, 12);
  assert.notEqual(
    skillDefinitions("moka-stage")[0].name,
    skillDefinitions("moka-base")[0].name,
  );
  assert.ok(
    unitStats(definitions["moka-stage"]).atk <
      unitStats(definitions["moka-base"]).atk,
  );
});
test("스킬 및 해방 수련은 독립적으로 행동의 위력에 반영", () => {
  const c = fixture();
  train(c, { kind: "skill", ownedId: "u0", index: 0 });
  train(c, { kind: "ultimate", ownedId: "u0" });
  const s = sn(c),
    b = createBattle(s, "boss", 1010),
    buffed = activateSkill(b, "u0", 0, b.enemies[0].id);
  assert.deepEqual(s[0].skillLevel, [2, 1, 1]);
  assert.equal(buffed.nextStars, 13);
  assert.equal(s[0].ultimateLevel, 2);
  const dmg = (rank) => {
    const st = createBattle(s, "boss", 1010);
    st.allies[0].gauge = 100;
    st.allies[0].ultimateLevel = rank;
    return resolveTurn(st, ["u0:ultimate"], st.enemies[0].id).events.find(
      (e) => e.kind === "ultimate",
    ).amount;
  };
  assert.ok(dmg(2) > dmg(1));
});

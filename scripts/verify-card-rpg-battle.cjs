const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSync } = require("esbuild");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const code = buildSync({
  stdin: {
    contents:
      'export * from "./app/games/kkulkkul-card-rpg/battle"; export * from "./app/games/kkulkkul-card-rpg/formation"',
    resolveDir: root,
  },
  platform: "node",
  format: "cjs",
  bundle: true,
  write: false,
}).outputFiles[0].text;
const compiled = { exports: {} };
new Function("module", "exports", "require", code)(
  compiled,
  compiled.exports,
  require,
);
const {
  definitions,
  buildBattleSnapshot,
  createBattle,
  resolveTurn,
  getActions,
  previewChain,
  activateSkill,
  swapReserve,
  replayBattle,
  skillDefinitions,
  TURN_LIMIT,
} = compiled.exports;
function snapshot(names = ["moka", "yeon", "neo"], relics = []) {
  const units = names.map((name, i) => ({
    ownedUnitId: "u" + i,
    battleVariantId: name + "-base",
    level: 1,
    xp: 0,
    costumeId: name === "moka" ? "moka-apron" : "default",
    acquired: 1,
  }));
  const items = relics.flatMap((id, i) =>
    id ? [{ ownedEquipmentId: "g" + i, equipmentDefinitionId: id }] : [],
  );
  const f = {
    tutorial: true,
    slots: Array.from({ length: 6 }, (_, i) =>
      units[i]
        ? { unit: units[i].ownedUnitId, gear: relics[i] ? "g" + i : undefined }
        : null,
    ),
  };
  return buildBattleSnapshot({ units, items }, f);
}
const start = (names, encounter = "boss", seed = 123) =>
  createBattle(snapshot(names), encounter, seed);
const target = (b) => b.enemies.find((e) => e.hp > 0).id;
const play = (b, ids) =>
  resolveTurn(
    b,
    ids ??
      getActions(b)
        .slice(0, 3)
        .map((c) => c.id),
    target(b),
  );

test("15개 실제 ID를 세 턴에 한 번씩 공개하고 선택하지 않은 카드도 버린다", () => {
  let b = start();
  const seen = new Set();
  for (let i = 0; i < 3; i++) {
    assert.equal(b.hand.length, 5);
    for (const c of b.hand) {
      assert.ok(!seen.has(c.id));
      seen.add(c.id);
      assert.ok(c.hits >= 1);
    }
    b = play(b, [b.hand[0].id]);
    assert.equal(b.discard.length, i === 2 ? 0 : 5 * (i + 1));
  }
  assert.equal(seen.size, 15);
  assert.equal(b.hand.length, 5);
});
test("교대 시 기존 손패의 퇴장 카드는 비활성이고 다음 턴 살아 있는 전열로 재편한다", () => {
  const b = start(["moka", "yeon", "neo", "yun"]);
  const out = b.hand[0].actorId,
    n = swapReserve(b, out, "u3");
  assert.deepEqual(n.hand, b.hand);
  assert.ok(!getActions(n).some((c) => c.actorId === out));
  assert.throws(() => swapReserve(n, "u3", out));
  const next = play(n);
  const all = [...next.hand, ...next.pile];
  assert.equal(all.length, 15);
  assert.ok(all.some((c) => c.actorId === "u3"));
  assert.ok(!all.some((c) => c.actorId === out));
  assert.ok(next.log.some((s) => s.includes("2턴 · 전열 덱 재구성")));
});
test("전투불능 후 후열 충원은 한 번만, 1인 편성은 5장만 순환", () => {
  let b = start(["moka", "yeon", "neo", "ln"]);
  b.allies[0].hp = 1;
  b = play(b, [b.hand[0].id]);
  assert.equal(b.allies[0].position, -1);
  assert.equal(b.allies[3].position, 0);
  const next = play(b, [b.hand[0].id]);
  assert.ok(
    !next.events.some((e) => e.kind === "deal" && e.text.includes("재구성")),
  );
  const solo = start(["moka"]);
  assert.equal(solo.pile.length, 0);
  assert.deepEqual(
    [...solo.hand.map((c) => c.id)].sort(),
    play(solo)
      .hand.map((c) => c.id)
      .sort(),
  );
});
test("일곱 전투 버전의 기명 해방은 연습 전열에서만 준비되며 실제 타격과 재생 기록이 일치한다", () => {
  const titles = new Set();
  for (const v of Object.values(definitions)) {
    const team = snapshot([v.baseCharacterId, "neo", "ln", "yeon"]);
    team[0].battleVariantId = v.battleVariantId;
    team[0].deck = v.deck;
    const b = createBattle(team, "rehearsal", 941);
    assert.equal(b.hand.length, 5);
    assert.equal(b.allies[3].gauge, 0);
    assert.equal(getActions(b).filter((c) => c.ultimate).length, 3);
    assert.ok(
      !getActions(createBattle(team, "single", 941)).some((c) => c.ultimate),
    );
    const next = resolveTurn(b, ["u0:ultimate"], b.enemies[0].id);
    const hit = next.events.find((e) => e.kind === "ultimate");
    assert.ok(hit.text.includes(v.ultimate));
    assert.equal(
      hit.hitAmounts.reduce((a, n) => a + n, 0),
      hit.amount,
    );
    assert.deepEqual(replayBattle(team, "rehearsal", 941, next.inputs), next);
    titles.add(v.ultimate);
  }
  assert.equal(titles.size, Object.keys(definitions).length);
});

test("치명타 확률은 손패 확정 시 생성되며 스킬, 조회, 직렬화로 재추첨되지 않는다", () => {
  const b = start(["moka"]);
  assert.ok(b.hand.every((c) => c.chance === 0));
  const n = activateSkill(b, "u0", 0, target(b));
  assert.ok(n.hand.every((c) => c.chance === 0));
  const next = play(n, [n.hand.find((c) => c.type === "Quick").id]);
  assert.ok(next.hand.some((c) => c.chance > 0));
  assert.deepEqual(
    getActions(next),
    getActions(JSON.parse(JSON.stringify(next))),
  );
  const saturated = structuredClone(b);
  saturated.nextStars = 1000;
  assert.ok(play(saturated).hand.every((c) => c.chance === 100));
});
test("게이지 선차입, 중복 선택, 4행동, 현재 손에 없는 카드를 거절", () => {
  const b = start(["moka"]);
  b.allies[0].gauge = 95;
  const arts = b.hand.find((c) => c.type === "Arts").id;
  for (const ids of [
    [arts, "u0:ultimate"],
    [arts, arts],
    ["bad"],
    b.hand.slice(0, 4).map((c) => c.id),
    [],
  ])
    assert.throws(() => play(b, ids));
  b.allies[0].gauge = 100;
  assert.ok(getActions(b).some((c) => c.ultimate));
  assert.throws(() => play(b, ["u0:ultimate", "u0:ultimate"]));
  const next = play(b, ["u0:ultimate"]);
  assert.equal(next.allies[0].gauge, 0);
  assert.equal(next.events.find((e) => e.kind === "ultimate").critical, false);
});
test("동일 원작의 다른 개체를 섞으면 추가 공격이 없다. 실제 한 개체 세 장이면 발동", () => {
  const sn = snapshot(["moka", "moka", "moka"]);
  sn[1].battleVariantId = "moka-rehearsal-fixture";
  sn[2].battleVariantId = "moka-encore-fixture";
  const b = createBattle(sn, "boss", 123);
  b.enemies[0].hp = 20000;
  const mixed = b.hand.slice(0, 3);
  assert.ok(new Set(mixed.map((c) => c.actorId)).size > 1);
  assert.ok(!previewChain(mixed).includes("동일 동료 · 추가 공격"));
  assert.ok(
    !play(
      b,
      mixed.map((c) => c.id),
    ).events.some((e) => e.kind === "extra"),
  );
  const solo = start(["moka"]);
  assert.ok(play(solo).events.some((e) => e.kind === "extra"));
});
test("행동불능 전열은 실제 가능한 수만 선택하고 0장일 때도 턴을 넘긴다", () => {
  const b = start(["moka"]);
  b.allies[0].stunned = 1;
  assert.equal(getActions(b).length, 0);
  assert.throws(() => activateSkill(b, "u0", 0, target(b)));
  assert.equal(getActions(play(b, [])).length, 5);
});
test("첫 웨이브 마지막 타격 후 미실행 궁극기·자원·적 턴을 취소하고 진행 상태를 이월", () => {
  const b = start(undefined, "waves");
  b.enemies[0].hp = 1;
  const card = b.hand[0],
    other = b.allies.find((a) => a.combatantId !== card.actorId);
  other.gauge = 100;
  const n = activateSkill(b, other.combatantId, 0, target(b));
  const next = play(n, [card.id, other.combatantId + ":ultimate"]);
  assert.equal(next.status, "playing");
  assert.equal(next.wave, 2);
  assert.equal(next.turn, 2);
  assert.equal(next.pile.length, 5);
  assert.equal(next.discard.length, 5);
  assert.equal(
    next.allies.find((a) => a.combatantId === other.combatantId).gauge,
    100,
  );
  assert.equal(
    next.allies.find((a) => a.combatantId === other.combatantId).cooldowns[0],
    n.allies.find((a) => a.combatantId === other.combatantId).cooldowns[0] - 1,
  );
  assert.ok(
    !next.events.some(
      (e) => e.kind === "ultimate" || e.kind === "hit" || e.kind === "victory",
    ),
  );
});
test("한 표적이 쓰러지면 다음 생존 적으로 변경하고 마지막 처치에서만 승리", () => {
  const b = start(["moka"], "multi");
  b.enemies.forEach((e) => (e.hp = 1));
  const final = play(b);
  assert.equal(final.status, "victory");
  assert.deepEqual(
    final.events.filter((e) => e.kind === "attack").map((e) => e.targetId),
    b.enemies.map((e) => e.id),
  );
  assert.equal(final.events.filter((e) => e.kind === "victory").length, 1);
  assert.throws(() => play(final));
});
test("동시 전멸은 패배, 최대 턴의 마지막 적 처치는 승리, 적 생존은 시간 초과", () => {
  const b = start(["moka"]);
  b.enemies[0].hp = 1;
  b.enemies[0].charge = 2;
  b.allies[0].hp = 1;
  assert.equal(play(b).status, "defeat");
  const t = start();
  t.turn = TURN_LIMIT;
  assert.equal(play(t).status, "defeat");
  t.enemies[0].hp = 1;
  assert.equal(play(t).status, "victory");
});
test("예장·의상 보존, 피해 감소·턴 종료 회복·최초 게이지 효과와 스킬 레벨", () => {
  const make = (gear) => createBattle(snapshot(["moka"], [gear]), "single", 1);
  const basic = make(null),
    stone = make("lotus"),
    alarm = make("alarm"),
    window = make("window");
  assert.equal(alarm.allies[0].gauge, 8);
  assert.equal(alarm.allies[0].atk, basic.allies[0].atk + 30);
  assert.equal(alarm.allies[0].costumeId, "moka-apron");
  const lost = (b) => b.allies[0].hp - play(b, [b.hand[0].id]).allies[0].hp;
  assert.ok(lost(stone) < lost(basic));
  assert.equal(lost(window), lost(basic) - 40);
  assert.equal(skillDefinitions("yun", 5)[0].value, 21);
});
test("서로 다른 덱과 18개 실제 스킬, 쿨다운, 결정적 재생", () => {
  for (const name of ["moka", "ln", "pje", "yun", "neo", "yeon"]) {
    const sn = snapshot([name], ["alarm"]);
    let b = createBattle(sn, "boss", 713);
    for (let i = 0; i < 3; i++) {
      b = activateSkill(b, "u0", i, target(b));
      assert.throws(() => activateSkill(b, "u0", i, target(b)));
    }
    for (let i = 0; i < 3 && b.status === "playing"; i++) b = play(b);
    assert.deepEqual(replayBattle(sn, "boss", 713, b.inputs), b);
  }
});

test("계정 성장과 독립적인 초기 편성·전략·예장 실측", () => {
  const teams = [
    { label: "기본", names: ["moka", "yeon", "neo"], gear: [] },
    {
      label: "예장",
      names: ["moka", "yeon", "neo"],
      gear: ["alarm", "window", "lotus"],
    },
    { label: "순환", names: ["ln", "yun", "pje"], gear: [] },
  ];
  const rows = [];
  for (const team of teams)
    for (const encounter of ["waves", "boss"])
      for (const preferred of ["Buster", "Arts", "Quick"]) {
        const tally = {
          wins: 0,
          turns: 0,
          damage: 0,
          ult: 0,
          Quick: 0,
          Arts: 0,
          Buster: 0,
        };
        for (let seed = 1; seed <= 12; seed++) {
          const sn = snapshot(team.names, team.gear);
          let b = createBattle(sn, encounter, seed);
          while (b.status === "playing") {
            for (const a of b.allies.filter(
              (u) =>
                u.hp > 0 && u.position >= 0 && u.position < 3 && !u.stunned,
            )) {
              for (const [i, s] of skillDefinitions(
                a.baseCharacterId,
              ).entries()) {
                if (a.cooldowns[i] > 0) continue;
                if (
                  s.effect === "heal" &&
                  b.allies.every((u) => u.hp === u.maxHp)
                )
                  continue;
                if (
                  s.effect === "delay" &&
                  b.enemies.find((e) => e.id === target(b)).charge === 0
                )
                  continue;
                b = activateSkill(b, a.combatantId, i, target(b));
              }
            }
            const score = (c) =>
              (c.ultimate ? 10 : 0) +
              (c.type === preferred ? 3 : 0) +
              c.chance / 101;
            const ids = getActions(b)
              .sort((a, c) => score(c) - score(a))
              .slice(0, 3)
              .map((c) => c.id);
            b = play(b, ids);
            for (const e of b.events) {
              if (e.kind === "hit") tally.damage += e.amount;
              if (e.kind === "ultimate") tally.ult++;
              if (e.kind === "attack") tally[e.type]++;
            }
          }
          tally.wins += Number(b.status === "victory");
          tally.turns += b.turn;
        }
        assert.ok(tally.turns <= TURN_LIMIT * 12);
        if (team.label === "기본")
          assert.ok(
            tally.wins > 0,
            "기본 팀으로 각 도전을 클리어할 수 있어야 한다.",
          );
        rows.push(
          [
            team.label,
            encounter,
            preferred,
            tally.wins + "/12",
            (tally.turns / 12).toFixed(2),
            Math.round(tally.damage / 12),
            (tally.ult / 12).toFixed(2),
            [tally.Quick, tally.Arts, tally.Buster].join("/"),
          ].join(" · "),
        );
      }
  console.log(
    "팀 · 전투 · 우선 카드 · 승리 · 평균 턴 · 평균 받은 피해 · 평균 해방 · 사용 Q/A/B\n" +
      rows.join("\n"),
  );
});

import { randomInt, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let rules;
function loadRules() {
  if (rules) return rules;
  // Compile the same TypeScript reducer used by the game into the local fixture process.
  const { buildSync } = require("esbuild");
  const out = buildSync({
    stdin: {
      contents:
        'export * from "./app/games/kkulkkul-card-rpg/battle"; export * from "./app/games/kkulkkul-card-rpg/formation"; export * from "./app/games/kkulkkul-card-rpg/campaign-data";',
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
  });
  const compiled = { exports: {} };
  new Function("module", "exports", "require", out.outputFiles[0].text)(
    compiled,
    compiled.exports,
    require,
  );
  return (rules = compiled.exports);
}
export function createBattlePracticeStore(
  filename = resolve(
    ".tmp",
    "card-rpg",
    "quests-" + (process.env.LOCAL_DEV_AUTH_API_PORT || "test") + ".sqlite",
  ),
) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const { DatabaseSync } = require("node:sqlite"),
    db = new DatabaseSync(filename),
    r = loadRules();
  db.exec(
    "CREATE TABLE IF NOT EXISTS fights(id TEXT PRIMARY KEY, owner TEXT NOT NULL, quest TEXT NOT NULL, ticket TEXT NOT NULL, receipt TEXT); CREATE INDEX IF NOT EXISTS fights_owner ON fights(owner,quest)",
  );
  const known = (id) => Object.hasOwn(r.questById, id);
  function wins(owner, quest) {
    return db
      .prepare(
        "SELECT COUNT(*) AS count FROM fights WHERE owner=? AND quest=? AND json_extract(receipt,'$.victory')=1",
      )
      .get(owner, quest).count;
  }
  function start(owner, id) {
    if (!known(id)) throw Error("알 수 없는 의뢰예요.");
    const q = r.questById[id],
      chapter = "chapter1.mirror";
    if (
      (id === "chapter1.mirror" && !wins(owner, "chapter1.lesson")) ||
      (!q.gate && !wins(owner, chapter)) ||
      (q.requires && !wins(owner, q.requires))
    )
      throw Error("이전 전투 완료 기록이 필요해요.");
    if (!q.repeat && wins(owner, id)) throw Error("이미 마친 의뢰예요.");
    const slots = q.gate
      ? [
          { unit: "support:yeon" },
          { unit: "support:neo" },
          null,
          null,
          null,
          null,
        ]
      : [
          { unit: "loan:moka", gear: "loan:alarm" },
          { unit: "support:yeon" },
          { unit: "support:neo" },
          null,
          null,
          null,
        ];
    const snapshot = r.buildBattleSnapshot(
      {
        units: [
          {
            ownedUnitId: "loan:moka",
            battleVariantId: "moka-base",
            costumeId: "default",
            level: 1,
            xp: 0,
            acquired: 0,
          },
        ],
        items: [
          { ownedEquipmentId: "loan:alarm", equipmentDefinitionId: "alarm" },
        ],
      },
      { tutorial: true, slots },
    );
    const ticket = {
      id: randomUUID(),
      version: r.BATTLE_VERSION,
      contentVersion: r.campaignVersion,
      rewardVersion: 1,
      questId: id,
      encounter: q.encounter,
      seed: randomInt(0x100000000),
      snapshot,
      inputs: [],
    };
    db.prepare("INSERT INTO fights VALUES(?,?,?,?,NULL)").run(
      ticket.id,
      owner,
      id,
      JSON.stringify(ticket),
    );
    return ticket;
  }
  function complete(owner, id, inputs) {
    const row = db
      .prepare("SELECT * FROM fights WHERE owner=? AND id=?")
      .get(owner, id);
    if (!row) throw Error("출전 기록이 없어요.");
    if (row.receipt) return JSON.parse(row.receipt);
    if (!Array.isArray(inputs) || inputs.length > 600)
      throw Error("전투 입력 기록을 확인하세요.");
    const t = JSON.parse(row.ticket);
    if (
      t.version !== r.BATTLE_VERSION ||
      t.contentVersion !== r.campaignVersion ||
      t.rewardVersion !== 1
    )
      throw Error("이전 버전의 의뢰를 다시 시작해 주세요.");
    const b = r.replayBattle(t.snapshot, t.encounter, t.seed, inputs);
    if (b.status === "playing") throw Error("전투가 끝나지 않았어요.");
    db.exec("BEGIN IMMEDIATE");
    try {
      const existing = db
        .prepare("SELECT receipt FROM fights WHERE id=?")
        .get(id).receipt;
      if (existing) {
        db.exec("COMMIT");
        return JSON.parse(existing);
      }
      const q = r.questById[row.quest],
        victory = b.status === "victory",
        first = victory && !wins(owner, row.quest);
      const receipt = {
        battleId: id,
        questId: q.id,
        victory,
        first,
        reward: victory ? (first ? q.first : q.repeat) : 0,
      };
      db.prepare("UPDATE fights SET receipt=? WHERE id=?").run(
        JSON.stringify(receipt),
        id,
      );
      db.exec("COMMIT");
      return receipt;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return { start, complete, close: () => db.close() };
}
export async function handlePracticeBattle(
  req,
  res,
  route,
  body,
  loggedIn,
  send,
  store,
) {
  if (process.env.CD_MOCK_DEV !== "1" || process.env.NODE_ENV === "production")
    return send(404, { ok: false });
  let token = (req.headers.cookie || "").match(
    /(?:^|;\s*)rpg_practice=([a-f0-9-]{36})(?:;|$)/,
  )?.[1];
  if (!token) {
    token = randomUUID();
    res.setHeader(
      "Set-Cookie",
      "rpg_practice=" + token + "; Path=/; HttpOnly; SameSite=Strict",
    );
  }
  const owner = loggedIn ? "user:mock-user" : "guest:" + token;
  try {
    if (route === "POST /api/card-rpg-dev/battle/start")
      return send(200, { ok: true, ticket: store.start(owner, body.questId) });
    if (route === "POST /api/card-rpg-dev/battle/complete")
      return send(200, {
        ok: true,
        receipt: store.complete(owner, body.battleId, body.inputs),
      });
    return send(404, { ok: false });
  } catch (e) {
    return send(409, { ok: false, message: e.message });
  }
}

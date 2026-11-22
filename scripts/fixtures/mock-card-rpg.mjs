import { randomInt, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { makeFakePaymentDb } from "../../__tests__/fixtures/fake-payment-db.mjs";
import { User, MonthlyCreditLedger } from "../../worker/lib/models.js";
import { consumeMonthlyCreditLotsWithDb } from "../../worker/lib/monthly-credit-store.js";
import { sumActiveBalance } from "../../worker/lib/monthly-credit-lots.js";

// These configs and routes exist only in the loopback mock server.
export const mockRpgOffers = Object.fromEntries(
  [
    ["character", 40, ["yun-base", "moka-base", "ln-base"]],
    ["encounter", 40, ["pje-base", "yeon-base", "neo-base"]],
    ["relic", 20, ["lotus", "alarm", "window"]],
  ].map(([id, cost, ids]) => [
    id,
    {
      id,
      version: "dev-1",
      poolVersion: "pool-1",
      priceVersion: "price-1",
      cost,
      entries: ids.map((id, i) => ({ id, weight: [15, 45, 40][i] })),
      guarantee: 10,
      enabled: true,
      startsAt: null,
      endsAt: null,
    },
  ]),
);
const fail = (code, status, message) =>
  Object.assign(new Error(message), { code, status });
export const mockWalletId = "507f1f77bcf86cd799439011";
const SAVE_VERSION = 1;
export function createMockRpgWallet({
  db = makeFakePaymentDb({ uniqueKeys: [["userId", "type", "sourceId"]] }),
  file = null,
  offers = mockRpgOffers,
  now = () => Date.now(),
  roll = () => randomInt(100),
  save,
} = {}) {
  if (file && existsSync(file)) {
    const stored = JSON.parse(readFileSync(file, "utf8"));
    if (stored.version !== SAVE_VERSION || !Array.isArray(stored.rows))
      throw Error("Unsupported local payment fixture");
    db.rows.push(...stored.rows);
  }
  async function persist(tx) {
    if (save) await save(tx);
    if (file) {
      mkdirSync(dirname(file), { recursive: true });
      const temporary = file + ".writing";
      writeFileSync(
        temporary,
        JSON.stringify({ version: SAVE_VERSION, rows: tx.rows }),
      );
      renameSync(temporary, file);
    }
  }
  async function init(uid) {
    return db.transaction(async (tx) => {
      if (await tx.findOne(User, { _id: uid })) return;
      const stamp = Date.now();
      const lot = (id, amount, age, life) => ({
        lotId: id,
        amount,
        remaining: amount,
        grantedAt: new Date(stamp - age),
        expiresAt: new Date(stamp + life),
      });
      const lots = [
        lot("fixture:reward", 240, 2000, 2592000000),
        lot("fixture:purchase", 360, 1000, 2592000000),
        lot("fixture:expired", 40, 3000, -1),
      ];
      await tx.insertOne(User, {
        _id: uid,
        recentConsumeRequestIds: [],
        profileSubscription: {
          membershipCreditLots: lots,
          membershipCreditBalance: 600,
          membershipCreditLotsVersion: 0,
        },
      });
      for (const row of lots)
        await tx.insertOne(MonthlyCreditLedger, {
          _id: randomUUID(),
          userId: uid,
          type: "MONTHLY_CREDIT_GRANT",
          sourceId: row.lotId,
          serviceKey: "mock-fixture",
          amount: row.amount,
          createdAt: row.grantedAt,
        });
      await persist(tx);
    });
  }
  const readBalance = async (tx, uid) =>
    sumActiveBalance(
      (await tx.findOne(User, { _id: uid }))?.profileSubscription
        ?.membershipCreditLots || [],
      now(),
    );
  const gameFilter = (uid) => ({ _id: "rpg:" + uid });
  async function view(uid) {
    return db.transaction(async (tx) => {
      const game = await tx.findOne(null, gameFilter(uid));
      return {
        offers,
        balance: await readBalance(tx, uid),
        pity: game?.pity || {},
        history: game?.history || [],
        accountId: uid,
      };
    });
  }
  async function summon(uid, input) {
    const { key, id, count, version, poolVersion, priceVersion } = input;
    if (
      typeof key !== "string" ||
      !/^[a-z0-9-]{8,80}$/i.test(key) ||
      ![1, 10].includes(count) ||
      typeof id !== "string"
    )
      throw fail("BAD_REQUEST", 400, "소환 횟수와 요청 번호를 확인하세요.");
    return db.transaction(async (tx) => {
      const game = (await tx.findOne(null, gameFilter(uid))) || {
        ...gameFilter(uid),
        units: { "moka-base": "unit:initial-moka" },
        equipment: [{ id: "gear:initial-alarm", definitionId: "alarm" }],
        pity: {},
        shards: 0,
        history: [],
      };
      const prior = game.history.find((r) => r.key === key);
      if (prior) {
        if (
          prior.id !== id ||
          prior.count !== count ||
          prior.version !== version ||
          prior.priceVersion !== priceVersion ||
          prior.poolVersion !== poolVersion
        )
          throw fail(
            "KEY_CONFLICT",
            409,
            "이미 사용한 요청과 배너 조건이 달라요.",
          );
        return prior;
      }
      const b = Object.hasOwn(offers, id) ? offers[id] : null;
      if (
        !b ||
        !b.enabled ||
        b.version !== version ||
        b.poolVersion !== poolVersion ||
        b.priceVersion !== priceVersion ||
        (b.startsAt !== null && now() < b.startsAt) ||
        (b.endsAt !== null && now() >= b.endsAt)
      )
        throw fail("BANNER_CHANGED", 409, "배너 정보를 다시 불러오세요.");
      if (
        !Number.isSafeInteger(b.cost) ||
        b.cost < 1 ||
        !Number.isSafeInteger(b.guarantee) ||
        b.guarantee < 1 ||
        !b.entries.length ||
        new Set(b.entries.map((x) => x.id)).size !== b.entries.length ||
        b.entries.some(
          (x) => !x.id || !Number.isSafeInteger(x.weight) || x.weight < 1,
        ) ||
        b.entries.reduce((s, x) => s + x.weight, 0) !== 100
      )
        throw fail("INVALID_POOL", 409, "배너 출현 설정을 확인하고 있어요.");
      const sourceId = "card-rpg:" + key,
        cost = b.cost * count;
      if (!Number.isSafeInteger(cost) || input.expectedCost !== cost)
        throw fail(
          "BANNER_CHANGED",
          409,
          "소환 비용이 바뀌었어요. 새 비용을 확인하세요.",
        );
      const balance = await readBalance(tx, uid);
      if (balance < cost)
        throw fail("INSUFFICIENT", 402, "테스트 계정의 월정석이 부족해요.");
      if (input.expectedBalance !== balance)
        throw fail(
          "BALANCE_CHANGED",
          409,
          "월정석 잔액이 바뀌었어요. 남은 잔액을 확인하세요.",
        );
      const deducted = await consumeMonthlyCreditLotsWithDb(tx, {
        userId: uid,
        amount: cost,
        pushRequestId: sourceId,
      });
      if (!deducted.ok)
        throw fail(
          deducted.reason,
          deducted.reason === "INSUFFICIENT" ? 402 : 409,
          deducted.reason === "INSUFFICIENT"
            ? "테스트 계정의 월정석이 부족해요."
            : "요청 상태를 다시 확인하세요.",
        );
      let pity = game.pity[id] || 0;
      const cards = [];
      for (let i = 0; i < count; i++) {
        const guaranteed = pity + 1 >= b.guarantee;
        let ticket = guaranteed ? 0 : roll();
        const pick = b.entries.find((e) => (ticket -= e.weight) < 0);
        if (!pick) throw Error("시험 추첨 범위 오류");
        pity = pick.id === b.entries[0].id ? 0 : pity + 1;
        const duplicate =
          id === "relic"
            ? game.equipment.some((e) => e.definitionId === pick.id)
            : Boolean(game.units[pick.id]);
        const shards = id !== "relic" && duplicate ? 3 : 0;
        const ownedId =
          id === "relic" ? randomUUID() : (game.units[pick.id] ?? randomUUID());
        if (id === "relic")
          game.equipment.push({ id: ownedId, definitionId: pick.id });
        else game.units[pick.id] = ownedId;
        game.shards += shards;
        cards.push({
          id: pick.id,
          ownedId,
          duplicate,
          guaranteed,
          pity,
          shards,
        });
      }
      game.pity[id] = pity;
      const receipt = {
        key,
        id,
        count,
        version,
        poolVersion,
        priceVersion,
        cost,
        guarantee: b.guarantee,
        balance: deducted.balance,
        cards,
        pity,
        createdAt: now(),
        ledgerId: randomUUID(),
      };
      game.history.push(receipt);
      const { _id, ...contents } = game;
      await tx.findOneAndUpdate(
        null,
        gameFilter(uid),
        { $setOnInsert: { _id }, $set: contents },
        { upsert: true },
      );
      await tx.insertOne(MonthlyCreditLedger, {
        _id: receipt.ledgerId,
        userId: uid,
        type: "MONTHLY_CREDIT_SPEND",
        sourceId,
        serviceKey: "card-rpg-summon",
        amount: cost,
        afterBalance: deducted.balance,
        settledAt: new Date(now()),
        metadata: { banner: id, version, poolVersion, priceVersion },
      });
      await persist(tx);
      return receipt;
    });
  }
  return { init, view, summon };
}

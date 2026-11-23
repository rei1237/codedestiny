import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMockRpgWallet,
  mockWalletId as uid,
  mockRpgOffers,
} from "./fixtures/mock-card-rpg.mjs";
import { makeFakePaymentDb } from "../__tests__/fixtures/fake-payment-db.mjs";
import { User, Payment } from "../worker/lib/models.js";
import { reserveOrderMoonstones } from "../worker/payments/moonstone.js";
import { calculateMoonstoneDiscount } from "../worker/lib/paid-feature-registry.js";
const db = makeFakePaymentDb({ uniqueKeys: [["userId", "type", "sourceId"]] });
const req = (id, count, key, expectedBalance = 600) => ({
  expectedCost: mockRpgOffers[id].cost * count,
  expectedBalance,
  id,
  count,
  key,
  version: "dev-1",
  priceVersion: "price-1",
  poolVersion: "pool-1",
});
const offers = structuredClone(mockRpgOffers);
let failWrite = false;
const wallet = createMockRpgWallet({
  db,
  offers,
  roll: () => 45,
  save() {
    if (failWrite) throw Error("disk full");
  },
});
await wallet.init(uid);
let state = await wallet.view(uid);
assert.equal(state.balance, 600);
const already = req("character", 10, "run-00001");
const [one, two] = await Promise.all([
  wallet.summon(uid, already),
  wallet.summon(uid, already),
]);
assert.deepEqual(one, two);
assert.equal(one.cards[9].guaranteed, true);
assert.equal(one.cards[0].shards, 3);
assert.equal(one.balance, 200);
assert.equal(
  db.rows.filter((r) => r.type === "MONTHLY_CREDIT_SPEND").length,
  1,
);
const sub = (await db.findOne(User, { _id: uid })).profileSubscription;
assert.equal(
  sub.membershipCreditLots.find((l) => l.lotId === "fixture:purchase")
    .remaining,
  200,
);
assert.equal(
  sub.membershipCreditLots.find((l) => l.lotId === "fixture:expired").remaining,
  40,
);
assert(!sub.membershipCreditLots.some((l) => l.lotId === "fixture:reward"));
await assert.rejects(
  wallet.summon(uid, { ...already, count: 1 }),
  (e) => e.code === "KEY_CONFLICT",
);
await assert.rejects(
  wallet.summon(uid, { ...already, priceVersion: "new" }),
  (e) => e.code === "KEY_CONFLICT",
);
offers.character.enabled = false;
assert.deepEqual(await wallet.summon(uid, already), one);
await assert.rejects(
  wallet.summon(uid, req("character", 1, "run-00002")),
  (e) => e.code === "BANNER_CHANGED",
);
offers.character.enabled = true;
offers.character.endsAt = Date.now() - 1;
await assert.rejects(
  wallet.summon(uid, req("character", 1, "run-00003")),
  (e) => e.code === "BANNER_CHANGED",
);
offers.character.endsAt = null;
offers.character.entries[1].weight = 1;
await assert.rejects(
  wallet.summon(uid, req("character", 1, "run-00004")),
  (e) => e.code === "INVALID_POOL",
);
offers.character.entries[1].weight = 45;
failWrite = true;
await assert.rejects(
  wallet.summon(uid, req("relic", 1, "run-outdated-balance")),
  (e) => e.code === "BALANCE_CHANGED",
);
await assert.rejects(
  wallet.summon(uid, {
    ...req("relic", 1, "run-outdated-price", 200),
    expectedCost: 1,
  }),
  (e) => e.code === "BANNER_CHANGED",
);
assert.equal((await wallet.view(uid)).history.length, 1);
const recover = req("relic", 10, "run-00005", 200);
await assert.rejects(wallet.summon(uid, recover), /disk full/);
assert.equal((await wallet.view(uid)).balance, 200);
failWrite = false;
const gear = await wallet.summon(uid, recover);
assert.equal(gear.balance, 0);
assert.equal(new Set(gear.cards.map((p) => p.ownedId)).size, 10);
assert.equal(gear.cards.filter((p) => p.shards).length, 0);
await assert.rejects(
  wallet.summon(uid, req("relic", 1, "run-00006")),
  (e) => e.code === "INSUFFICIENT",
);
const contestDb = makeFakePaymentDb();
const contest = createMockRpgWallet({ db: contestDb });
await contest.init(uid);
const order = {
  _id: "507f1f77bcf86cd799439013",
  merchantUid: "discount-test",
  userId: uid,
  featureKey: "yeongnyangi-saju-mackerel",
  status: "pending",
  paymentAmount: 4900,
  expectedChargedPoints: 99,
  pricingSnapshot: {
    moonstoneDiscount: calculateMoonstoneDiscount(9900, 990, 500),
  },
  metadata: {},
};
await contestDb.insertOne(Payment, order);
const race = await Promise.allSettled([
  contestDb.transaction((tx) => reserveOrderMoonstones(tx, order)),
  contest.summon(uid, already),
]);
assert.equal(race.filter((x) => x.status === "fulfilled").length, 1);
state = await contest.view(uid);
assert.equal(state.balance, 100);
assert.equal(state.history.length, 0);
assert.equal(
  contestDb.rows.filter((r) => r.type === "MONTHLY_CREDIT_SPEND").length,
  1,
);
const dir = mkdtempSync(join(tmpdir(), "kkulkkul-ledger-"));
try {
  const file = join(dir, "fixture.json"),
    a = createMockRpgWallet({ file });
  await a.init(uid);
  const receipt = await a.summon(uid, already),
    b = createMockRpgWallet({ file });
  await b.init(uid);
  assert.deepEqual(await b.summon(uid, already), receipt);
  assert.equal((await b.view(uid)).balance, 200);
} finally {
  rmSync(dir, { force: true, recursive: true });
}
console.log(
  "Wallet PASS: FIFO/expiry, 10-slot pity, per-copy gear, retries, conflicting keys, offer changes, rollback, actual shared product race and persisted history.",
);

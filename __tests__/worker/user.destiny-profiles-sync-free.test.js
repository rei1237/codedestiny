/**
 * @jest-environment node
 *
 * POST /api/user/destiny-profiles — 레거시 일괄 동기화.
 * 2026-10-11 부터 프로필 카드 추가·삭제는 개수·결제와 무관하게 허용한다. 예전에는 첫 카드 이후
 * 추가·삭제가 섞이면 402 를 돌려 결제 증빙을 요구했다. 그 분기가 되살아나면 여기서 실패한다.
 */

import { jest } from "@jest/globals";

const TEST_USER_ID = "507f1f77bcf86cd799439011";

const store = { cards: [] };
const bulkWrite = jest.fn(async (ops) => {
  for (const { updateOne } of ops) {
    const id = updateOne.filter.profileId;
    const row = store.cards.find((card) => card.profileId === id);
    if (row) Object.assign(row, updateOne.update.$set);
    else store.cards.push({ userId: TEST_USER_ID, profileId: id, ...updateOne.update.$set });
  }
});
const deleteMany = jest.fn(async (filter) => {
  const keep = filter.profileId?.$nin;
  store.cards = keep ? store.cards.filter((card) => keep.includes(card.profileId)) : [];
});
const userUpdateOne = jest.fn(async () => ({}));

function chain(valueFn) {
  const node = { select: () => node, sort: () => node, lean: async () => valueFn() };
  return node;
}

let handleUserRoutes;

beforeAll(async () => {
  await jest.unstable_mockModule("../../worker/lib/db.js", () => ({ connectDb: async () => ({}) }));
  await jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    requireUserFromRequest: async () => ({ userId: TEST_USER_ID }),
    getOptionalUserFromRequest: async () => ({ userId: TEST_USER_ID }),
  }));
  await jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    ProfileCard: {
      bulkWrite,
      deleteMany,
      find: () => chain(() => store.cards.map((card) => ({ ...card }))),
    },
    User: {
      findById: () => chain(() => ({
        _id: TEST_USER_ID,
        profileSubscription: { tier: "free", profileLimit: 1 },
        destinyProfilesCurrentId: "a",
      })),
      updateOne: userUpdateOne,
    },
  }));
  ({ handleUserRoutes } = await import("../../worker/routes/user.js"));
});

function card(profileId) {
  return { profileId, name: profileId, gender: "F", birth: { year: 1990, month: 5, day: 6, hour: 7, minute: 8, calType: "solar" } };
}

function sync(profiles) {
  return handleUserRoutes(new Request("https://example.com/api/user/destiny-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "sync", profiles, currentId: "a", baseCurrentId: "a" }),
  }), {});
}

beforeEach(() => {
  jest.clearAllMocks();
  store.cards = [{ userId: TEST_USER_ID, ...card("a") }];
});

test("무료 계정이 결제 없이 카드 여러 장을 한 번에 추가한다", async () => {
  const response = await sync([card("a"), card("b"), card("c"), card("d")]);
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  expect(payload.canCreateMore).toBe(true);
  expect(store.cards.map((row) => row.profileId).sort()).toEqual(["a", "b", "c", "d"]);
});

test("추가와 삭제가 섞인 동기화도 결제 없이 반영된다", async () => {
  store.cards.push({ userId: TEST_USER_ID, ...card("b") }, { userId: TEST_USER_ID, ...card("c") });

  const response = await sync([card("a"), card("x"), card("y")]);

  expect(response.status).toBe(200);
  expect(store.cards.map((row) => row.profileId).sort()).toEqual(["a", "x", "y"]);
  expect(deleteMany).toHaveBeenCalledWith({ userId: TEST_USER_ID, profileId: { $nin: ["a", "x", "y"] } });
});

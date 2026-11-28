/**
 * @jest-environment node
 *
 * 숙요 1년운 점수 시드는 출생 정보에서만 나온다(2026-11-28 D3).
 * 같은 출생 정보면 계정(userId)·프로필 id 가 달라도 결과가 같고, 출생 정보가 다르면 대체로 달라진다.
 * 천문 계산은 입력 날짜만 보는 결정적 목으로 바꿔, 시드 차이만 결과에 드러나게 한다.
 */
import { jest } from "@jest/globals";

jest.unstable_mockModule("../../worker/lib/sukuyo-astronomy.js", () => ({
  calculateSukuyoForMoment: jest.fn(async (_env, input) => {
    const index = (Number(input.year) * 7 + Number(input.month) * 3 + Number(input.day)) % 27;
    return { index, nameKo: `숙${index}`, nameHan: "宿", direction: "東", element: "木", keywords: ["k1", "k2"] };
  }),
}));

let build;
beforeAll(async () => {
  ({ buildSukuyoYearlyFortuneResultV2: build } = await import("../../worker/lib/sukuyo-yearly.js"));
});

const profile = (birth, extra = {}) => ({
  profileId: "profile-a",
  gender: "F",
  birth: { year: 1990, month: 1, day: 1, hour: 7, minute: 30, calType: "solar", ...birth },
  ...extra,
});

test("same birth info with different userId and profileId yields an identical result", async () => {
  const a = await build({ auth: { userId: "user-a" }, profile: profile({}), targetYear: 2026 });
  const b = await build({ auth: { userId: "user-b" }, profile: profile({}, { profileId: "profile-b" }), targetYear: 2026 });
  expect(b).toEqual(a);
});

test("different birth info generally yields a different result", async () => {
  const base = await build({ auth: { userId: "user-a" }, profile: profile({}), targetYear: 2026 });
  const others = await Promise.all([
    profile({ day: 2 }),
    profile({ year: 1991 }),
    profile({ hour: 9 }),
    profile({}, { gender: "M" }),
  ].map((p) => build({ auth: { userId: "user-a" }, profile: p, targetYear: 2026 })));
  const differing = others.filter((result) => JSON.stringify(result) !== JSON.stringify(base));
  expect(differing.length).toBeGreaterThanOrEqual(3);
});

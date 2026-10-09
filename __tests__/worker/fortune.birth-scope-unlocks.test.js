/**
 * @jest-environment node
 *
 * /api/fortune/balance 의 영구 해금 목록(resolvePersistedUnlockFeatures) — 프로필이 없을 때.
 * 출생 기반 키(userId + 생년월일 + contentKey)는 계정 배열·계정 전체 PointHistory 로 열리지 않는다
 * (어느 생년월일로 샀는지 모른다). 계정 기반 키는 예전대로 열린다.
 */

let resolvePersistedUnlockFeatures;
let PointHistory;
let User;

beforeAll(async () => {
  const actualDb = await import("../../worker/lib/db.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    ...actualDb,
    connectDb: jest.fn(async () => undefined),
    withMongoRetry: jest.fn(async (_env, run) => run()),
  }));
  ({ PointHistory, User } = await import("../../worker/lib/models.js"));
  ({ resolvePersistedUnlockFeatures } = (await import("../../worker/routes/fortune.js")).__fortuneAccessTestUtils);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("프로필 없이는 계정 배열의 출생 기반 키를 해금으로 내보내지 않는다 (계정 기반 키는 유지)", async () => {
  const keys = await resolvePersistedUnlockFeatures("64b000000000000000000a01", ["section_daewun", "flower-fc"], "", {});

  expect(keys).toContain("flower-fc");
  expect(keys).not.toContain("section_daewun");
});

test("프로필 없이 계정 전체 PointHistory 로 출생 기반 키를 추론·되쓰기하지 않는다", async () => {
  jest.spyOn(PointHistory, "distinct").mockResolvedValue(["section_daewun"]);
  const updateOne = jest.spyOn(User, "updateOne").mockReturnValue({ catch: () => undefined });

  const keys = await resolvePersistedUnlockFeatures("64b000000000000000000a02", [], "", {});

  expect(keys).toEqual([]);
  expect(updateOne).not.toHaveBeenCalled();
});

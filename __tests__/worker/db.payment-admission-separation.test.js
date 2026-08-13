/**
 * @jest-environment node
 *
 * 결제는 공유 레인이 포화여도 즉시 슬롯을 잡아야 한다.
 *
 * 부팅 폭풍(auth·profile·access-state·subscription)이 Mongo admission 을 가득 채우는 그 순간이
 * 정확히 사용자가 결제창을 여는 순간이다. 두 트래픽이 같은 카운터를 쓰면 결제 prepare 가
 * MongoOperationOverloadedError 로 떨어지고, 사용자에게는 "결제 준비 실패" 로 보인다.
 * 그래서 worker/lib/db.js 는 admissionLane 으로 카운터를 둘로 나눈다(resolveAdmissionLane).
 *
 * 🔴 이 분리를 지키던 테스트가 없었다. PR #503 이 main 에 도달하지 못하면서 함께 사라졌고
 * (머지 커밋이 부모 브랜치에 좌초), 코드는 프로덕션에 살아 있는데 가드만 빈 상태로 남아 있었다.
 * 옵션 값(admissionLane === "payment")을 단언하는 테스트는 세 개 있지만, **포화 상태에서 실제로
 * 통과하는지**를 보는 것은 이것뿐이다 — 값이 맞아도 게이트가 한 카운터를 쓰면 아무 소용이 없다.
 *
 * 대조군을 같은 테스트에 둔 이유: 공유 레인 op 가 같은 조건에서 거부되는 것을 함께 보여야
 * "포화가 실제로 일어났다"가 증명된다. 그게 없으면 결제가 통과한 이유가 분리 덕분인지
 * 애초에 포화가 아니었는지 구분되지 않는다.
 */

import { jest } from "@jest/globals";

const ENV = { MONGO_URI: "mongodb://fake/test", MONGO_MAX_IN_FLIGHT_OPS: "1" };

test("🔴 공유 레인이 포화여도 결제 레인은 슬롯을 얻는다", async () => {
  const connection = {
    readyState: 0,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
    getClient: () => ({ on: jest.fn() }),
  };
  const mongooseMock = {
    connection,
    connect: jest.fn(async () => {
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => {
      connection.readyState = 0;
    }),
  };

  // 🔴 결제 레인도 함께 지운다. 이걸 빠뜨리면 앞 테스트가 남긴 레인 상태가 넘어와,
  // 통과하는 이유가 분리 때문인지 슬롯이 원래 비어 있어서인지 알 수 없게 된다.
  delete globalThis.__mongoOperationAdmission;
  delete globalThis.__mongoPaymentAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const { withMongoRetry } = await import("../../worker/lib/db.js");

  // 공유 레인의 단 하나뿐인 슬롯을 붙잡아 둔다.
  let releaseShared;
  const holder = withMongoRetry(ENV, () => new Promise((resolve) => { releaseShared = resolve; }), { retries: 0 });
  await new Promise((resolve) => setTimeout(resolve, 20));

  // 대조군 — 같은 조건에서 공유 레인 op 는 거부돼야 한다. 즉 포화는 진짜다.
  await expect(withMongoRetry(ENV, async () => ({ ok: true }), { retries: 0, admissionTimeoutMS: 100 }))
    .rejects.toMatchObject({ name: "MongoOperationOverloadedError" });

  // 본론 — 결제 레인은 같은 순간에 통과한다.
  const startedAt = Date.now();
  await expect(withMongoRetry(
    ENV,
    async () => ({ paid: true }),
    { retries: 0, admissionLane: "payment", admissionTimeoutMS: 100 },
  )).resolves.toEqual({ paid: true });

  // "통과했다"만으로는 부족하다 — 대기하다 겨우 들어간 것이면 결제창 앞 지연은 그대로다.
  // 공유 슬롯은 아직 잡혀 있으므로, 즉시 통과가 아니면 여기서 걸린다.
  expect(Date.now() - startedAt).toBeLessThan(100);

  releaseShared({ ok: true });
  await expect(holder).resolves.toEqual({ ok: true });
});

/**
 * @jest-environment node
 *
 * Mongo operation admission must fail quickly under a burst instead of
 * creating more connection-pool waiters. This test uses only a fake driver.
 */

import { jest } from "@jest/globals";

test("Mongo operation admission bounds concurrent work without touching a real DB", async () => {
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

  delete globalThis.__mongoOperationAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const { withMongoRetry } = await import("../../worker/lib/db.js");

  let releaseFirst;
  const first = withMongoRetry(
    { MONGO_URI: "mongodb://fake/test", MONGO_MAX_IN_FLIGHT_OPS: "1" },
    () => new Promise((resolve) => { releaseFirst = resolve; }),
    { retries: 0 },
  );

  await new Promise((resolve) => setTimeout(resolve, 20));
  await expect(withMongoRetry(
    { MONGO_URI: "mongodb://fake/test", MONGO_MAX_IN_FLIGHT_OPS: "1" },
    async () => ({ ok: true }),
    { retries: 0, admissionTimeoutMS: 100 },
  )).rejects.toMatchObject({
    name: "MongoOperationOverloadedError",
    code: "MONGO_OPERATION_ADMISSION_TIMEOUT",
  });

  releaseFirst({ ok: true });
  await expect(first).resolves.toEqual({ ok: true });
});

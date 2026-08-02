/**
 * @jest-environment node
 *
 * Security bookkeeping uses a deliberately short, admission-controlled
 * timeout. This must be opt-in; normal Mongo operations keep the
 * server-selection safety floor.
 */

import { jest } from "@jest/globals";

test("withMongoRetry accepts an explicit short timeout without changing the default floor", async () => {
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

  const startedAt = Date.now();
  await expect(withMongoRetry(
    { MONGO_URI: "mongodb://fake/test", MONGO_SERVER_SELECTION_TIMEOUT_MS: "8000" },
    () => new Promise(() => {}),
    {
      retries: 0,
      attemptTimeoutMS: 1000,
      minAttemptTimeoutMS: 1000,
      respectServerSelectionFloor: false,
      resetOnOperationTimeout: false,
    },
  )).rejects.toThrow(/operation timed out/i);

  expect(Date.now() - startedAt).toBeLessThan(3000);
  expect(mongooseMock.disconnect).not.toHaveBeenCalled();
});

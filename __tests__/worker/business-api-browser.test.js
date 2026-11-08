/** @jest-environment node */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { handleBusinessApi } from "../../worker/business-api/routes.js";
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { signAuthToken } from "../../worker/lib/auth.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";
import { addBusinessCollections } from "../fixtures/business-meter-db.mjs";

const enabled = !!process.env.BUSINESS_TEST_UI;
(enabled ? test : test.skip)(
  "PC·모바일 구매와 별도 cURL 프로세스",
  async () => {
    const owner = "64b000000000000000000001",
      user = {
        _id: owner,
        id: owner,
        email: "api-buyer@example.test",
        name: "구매자",
        phoneNumber: "01012345678",
      };
    const env = {
      BUSINESS_API_SALES: "saju,ziwei,tarot",
      PORTONE_STORE_ID: "store-test",
      PORTONE_CHANNEL_KEY: "channel-test",
      PORTONE_API_SECRET: "test-secret",
      JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
    };
    const token = await signAuthToken(user, env);
    let db, loggedIn, approved;
    const withDb = (_env, _ctx, fn) => fn(db);
    const server = createServer(async (req, res) => {
      const send = (status, data) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };
      try {
        const path = new URL(req.url, "http://127.0.0.1").pathname;
        if (path === "/reset") {
          db = makeFakePaymentDb();
          db.rows.push({ ...user });
          addBusinessCollections(db);
          loggedIn = false;
          approved = new Map();
          return send(200, {});
        }
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = Buffer.concat(chunks).toString();
        if (path === "/api/auth/login") loggedIn = true;
        if (
          ["/api/auth/login", "/api/auth/me", "/api/auth/refresh"].includes(
            path,
          )
        )
          return send(
            loggedIn ? 200 : 401,
            loggedIn
              ? { ok: true, user, accessToken: token }
              : { message: "로그인이 필요합니다." },
          );
        if (path === "/api/test-pg") {
          const { id, amount } = JSON.parse(body);
          const order = db.rows.find((r) => r.merchantUid === id);
          if (!order || amount !== 99000 || order.paymentAmount !== amount)
            return send(422, {});
          approved.set(id, {
            paymentId: id,
            status: "paid",
            amount,
            currency: "KRW",
            paid_at: Math.floor(Date.now() / 1000),
          });
          return send(200, {});
        }
        if (path === "/api/payments/config")
          return send(200, {
            storeId: env.PORTONE_STORE_ID,
            channelKey: env.PORTONE_CHANNEL_KEY,
            currency: "CURRENCY_KRW",
            payMethod: "CARD",
          });
        const headers = { "Content-Type": "application/json" };
        const bearer =
          req.headers.authorization || (loggedIn ? "Bearer " + token : "");
        if (bearer) headers.Authorization = bearer;
        const request = new Request("http://127.0.0.1" + req.url, {
          method: req.method,
          headers,
          ...(req.method === "GET" ? {} : { body }),
        });
        let response;
        if (path.startsWith("/api/business/"))
          response = await handleBusinessApi(request, env, {
            withDb,
            authenticate: async () => {
              if (!loggedIn) throw Object.assign(Error(), { status: 401 });
              return { userId: owner };
            },
          });
        else if (path.startsWith("/api/payments/"))
          response = await handlePaymentsContext(request, env, {
            withDb,
            pgDeps: {
              fetchPayment: async (_env, id) =>
                approved.get(id) || { paymentId: id, status: "ready" },
            },
          });
        else return send(200, { ok: true, data: [], profiles: [] });
        send(response.status, await response.json());
      } catch {
        send(500, { message: "모의 연동에서 오류가 발생했습니다." });
      }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const child = spawn(
        process.execPath,
        ["scripts/business-api-browser-smoke.mjs"],
        {
          env: {
            ...process.env,
            BUSINESS_TEST_API: "http://127.0.0.1:" + server.address().port,
          },
          stdio: "inherit",
        },
      );
      const [code] = await once(child, "exit");
      expect(code).toBe(0);
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  },
  900000,
);

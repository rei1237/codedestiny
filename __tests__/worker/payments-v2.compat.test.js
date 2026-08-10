/**
 * @jest-environment node
 *
 * 부패방지층 — 컷오버 구간에서 화면이 조용히 비지 않게 한다.
 *
 * 서버만 바뀌고 클라이언트는 그대로인 구간이 반드시 있다. 그때 키가 하나 어긋나면 200 이 오고
 * 파싱도 되는데 값만 undefined 라 **에러 없이 화면이 빈다.** 가장 찾기 어려운 실패라 여기서 막는다.
 *
 * 🔴 키 목록을 손으로 적지 않는다. 소비자 소스(app/points/history/order-view-model.ts)에서
 * `order.<key>` 접근을 실제로 추출해 대조한다 — 클라가 필드를 하나 더 읽기 시작하면 이 테스트가
 * 자동으로 걸린다. 손으로 적은 목록은 그 순간 조용히 낡는다.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  LEGACY_ORDER_DETAIL_KEYS,
  legacyOrderDetailEnvelope,
  maskIdentifier,
  toLegacyOrderDetail,
} from "../../worker/payments/compat.js";

const VIEW_MODEL_SOURCE = readFileSync(
  fileURLToPath(new URL("../../app/points/history/order-view-model.ts", import.meta.url)),
  "utf8",
);

const ORDER = {
  merchantUid: "cd7f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f",
  impUid: "imp_0123456789",
  paymentAmount: 30000,
  membershipCreditCost: 3000,
  chargedPoints: 300,
  featureKey: "master-love-codex",
  productId: "master-love-codex",
  paymentType: "digital_content",
  subscriptionTier: "",
  paymentMethod: "card",
  status: "paid",
  orderState: "PAID_VERIFIED",
  createdAt: new Date("2026-08-11T00:00:00Z"),
  updatedAt: new Date("2026-08-11T00:01:00Z"),
  paidAt: new Date("2026-08-11T00:00:30Z"),
  rawPortOne: { receiptUrl: "https://receipt.example/1" },
};

/** 소비자가 실제로 읽는 `order.<key>` 를 소스에서 뽑는다. */
function keysReadByClient() {
  const found = new Set();
  for (const match of VIEW_MODEL_SOURCE.matchAll(/\border\.([A-Za-z_$][\w$]*)/g)) {
    found.add(match[1]);
  }
  return [...found].sort();
}

describe("🔴 클라이언트가 읽는 키를 하나도 빠뜨리지 않는다", () => {
  test("소비자 소스에서 추출한 키가 전부 응답에 있다", () => {
    const needed = keysReadByClient();
    expect(needed.length).toBeGreaterThan(10); // 추출이 실패해 빈 배열로 통과하는 것을 막는다
    const provided = toLegacyOrderDetail(ORDER);
    const missing = needed.filter((key) => !(key in provided));
    expect(missing).toEqual([]);
  });

  test("선언한 키 목록이 실제 응답과 일치한다", () => {
    expect(Object.keys(toLegacyOrderDetail(ORDER)).sort()).toEqual([...LEGACY_ORDER_DETAIL_KEYS].sort());
  });

  test("🔴 안 읽는 구 필드는 되살리지 않는다 — 호환층이 구 응답을 통째로 복제하면 부패 이전이다", () => {
    const provided = toLegacyOrderDetail(ORDER);
    for (const unused of ["coinPrice", "accessType", "cancelAmount", "cancelledAt", "requestId", "metadata"]) {
      expect(unused in provided).toBe(false);
    }
  });
});

describe("봉투", () => {
  test("PointHistoryClient 가 읽는 data.data.order 경로를 맞춘다", () => {
    const envelope = legacyOrderDetailEnvelope(ORDER);
    expect(envelope.data.order.id).toBe(ORDER.merchantUid);
    // 소비자 코드가 실제로 그 경로를 쓰는지도 함께 고정한다.
    const clientSource = readFileSync(
      fileURLToPath(new URL("../../app/points/history/PointHistoryClient.tsx", import.meta.url)),
      "utf8",
    );
    expect(clientSource).toMatch(/data\?\.data\?\.order/);
  });

  test("주문이 없으면 order 는 null 이다", () => {
    expect(legacyOrderDetailEnvelope(null).data.order).toBeNull();
  });
});

describe("값 변환", () => {
  test("식별자 마스킹은 구 구현과 같다 — 끝 4자만", () => {
    expect(maskIdentifier("imp_0123456789")).toBe("••••6789");
    expect(maskIdentifier("ab")).toBe("••••ab");
    expect(maskIdentifier("")).toBeNull();
    expect(maskIdentifier(null)).toBeNull();
  });

  test("주문번호·승인번호가 원문 그대로 나가지 않는다", () => {
    const detail = toLegacyOrderDetail(ORDER);
    expect(detail.orderNumberMasked).not.toContain(ORDER.merchantUid);
    expect(detail.approvalNumberMasked).toBe("••••6789");
  });

  test("날짜는 ISO 문자열이다", () => {
    const detail = toLegacyOrderDetail(ORDER);
    expect(detail.paidAt).toBe("2026-08-11T00:00:30.000Z");
    expect(toLegacyOrderDetail({ ...ORDER, paidAt: null }).paidAt).toBeNull();
    expect(toLegacyOrderDetail({ ...ORDER, paidAt: "쓰레기" }).paidAt).toBeNull();
  });

  test("영수증은 PG 요약에서만 온다", () => {
    expect(toLegacyOrderDetail(ORDER).receiptAvailable).toBe(true);
    expect(toLegacyOrderDetail({ ...ORDER, rawPortOne: null }).receiptAvailable).toBe(false);
  });

  test("🔴 PG 요약 밖의 값은 응답으로 새지 않는다", () => {
    const withPii = { ...ORDER, rawPortOne: { receiptUrl: "https://r/1" }, metadata: { phone: "010-1234-5678" } };
    expect(JSON.stringify(toLegacyOrderDetail(withPii))).not.toMatch(/010-1234-5678/);
  });
});

describe("🔴 신규 5상태가 구 판정 로직을 그대로 통과한다", () => {
  /* resolveStatus 는 `status + orderState` 를 소문자로 이어 붙여 부분문자열로 본다.
     신규 상태값이 그 판정을 통과하는 것은 우연이 아니라 확인한 사실이고, 여기서 고정한다.
     (order-view-model.ts 는 TS 라 이 레포 Jest 가 직접 import 하지 못한다 — 규칙을 소스에서
     읽어 그대로 적용해 확인한다.) */
  function resolveStatusLikeClient(status, orderState) {
    const value = `${String(status || "")} ${String(orderState || "")}`.toLowerCase();
    if (value.includes("partial")) return "partially_refunded";
    if (value.includes("refund")) return "refunded";
    if (value.includes("cancel")) return "cancelled";
    if (value.includes("fail") || value.includes("error")) return "failed";
    if (value.includes("pending") || value.includes("processing") || value.includes("redirect")) return "pending";
    if (value.includes("success") || value.includes("paid") || value.includes("complete") || value.includes("fulfilled")) return "completed";
    return orderState || status ? "unknown" : "legacy";
  }

  test("복제한 판정 규칙이 실제 소스와 같다", () => {
    // 규칙이 바뀌면 아래 매핑 단언이 거짓 안심이 되므로, 분기 문구를 소스에서 확인한다.
    for (const needle of ["partial", "refund", "cancel", "fail", "pending", "paid", "fulfilled"]) {
      expect(VIEW_MODEL_SOURCE).toContain(`includes("${needle}")`);
    }
  });

  test("5상태 매핑", () => {
    expect(resolveStatusLikeClient("PENDING", "PENDING")).toBe("pending");
    expect(resolveStatusLikeClient("PAID", "PAID_VERIFIED")).toBe("completed");
    expect(resolveStatusLikeClient("FAILED", "FAILED")).toBe("failed");
    expect(resolveStatusLikeClient("CANCELLED", "CANCELLED")).toBe("cancelled");
    expect(resolveStatusLikeClient("REFUNDED", "CANCELLED")).toBe("refunded");
  });

  test("신규 코드가 쓰는 소문자 status 도 같은 결과다", () => {
    // compat 은 문서의 status 를 그대로 넘긴다(5상태로 접지 않는다).
    expect(resolveStatusLikeClient("paid", "PAID_VERIFIED")).toBe("completed");
    expect(resolveStatusLikeClient("pending", "PENDING")).toBe("pending");
    expect(resolveStatusLikeClient("refunded", "CANCELLED")).toBe("refunded");
  });
});

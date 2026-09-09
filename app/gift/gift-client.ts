import { authFetch } from "@/app/_lib/auth-client";

export type GiftView = {
  giftId: string; orderId?: string; status: string; senderName: string; recipientName: string;
  giftMessage: string; expiresAt?: string; purchasedAt?: string; claimedAt?: string;
  tokenVersion?: number; hasLink?: boolean; reviewRequired?: boolean;
  product: { name: string; durationDays: number; wonPrice: number; tier: string };
};
export type GiftResponse = {
  gift?: GiftView; gifts?: GiftView[]; nextCursor?: string | null; claimPath?: string;
  displayName?: string; subscription?: { tier?: string; expiresAt?: string };
  activationPending?: boolean; purchaseType?: string; message?: string;
};
export class GiftApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function giftApi(path: string, body?: object): Promise<GiftResponse> {
  const url = path.startsWith("/api/") ? path : `/api/payments/gifts${path}`;
  const response = await authFetch(url, {
    method: body === undefined ? "GET" : "POST", credentials: "include", cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, { apiBase: window.location.origin });
  const data = await response.json();
  if (!response.ok) throw new GiftApiError(response.status, data.code || "", data.message || "선물을 확인할 수 없습니다. 다시 시도해 주세요.");
  return data;
}

"use client";
import { authFetch } from "@/app/_lib/auth-client";
import type { NeoOrder } from "./types";

export async function neoCall(path: string, body?: object): Promise<{ order: NeoOrder; orders: NeoOrder[]; checkout?: { merchantUid:string; paymentAmount:number; storeId:string; channelKey:string; customer:{customerId:string;fullName:string;email:string;phoneNumber?:string} } }> {
  const response = await authFetch("/api/neo-consultations" + path, {
    cache: "no-store",
    ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "처리하지 못했어요. 잠시 후 다시 확인해 주세요.");
  return data;
}

export const remoteQueryKeys = {
  account: {
    accessSnapshot: (profileId = "") => ["account", "access-snapshot", String(profileId)] as const,
    authMe: () => ["account", "auth-me"] as const,
  },
  commerce: {
    moonlightSnapshot: () => ["commerce", "moonlight-snapshot"] as const,
    moonstone: () => ["commerce", "moonstone"] as const,
  },
  entitlements: {
    summary: () => ["entitlements", "summary"] as const,
    product: (productType: string) => ["entitlements", "product", String(productType)] as const,
  },
  orders: {
    list: (view = "history") => ["orders", "list", String(view)] as const,
    detail: (orderId: string) => ["orders", "detail", String(orderId)] as const,
  },
} as const;

export function remoteQueryKeyToString(key: readonly unknown[]): string {
  return key.map((part) => String(part)).join(":");
}

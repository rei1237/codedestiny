import { GUARDIAN_FORTUNE_PRODUCTS } from "./constants";
import type { GuardianFortuneProduct, GuardianFortunePurchaseChannel } from "./types";

export const GUARDIAN_FORTUNE_PURCHASE_POLICY = {
  version: "guardian-fortune-purchase.v1",
  allowedChannels: ["pg"] as const,
  blockedChannels: [
    "monthly_membership_payment",
    "pass",
    "family_pass",
    "free_pass",
    "event_pass",
    "credit",
    "conversation_credit",
    "entitlement",
    "price_coverage",
  ] as const,
  requireServerSideValidation: true,
  blockPassBasedPurchase: true,
  blockFamilyPassPurchase: true,
  blockPriceCoveragePurchase: true,
  blockCreditToCreditPurchase: true,
  v1OnlyPg: true,
} as const;

export function findGuardianFortuneProduct(productId: string): GuardianFortuneProduct | undefined {
  return GUARDIAN_FORTUNE_PRODUCTS.find((product) => product.productId === productId);
}

export function isAllowedGuardianFortunePurchaseChannel(channel: GuardianFortunePurchaseChannel, productId?: string): boolean {
  const product = productId ? findGuardianFortuneProduct(productId) : undefined;
  return channel === "pg" && (!product || product.allowedPurchaseChannels.includes(channel));
}

export function assertGuardianFortuneCreditPurchasePolicy(input: {
  productId: string;
  channel: GuardianFortunePurchaseChannel;
  amountKrw?: number;
}): GuardianFortuneProduct {
  const product = findGuardianFortuneProduct(input.productId);
  if (!product) throw new Error("GUARDIAN_FORTUNE_UNKNOWN_PRODUCT");
  if (!isAllowedGuardianFortunePurchaseChannel(input.channel, input.productId)) {
    throw new Error(`GUARDIAN_FORTUNE_PURCHASE_CHANNEL_BLOCKED:${input.channel}`);
  }
  if (input.amountKrw !== undefined && input.amountKrw !== product.priceKrw) throw new Error("GUARDIAN_FORTUNE_PRICE_MISMATCH");
  return product;
}

const GUARDIAN_FORTUNE_REAL_LLM_DEFAULTS = {
  provider: "mock",
  model: "gemini-2.5-flash",
  temperature: 0.7,
  maxOutputTokens: 1800,
  timeoutMs: 25000,
  maxRetries: 0,
} as const;

function envText(env: Record<string, unknown>, key: string): string {
  return String(env[key] ?? "").trim();
}

function envTrue(env: Record<string, unknown>, key: string): boolean {
  return envText(env, key).toLowerCase() === "true";
}

export function getGuardianFortuneRealLlmBlockReason(env: Record<string, unknown> = {}, userId = ""): string {
  if (!envTrue(env, "ENABLE_GUARDIAN_FORTUNE_REAL_LLM")) return "REAL_LLM_FLAG_OFF";
  if (!envTrue(env, "ALLOW_REAL_GUARDIAN_FORTUNE_LLM")) return "REAL_LLM_ALLOW_FLAG_OFF";
  if (!envTrue(env, "ENABLE_GUARDIAN_FORTUNE_API")) return "GUARDIAN_API_FLAG_OFF";
  if (envText(env, "NODE_ENV").toLowerCase() === "test") return "TEST_ENVIRONMENT";
  const deployment = envText(env, "APP_ENV") || envText(env, "DEPLOY_ENV") || envText(env, "ENVIRONMENT") || envText(env, "NODE_ENV");
  if (deployment.toLowerCase() !== "staging") return "STAGING_ONLY";
  if (!String(userId).trim()) return "LOGIN_REQUIRED";
  const allowlist = envText(env, "GUARDIAN_FORTUNE_REAL_LLM_ALLOWLIST").split(",").map((value) => value.trim()).filter(Boolean);
  if (!allowlist.includes(String(userId).trim())) return "ALLOWLIST_MISS";
  if ((envText(env, "GUARDIAN_FORTUNE_LLM_PROVIDER") || GUARDIAN_FORTUNE_REAL_LLM_DEFAULTS.provider) !== "gemini") return "PROVIDER_NOT_ALLOWED";
  return "";
}

export function isGuardianFortuneRealLlmEnabled(env: Record<string, unknown> = {}, userId = ""): boolean {
  const allowRealFlag = env.ALLOW_REAL_GUARDIAN_FORTUNE_LLM === "true";
  if (!allowRealFlag) return false;
  return getGuardianFortuneRealLlmBlockReason(env, userId) === "";
}

export function assertGuardianFortuneRealLlmAllowed(env: Record<string, unknown> = {}, userId = ""): void {
  const reason = getGuardianFortuneRealLlmBlockReason(env, userId);
  if (reason) throw new Error(`GUARDIAN_FORTUNE_REAL_LLM_BLOCKED:${reason}`);
}

/** Backward-compatible contract helper: it now asserts the guarded policy, not a permanent ban. */
export function assertGuardianFortuneRealLlmDisabled(env: Record<string, unknown> = {}): void {
  if (isGuardianFortuneRealLlmEnabled(env, String(env.GUARDIAN_FORTUNE_REAL_LLM_USER_ID ?? ""))) {
    throw new Error("GUARDIAN_FORTUNE_REAL_LLM_ENABLED");
  }
}

export { GUARDIAN_FORTUNE_REAL_LLM_DEFAULTS };

export function isGuardianFortuneApiEnabled(env: Record<string, unknown> = {}): boolean {
  return env.ENABLE_GUARDIAN_FORTUNE_API === "true";
}

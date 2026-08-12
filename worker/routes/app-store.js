import { connectDb, mongoose } from "../lib/db.js";
import { getEnv } from "../lib/env.js";
import { Payment, User } from "../lib/models.js";
import { requireAuth } from "../lib/auth.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { getPaidFeatureBillingType, isPerUsePaidFeatureKey, PAID_FEATURE_BILLING_TYPES } from "../lib/paid-feature-registry.js";
import {
  APP_PASS_DURATION_DAYS,
  findAppStoreProductById,
  isAppFreeCoinPrice,
  resolveAppContentTier,
  resolveAppPassCoverageKRW,
  resolveAppPassProduct,
} from "../lib/app-store-pricing.js";
import { PASS_LIMITS } from "../lib/profile-limits.js";
import { AppPurchaseIntent, APP_PURCHASE_INTENT_TTL_MS } from "../lib/app-store-models.js";
import { writeSecurityLog } from "../lib/security/index.js";

const GOOGLE_ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
let cachedGoogleAccessToken = null;

function cleanText(value) {
  return String(value || "").trim();
}

async function rejectGooglePlayPassPurchase(request, env, auth, product) {
  await writeSecurityLog({
    env,
    request,
    userId: auth?.userId,
    endpoint: new URL(request.url).pathname,
    reason: "PASS_PURCHASE_CHANNEL_DISABLED",
    metadata: {
      provider: "GOOGLE_PLAY",
      productId: cleanText(product?.productId),
      passTier: cleanText(product?.passTier || product?.subscriptionTier),
    },
  });
  return json({
    ok: false,
    code: "PASS_PURCHASE_CHANNEL_DISABLED",
    message: "이용권 신규 구매는 웹 PG 단건 결제로만 진행할 수 있습니다.",
  }, { status: 403 });
}

function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64url");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem) {
  const normalized = cleanText(pem)
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!normalized) throw new Error("GOOGLE_PLAY_PRIVATE_KEY is empty.");
  if (typeof Buffer !== "undefined") return Buffer.from(normalized, "base64");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function signGoogleServiceJwt(email, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: email,
    scope: GOOGLE_ANDROID_PUBLISHER_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function readGoogleServiceAccount(env) {
  const rawJson = cleanText(getEnv(env, "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"));
  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    return {
      clientEmail: cleanText(parsed.client_email),
      privateKey: cleanText(parsed.private_key),
    };
  }
  return {
    clientEmail: cleanText(getEnv(env, "GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL")),
    privateKey: cleanText(getEnv(env, "GOOGLE_PLAY_PRIVATE_KEY")),
  };
}

async function getGoogleAccessToken(env) {
  if (cachedGoogleAccessToken && cachedGoogleAccessToken.expiresAt > Date.now() + 60000) {
    return cachedGoogleAccessToken.token;
  }

  const account = readGoogleServiceAccount(env);
  if (!account.clientEmail || !account.privateKey) {
    const error = new Error("Google Play service account is not configured.");
    error.code = "GOOGLE_PLAY_SERVICE_ACCOUNT_MISSING";
    error.status = 503;
    throw error;
  }

  const assertion = await signGoogleServiceJwt(account.clientEmail, account.privateKey);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const error = new Error(cleanText(payload.error_description || payload.error || "Google Play OAuth failed."));
    error.code = "GOOGLE_PLAY_OAUTH_FAILED";
    error.status = 502;
    throw error;
  }

  cachedGoogleAccessToken = {
    token: cleanText(payload.access_token),
    expiresAt: Date.now() + Math.max(60, Number(payload.expires_in || 3600)) * 1000,
  };
  return cachedGoogleAccessToken.token;
}

function productKey(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
}

function normalizeGoogleProductType(raw) {
  return cleanText(raw).toLowerCase() === "subs" ? "subs" : "inapp";
}

function readProductMap(env) {
  const raw = cleanText(getEnv(env, "GOOGLE_PLAY_PRODUCT_MAP"));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

function resolveProductCoinPrice(pricing, body = {}) {
  const coinPrice = Math.floor(Number(pricing?.coinPrice ?? pricing?.cost ?? body?.coinPrice ?? body?.cost ?? 0));
  return Number.isFinite(coinPrice) && coinPrice > 0 ? coinPrice : 0;
}

/**
 * 기능 → Play 상품.
 *
 * 앱은 가격대 티어 SKU를 쓴다(웹 코인가 → 티어 → productId). 티어에 없는 가격대면
 * fail-closed로 던진다 — 임의 상품으로 결제시키면 Play 등록가와 서버 기록이 어긋난다.
 * 가격표 누락은 scripts/verify-app-store-pricing.mjs가 배포 전에 잡는다.
 */
function resolveProduct(pricing, env, body = {}) {
  const featureKey = cleanText(pricing?.featureKey || body.featureKey);
  const billingType = getPaidFeatureBillingType(featureKey);
  const coinPrice = resolveProductCoinPrice(pricing, body);

  // 웹 ₩500 이하 기능은 인상해도 Play KRW 최저 판매가를 밑돌 수 있어 SKU를 만들지 않고
  // 앱에서만 무료로 통과시킨다(웹은 유료 그대로).
  if (isAppFreeCoinPrice(coinPrice)) {
    return {
      provider: "GOOGLE_PLAY",
      kind: "free",
      productId: "",
      productType: "inapp",
      featureKey,
      billingType,
      coinPrice,
      amountKRW: 0,
      freeInApp: true,
      subscriptionTier: "",
      passTier: "",
    };
  }

  // env 오버라이드(GOOGLE_PLAY_PRODUCT_MAP) — 기존 동작 호환용. 티어 표보다 우선한다.
  const map = readProductMap(env);
  const mapped = map[featureKey] || map[productKey(featureKey)] || null;
  if (mapped) {
    const mappedProductId = cleanText(typeof mapped === "string" ? mapped : (mapped?.productId || mapped?.id));
    if (mappedProductId) {
      const mappedProductType = typeof mapped === "object" && mapped ? mapped.productType : "";
      const known = findAppStoreProductById(mappedProductId);
      return {
        provider: "GOOGLE_PLAY",
        kind: known?.kind || "content",
        productId: mappedProductId,
        productType: normalizeGoogleProductType(mappedProductType || body.productType),
        featureKey,
        billingType,
        coinPrice,
        amountKRW: Number(known?.amountKRW || 0),
        freeInApp: false,
        subscriptionTier: cleanText(mapped?.subscriptionTier || body.subscriptionTier),
        passTier: cleanText(mapped?.passTier || mapped?.subscriptionTier),
      };
    }
  }

  const tier = resolveAppContentTier(coinPrice);
  if (!tier) {
    const error = new Error("Google Play tier is not registered for this price.");
    error.code = "APP_STORE_TIER_NOT_REGISTERED";
    error.status = 503;
    throw error;
  }

  return {
    provider: "GOOGLE_PLAY",
    kind: "content",
    productId: tier.productId,
    productType: "inapp",
    featureKey,
    billingType,
    coinPrice,
    amountKRW: tier.amountKRW,
    freeInApp: false,
    subscriptionTier: "",
    passTier: "",
  };
}

/** 이용권(30일, 자동갱신 없음, 사용 횟수 제한 없음)은 Play `subs`가 아니라 `inapp`으로 등록한다. */
function resolveAppPassPurchaseProduct(body = {}) {
  const passTier = cleanText(body.passTier || body.subscriptionTier).toLowerCase();
  const pass = resolveAppPassProduct(passTier);
  if (!pass) {
    const error = new Error("Google Play pass product is not registered for this tier.");
    error.code = "APP_STORE_PASS_TIER_UNKNOWN";
    error.status = 400;
    throw error;
  }
  // 커버 한도는 웹 정본(PASS_LIMITS, 코인)에서 읽고 앱 확정가로 환산해 내려준다 —
  // 클라이언트가 코인×100(웹가)으로 계산하면 앱 결제창 금액과 어긋난다.
  const coinLimit = Number(PASS_LIMITS[pass.passTier] || 0);
  const isUnlimited = coinLimit >= 999999999;
  return {
    provider: "GOOGLE_PLAY",
    kind: "pass",
    productId: pass.productId,
    productType: "inapp",
    featureKey: `app-pass-${pass.passTier}`,
    billingType: PAID_FEATURE_BILLING_TYPES.UNLOCK,
    coinPrice: 0,
    amountKRW: pass.amountKRW,
    freeInApp: false,
    subscriptionTier: pass.passTier,
    passTier: pass.passTier,
    durationDays: APP_PASS_DURATION_DAYS,
    // 이용권은 기간만 있고 사용 횟수 제한이 없다.
    usageLimited: false,
    coverageCoin: isUnlimited ? null : coinLimit,
    coverageKRW: isUnlimited ? null : resolveAppPassCoverageKRW(coinLimit),
  };
}

function isPerUseProduct(product) {
  return product?.billingType === PAID_FEATURE_BILLING_TYPES.PER_USE;
}

/**
 * Play 일회성 구매를 소비할지 여부. **소비하지 않을 이유가 없다 — 전부 소비한다.**
 *
 * 티어 SKU는 기능별이 아니라 '가격대별'로 공유된다(app-store-pricing.js: 50코인 기능 전부가
 * cd_content_tier_02 하나를 쓴다). 그런데 Play 일회성 상품은 consume 하지 않으면 영구 소유
 * 상태로 남는다. 따라서 UNLOCK 하나만 사도 그 SKU가 잠겨 **같은 가격대의 나머지 기능 수십 개가
 * 전부 ITEM_ALREADY_OWNED 로 구매 불가**가 된다(이용권 30일 후 재구매 불가도 같은 원인이었다).
 *
 * 소비해도 권한은 잃지 않는다. 해금은 Play 소유 상태가 아니라 서버가 들고 있다 —
 * buildEntitlementUpdate 가 unlockedFeatures/paidFeatures 에 기록하고, 복원(handleRestore)은
 * Play 소유가 아니라 Payment 기록(status: success)에서 되돌린다. Play 구매는 영수증일 뿐이다.
 *
 * subs(자동갱신 구독)는 소비 대상이 아니므로 제외한다.
 */
function shouldConsumePurchase(product) {
  return normalizeGoogleProductType(product?.productType) !== "subs";
}

/**
 * productId → 서버 기능 역해석.
 *
 * 가격대 티어 SKU라 productId 하나에 여러 featureKey가 매달린다(예: cd_content_tier_02 ←
 * 50코인 기능 54개). 따라서 티어 SKU는 "이 유저가 이 상품으로 열어둔 결제 의도"를 먼저 보고,
 * 그것만으로 확정한다. 후보를 순회해 아무거나 첫 매치를 고르면 엉뚱한 기능을 지급하게 된다.
 *
 * 명시적 featureKey(= verify 정상 경로)가 있으면 그대로 쓰고, 없을 때(= 고아 구매 복구)만
 * 의도 기록을 조회한다.
 */
async function resolveProductByProductId(env, body = {}, auth = null) {
  const requestedProductId = cleanText(body.productId);
  if (!requestedProductId) {
    const error = new Error("Google Play productId is required.");
    error.code = "APP_STORE_PRODUCT_ID_REQUIRED";
    error.status = 400;
    throw error;
  }

  if (cleanText(body.featureKey)) {
    const pricing = resolvePricing(body);
    const product = resolveProduct(pricing, env, body);
    if (product.productId === requestedProductId) return { pricing, product, intent: null };
  }

  const knownProduct = findAppStoreProductById(requestedProductId);
  if (knownProduct?.kind === "pass") {
    const product = resolveAppPassPurchaseProduct({ passTier: knownProduct.passTier });
    return { pricing: buildPassPricingShape(knownProduct), product, intent: null };
  }

  // env 오버라이드 매핑(기존 호환) — 1:1 매핑이라 역해석이 안전하다.
  const map = readProductMap(env);
  for (const [mapKey, mapped] of Object.entries(map)) {
    const mappedProductId = cleanText(typeof mapped === "string" ? mapped : (mapped?.productId || mapped?.id));
    if (!mappedProductId || mappedProductId !== requestedProductId) continue;
    const featureKey = cleanText(typeof mapped === "object" && mapped ? mapped.featureKey : "") || cleanText(mapKey);
    const pricing = resolvePricing({ ...body, featureKey });
    const product = resolveProduct(pricing, env, { ...body, featureKey });
    if (product.productId === requestedProductId) return { pricing, product, intent: null };
  }

  const intent = auth ? await findOpenPurchaseIntent(env, auth.userId, requestedProductId) : null;
  if (intent) {
    const pricing = resolvePricing({ ...body, featureKey: intent.featureKey });
    const product = resolveProduct(pricing, env, { ...body, featureKey: intent.featureKey });
    if (product.productId === requestedProductId) return { pricing, product, intent };
  }

  const error = new Error("Google Play purchase could not be matched to a feature. Open the feature again to retry.");
  error.code = "APP_STORE_INTENT_NOT_FOUND";
  error.status = 409;
  throw error;
}

function buildPassPricingShape(pass) {
  return {
    categoryKey: "app-membership-pass",
    categoryLabel: "이용권",
    subFeatureKey: pass.passTier,
    featureKey: `app-pass-${pass.passTier}`,
    cost: 0,
    coinPrice: 0,
    displayUnit: "KRW",
    displayPrice: `${pass.amountKRW.toLocaleString("ko-KR")}원`,
    reason: `App membership pass (${pass.passTier})`,
    currency: "KRW",
    amountKRW: pass.amountKRW,
    cashPrice: pass.amountKRW,
    membershipCreditCost: 0,
  };
}

async function findOpenPurchaseIntent(env, userId, productId) {
  await connectDb(env);
  return AppPurchaseIntent.findOne({
    userId: new mongoose.Types.ObjectId(String(userId)),
    productId: cleanText(productId),
    status: "OPEN",
  }).sort({ createdAt: -1 }).lean();
}

async function settlePurchaseIntent(env, userId, productId, tokenHash) {
  try {
    await connectDb(env);
    await AppPurchaseIntent.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(String(userId)),
        productId: cleanText(productId),
        status: "OPEN",
      },
      { $set: { status: "SETTLED", settledPurchaseTokenHash: cleanText(tokenHash) } },
      { sort: { createdAt: -1 } },
    );
  } catch (e) {
    // 의도 기록은 고아 구매 복구용 힌트일 뿐이다. 정산 실패가 지급을 막아선 안 된다.
    void e;
  }
}

/**
 * 계정 대조. obfuscatedAccountId는 launchBillingFlow에서 앱이 주입한 userId 해시다.
 * 이게 없으면 남의 purchaseToken을 먼저 POST하는 쪽이 콘텐츠를 가져갈 수 있다
 * (Payment.impUid 유니크는 '두 번째'만 막지 '첫 번째 선점'은 막지 못한다).
 */
async function assertPurchaseBelongsToUser(auth, googlePurchase) {
  const claimed = cleanText(googlePurchase?.obfuscatedExternalAccountId);
  // 이 가드 도입 이전 클라이언트가 만든 구매는 값이 비어 있다 — 하위호환으로 통과시킨다.
  if (!claimed) return;
  const expected = await obfuscatedAccountIdForUser(auth.userId);
  if (claimed === expected) return;
  const error = new Error("Google Play purchase belongs to a different account.");
  error.code = "GOOGLE_PLAY_PURCHASE_ACCOUNT_MISMATCH";
  error.status = 409;
  throw error;
}

export async function obfuscatedAccountIdForUser(userId) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`cd-account:${String(userId || "")}`));
  // Play 제약: 64자 이하.
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 64);
}

function resolvePricing(input = {}) {
  const result = getBillingFeaturePricing(input);
  if (result?.ok && result.pricing) return result.pricing;
  const error = new Error("Paid product pricing was not found.");
  error.code = "APP_STORE_PRODUCT_NOT_FOUND";
  error.status = 404;
  throw error;
}

async function purchaseTokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cleanText(token)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buildGooglePurchaseUrl({ packageName, productId, purchaseToken, productType }) {
  const encodedPackage = encodeURIComponent(packageName);
  const encodedProduct = encodeURIComponent(productId);
  const encodedToken = encodeURIComponent(purchaseToken);
  if (productType === "subs") {
    return `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodedPackage}/purchases/subscriptions/${encodedProduct}/tokens/${encodedToken}`;
  }
  return `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodedPackage}/purchases/products/${encodedProduct}/tokens/${encodedToken}`;
}

function buildGoogleAcknowledgeUrl({ packageName, productId, purchaseToken, productType }) {
  return `${buildGooglePurchaseUrl({ packageName, productId, purchaseToken, productType })}:acknowledge`;
}

function isVerifiedPurchase(payload, productType) {
  if (!payload || typeof payload !== "object") return false;
  if (productType === "subs") {
    const paymentState = Number(payload.paymentState);
    const expiryTime = Number(payload.expiryTimeMillis || 0);
    if (expiryTime && expiryTime <= Date.now()) return false;
    return paymentState === 1 || paymentState === 2 || expiryTime > Date.now();
  }
  return Number(payload.purchaseState || 0) === 0;
}

async function fetchGooglePurchase(env, { packageName, productId, productType, purchaseToken }) {
  const token = await getGoogleAccessToken(env);
  const url = buildGooglePurchaseUrl({ packageName, productId, productType, purchaseToken });
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(cleanText(payload.error?.message || payload.message || "Google Play purchase verification failed."));
    error.code = "GOOGLE_PLAY_VERIFY_FAILED";
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.details = payload;
    throw error;
  }
  return payload;
}

async function verifyGooglePurchase(env, { packageName, productId, productType, purchaseToken }) {
  const payload = await fetchGooglePurchase(env, { packageName, productId, productType, purchaseToken });
  if (!isVerifiedPurchase(payload, productType)) {
    const error = new Error("Google Play purchase is not in a paid state.");
    error.code = "GOOGLE_PLAY_PURCHASE_NOT_PAID";
    error.status = 402;
    error.details = payload;
    throw error;
  }
  return payload;
}

function isAcknowledgedPurchase(payload) {
  return Number(payload?.acknowledgementState || 0) === 1;
}

async function acknowledgeGooglePurchase(env, { packageName, productId, productType, purchaseToken, googlePurchase }) {
  if (isAcknowledgedPurchase(googlePurchase)) return false;
  const token = await getGoogleAccessToken(env);
  const response = await fetch(buildGoogleAcknowledgeUrl({ packageName, productId, productType, purchaseToken }), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (response.ok) return true;
  const payload = await response.json().catch(() => ({}));
  const error = new Error(cleanText(payload.error?.message || payload.message || "Google Play purchase acknowledgement failed."));
  error.code = "GOOGLE_PLAY_ACKNOWLEDGE_FAILED";
  error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
  error.details = payload;
  throw error;
}

async function handleProducts(request, env) {
  const url = new URL(request.url);

  // 이용권 스토어는 featureKey가 아니라 passTier로 조회한다.
  const passTier = cleanText(url.searchParams.get("passTier"));
  if (passTier) {
    const pass = resolveAppPassProduct(passTier);
    if (!pass) return json({ ok: false, code: "APP_STORE_PASS_TIER_UNKNOWN", message: "Unknown pass tier." }, { status: 400 });
    return json({
      ok: true,
      data: {
        provider: "GOOGLE_PLAY",
        product: resolveAppPassPurchaseProduct({ passTier }),
        pricing: buildPassPricingShape(pass),
      },
    });
  }

  const pricing = resolvePricing({
    categoryKey: url.searchParams.get("categoryKey"),
    subFeatureKey: url.searchParams.get("subFeatureKey"),
    featureKey: url.searchParams.get("featureKey"),
    reason: url.searchParams.get("reason"),
  });
  const product = resolveProduct(pricing, env, {
    productType: url.searchParams.get("productType"),
  });
  return json({
    ok: true,
    data: {
      provider: "GOOGLE_PLAY",
      product,
      pricing,
    },
  });
}

/**
 * 앱에서 무료로 통과시키는 저가 콘텐츠의 접근 허가.
 *
 * 웹 ₩500 이하는 인상해도 Play KRW 최저 판매가를 밑돌 수 있어 SKU를 만들지 않았다.
 * 결제가 없으니 Payment 기록도 남기지 않고 접근만 열어준다. "무료인지"는 서버 가격표로만
 * 판정한다 — 클라이언트가 무료라고 주장하는 것을 믿으면 전 기능이 공짜가 된다.
 */
async function handleFreeGrant(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const pricing = resolvePricing(body);
  const product = resolveProduct(pricing, env, body);

  if (!product.freeInApp) {
    return json({ ok: false, code: "APP_STORE_PRODUCT_NOT_FREE", message: "This product requires payment." }, { status: 400 });
  }

  const requestId = cleanText(body.requestId || body.idempotencyKey).slice(0, 120);
  return json({
    ok: true,
    message: "Free in app.",
    data: {
      provider: "GOOGLE_PLAY",
      freeInApp: true,
      pricing,
      consume: {
        transactionId: `free:${product.featureKey}:${requestId}`,
        purchaseId: `free:${product.featureKey}:${requestId}`,
        featureKey: product.featureKey,
        chargedCoins: 0,
        accessType: "single_purchase",
        accessMethod: "FREE_IN_APP",
        paymentMethod: "FREE_IN_APP",
        amountKRW: 0,
        requestId,
      },
      accessGrant: {
        ok: true,
        accessType: "single_purchase",
        accessMethod: "FREE_IN_APP",
        paymentMethod: "FREE_IN_APP",
        featureKey: product.featureKey,
        requestId,
        reportId: cleanText(body.reportId),
        sessionId: cleanText(body.sessionId || body.reportSessionId),
        paidAt: new Date().toISOString(),
      },
      balance: 0,
      user: { id: String(auth.userId || "") },
      unlockMap: { [product.featureKey]: true },
      freeBySubscription: false,
    },
  });
}

/**
 * 결제 의도 기록. launchBillingFlow 직전에 호출한다.
 *
 * 티어 SKU라 productId만으로는 featureKey를 알 수 없어, 결제 도중 앱이 죽은 고아 구매를
 * 복구할 때 이 기록이 유일한 단서가 된다.
 */
async function handleGoogleIntent(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const knownPass = findAppStoreProductById(cleanText(body.productId));
  const isPassPurchase = Boolean(cleanText(body.passTier)) || knownPass?.kind === "pass";
  const product = isPassPurchase
    ? resolveAppPassPurchaseProduct({ ...body, passTier: body.passTier || knownPass?.passTier })
    : resolveProduct(resolvePricing(body), env, body);

  if (product.kind === "pass") return rejectGooglePlayPassPurchase(request, env, auth, product);

  if (product.freeInApp) {
    return json({ ok: false, code: "APP_STORE_PRODUCT_FREE_IN_APP", message: "This content is free in the app." }, { status: 400 });
  }

  await connectDb(env);
  const now = Date.now();
  const intent = await AppPurchaseIntent.create({
    userId: new mongoose.Types.ObjectId(String(auth.userId)),
    featureKey: product.featureKey,
    productId: product.productId,
    productType: product.productType,
    passTier: cleanText(product.passTier),
    requestId: cleanText(body.requestId || body.idempotencyKey).slice(0, 120),
    profileId: cleanText(body.profileId || body.selectedProfileId).slice(0, 120),
    reportId: cleanText(body.reportId).slice(0, 120),
    sessionId: cleanText(body.sessionId || body.reportSessionId).slice(0, 120),
    status: "OPEN",
    expiresAt: new Date(now + APP_PURCHASE_INTENT_TTL_MS),
  });

  return json({
    ok: true,
    data: {
      provider: "GOOGLE_PLAY",
      intentId: String(intent._id || ""),
      product,
      // 앱은 이 값을 launchBillingFlow의 obfuscatedAccountId로 주입해야 한다.
      obfuscatedAccountId: await obfuscatedAccountIdForUser(auth.userId),
    },
  });
}

function buildAccessGrant({ payment, pricing, requestId, body }) {
  return {
    ok: true,
    accessType: "single_purchase",
    accessMethod: "DIRECT_KRW",
    paymentMethod: "GOOGLE_PLAY",
    purchaseId: String(payment?._id || ""),
    merchantUid: cleanText(payment?.merchantUid),
    featureKey: cleanText(pricing?.featureKey || body.featureKey),
    requestId,
    reportId: cleanText(body.reportId),
    sessionId: cleanText(body.sessionId || body.reportSessionId),
    evidenceId: String(payment?._id || ""),
    paidAt: payment?.paidAt ? new Date(payment.paidAt).toISOString() : new Date().toISOString(),
  };
}

async function persistGooglePurchase({ auth, env, pricing, product, body, googlePurchase }) {
  await connectDb(env);
  const userId = new mongoose.Types.ObjectId(String(auth.userId));
  const now = new Date();
  const purchaseToken = cleanText(body.purchaseToken);
  const tokenHash = await purchaseTokenHash(purchaseToken);
  const impUid = `google:${tokenHash}`;
  const merchantUid = cleanText(body.orderId) || `google:${product.productId}:${tokenHash.slice(0, 24)}`;
  const requestId = cleanText(body.requestId || body.idempotencyKey || merchantUid).slice(0, 120);
  const appAmountKRW = Number(product.amountKRW || 0);
  const existing = await Payment.findOne({ impUid }).lean();
  if (existing) {
    const existingUserId = String(existing.userId || "");
    const existingFeatureKey = cleanText(existing.featureKey);
    const existingProductId = cleanText(existing.productId || existing.pricingSnapshot?.productId);
    if (existingUserId !== String(userId) || (existingFeatureKey && existingFeatureKey !== product.featureKey) || (existingProductId && existingProductId !== product.productId)) {
      const error = new Error("Google Play purchase token was already used for another entitlement.");
      error.code = "GOOGLE_PLAY_PURCHASE_TOKEN_REPLAY";
      error.status = 409;
      throw error;
    }
    const user = await applyEntitlementUpdate({ userId, product, googlePurchase, now });
    return { payment: existing, user, requestId, idempotent: true };
  }

  const payment = await Payment.create({
    userId,
    impUid,
    merchantUid,
    idempotencyKey: cleanText(body.idempotencyKey || requestId),
    // 실제 청구액은 웹가가 아니라 Play에 등록된 앱 티어 가격이다. 웹가를 기록하면
    // 정산 대조가 통째로 어긋난다(웹 ₩10,000 기능이 앱에선 ₩12,900).
    paymentAmount: appAmountKRW,
    expectedChargedPoints: Number(pricing.coinPrice || pricing.cost || 0),
    chargedPoints: 0,
    featureKey: product.featureKey,
    productId: product.productId,
    coinPrice: Number(pricing.coinPrice || pricing.cost || 0),
    membershipCreditCost: Number(pricing.membershipCreditCost || calculateMembershipCreditCost(Number(pricing.coinPrice || pricing.cost || 0))),
    accessType: "single_purchase",
    requestId,
    reportId: cleanText(body.reportId).slice(0, 120),
    sessionId: cleanText(body.sessionId || body.reportSessionId).slice(0, 120),
    pricingSnapshot: {
      ...pricing,
      provider: "GOOGLE_PLAY",
      productId: product.productId,
      productType: product.productType,
      packageName: cleanText(body.packageName),
      requestId,
      // 웹가는 대조용으로 남기고, 앱 확정가를 정본으로 덮어쓴다.
      webAmountKRW: Number(pricing.amountKRW || pricing.cashPrice || 0),
      amountKRW: appAmountKRW,
      cashPrice: appAmountKRW,
      appBillingType: product.billingType || "",
      appProductKind: product.kind || "content",
    },
    metadata: {
      provider: "GOOGLE_PLAY",
      purchaseTokenHash: tokenHash,
      orderId: cleanText(body.orderId),
      googlePurchase,
    },
    paymentMethod: "GOOGLE_PLAY",
    status: "success",
    orderState: "PAID_VERIFIED",
    paymentType: product.kind === "pass" ? "membership_pass" : "digital_content",
    subscriptionTier: cleanText(product.passTier || product.subscriptionTier),
    rawPortOne: {
      provider: "GOOGLE_PLAY",
      purchaseTokenHash: tokenHash,
      googlePurchase,
    },
  });

  const user = await applyEntitlementUpdate({ userId, product, googlePurchase, now });

  return { payment: payment.toObject ? payment.toObject() : payment, user, requestId, idempotent: false };
}

const USER_ENTITLEMENT_PROJECTION = { points: 1, unlockedFeatures: 1, profileSubscription: 1 };

/**
 * 구매 → 권한 반영.
 *
 * 회당 결제(PER_USE)는 unlockedFeatures에 넣지 않는다. 넣으면 그 기능이 영구 해금으로
 * 굳어 두 번째 구매가 아예 불가능해진다(웹 coin-gate도 PER_USE는 권한을 남기지 않고
 * accessGrant만 발급한다). 앱에서의 재구매는 클라이언트 consume()이 열어준다.
 */
function buildEntitlementUpdate({ product, googlePurchase, now }) {
  if (isPerUseProduct(product)) return null;

  const update = {
    $addToSet: {
      unlockedFeatures: product.featureKey,
      paidFeatures: product.featureKey,
    },
  };

  // 이용권은 30일·자동갱신 없음이라 Play `inapp`으로 판다. `subs`가 아니므로
  // productType이 아니라 passTier로 판정해야 한다.
  const passTier = cleanText(product.passTier || product.subscriptionTier);
  if (product.kind === "pass" && passTier) {
    const expiresAt = googlePurchase?.expiryTimeMillis
      ? new Date(Number(googlePurchase.expiryTimeMillis))
      : new Date(now.getTime() + APP_PASS_DURATION_DAYS * 24 * 60 * 60 * 1000);
    update.$set = {
      "profileSubscription.tier": passTier,
      "profileSubscription.source": "card",
      "profileSubscription.planId": product.productId,
      "profileSubscription.productType": "membership_pass",
      "profileSubscription.passTier": passTier,
      "profileSubscription.startedAt": now,
      "profileSubscription.expiresAt": expiresAt,
      "profileSubscription.paymentMethod": "GOOGLE_PLAY",
      "profileSubscription.lastBillingAt": now,
      "profileSubscription.lastBillingStatus": "success",
    };
  }
  return update;
}

async function applyEntitlementUpdate({ userId, product, googlePurchase, now }) {
  const update = buildEntitlementUpdate({ product, googlePurchase, now });
  if (!update) {
    return User.findById(userId, USER_ENTITLEMENT_PROJECTION).lean();
  }
  return User.findByIdAndUpdate(userId, update, {
    returnDocument: "after",
    projection: USER_ENTITLEMENT_PROJECTION,
  }).lean();
}

async function handleGoogleVerify(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const knownPass = findAppStoreProductById(cleanText(body.productId));
  const isPassPurchase = Boolean(cleanText(body.passTier)) || knownPass?.kind === "pass";
  const pricing = isPassPurchase
    ? buildPassPricingShape(resolveAppPassProduct(cleanText(body.passTier || knownPass?.passTier)) || {})
    : resolvePricing(body);
  const product = isPassPurchase
    ? resolveAppPassPurchaseProduct({ ...body, passTier: body.passTier || knownPass?.passTier })
    : resolveProduct(pricing, env, body);
  const requestedProductId = cleanText(body.productId);
  const purchaseToken = cleanText(body.purchaseToken);
  const packageName = cleanText(body.packageName || getEnv(env, "GOOGLE_PLAY_PACKAGE_NAME") || getEnv(env, "CODE_DESTINY_ANDROID_PACKAGE_ID") || "com.codedestiny.app");

  if (product.kind === "pass") return rejectGooglePlayPassPurchase(request, env, auth, product);

  // 앱에서 무료로 통과시키는 저가 콘텐츠는 Play 상품 자체가 없다.
  if (product.freeInApp) {
    return json({ ok: false, code: "APP_STORE_PRODUCT_FREE_IN_APP", message: "This content is free in the app." }, { status: 400 });
  }
  if (!purchaseToken) return json({ ok: false, code: "PURCHASE_TOKEN_REQUIRED", message: "purchaseToken is required." }, { status: 400 });
  if (requestedProductId !== product.productId) {
    return json({ ok: false, code: "APP_STORE_PRODUCT_MISMATCH", message: "Google Play product does not match server pricing." }, { status: 400 });
  }

  const googlePurchase = await verifyGooglePurchase(env, {
    packageName,
    productId: product.productId,
    productType: product.productType,
    purchaseToken,
  });
  await assertPurchaseBelongsToUser(auth, googlePurchase);
  const persisted = await persistGooglePurchase({
    auth,
    env,
    pricing,
    product,
    body: { ...body, packageName },
    googlePurchase,
  });
  await settlePurchaseIntent(env, auth.userId, product.productId, await purchaseTokenHash(purchaseToken));
  const acknowledged = await acknowledgeGooglePurchase(env, {
    packageName,
    productId: product.productId,
    productType: product.productType,
    purchaseToken,
    googlePurchase,
  });
  const accessGrant = buildAccessGrant({
    payment: persisted.payment,
    pricing,
    requestId: persisted.requestId,
    body,
  });
  const unlockedFeatures = Array.isArray(persisted.user?.unlockedFeatures) ? persisted.user.unlockedFeatures : [product.featureKey];

  return json({
    ok: true,
    message: "Google Play purchase verified.",
    data: {
      provider: "GOOGLE_PLAY",
      idempotent: persisted.idempotent,
      pricing,
      consume: {
        transactionId: String(persisted.payment?._id || ""),
        purchaseId: String(persisted.payment?._id || ""),
        featureKey: product.featureKey,
        chargedCoins: 0,
        accessType: "single_purchase",
        accessMethod: "DIRECT_KRW",
        paymentMethod: "GOOGLE_PLAY",
        amountKRW: Number(product.amountKRW || 0),
        requestId: persisted.requestId,
      },
      accessGrant,
      balance: Number(persisted.user?.points || 0),
      user: {
        id: String(auth.userId || ""),
        points: Number(persisted.user?.points || 0),
        unlockedFeatures,
        profileSubscription: persisted.user?.profileSubscription || null,
      },
      unlockedFeatures,
      unlockMap: { [product.featureKey]: true },
      payment: {
        id: String(persisted.payment?._id || ""),
        provider: "GOOGLE_PLAY",
        productId: product.productId,
        productType: product.productType,
        acknowledged: acknowledged || isAcknowledgedPurchase(googlePurchase),
      },
      // 클라이언트는 이 값으로 consume 여부를 판단한다. 소비하지 않으면 다음 구매가
      // ITEM_ALREADY_OWNED로 막힌다 — 티어 SKU는 가격대별 공유라 한 기능만 사도
      // 그 가격대 전체가 잠긴다(shouldConsumePurchase 주석 참고).
      appPurchase: {
        billingType: product.billingType || "",
        shouldConsume: shouldConsumePurchase(product),
        purchaseToken,
        productId: product.productId,
        amountKRW: Number(product.amountKRW || 0),
      },
      freeBySubscription: false,
    },
  });
}

async function handleGoogleRestore(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request).catch(() => ({}));
  const nativePurchases = Array.isArray(body?.purchases) ? body.purchases : [];
  const packageNameFallback = cleanText(body.packageName || getEnv(env, "GOOGLE_PLAY_PACKAGE_NAME") || getEnv(env, "CODE_DESTINY_ANDROID_PACKAGE_ID") || "com.codedestiny.app");
  const restoredPurchases = [];
  const failedPurchases = [];

  if (nativePurchases.length) {
    for (const nativePurchase of nativePurchases.slice(0, 100)) {
      const productId = cleanText(nativePurchase?.productId);
      const purchaseToken = cleanText(nativePurchase?.purchaseToken);
      const productType = normalizeGoogleProductType(nativePurchase?.productType);
      const packageName = cleanText(nativePurchase?.packageName || packageNameFallback);

      try {
        if (!productId || !purchaseToken) {
          const error = new Error("Google Play productId and purchaseToken are required.");
          error.code = "PURCHASE_RESTORE_INPUT_INVALID";
          error.status = 400;
          throw error;
        }

        const { pricing, product } = await resolveProductByProductId(env, {
          ...body,
          ...nativePurchase,
          productId,
          productType,
        }, auth);
        if (product.kind === "pass") {
          const error = new Error("Google Play pass restore is disabled for new entitlement grants.");
          error.code = "PASS_PURCHASE_CHANNEL_DISABLED";
          error.status = 403;
          throw error;
        }
        const googlePurchase = await verifyGooglePurchase(env, {
          packageName,
          productId: product.productId,
          productType: product.productType,
          purchaseToken,
        });
        await assertPurchaseBelongsToUser(auth, googlePurchase);
        const persisted = await persistGooglePurchase({
          auth,
          env,
          pricing,
          product,
          body: {
            ...body,
            ...nativePurchase,
            packageName,
            productId: product.productId,
            productType: product.productType,
            purchaseToken,
            idempotencyKey: cleanText(nativePurchase?.orderId) || cleanText(body?.idempotencyKey),
          },
          googlePurchase,
        });
        const acknowledged = await acknowledgeGooglePurchase(env, {
          packageName,
          productId: product.productId,
          productType: product.productType,
          purchaseToken,
          googlePurchase,
        });
        await settlePurchaseIntent(env, auth.userId, product.productId, await purchaseTokenHash(purchaseToken));
        restoredPurchases.push({
          id: String(persisted.payment?._id || ""),
          featureKey: product.featureKey,
          productId: product.productId,
          productType: product.productType,
          acknowledged: acknowledged || isAcknowledgedPurchase(googlePurchase),
          // 고아 구매는 지급 후 반드시 소비시켜야 다음 구매가 열린다(티어 SKU 공유).
          shouldConsume: shouldConsumePurchase(product),
          purchaseToken,
        });
      } catch (error) {
        failedPurchases.push({
          productId,
          code: cleanText(error?.code) || "PURCHASE_RESTORE_FAILED",
          message: cleanText(error?.message) || "Google Play purchase restore failed.",
        });
      }
    }
  }

  await connectDb(env);
  const rows = await Payment.find({
    userId: new mongoose.Types.ObjectId(String(auth.userId)),
    paymentMethod: "GOOGLE_PLAY",
    status: "success",
  }).sort({ createdAt: -1 }).limit(200).lean();
  // 복원은 '영구 해금'만 되돌린다. 회당 결제(PER_USE)는 1회 소비로 끝난 거래라
  // 여기서 다시 unlockedFeatures에 넣으면 결제 없이 영구 무료가 되어버린다.
  const restorableRows = rows.filter((row) => (
    !isPerUsePaidFeatureKey(cleanText(row.featureKey))
    && row.paymentType !== "membership_pass"
  ));
  const featureKeys = Array.from(new Set(restorableRows.map((row) => cleanText(row.featureKey)).filter(Boolean)));
  if (featureKeys.length) {
    await User.findByIdAndUpdate(
      auth.userId,
      { $addToSet: { unlockedFeatures: { $each: featureKeys }, paidFeatures: { $each: featureKeys } } },
    );
  }
  // 방금 되살린 고아 구매도 응답 목록에 반영한다. 판정 기준은 위 restorableRows 와 동일하게
  // featureKey 종류로 한다 — 이제 모든 일회성 구매를 소비하므로(shouldConsumePurchase)
  // consume 여부로는 영구 해금과 회당 결제를 구분할 수 없다.
  for (const purchase of restoredPurchases) {
    const featureKey = cleanText(purchase.featureKey);
    if (!featureKey || isPerUsePaidFeatureKey(featureKey)) continue;
    if (!featureKeys.includes(featureKey)) featureKeys.push(featureKey);
  }
  return json({
    ok: true,
    data: {
      provider: "GOOGLE_PLAY",
      restoredFeatures: featureKeys,
      purchases: [
        ...restoredPurchases,
        ...restorableRows.map((row) => ({
          id: String(row._id || ""),
          featureKey: row.featureKey,
          productId: row.productId,
          // 이용권도 자동갱신이 없어 Play `inapp`으로 판다 — subs는 쓰지 않는다.
          productType: "inapp",
          createdAt: row.createdAt,
        })),
      ],
      failedPurchases,
    },
  });
}

function decodeBase64Json(value) {
  const input = cleanText(value);
  if (!input) return {};
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;
  const text = typeof Buffer !== "undefined"
    ? Buffer.from(padded, "base64").toString("utf8")
    : decodeURIComponent(Array.from(atob(padded), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
  return JSON.parse(text);
}

/**
 * RTDN 요청 인증.
 *
 * Play RTDN 은 Cloud Pub/Sub 푸시 구독으로 전달된다. Pub/Sub 는 개발자가 정한 고정 토큰을
 * 헤더에 실어줄 수 없다 — 인증을 켜면 "signs a JWT and sends the JWT in the authorization
 * header"(cloud.google.com/pubsub/docs/push), 즉 Authorization 에는 Google 이 서명한 OIDC JWT 가
 * 들어온다. 그래서 헤더만 검사하면 정상 알림이 전부 401 로 거부된다.
 *
 * Pub/Sub 는 pushEndpoint URL 의 쿼리스트링을 그대로 보존하므로, 공유 토큰을 쿼리로 받는다.
 * (OIDC 이전 Google 이 권장하던 방식이다.)
 *   등록 URL: https://code-destiny.com/api/app-store/google/rtdn?token=<GOOGLE_PLAY_RTDN_TOKEN>
 *
 * 헤더 경로도 그대로 둔다 — 수동 재전송·헬스체크 등 Pub/Sub 가 아닌 호출을 위해서다.
 */
function requireGoogleRtdnToken(request, env) {
  const expected = cleanText(getEnv(env, "GOOGLE_PLAY_RTDN_TOKEN"));
  if (!expected) {
    const error = new Error("Google Play RTDN endpoint is not configured.");
    error.code = "GOOGLE_PLAY_RTDN_DISABLED";
    error.status = 503;
    throw error;
  }
  const authHeader = cleanText(request.headers.get("Authorization")).replace(/^Bearer\s+/i, "");
  const channelToken = cleanText(request.headers.get("X-Goog-Channel-Token") || request.headers.get("X-Google-Channel-Token"));
  let queryToken = "";
  try {
    queryToken = cleanText(new URL(request.url).searchParams.get("token"));
  } catch (e) { /* URL 파싱 실패는 토큰 없음으로 취급한다 */ }
  if (authHeader === expected || channelToken === expected || queryToken === expected) return;
  const error = new Error("Google Play RTDN token is invalid.");
  error.code = "GOOGLE_PLAY_RTDN_UNAUTHORIZED";
  error.status = 401;
  throw error;
}

function extractGoogleRtdnNotification(body) {
  const decoded = decodeBase64Json(body?.message?.data);
  const subscription = decoded?.subscriptionNotification || null;
  const oneTime = decoded?.oneTimeProductNotification || null;
  // 환불/취소/차지백은 voidedPurchaseNotification으로 온다. 이걸 읽지 않으면 환불이
  // 조용히 무시되어 콘텐츠가 회수되지 않는다.
  const voided = decoded?.voidedPurchaseNotification || null;
  const test = decoded?.testNotification || null;
  return {
    raw: decoded,
    packageName: cleanText(decoded?.packageName),
    purchaseToken: cleanText(subscription?.purchaseToken || oneTime?.purchaseToken || voided?.purchaseToken),
    productId: cleanText(subscription?.subscriptionId || oneTime?.sku),
    orderId: cleanText(voided?.orderId),
    productType: subscription || Number(voided?.productType) === 2 ? "subs" : "inapp",
    notificationType: subscription?.notificationType || oneTime?.notificationType || "",
    // voided는 조회 없이 곧바로 회수한다 — Google이 이미 환불을 확정한 상태다.
    voided: Boolean(voided),
    isTest: Boolean(test),
  };
}

async function updateActiveGoogleEntitlement({ payment, googlePurchase, notification }) {
  await Payment.findByIdAndUpdate(payment._id, {
    $set: {
      status: "success",
      orderState: "PAID_VERIFIED",
      "metadata.googlePurchase": googlePurchase,
      "metadata.googleRtdn": notification.raw,
      "rawPortOne.googlePurchase": googlePurchase,
      "rawPortOne.googleRtdn": notification.raw,
    },
  });
  const featureKey = cleanText(payment.featureKey);
  if (!featureKey) return;
  const update = {
    $addToSet: {
      unlockedFeatures: featureKey,
      paidFeatures: featureKey,
    },
  };
  if (notification.productType === "subs") {
    update.$set = {
      "profileSubscription.lastBillingStatus": "success",
      "profileSubscription.lastBillingAt": new Date(),
    };
    if (googlePurchase?.expiryTimeMillis) {
      update.$set["profileSubscription.expiresAt"] = new Date(Number(googlePurchase.expiryTimeMillis));
    }
  }
  await User.findByIdAndUpdate(payment.userId, update);
}

async function revokeGoogleEntitlement({ payment, googlePurchase, notification }) {
  const featureKey = cleanText(payment.featureKey);
  /* 🔴 회수는 **한 번만** 돈다. RTDN 에는 이벤트 중복 방지 테이블이 없어서 Google 이 같은
     voided 알림을 재전송하면 이 함수가 다시 불린다. $pull 자체는 멱등이라 그대로도 무해해
     보이지만, 그 사이 사용자가 **재구매**했다면 이야기가 다르다 — 재구매는 새 purchaseToken
     이라 다른 Payment 문서를 만들지만, 이 함수는 옛 Payment 의 featureKey 로 $pull 하므로
     방금 다시 산 권한을 도로 뺏는다.
     그래서 "취소 아님 → 취소" 전이에 성공한 요청만 사용자 문서를 건드린다. 진 요청은
     이미 처리된 재전송이므로 조용히 끝낸다. */
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: "cancelled" } },
    {
      $set: {
        status: "cancelled",
        orderState: "CANCELLED",
        "metadata.googlePurchase": googlePurchase || null,
        "metadata.googleRtdn": notification.raw,
        "rawPortOne.googlePurchase": googlePurchase || null,
        "rawPortOne.googleRtdn": notification.raw,
      },
    },
  ).lean();
  if (!claimed) return;
  const update = featureKey
    ? { $pull: { unlockedFeatures: featureKey, paidFeatures: featureKey } }
    : {};
  // 이용권은 Play `inapp`으로 팔므로 notification.productType이 아니라 결제 기록의
  // paymentType으로 판정해야 한다(subs로 보면 이용권 환불 시 구독이 안 끊긴다).
  if (payment.paymentType === "membership_pass" || notification.productType === "subs") {
    update.$set = {
      "profileSubscription.lastBillingStatus": "cancelled",
      "profileSubscription.lastBillingAt": new Date(),
    };
  }
  if (Object.keys(update).length) await User.findByIdAndUpdate(payment.userId, update);
}

async function handleGoogleRtdn(request, env) {
  requireGoogleRtdnToken(request, env);
  const body = await readJson(request);
  const notification = extractGoogleRtdnNotification(body);
  // Play Console "테스트 알림 보내기"는 구매 토큰이 없다 — 200으로 ack해야 연결이 확인된다.
  if (notification.isTest) {
    return json({ ok: true, data: { provider: "GOOGLE_PLAY", test: true } });
  }
  if (!notification.purchaseToken) {
    return json({ ok: true, data: { provider: "GOOGLE_PLAY", ignored: true, reason: "purchaseToken_missing" } });
  }

  await connectDb(env);
  const tokenHash = await purchaseTokenHash(notification.purchaseToken);
  const payment = await Payment.findOne({ impUid: `google:${tokenHash}` }).lean();
  if (!payment) {
    return json({ ok: true, data: { provider: "GOOGLE_PLAY", ignored: true, reason: "payment_not_found" } });
  }
  if (payment.paymentType === "membership_pass" && !notification.voided) {
    return json({
      ok: true,
      data: {
        provider: "GOOGLE_PLAY",
        ignored: true,
        reason: "PASS_PURCHASE_CHANNEL_DISABLED",
      },
    });
  }

  const packageName = notification.packageName
    || cleanText(getEnv(env, "GOOGLE_PLAY_PACKAGE_NAME") || getEnv(env, "CODE_DESTINY_ANDROID_PACKAGE_ID") || "com.codedestiny.app");
  const productId = notification.productId || cleanText(payment.productId || payment.pricingSnapshot?.productId);

  // 환불/취소/차지백은 Google이 이미 확정한 사실이라 재조회 없이 곧바로 회수한다.
  // (소비된 구매는 products.get이 실패할 수 있어 조회에 기대면 회수를 놓친다)
  if (notification.voided) {
    await revokeGoogleEntitlement({ payment, googlePurchase: null, notification });
    return json({
      ok: true,
      data: {
        provider: "GOOGLE_PLAY",
        active: false,
        voided: true,
        featureKey: cleanText(payment.featureKey),
        productId,
        productType: notification.productType,
        notificationType: notification.notificationType,
      },
    });
  }

  if (!productId) {
    return json({ ok: true, data: { provider: "GOOGLE_PLAY", ignored: true, reason: "productId_missing" } });
  }
  let googlePurchase = null;
  let active = false;
  try {
    googlePurchase = await fetchGooglePurchase(env, {
      packageName,
      productId,
      productType: notification.productType,
      purchaseToken: notification.purchaseToken,
    });
    active = isVerifiedPurchase(googlePurchase, notification.productType);
  } catch (error) {
    const status = Number(error?.status || error?.statusCode || 0);
    if (status >= 500) throw error;
  }

  if (active) {
    await updateActiveGoogleEntitlement({ payment, googlePurchase, notification });
  } else {
    await revokeGoogleEntitlement({ payment, googlePurchase, notification });
  }

  return json({
    ok: true,
    data: {
      provider: "GOOGLE_PLAY",
      active,
      featureKey: cleanText(payment.featureKey),
      productId,
      productType: notification.productType,
      notificationType: notification.notificationType,
    },
  });
}

export async function handleAppStoreRoutes(request, env) {
  let path = "";
  try {
    const method = request.method.toUpperCase();
    path = getRoutePath(request, "/api/app-store");
    if (method === "GET" && path === "/products") return await handleProducts(request, env);
    if (method === "POST" && path === "/free-grant") return await handleFreeGrant(request, env);
    if (method === "POST" && path === "/google/intent") return await handleGoogleIntent(request, env);
    if (method === "POST" && path === "/google/verify") return await handleGoogleVerify(request, env);
    if (method === "POST" && path === "/google/restore") return await handleGoogleRestore(request, env);
    if (method === "POST" && path === "/google/rtdn") return await handleGoogleRtdn(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    const status = Number(error?.status || error?.statusCode || 0);
    if (status >= 400 && status < 600) {
      return json({
        ok: false,
        code: cleanText(error?.code) || "APP_STORE_ERROR",
        message: cleanText(error?.message) || "App store request failed.",
      }, { status });
    }
    // exposeMessage 를 켜지 않는다 — 위 status 분기가 이미 저자가 쓴 메시지(결제 토큰 재사용 409 등)를
    // 그대로 돌려주므로, 여기 도달하는 것은 status 없는 예상 밖 오류뿐이다. 그 원문에는 Mongo 타임아웃의
    // Atlas 토폴로지나 스택 유래 문자열이 섞이고, 이 라우트는 결제 경로라 노출 대가가 크다.
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "app-store",
        requestPath: `/api/app-store${path || ""}`,
        method: request?.method || "",
      },
    });
  }
}

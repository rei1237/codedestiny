import { connectDb, mongoose } from "../lib/db.js";
import { getEnv } from "../lib/env.js";
import { Payment, User } from "../lib/models.js";
import { requireAuth } from "../lib/auth.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getBillingFeaturePricing, listBillingFeatures } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";

const GOOGLE_ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
let cachedGoogleAccessToken = null;

function cleanText(value) {
  return String(value || "").trim();
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

function resolveProduct(pricing, env, body = {}) {
  const featureKey = cleanText(pricing?.featureKey || body.featureKey);
  const map = readProductMap(env);
  const mapped = map[featureKey] || map[productKey(featureKey)] || null;
  const prefix = cleanText(getEnv(env, "GOOGLE_PLAY_PRODUCT_PREFIX")) || "code_destiny";
  const mappedProductId = typeof mapped === "string" ? mapped : (mapped?.productId || mapped?.id);
  const mappedProductType = typeof mapped === "object" && mapped ? mapped.productType : "";
  const productId = cleanText(mappedProductId || `${prefix}.${productKey(featureKey)}`);
  const productType = normalizeGoogleProductType(mappedProductType || body.productType);
  return {
    provider: "GOOGLE_PLAY",
    productId,
    productType,
    featureKey,
    subscriptionTier: cleanText(mapped?.subscriptionTier || body.subscriptionTier),
  };
}

function listProductResolveCandidates() {
  const listed = listBillingFeatures();
  const candidates = [];
  if (Array.isArray(listed?.legacyFeatureTable)) candidates.push(...listed.legacyFeatureTable);
  if (Array.isArray(listed?.categories)) {
    for (const category of listed.categories) {
      candidates.push(category);
      if (Array.isArray(category?.subFeatures)) candidates.push(...category.subFeatures);
    }
  }
  return candidates;
}

function resolveProductByProductId(env, body = {}) {
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
    if (product.productId === requestedProductId) return { pricing, product };
  }

  const map = readProductMap(env);
  for (const [mapKey, mapped] of Object.entries(map)) {
    const mappedProductId = cleanText(typeof mapped === "string" ? mapped : (mapped?.productId || mapped?.id));
    if (!mappedProductId || mappedProductId !== requestedProductId) continue;
    const featureKey = cleanText(typeof mapped === "object" && mapped ? mapped.featureKey : "") || cleanText(mapKey);
    const pricing = resolvePricing({ ...body, featureKey });
    const product = resolveProduct(pricing, env, { ...body, featureKey });
    if (product.productId === requestedProductId) return { pricing, product };
  }

  for (const feature of listProductResolveCandidates()) {
    try {
      const featureKey = cleanText(feature?.featureKey);
      if (!featureKey) continue;
      const pricing = resolvePricing({ ...body, featureKey });
      const product = resolveProduct(pricing, env, { ...body, featureKey });
      if (product.productId === requestedProductId) return { pricing, product };
    } catch (e) {
      void e;
    }
  }

  const error = new Error("Google Play product is not mapped to a server billing feature.");
  error.code = "APP_STORE_PRODUCT_MAP_REQUIRED";
  error.status = 400;
  throw error;
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
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { unlockedFeatures: product.featureKey, paidFeatures: product.featureKey } },
      { returnDocument: "after", projection: { points: 1, unlockedFeatures: 1, profileSubscription: 1 } },
    ).lean();
    return { payment: existing, user, requestId, idempotent: true };
  }

  const payment = await Payment.create({
    userId,
    impUid,
    merchantUid,
    idempotencyKey: cleanText(body.idempotencyKey || requestId),
    paymentAmount: Number(pricing.amountKRW || pricing.cashPrice || 0),
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
    paymentType: product.productType === "subs" ? "membership_pass" : "digital_content",
    subscriptionTier: product.subscriptionTier || "",
    rawPortOne: {
      provider: "GOOGLE_PLAY",
      purchaseTokenHash: tokenHash,
      googlePurchase,
    },
  });

  const update = {
    $addToSet: {
      unlockedFeatures: product.featureKey,
      paidFeatures: product.featureKey,
    },
  };
  if (product.productType === "subs" && product.subscriptionTier) {
    const expiresAt = googlePurchase?.expiryTimeMillis
      ? new Date(Number(googlePurchase.expiryTimeMillis))
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    update.$set = {
      "profileSubscription.tier": product.subscriptionTier,
      "profileSubscription.source": "card",
      "profileSubscription.planId": product.productId,
      "profileSubscription.productType": "membership_pass",
      "profileSubscription.passTier": product.subscriptionTier,
      "profileSubscription.status": "active",
      "profileSubscription.subscriptionStatus": "active",
      "profileSubscription.membershipStatus": "active",
      "profileSubscription.startedAt": now,
      "profileSubscription.expiresAt": expiresAt,
      "profileSubscription.paymentMethod": "GOOGLE_PLAY",
      "profileSubscription.lastBillingAt": now,
      "profileSubscription.lastBillingStatus": "success",
    };
  }
  const user = await User.findByIdAndUpdate(userId, update, {
    returnDocument: "after",
    projection: { points: 1, unlockedFeatures: 1, profileSubscription: 1 },
  }).lean();

  return { payment: payment.toObject ? payment.toObject() : payment, user, requestId, idempotent: false };
}

async function handleGoogleVerify(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const pricing = resolvePricing(body);
  const product = resolveProduct(pricing, env, body);
  const requestedProductId = cleanText(body.productId);
  const purchaseToken = cleanText(body.purchaseToken);
  const packageName = cleanText(body.packageName || getEnv(env, "GOOGLE_PLAY_PACKAGE_NAME") || getEnv(env, "CODE_DESTINY_ANDROID_PACKAGE_ID") || "com.codedestiny.app");

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
  const persisted = await persistGooglePurchase({
    auth,
    env,
    pricing,
    product,
    body: { ...body, packageName },
    googlePurchase,
  });
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
        amountKRW: Number(pricing.amountKRW || pricing.cashPrice || 0),
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

        const { pricing, product } = resolveProductByProductId(env, {
          ...body,
          ...nativePurchase,
          productId,
          productType,
        });
        const googlePurchase = await verifyGooglePurchase(env, {
          packageName,
          productId: product.productId,
          productType: product.productType,
          purchaseToken,
        });
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
        restoredPurchases.push({
          id: String(persisted.payment?._id || ""),
          featureKey: product.featureKey,
          productId: product.productId,
          productType: product.productType,
          acknowledged: acknowledged || isAcknowledgedPurchase(googlePurchase),
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
  const featureKeys = Array.from(new Set(rows.map((row) => cleanText(row.featureKey)).filter(Boolean)));
  if (featureKeys.length) {
    await User.findByIdAndUpdate(
      auth.userId,
      { $addToSet: { unlockedFeatures: { $each: featureKeys }, paidFeatures: { $each: featureKeys } } },
    );
  }
  for (const purchase of restoredPurchases) {
    const featureKey = cleanText(purchase.featureKey);
    if (featureKey && !featureKeys.includes(featureKey)) featureKeys.push(featureKey);
  }
  return json({
    ok: true,
    data: {
      provider: "GOOGLE_PLAY",
      restoredFeatures: featureKeys,
      purchases: [
        ...restoredPurchases,
        ...rows.map((row) => ({
          id: String(row._id || ""),
          featureKey: row.featureKey,
          productId: row.productId,
          productType: row.paymentType === "membership_pass" ? "subs" : "inapp",
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
  if (authHeader === expected || channelToken === expected) return;
  const error = new Error("Google Play RTDN token is invalid.");
  error.code = "GOOGLE_PLAY_RTDN_UNAUTHORIZED";
  error.status = 401;
  throw error;
}

function extractGoogleRtdnNotification(body) {
  const decoded = decodeBase64Json(body?.message?.data);
  const subscription = decoded?.subscriptionNotification || null;
  const oneTime = decoded?.oneTimeProductNotification || null;
  return {
    raw: decoded,
    packageName: cleanText(decoded?.packageName),
    purchaseToken: cleanText(subscription?.purchaseToken || oneTime?.purchaseToken),
    productId: cleanText(subscription?.subscriptionId || oneTime?.sku),
    productType: subscription ? "subs" : "inapp",
    notificationType: subscription?.notificationType || oneTime?.notificationType || "",
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
      "profileSubscription.status": "active",
      "profileSubscription.subscriptionStatus": "active",
      "profileSubscription.membershipStatus": "active",
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
  await Payment.findByIdAndUpdate(payment._id, {
    $set: {
      status: "cancelled",
      orderState: "CANCELLED",
      "metadata.googlePurchase": googlePurchase || null,
      "metadata.googleRtdn": notification.raw,
      "rawPortOne.googlePurchase": googlePurchase || null,
      "rawPortOne.googleRtdn": notification.raw,
    },
  });
  const update = featureKey
    ? { $pull: { unlockedFeatures: featureKey, paidFeatures: featureKey } }
    : {};
  if (notification.productType === "subs") {
    update.$set = {
      "profileSubscription.status": "cancelled",
      "profileSubscription.subscriptionStatus": "cancelled",
      "profileSubscription.membershipStatus": "cancelled",
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
  if (!notification.purchaseToken) {
    return json({ ok: true, data: { provider: "GOOGLE_PLAY", ignored: true, reason: "purchaseToken_missing" } });
  }

  await connectDb(env);
  const tokenHash = await purchaseTokenHash(notification.purchaseToken);
  const payment = await Payment.findOne({ impUid: `google:${tokenHash}` }).lean();
  if (!payment) {
    return json({ ok: true, data: { provider: "GOOGLE_PLAY", ignored: true, reason: "payment_not_found" } });
  }

  const packageName = notification.packageName
    || cleanText(getEnv(env, "GOOGLE_PLAY_PACKAGE_NAME") || getEnv(env, "CODE_DESTINY_ANDROID_PACKAGE_ID") || "com.codedestiny.app");
  const productId = notification.productId || cleanText(payment.productId || payment.pricingSnapshot?.productId);
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
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "app-store",
        requestPath: `/api/app-store${path || ""}`,
        method: request?.method || "",
      },
      exposeMessage: true,
    });
  }
}

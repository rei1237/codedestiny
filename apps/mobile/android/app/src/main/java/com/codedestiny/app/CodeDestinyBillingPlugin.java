package com.codedestiny.app;

import android.os.Handler;
import android.os.Looper;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "CodeDestinyBilling")
public class CodeDestinyBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final int MAX_CONNECTION_RETRIES = 3;
    private static final long CONNECTION_RETRY_BASE_DELAY_MS = 500L;

    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;
    private String pendingProductId;
    private String pendingProductType;

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = clean(call.getString("productId"));
        String productType = normalizeProductType(call.getString("productType"));
        if (productId.isEmpty()) {
            call.reject("productId is required.", "PRODUCT_ID_REQUIRED");
            return;
        }
        if (pendingPurchaseCall != null) {
            call.reject("Another purchase is already in progress.", "PURCHASE_IN_PROGRESS");
            return;
        }

        runWhenBillingReady(call, () -> queryAndLaunchPurchase(call, productId, productType));
    }

    /**
     * 소모(consume). 회당 결제(PER_USE) 상품은 서버 검증·지급이 끝난 뒤 반드시 소비해야
     * 같은 상품을 다시 살 수 있다. 소비하지 않으면 다음 구매가 ITEM_ALREADY_OWNED로 막힌다.
     * 가격대 티어 SKU를 쓰므로 같은 티어의 '다른 기능'까지 함께 막힌다.
     */
    @PluginMethod
    public void consume(PluginCall call) {
        String purchaseToken = clean(call.getString("purchaseToken"));
        if (purchaseToken.isEmpty()) {
            call.reject("purchaseToken is required.", "PURCHASE_TOKEN_REQUIRED");
            return;
        }
        runWhenBillingReady(call, () -> billingClient.consumeAsync(
                ConsumeParams.newBuilder().setPurchaseToken(purchaseToken).build(),
                (billingResult, outToken) -> {
                    if (!isOk(billingResult)) {
                        rejectWithBillingResult(call, billingResult, "PURCHASE_CONSUME_FAILED");
                        return;
                    }
                    JSObject result = new JSObject();
                    result.put("ok", true);
                    result.put("purchaseToken", clean(outToken));
                    call.resolve(result);
                }));
    }

    /**
     * 영구 해금(UNLOCK) 상품의 승인. 서버가 Play Developer API로 먼저 승인하므로 보통은
     * 쓰이지 않지만, 서버 승인이 실패한 구매를 클라이언트에서 복구할 때 필요하다.
     * (3일 내 승인되지 않은 구매는 Google이 자동 환불한다)
     */
    @PluginMethod
    public void acknowledge(PluginCall call) {
        String purchaseToken = clean(call.getString("purchaseToken"));
        if (purchaseToken.isEmpty()) {
            call.reject("purchaseToken is required.", "PURCHASE_TOKEN_REQUIRED");
            return;
        }
        runWhenBillingReady(call, () -> billingClient.acknowledgePurchase(
                AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchaseToken).build(),
                (billingResult) -> {
                    if (!isOk(billingResult)) {
                        rejectWithBillingResult(call, billingResult, "PURCHASE_ACKNOWLEDGE_FAILED");
                        return;
                    }
                    JSObject result = new JSObject();
                    result.put("ok", true);
                    call.resolve(result);
                }));
    }

    /**
     * 상품 조회. 화면에 표시하는 가격은 하드코딩이 아니라 여기서 받은 formattedPrice여야 한다
     * — Play Console에서 가격을 바꿔도 앱 표시가 따라간다.
     */
    @PluginMethod
    public void queryProducts(PluginCall call) {
        JSArray requested = call.getArray("productIds");
        String productType = normalizeProductType(call.getString("productType"));
        List<String> productIds = new ArrayList<>();
        if (requested != null) {
            try {
                for (Object item : requested.toList()) {
                    String productId = clean(String.valueOf(item));
                    if (!productId.isEmpty()) productIds.add(productId);
                }
            } catch (Exception e) {
                call.reject("productIds must be an array of strings.", "PRODUCT_IDS_INVALID");
                return;
            }
        }
        if (productIds.isEmpty()) {
            call.reject("productIds is required.", "PRODUCT_IDS_REQUIRED");
            return;
        }

        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String productId : productIds) {
            products.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(productType)
                    .build());
        }

        runWhenBillingReady(call, () -> billingClient.queryProductDetailsAsync(
                QueryProductDetailsParams.newBuilder().setProductList(products).build(),
                (billingResult, queryResult) -> {
                    if (!isOk(billingResult)) {
                        rejectWithBillingResult(call, billingResult, "PRODUCT_QUERY_FAILED");
                        return;
                    }
                    JSArray payloads = new JSArray();
                    List<ProductDetails> details = queryResult.getProductDetailsList();
                    if (details != null) {
                        for (ProductDetails detail : details) payloads.put(buildProductPayload(detail, productType));
                    }
                    JSObject result = new JSObject();
                    result.put("ok", true);
                    result.put("provider", "GOOGLE_PLAY");
                    result.put("products", payloads);
                    call.resolve(result);
                }));
    }

    @PluginMethod
    public void restore(PluginCall call) {
        String productType = normalizeRestoreProductType(call.getString("productType"));
        runWhenBillingReady(call, () -> {
            if ("all".equals(productType)) {
                queryAllPurchases(call);
                return;
            }
            queryPurchases(call, productType);
        });
    }

    private void queryAndLaunchPurchase(PluginCall call, String productId, String productType) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(productType)
                .build();
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(product))
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, queryResult) -> {
            if (!isOk(billingResult)) {
                rejectWithBillingResult(call, billingResult, "PRODUCT_QUERY_FAILED");
                return;
            }

            List<ProductDetails> products = queryResult.getProductDetailsList();
            if (products == null || products.isEmpty()) {
                call.reject("Google Play product was not found.", "PRODUCT_NOT_FOUND");
                return;
            }

            ProductDetails details = products.get(0);
            BillingFlowParams.ProductDetailsParams.Builder detailsParams =
                    BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details);

            if (BillingClient.ProductType.SUBS.equals(productType)) {
                List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
                if (offers == null || offers.isEmpty() || clean(offers.get(0).getOfferToken()).isEmpty()) {
                    call.reject("Google Play subscription offer was not found.", "SUBSCRIPTION_OFFER_NOT_FOUND");
                    return;
                }
                detailsParams.setOfferToken(offers.get(0).getOfferToken());
            }

            BillingFlowParams.Builder flowBuilder = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(Collections.singletonList(detailsParams.build()));

            // 계정 귀속. 서버가 purchases.get의 obfuscatedExternalAccountId를 로그인 유저와
            // 대조해, 남의 구매 토큰을 먼저 POST해 콘텐츠를 가로채는 것을 막는다.
            String obfuscatedAccountId = clean(call.getString("obfuscatedAccountId"));
            if (!obfuscatedAccountId.isEmpty()) flowBuilder.setObfuscatedAccountId(obfuscatedAccountId);
            // 티어 SKU라 productId만으로는 어떤 기능을 사려던 건지 모른다 — 고아 구매 복구 시
            // 서버 intent 기록과 교차 확인할 보조 단서로 featureKey를 실어 보낸다.
            String obfuscatedProfileId = clean(call.getString("obfuscatedProfileId"));
            if (!obfuscatedProfileId.isEmpty()) flowBuilder.setObfuscatedProfileId(obfuscatedProfileId);

            BillingFlowParams flowParams = flowBuilder.build();

            getActivity().runOnUiThread(() -> {
                pendingPurchaseCall = call;
                pendingProductId = productId;
                pendingProductType = productType;
                BillingResult launchResult = billingClient.launchBillingFlow(getActivity(), flowParams);
                if (!isOk(launchResult)) {
                    clearPendingPurchase();
                    rejectWithBillingResult(call, launchResult, "PURCHASE_FLOW_FAILED");
                }
            });
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        if (call == null) return;

        if (!isOk(billingResult)) {
            clearPendingPurchase();
            rejectWithBillingResult(call, billingResult, billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED
                    ? "USER_CANCELED"
                    : "PURCHASE_FAILED");
            return;
        }

        String productType = pendingProductType;
        Purchase purchase = findPurchase(purchases, pendingProductId);
        clearPendingPurchase();
        if (purchase == null) {
            call.reject("Google Play purchase result was empty.", "PURCHASE_RESULT_EMPTY");
            return;
        }

        JSObject result = buildPurchasePayload(purchase, productType);
        result.put("ok", true);
        call.resolve(result);
    }

    private void queryPurchases(PluginCall call, String productType) {
        billingClient.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(productType).build(),
                (billingResult, purchases) -> {
                    if (!isOk(billingResult)) {
                        rejectWithBillingResult(call, billingResult, "PURCHASE_RESTORE_FAILED");
                        return;
                    }
                    resolveRestoreResult(call, purchases, productType);
                });
    }

    private void queryAllPurchases(PluginCall call) {
        billingClient.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                (inappResult, inappPurchases) -> {
                    if (!isOk(inappResult)) {
                        rejectWithBillingResult(call, inappResult, "PURCHASE_RESTORE_FAILED");
                        return;
                    }
                    billingClient.queryPurchasesAsync(
                            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
                            (subsResult, subsPurchases) -> {
                                if (!isOk(subsResult)) {
                                    rejectWithBillingResult(call, subsResult, "PURCHASE_RESTORE_FAILED");
                                    return;
                                }
                                JSArray payloads = new JSArray();
                                appendPurchasePayloads(payloads, inappPurchases, BillingClient.ProductType.INAPP);
                                appendPurchasePayloads(payloads, subsPurchases, BillingClient.ProductType.SUBS);
                                resolveRestorePayloads(call, payloads);
                            });
                });
    }

    private void resolveRestoreResult(PluginCall call, List<Purchase> purchases, String productType) {
        JSArray payloads = new JSArray();
        if (purchases != null) {
            for (Purchase purchase : purchases) {
                payloads.put(buildPurchasePayload(purchase, productType));
            }
        }
        resolveRestorePayloads(call, payloads);
    }

    private void appendPurchasePayloads(JSArray payloads, List<Purchase> purchases, String productType) {
        if (purchases == null) return;
        for (Purchase purchase : purchases) {
            payloads.put(buildPurchasePayload(purchase, productType));
        }
    }

    private void resolveRestorePayloads(PluginCall call, JSArray payloads) {
        JSObject result = new JSObject();
        result.put("ok", true);
        result.put("provider", "GOOGLE_PLAY");
        result.put("packageName", getContext().getPackageName());
        result.put("purchases", payloads);
        call.resolve(result);
    }

    private void runWhenBillingReady(PluginCall call, Runnable onReady) {
        if (billingClient != null && billingClient.isReady()) {
            onReady.run();
            return;
        }

        if (billingClient == null) {
            billingClient = BillingClient.newBuilder(getContext())
                    .setListener(this)
                    .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                    .build();
        }

        connectWithRetry(call, onReady, 0);
    }

    /**
     * Play 스토어 서비스는 기기 부팅 직후나 업데이트 중 일시적으로 붙지 않는다.
     * 한 번 실패했다고 결제를 포기하면 사용자에겐 "결제가 안 되는 앱"이 된다.
     */
    private void connectWithRetry(PluginCall call, Runnable onReady, int attempt) {
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (isOk(billingResult)) {
                    onReady.run();
                    return;
                }
                if (attempt >= MAX_CONNECTION_RETRIES || !isRetriableSetupFailure(billingResult)) {
                    rejectWithBillingResult(call, billingResult, "BILLING_SETUP_FAILED");
                    return;
                }
                new Handler(Looper.getMainLooper()).postDelayed(
                        () -> connectWithRetry(call, onReady, attempt + 1),
                        CONNECTION_RETRY_BASE_DELAY_MS * (1L << attempt));
            }

            @Override
            public void onBillingServiceDisconnected() {
                // 다음 호출의 runWhenBillingReady가 isReady()==false를 보고 다시 연결한다.
            }
        });
    }

    private boolean isRetriableSetupFailure(BillingResult result) {
        if (result == null) return true;
        int code = result.getResponseCode();
        // 기기가 Play Billing 자체를 지원하지 않는 경우는 재시도해도 소용없다.
        return code != BillingClient.BillingResponseCode.BILLING_UNAVAILABLE
                && code != BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED;
    }

    private Purchase findPurchase(List<Purchase> purchases, String productId) {
        if (purchases == null || purchases.isEmpty()) return null;
        for (Purchase purchase : purchases) {
            if (purchase.getProducts().contains(productId)) return purchase;
        }
        return purchases.get(0);
    }

    private String firstProductId(Purchase purchase) {
        List<String> products = purchase.getProducts();
        return products == null || products.isEmpty() ? "" : products.get(0);
    }

    private String normalizeProductType(String raw) {
        return "subs".equalsIgnoreCase(clean(raw)) ? BillingClient.ProductType.SUBS : BillingClient.ProductType.INAPP;
    }

    private String normalizeRestoreProductType(String raw) {
        return "all".equalsIgnoreCase(clean(raw)) ? "all" : normalizeProductType(raw);
    }

    private JSObject buildProductPayload(ProductDetails details, String productType) {
        JSObject result = new JSObject();
        result.put("productId", clean(details.getProductId()));
        result.put("productType", productType);
        result.put("title", clean(details.getTitle()));
        result.put("name", clean(details.getName()));
        result.put("description", clean(details.getDescription()));
        // 화면 표시는 반드시 이 값을 쓴다 — 통화 기호·자릿수까지 Play가 로케일에 맞춰 준다.
        ProductDetails.OneTimePurchaseOfferDetails oneTime = details.getOneTimePurchaseOfferDetails();
        if (oneTime != null) {
            result.put("formattedPrice", clean(oneTime.getFormattedPrice()));
            result.put("priceAmountMicros", oneTime.getPriceAmountMicros());
            result.put("priceCurrencyCode", clean(oneTime.getPriceCurrencyCode()));
        }
        return result;
    }

    private JSObject buildPurchasePayload(Purchase purchase, String productType) {
        JSObject result = new JSObject();
        result.put("provider", "GOOGLE_PLAY");
        result.put("productId", firstProductId(purchase));
        result.put("productType", productType);
        result.put("packageName", getContext().getPackageName());
        result.put("purchaseToken", purchase.getPurchaseToken());
        result.put("orderId", purchase.getOrderId());
        result.put("purchaseState", purchase.getPurchaseState());
        result.put("acknowledged", purchase.isAcknowledged());
        result.put("signature", purchase.getSignature());
        result.put("originalJson", purchase.getOriginalJson());
        return result;
    }

    private boolean isOk(BillingResult result) {
        return result != null && result.getResponseCode() == BillingClient.BillingResponseCode.OK;
    }

    private void rejectWithBillingResult(PluginCall call, BillingResult result, String code) {
        String message = result == null || clean(result.getDebugMessage()).isEmpty()
                ? "Google Play Billing request failed."
                : result.getDebugMessage();
        call.reject(message, code);
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private void clearPendingPurchase() {
        pendingPurchaseCall = null;
        pendingProductId = "";
        pendingProductType = "";
    }
}

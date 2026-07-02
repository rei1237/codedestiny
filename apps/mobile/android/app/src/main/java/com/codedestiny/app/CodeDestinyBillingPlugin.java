package com.codedestiny.app;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
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

import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "CodeDestinyBilling")
public class CodeDestinyBillingPlugin extends Plugin implements PurchasesUpdatedListener {
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

            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(Collections.singletonList(detailsParams.build()))
                    .build();

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

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (!isOk(billingResult)) {
                    rejectWithBillingResult(call, billingResult, "BILLING_SETUP_FAILED");
                    return;
                }
                onReady.run();
            }

            @Override
            public void onBillingServiceDisconnected() {
            }
        });
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

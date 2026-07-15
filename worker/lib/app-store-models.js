// 앱(Google Play) 전용 DB 스키마.
//
// worker/lib/models.js(웹·앱 공용)는 건드리지 않는다. mongoose 모델 레지스트리는 전역이라
// 여기서 등록해도 동일하게 동작한다.

import { mongoose } from "./db.js";

// 결제 의도(intent). launchBillingFlow 직전에 기록한다.
//
// 앱은 가격대 티어 SKU를 쓰므로 productId 하나에 여러 featureKey가 매달린다
// (예: cd_content_tier_02 ← 50코인 기능 54개). 따라서 구매 토큰만으로는 "무엇을 사려던
// 것인지" 역해석할 수 없다. 결제 도중 앱이 죽어 verify를 못 한 고아 구매를
// queryPurchasesAsync로 복구할 때 이 기록이 유일한 단서가 된다.
const appPurchaseIntentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  featureKey: { type: String, required: true, trim: true, maxlength: 120 },
  productId: { type: String, required: true, trim: true, maxlength: 120 },
  productType: { type: String, enum: ["inapp", "subs"], default: "inapp" },
  passTier: { type: String, default: "", trim: true, maxlength: 40 },
  requestId: { type: String, default: "", trim: true, maxlength: 120 },
  profileId: { type: String, default: "", trim: true, maxlength: 120 },
  reportId: { type: String, default: "", trim: true, maxlength: 120 },
  sessionId: { type: String, default: "", trim: true, maxlength: 120 },
  // OPEN: 아직 대응되는 구매가 검증되지 않음 / SETTLED: verify 완료
  status: { type: String, enum: ["OPEN", "SETTLED"], default: "OPEN" },
  settledPurchaseTokenHash: { type: String, default: "", trim: true, maxlength: 80 },
  // expiresAt 는 아래 TTL 인덱스로만 색인한다(중복 인덱스 방지).
  expiresAt: { type: Date, required: true },
}, { timestamps: true, collection: "app_purchase_intents" });

appPurchaseIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// 고아 구매 복구 시 "이 유저가 이 상품으로 열어둔 가장 최근 의도"를 찾는 조회 경로.
appPurchaseIntentSchema.index({ userId: 1, productId: 1, status: 1, createdAt: -1 });

// NOTE: db.js는 autoIndex:false로 연결하므로 이 선언만으로는 실제 인덱스가 생성되지 않는다 —
// scripts/migrations/20260716-add-app-purchase-intent-indexes.mjs를 DB에 1회 실행할 것.
export const AppPurchaseIntent = mongoose.models.AppPurchaseIntent
  || mongoose.model("AppPurchaseIntent", appPurchaseIntentSchema);

export const APP_PURCHASE_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

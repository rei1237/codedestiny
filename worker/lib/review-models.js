// 사용자 리뷰 전용 DB 스키마.
//
// worker/lib/models.js(웹·앱 공용)는 건드리지 않는다. mongoose 모델 레지스트리는 전역이라
// 여기서 등록해도 동일하게 동작한다(app-store-models.js 선례).

import { mongoose } from "./db.js";

export const REVIEW_STATUSES = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  HIDDEN: "hidden",
});

export const REVIEW_STATUS_LIST = Object.freeze(Object.values(REVIEW_STATUSES));

// 사용자에게 공개되는 상태는 approved 하나뿐이다. 작성 직후는 항상 pending이라
// 관리자 승인 전에는 어떤 공개 조회 경로에서도 노출되지 않는다.
export const PUBLIC_REVIEW_STATUS = REVIEW_STATUSES.APPROVED;

const reviewSchema = new mongoose.Schema({
  // 작성자 — userId는 String(ContentEntitlement/PaidExecutionRecord 계열과 통일).
  // 관리자가 임의 닉네임으로 시딩한 리뷰는 userId가 빈 문자열일 수 있다.
  userId: { type: String, default: "", trim: true, maxlength: 120 },
  // authorName/authorImage는 스냅샷이다. User 문서가 바뀌거나 탈퇴해도 리뷰 카드가
  // 깨지지 않도록 작성 시점 값을 박아둔다(Insight.authorName 선례).
  authorName: { type: String, required: true, trim: true, maxlength: 40 },
  authorImage: { type: String, default: "", trim: true, maxlength: 500 },

  // 상품 — 리뷰는 그룹(productId) 단위로 모으고, 실제 결제된 세부 키는 따로 남긴다.
  productId: { type: String, required: true, trim: true, maxlength: 80 },
  // productName도 스냅샷이다. paid-feature-registry의 reason은 변경 가능하고 일부는
  // 영문("Section daewun unlock")이라 표시명으로 쓸 수 없다.
  productName: { type: String, required: true, trim: true, maxlength: 120 },
  featureKey: { type: String, default: "", trim: true, maxlength: 120 },
  orderId: { type: String, default: "", trim: true, maxlength: 160 },

  // 내용
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, default: "", trim: true, maxlength: 60 },
  body: { type: String, required: true, trim: true, maxlength: 1000 },
  locale: { type: String, enum: ["ko", "ja", "zh", "en"], default: "ko" },

  // 상태
  status: { type: String, enum: REVIEW_STATUS_LIST, default: REVIEW_STATUSES.PENDING },
  // 구매 인증 배지는 "실제 구매 기록이 있다"는 사실 진술이다. 클라이언트 입력을 받지 않고
  // 서버가 review-eligibility로 재검증해 결정한다.
  isVerifiedPurchase: { type: Boolean, default: false },
  // isVerifiedPurchase 는 "돈이 오갔다", usageSource 는 "그 기록의 성격"이다.
  // 🔴 둘을 한 불리언에 뭉개지 말 것 — isVerifiedPurchase:false 는 지금 운영진 시딩
  // (createdByAdmin:true, 이용 기록 없음)을 뜻하는데, 여기에 다른 뜻을 얹으면 화면에서
  // 구분이 사라진다. 배지 분기는 반드시 usageSource 로 하고 !isVerifiedPurchase 로 하지 말 것.
  // "free"(무료 이용 기록으로 얻은 자격)는 아직 쓰이지 않는다 — 그 소스를 만드는 작업이
  // 뒤따르므로 enum 만 미리 열어 둔다. 값을 쓰는 코드가 없어 이 PR 의 동작은 변하지 않는다.
  usageSource: { type: String, enum: ["", "purchase", "free"], default: "" },
  createdByAdmin: { type: Boolean, default: false },

  // 검수 + 향후 AI 검수 확장 슬롯
  approvedAt: { type: Date, default: null },
  reviewedBy: { type: String, default: "", trim: true, maxlength: 120 },
  adminNote: { type: String, default: "", trim: true, maxlength: 500 },
  autoFlagReasons: { type: [String], default: [] },
  aiReviewScore: { type: Number, default: null },
  aiFlagReason: { type: String, default: "", trim: true, maxlength: 300 },

  // ── 후기 작성 보상(월정석). 승인(status:"approved") 전환 시 1회 자동 지급된다.
  // ledgerSourceId 가 MonthlyCreditLedger 의 sourceId 와 같아 같은 리뷰를 반려했다가 다시
  // 승인해도 중복 지급되지 않는다(grantMonthlyCreditLotDetailed 의 lotId 멱등).
  // 🔴 feedback-models.js 의 bugReward 와 같은 모양이다 — 형태를 갈라 두면 두 보상의
  // 회계 조회가 갈라진다. 지급 로직 정본은 worker/lib/review-reward.js 하나다.
  reviewReward: {
    granted: { type: Boolean, default: false },
    amount: { type: Number, default: 0, min: 0 },
    grantedAt: { type: Date, default: null },
    grantedBy: { type: String, default: "", trim: true, maxlength: 120 },
    ledgerSourceId: { type: String, default: "", trim: true, maxlength: 160 },
  },

  // 노출 시각. 관리자가 임의로 지정할 수 있어야 하므로 createdAt과 분리한다.
  displayedAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: "reviews" });

// 공개 목록(전체 / 상품별 / 평점순)
reviewSchema.index({ status: 1, displayedAt: -1 });
reviewSchema.index({ productId: 1, status: 1, displayedAt: -1 });
reviewSchema.index({ productId: 1, status: 1, rating: -1 });
// 관리자 검수 대기열
reviewSchema.index({ status: 1, createdAt: -1 });
// 사용자 1인 1상품 1리뷰. 관리자 시딩(createdByAdmin)과 익명 닉네임(userId 빈값)은 제외한다.
reviewSchema.index(
  { userId: 1, productId: 1 },
  {
    name: "user_product_unique_nonadmin",
    unique: true,
    partialFilterExpression: {
      createdByAdmin: false,
      userId: { $type: "string", $gt: "" },
    },
  },
);

// NOTE: db.js는 autoIndex:false로 연결하므로 이 선언만으로는 실제 인덱스가 생성되지 않는다 —
// scripts/migrations/20260729-add-review-indexes.mjs를 DB에 1회 실행할 것.
// 실행 전에는 1인 1리뷰 unique 제약이 걸리지 않는다.
export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export const REVIEW_BODY_MIN_LENGTH = 20;
export const REVIEW_BODY_MAX_LENGTH = 1000;
export const REVIEW_TITLE_MAX_LENGTH = 60;

import { mongoose } from "./db.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

// recentConsumeRequestIds(멱등 마커)를 최근 N개로 제한한다. 상한이 없으면 무제한 누적되는데,
// 이 배열은 결제 차감 핫패스에서 매 재시도마다 통째로 조회된다(applyLotDeduction). 특히 이용권
// 무료 통과도 마커를 남겨 돈 한 푼 안 쓰고 배열이 계속 커진다.
// 강제 수단은 $slice뿐이다: 스키마 배열 validator는 findOneAndUpdate 같은 업데이트 연산자에서 실행되지 않는다.
// (예전에는 같은 User 문서를 쓰는 레거시 Express 의 $slice 수치와 맞춰야 했다. 그쪽은 삭제됐고,
//  이제 이 컬렉션에 쓰는 곳은 워커 하나뿐이라 이 상수가 유일한 정본이다.)
export const RECENT_CONSUME_REQUEST_ID_CAP = 200;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: emailRegex },
  profileImage: { type: String, default: "", trim: true },
  // 평문 01… 과 AES-256-GCM 봉투(v1:<iv_b64>:<ct_b64>) 두 형태를 함께 허용한다.
  // 신규 쓰기는 항상 봉투(worker/lib/pii-crypto.js)지만, 마이그레이션 전 기존 행은 평문이라
  // 어느 한쪽만 허용하면 그쪽이 곧바로 저장/검증 실패가 된다.
  phoneNumber: { type: String, default: "", trim: true, match: /^$|^01\d{8,9}$|^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/ },
  phoneUpdatedAt: { type: Date },
  // 🔴 번호 중복을 판정하는 필드(해시 등)를 여기 만들지 말 것 — 한 번호로 계정을 여러 개 만드는
  // 것을 허용하기로 했으므로(2026-08-19) 비교용 값은 목적 없는 식별자가 되고, 개인정보처리방침에
  // 적을 수집 목적이 없어진다. 가족 공용 번호가 막히던 문제도 이 결정으로 사라졌다.
  // 번호의 출처. 카카오 심사 대응("공급자가 준 값인가, 자체 가입에서 받은 값인가")을 실측으로
  // 답하기 위한 기록이며 권한·게이팅 판정에는 쓰지 않는다.
  // 🔴 phoneVerified 류 필드를 여기 만들지 말 것 — 이 서비스에는 SMS/OTP·본인확인 절차가
  // 아예 없어서(2026-08-19 전수 검색) "검증됨"을 주장하는 순간 그 필드가 거짓이 된다.
  phoneSource: { type: String, enum: ["", "signup", "social", "checkout"], default: "" },
  passwordHash: { type: String, required: false, default: "", select: false },
  birthDate: { type: String, default: "", match: /^$|^\d{4}-\d{2}-\d{2}$/ },
  birthTime: { type: String, default: "", match: /^$|^(?:[01]\d|2[0-3]):[0-5]\d$/ },
  gender: { type: String, enum: ["", "M", "F", "OTHER"], default: "" },
  joinedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "withdrawn"], default: "active", index: true },
  withdrawnAt: { type: Date, default: null },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  points: { type: Number, default: 0, min: 0 },
  recentConsumeRequestIds: { type: [String], default: [] },
  unlockedFeatures: { type: [String], default: [] },
  paidFeatures: { type: [String], default: [] },
  licenses: {
    standard: { type: Number, default: 0, min: 0 },
    premium: { type: Number, default: 0, min: 0 },
    vvip: { type: Number, default: 0, min: 0 },
    status: { type: String, default: "", trim: true },
    expiresAt: { type: Date, default: null },
  },
  localAuth: {
    enabled: { type: Boolean, default: true },
    activatedAt: { type: Date, default: Date.now },
  },
  legalConsents: {
    termsVersion: { type: String, default: "", trim: true },
    termsAcceptedAt: { type: Date, default: null },
    privacyVersion: { type: String, default: "", trim: true },
    privacyAcceptedAt: { type: Date, default: null },
    age14AttestedAt: { type: Date, default: null },
    // 🔴 결제용 휴대폰 번호 동의는 첫 단건결제 모달에서 별도로 받으므로 위 가입 동의와
    // 분리해 기록한다(개인정보 보호법 제22조: 받은 사실을 입증할 수 있어야 한다).
    // 이 두 필드가 없으면 "고지하고 동의를 받은 뒤 저장했다"를 증명할 근거가 남지 않는다.
    phoneVersion: { type: String, default: "", trim: true },
    phoneAcceptedAt: { type: Date, default: null },
  },
  // 만 14세 미만 가입자의 법정대리인 동의 기록 (개인정보보호법 제22조의2).
  // 만 14세 이상 계정에는 이 필드가 아예 생기지 않는다(status 기본값 "none").
  guardianConsent: {
    required: { type: Boolean, default: false },
    status: { type: String, enum: ["none", "pending", "approved", "rejected", "revoked"], default: "none" },
    method: { type: String, default: "", trim: true },
    guardianEmail: { type: String, default: "", lowercase: true, trim: true },
    requestedAt: { type: Date, default: null },
    consentedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    consentIp: { type: String, default: "", trim: true },
  },
  socialAccounts: {
    google: {
      id: { type: String, default: "" },
      connectedAt: { type: Date, default: null },
    },
    naver: {
      id: { type: String, default: "" },
      connectedAt: { type: Date, default: null },
    },
    kakao: {
      id: { type: String, default: "" },
      connectedAt: { type: Date, default: null },
    },
  },
  destinyProfiles: { type: [mongoose.Schema.Types.Mixed], default: [] },
  destinyProfilesCurrentId: { type: String, default: "" },
  destinyProfilesCurrentIdUpdatedAt: { type: Date, default: null },
  destinyProfilesLockedCurrentId: { type: String, default: "" },
  destinyProfilesLockedAt: { type: Date, default: null },
  tamagotchi: { type: mongoose.Schema.Types.Mixed, default: null },
  twoFA: {
    enabled: { type: Boolean, default: false, index: true },
    totpSecret: { type: String, default: "" },
    backupCodesHash: { type: [String], default: [] },
  },
  adminRefreshTokenHash: { type: String, default: "" },
  adminLastActivityAt: { type: Date, default: null },
  profileSubscription: {
    tier: { type: String, enum: ["free", "standard", "premium", "vvip", "family"], default: "free" },
    source: { type: String, enum: ["coin", "card", "pass", "event"], default: "coin" },
    planId: { type: String, default: "", trim: true },
    productType: { type: String, default: "", trim: true },
    durationMonths: { type: Number, default: 0, min: 0 },
    profileLimit: { type: Number, default: 1, min: 0 },
    passTier: { type: String, enum: ["standard", "premium", "vvip", "family", ""], default: "" },
    maxCoveredCoin: { type: Number, default: 0, min: 0 },
    freeLimit: { type: Number, default: 0, min: 0 },
    passLimit: { type: Number, default: 0, min: 0 },
    membershipCreditBalance: { type: Number, default: 0, min: 0 },
    membershipCreditGranted: { type: Number, default: 0, min: 0 },
    membershipCreditUsed: { type: Number, default: 0, min: 0 },
    // 공정이용 공유 카운터: 이용권 기간당 프리미엄 상담(300코인 이상) 사용 횟수(Family
    // 10회 · VVIP 3회)와 이용권으로 커버된 거래의 월 누적 코인가 합계를 함께 담는다.
    // cycleKey 는 이용권 만료일 ISO 문자열이라, 이용권을 새로 사면 키가 바뀌어
    // 두 카운터가 자동으로 0부터 다시 센다(리셋 크론 불필요) — 리셋 트리거가 같아 키를 공유한다.
    // 판정 정본은 lib/profile-limits.js 의 resolvePremiumQuota / resolveMonthlySpendQuota.
    premiumUseCycleKey: { type: String, default: "", trim: true, maxlength: 40 },
    premiumUseCount: { type: Number, default: 0, min: 0 },
    monthlySpendCoin: { type: Number, default: 0, min: 0 },
    // 이 이용권을 켠 주문. 이용권 확정(PENDING→PAID)이 재생돼도 expiresAt 을 두 번 늘리지 않도록,
    // 신규 컨텍스트가 CAS 조건으로 함께 본다. 기존 코드는 읽지 않는다.
    lastPassOrderId: { type: String, default: "", trim: true, maxlength: 160 },
    // 월정석 지급분별(lot) 만료: 각 지급분이 지급일+30일에 개별 소멸, FIFO 차감.
    // lot 배열이 신뢰 원천이고 membershipCreditBalance는 "미만료 lot.remaining 합계" 파생 캐시.
    membershipCreditLots: {
      type: [{
        _id: false,
        lotId: { type: String, default: "", trim: true, maxlength: 180 },
        amount: { type: Number, default: 0, min: 0 },
        remaining: { type: Number, default: 0, min: 0 },
        grantedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
      }],
      default: [],
    },
    membershipCreditLotsVersion: { type: Number, default: 0, min: 0 },
    legacyCoinCreditSeeded: { type: Boolean, default: false },
    legacyCoinCreditSeededAt: { type: Date, default: null },
    legacyCoinCreditSeededPoints: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    firstSubAt: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelRequestedAt: { type: Date, default: null },
    customerUid: { type: String, default: "" },
    paymentMethod: { type: String, default: "" },
    nextBillingAt: { type: Date, default: null },
    lastBillingAt: { type: Date, default: null },
    lastBillingStatus: {
      type: String,
      enum: ["idle", "success", "failed", "cancelled"],
      default: "idle",
    },
    lastBillingError: { type: String, default: "" },
    // consumeTierPassIfAvailable(billing.js) 이 이용권 소비마다 갱신한다. default 없음은 의도적
    // — 이용권을 쓴 적 없는 계정에 빈 값을 만들지 않기 위해서다.
    updatedAt: { type: Date },
  },
  monthlySubscription: {
    active: { type: Boolean, default: false },
    status: { type: String, default: "", trim: true },
    tier: { type: String, default: "", trim: true },
    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    source: { type: String, default: "", trim: true },
  },
  has_started_paid_service: { type: Boolean, default: false, index: true },
  first_service_access_date: { type: Date, default: null },
  // 카카오 추천 보상(worker/routes/auth.js:222~486). 실제 쓰기는 전부 User.collection 네이티브
  // 드라이버라 선언 없이도 저장돼 왔지만, 선언이 없으면 mongoose 경유 쓰기가 strict 에 걸려
  // 조용히 버려진다(app-store.js 가 같은 함정에 빠져 있었다).
  // 🔴 하위 필드에 default 를 주지 않는 것은 의도적이다 — default 가 있으면 minimize 가 걷어내지
  // 못해 추천을 쓴 적 없는 전 계정에 빈 껍데기가 생긴다. 읽는 쪽은 이미 $ifNull 로 방어한다.
  referralCode: { type: String, trim: true },
  referralCodeCreatedAt: { type: Date },
  referralProgram: {
    kakaoShareRewardEnabled: { type: Boolean },
    kakaoShareLastPreparedAt: { type: Date },
    rewardDayKey: { type: String, trim: true },
    rewardedToday: { type: Number, min: 0 },
    totalRewardCredit: { type: Number, min: 0 },
    lastRewardedAt: { type: Date },
  },
  // 초대받은 쪽에 남는 보상 처리 상태. 현재 프로덕션에 데이터 0건이지만 쓰는 코드는 살아 있다.
  referralReward: {
    status: { type: String, trim: true },
    channel: { type: String, trim: true },
    referralCode: { type: String, trim: true },
    inviterUserId: { type: String, trim: true },
    capturedAt: { type: Date },
    completedAt: { type: Date },
    rewardMonthlyCredit: { type: Number, min: 0 },
  },
}, { timestamps: true });

const profileCardBirthSchema = new mongoose.Schema({
  year: { type: Number, min: 1000, max: 9999 },
  month: { type: Number, min: 1, max: 12 },
  day: { type: Number, min: 1, max: 31 },
  hour: { type: Number, min: 0, max: 23, default: 0 },
  minute: { type: Number, min: 0, max: 59, default: 0 },
  calType: {
    type: String,
    enum: ["solar", "lunar", "lunar_leap"],
    default: "solar",
  },
}, { _id: false });

const profileCardLocationSchema = new mongoose.Schema({
  label: { type: String, default: "", trim: true, maxlength: 120 },
  tz: { type: String, default: "Asia/Seoul", trim: true, maxlength: 80 },
  lng: { type: Number, default: 127.0 },
  lat: { type: Number, default: 37.5 },
}, { _id: false });

const profileCardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  profileId: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  gender: {
    type: String,
    enum: ["M", "F", "OTHER"],
    default: "OTHER",
  },
  birth: { type: profileCardBirthSchema, default: () => ({}) },
  location: { type: profileCardLocationSchema, default: () => ({}) },
}, { timestamps: true });

profileCardSchema.index({ userId: 1, profileId: 1 }, { unique: true });
profileCardSchema.index({ userId: 1, createdAt: 1 });

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  impUid: { type: String, unique: true, sparse: true, index: true, trim: true },
  merchantUid: { type: String, unique: true, sparse: true, index: true, trim: true },
  idempotencyKey: { type: String, trim: true, default: "", index: true },
  paymentAmount: { type: Number, required: true, min: 0 },
  expectedChargedPoints: { type: Number, min: 0, default: 0 },
  chargedPoints: { type: Number, required: true, min: 0, default: 0 },
  featureKey: { type: String, trim: true, default: "", index: true },
  productId: { type: String, trim: true, default: "", index: true },
  coinPrice: { type: Number, min: 0, default: 0 },
  membershipCreditCost: { type: Number, min: 0, default: 0 },
  accessType: { type: String, enum: ["", "single_purchase", "membership_credit"], default: "", index: true },
  requestId: { type: String, trim: true, default: "", index: true },
  reportId: { type: String, trim: true, default: "", index: true },
  sessionId: { type: String, trim: true, default: "", index: true },
  pricingSnapshot: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed },
  paymentMethod: { type: String, trim: true, default: "unknown" },
  status: { type: String, enum: ["pending", "paid", "processing", "success", "fulfilled", "retryable", "failed", "cancelled", "refunded"], default: "pending", index: true },
  orderState: {
    type: String,
    enum: [
      "",
      "PENDING",
      "REDIRECTED",
      "PAID_VERIFIED",
      "UNLOCKED",
      "VIRTUAL_ACCOUNT_ISSUED",
      "FAILED",
      "CANCELLED",
      "PARTIAL_CANCELLED",
      "VERIFY_FAILED",
      "ERROR",
    ],
    default: "",
    index: true,
  },
  failureCode: { type: String, trim: true, maxlength: 80 },
  failureMessage: { type: String, trim: true, maxlength: 500 },
  failureStage: { type: String, trim: true, maxlength: 80 },
  lastErrorAt: { type: Date },
  confirmAttempts: { type: Number, default: 0, min: 0 },
  paidAt: { type: Date },
  source: { type: String, enum: ["prepare", "confirm", "webhook", "system"], default: "confirm" },
  paymentType: {
    type: String,
    enum: ["point_charge", "digital_content", "membership_pass", "subscription_initial", "subscription_recurring"],
    default: "point_charge",
    index: true,
  },
  subscriptionTier: {
    type: String,
    enum: ["standard", "premium", "vvip", "family", ""],
    default: "",
  },
  rawPortOne: { type: mongoose.Schema.Types.Mixed },
  /* ── 신규 결제 컨텍스트(worker/payments/)용 3필드. 기존 코드는 읽지도 쓰지도 않는다. ──
     Atlas M0 에는 리플리카셋이 없어 트랜잭션을 못 쓴다. 그래서 주문 상태기계는 전이마다
     **단일 문서 조건부 갱신(CAS)** 으로 원자성을 얻고, 아래 세 필드가 그 CAS 의 조건이 된다. */
  // PAID→REFUNDED 는 PortOne 호출이 끼어 있어 한 번에 못 끝낸다. A) 락을 잡고 B) PG 를 부른 뒤
  // C) 정산한다. A~C 사이에 죽으면 이 타임스탬프가 만료(120s)되어 크론이 이어받는다.
  // 이중 환불은 PortOne 의 Idempotency-Key(주문 id 파생, 랜덤 금지)가 막는다.
  refundLock: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  // 지급까지 끝났는가. 크론이 "PAID 인데 이 값이 없는 주문"을 찾아 재지급하는 열쇠다.
  // 돈은 받았는데 권한이 없는 상태를 사람이 찾아내지 않아도 되게 하는 것이 목적이다.
  entitlementGrantedAt: { type: Date, default: null },
  // 구매 확인 메일(전자상거래법 제13조 계약내용 확인)을 보냈는가. 크론이 "지급까지 끝났는데
  // 이 값이 없는 최근 주문"을 찾아 보낸다. 🔴 발송 **전에** CAS 로 선점하고 실패하면 되돌린다 —
  // 보낸 뒤에 찍으면 아이솔레이트가 죽었을 때 같은 영수증이 두 번 간다.
  receiptEmailSentAt: { type: Date, default: null },
}, { timestamps: true });

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index(
  { userId: 1, idempotencyKey: 1, paymentType: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $exists: true, $type: "string", $gt: "" },
    },
  },
);

const pointHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  kind: { type: String, enum: ["charge", "deduct", "refund", "adjust", "share_reward"], required: true, index: true },
  delta: { type: Number, required: true },
  balanceAfter: { type: Number, required: true, min: 0 },
  reason: { type: String, trim: true, default: "" },
  featureKey: { type: String, trim: true, default: "" },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", index: true },
  impUid: { type: String, trim: true, index: true },
  merchantUid: { type: String, trim: true, index: true },
  // Idempotency lock for grants that must not double-credit under concurrency
  // (e.g. share reward per content/day). Only set on such grants; partial-unique below.
  dedupeKey: { type: String, trim: true, default: "" },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

pointHistorySchema.index({ userId: 1, createdAt: -1 });
pointHistorySchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      dedupeKey: { $exists: true, $type: "string", $gt: "" },
    },
  },
);
// consumption-check lookup used by worker/routes/ziwei-island-ai.js
// ({userId, kind:"deduct", featureKey}, one call site also sorts by createdAt desc).
// NOTE: db.js connects with autoIndex:false, so this declaration alone does not create the
// index in production — run `npm run migrate:point-history-feature-lookup-index` once against the DB.
pointHistorySchema.index(
  { userId: 1, kind: 1, featureKey: 1, createdAt: -1 },
  { name: "user_kind_feature_lookup" },
);

const monthlyCreditLedgerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: {
    type: String,
    enum: ["MONTHLY_CREDIT_GRANT", "MONTHLY_CREDIT_SPEND", "MONTHLY_CREDIT_EXPIRE"],
    required: true,
    index: true,
  },
  amount: { type: Number, required: true, min: 1 },
  beforeBalance: { type: Number, min: 0 },
  afterBalance: { type: Number, min: 0 },
  reason: { type: String, trim: true, default: "" },
  sourceId: { type: String, required: true, trim: true, maxlength: 180, index: true },
  serviceKey: { type: String, trim: true, default: "", maxlength: 120, index: true },
  profileId: { type: String, trim: true, default: "", maxlength: 120, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  /* 신규 결제 컨텍스트용. **default 를 주지 않는 것이 설계의 일부다** — 없는 것과 null 인 것을
     구분해야 `{ settledAt: { $exists: false } }` 로 미정산 예약행만 골라낼 수 있다.
     월정석 차감은 트랜잭션 없이 "원장 예약 → 차감 → 정산" 순으로 도는데, 예약과 차감 사이에서
     죽으면 미정산 행 + 미차감 잔액이 남는다(= 사용자는 과금되지 않았다). 그 상태는 재시도가
     안전하고, 크론이 이 표식으로 찾아 마무리한다. 반대 순서(차감 먼저)가 트랜잭션이 가리고
     있던 유일하게 나쁜 인터리빙이다 — 거기서 죽으면 기록 없이 차감만 남는다. */
  settledAt: { type: Date },
}, { timestamps: true, collection: "monthly_credit_ledger" });

monthlyCreditLedgerSchema.index(
  { userId: 1, type: 1, sourceId: 1 },
  { unique: true },
);
monthlyCreditLedgerSchema.index({ userId: 1, createdAt: -1 });

export const SAJU_LOCKED_CONTENT_KEYS = Object.freeze({
  DAEUN_ANALYSIS: "saju.daeunAnalysis",
  FULL_READING: "saju.fullReading",
  COMPATIBILITY: "saju.compatibility",
});

export const CONTENT_ENTITLEMENT_SERVICE_KEYS = Object.freeze({
  SAJU: "saju",
});

export const CONTENT_ENTITLEMENT_SCOPES = Object.freeze({
  PROFILE: "PROFILE",
  USER: "USER",
});

export const CONTENT_ENTITLEMENT_STATUSES = Object.freeze({
  ACTIVE: "ACTIVE",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
});

export const CONTENT_ENTITLEMENT_SOURCES = Object.freeze({
  COIN: "COIN",
  PAYMENT: "PAYMENT",
  PASS: "PASS",
  MONTHLY: "MONTHLY",
  ADMIN: "ADMIN",
  BACKFILL: "BACKFILL",
});

const contentEntitlementSchema = new mongoose.Schema({
  userId: { type: String, required: true, trim: true, index: true },
  profileId: { type: String, required: true, trim: true, maxlength: 80, index: true },
  featureKey: { type: String, default: "", trim: true, maxlength: 160, index: true },
  serviceId: { type: String, default: "", trim: true, maxlength: 80, index: true },
  serviceKey: { type: String, required: true, trim: true, maxlength: 80, index: true },
  contentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  contentKey: { type: String, required: true, trim: true, maxlength: 120, index: true },
  contentType: { type: String, default: "", trim: true, maxlength: 80, index: true },
  scope: { type: String, enum: Object.values(CONTENT_ENTITLEMENT_SCOPES), required: true, default: CONTENT_ENTITLEMENT_SCOPES.PROFILE, index: true },
  status: { type: String, enum: Object.values(CONTENT_ENTITLEMENT_STATUSES), required: true, default: CONTENT_ENTITLEMENT_STATUSES.ACTIVE, index: true },
  source: { type: String, enum: Object.values(CONTENT_ENTITLEMENT_SOURCES), required: true },
  grantType: { type: String, enum: ["", "permanent_unlock"], default: "" },
  evidenceId: { type: String, default: "", trim: true, maxlength: 180 },
  unlockedBy: { type: String, default: "", trim: true, maxlength: 80, index: true },
  orderId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  passId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  coinAmount: { type: Number, default: 0, min: 0 },
  coinPrice: { type: Number, default: 0, min: 0 },
  amountKRW: { type: Number, default: 0, min: 0 },
  unlockedAt: { type: Date, required: true, default: Date.now, index: true },
  grantedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, default: null, index: true },
}, { timestamps: true, collection: "content_entitlements" });

contentEntitlementSchema.index(
  { userId: 1, profileId: 1, serviceKey: 1, contentKey: 1, scope: 1 },
  { unique: true },
);
contentEntitlementSchema.index({ userId: 1, serviceKey: 1, status: 1, expiresAt: 1 });
// 🔴 contentKey 가 키에 포함되어야 한다. sukyo_yearly_fortune_unlock 은 featureKey 가 상수이고
// contentKey 만 연도별로 다르므로, contentKey 없이 unique 를 걸면 한 프로필이 두 개 연도를 보유할 수 없다.
// db.js 가 autoIndex:false 이므로 이 선언만으로는 생성되지 않는다 —
// 생성은 scripts/migrations/20260804-add-permanent-unlock-index.mjs (중복 사전스캔 통과 후).
contentEntitlementSchema.index(
  { userId: 1, profileId: 1, featureKey: 1, contentKey: 1, scope: 1 },
  {
    unique: true,
    name: "permanent_unlock_identity",
    partialFilterExpression: { featureKey: { $exists: true, $type: "string", $gt: "" } },
  },
);

const refreshTokenSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  userAgent: { type: String, default: "", trim: true, maxlength: 300 },
  ip: { type: String, default: "", trim: true, maxlength: 120 },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null, index: true },
  replacedByTokenHash: { type: String, default: "", trim: true },
}, { timestamps: true, collection: "refresh_tokens" });

refreshTokenSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: -1 });

const paymentFailureLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  impUid: { type: String, trim: true, index: true },
  merchantUid: { type: String, trim: true, index: true },
  source: { type: String, enum: ["prepare", "confirm", "webhook", "client", "system"], default: "system", index: true },
  stage: { type: String, trim: true, default: "unknown" },
  code: { type: String, trim: true, maxlength: 80 },
  message: { type: String, trim: true, maxlength: 500 },
  status: { type: Number },
  expectedAmount: { type: Number },
  clientAmount: { type: Number },
  portOneAmount: { type: Number },
  portOneStatus: { type: String, trim: true, maxlength: 40 },
  requestMeta: {
    ip: { type: String, trim: true, maxlength: 120 },
    userAgent: { type: String, trim: true, maxlength: 300 },
    requestId: { type: String, trim: true, maxlength: 120 },
  },
  payload: { type: mongoose.Schema.Types.Mixed },
  rawPortOne: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

paymentFailureLogSchema.index({ createdAt: -1 });
paymentFailureLogSchema.index({ source: 1, createdAt: -1 });

const paymentWebhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true, trim: true, maxlength: 40, default: "portone" },
  eventId: { type: String, required: true, trim: true, maxlength: 180 },
  eventType: { type: String, required: true, trim: true, maxlength: 120, index: true },
  paymentId: { type: String, required: true, trim: true, maxlength: 180, index: true },
  status: {
    type: String,
    enum: ["processing", "processed", "failed"],
    default: "processing",
    index: true,
  },
  attempts: { type: Number, default: 1, min: 1 },
  receivedAt: { type: Date, default: Date.now, index: true },
  processedAt: { type: Date, default: null },
  lastAttemptAt: { type: Date, default: Date.now },
  lastError: { type: String, default: "", trim: true, maxlength: 500 },
  requestMeta: {
    ip: { type: String, trim: true, maxlength: 120 },
    userAgent: { type: String, trim: true, maxlength: 300 },
    requestId: { type: String, trim: true, maxlength: 120 },
  },
  payload: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true, collection: "payment_webhook_events" });

paymentWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
paymentWebhookEventSchema.index({ paymentId: 1, createdAt: -1 });

// 결제창(체크아웃) 퍼널 계측. "결제창까지 왔는데 왜 안 사는가"를 데이터로 볼 수 있는 유일한 채널이다
// — 이 프로젝트에는 GA/GTM 이 없고 그동안 결제 퍼널 이벤트가 0건이었다.
// 🔴 개인식별자를 저장하지 않는다(userId·이메일·프로필·생년 정보 없음). 집계용 익명 이벤트 전용이며,
// 90일 TTL 로 스스로 사라진다. 클라는 sendBeacon 으로 fire-and-forget 하고 응답을 보지 않는다.
const checkoutFunnelEventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60, index: true },
  featureKey: { type: String, default: "", trim: true, maxlength: 120, index: true },
  option: { type: String, default: "", trim: true, maxlength: 40 },
  renderer: { type: String, default: "", trim: true, maxlength: 40 },
  runtime: { type: String, default: "", trim: true, maxlength: 20 },
  coinPrice: { type: Number, default: 0, min: 0 },
  hasPassHint: { type: String, default: "", trim: true, maxlength: 20 },
  dwellMs: { type: Number, default: 0, min: 0 },
  // checkout_pg_opened 전용. 클릭→PG창 단계 소요를 "checkout=812ms sdk=3ms …" 로 담는다.
  // 개인식별자가 아니며, 이 컬렉션의 90일 TTL 을 그대로 따른다.
  steps: { type: String, default: "", trim: true, maxlength: 120 },
  createdAt: { type: Date, default: Date.now },
}, { collection: "checkout_funnel_events", versionKey: false });

checkoutFunnelEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
checkoutFunnelEventSchema.index({ name: 1, createdAt: -1 });

const securityEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, default: null },
  ipHash: { type: String, trim: true, maxlength: 96, index: true, default: "" },
  endpoint: { type: String, trim: true, maxlength: 160, index: true, default: "" },
  level: { type: String, enum: ["info", "warn", "error"], default: "warn", index: true },
  reason: { type: String, trim: true, maxlength: 120, index: true, default: "" },
  method: { type: String, trim: true, maxlength: 12, default: "" },
  userAgent: { type: String, trim: true, maxlength: 300, default: "" },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
}, { collection: "security_events" });

securityEventSchema.index({ userId: 1, createdAt: -1 });
securityEventSchema.index({ ipHash: 1, createdAt: -1 });
securityEventSchema.index({ reason: 1, createdAt: -1 });

/**
 * 관리자 행위 감사 로그.
 *
 * 컬렉션명은 레거시 Express 의 server/models/AdminAuditLog.js 와 같은 `adminauditlogs` 를
 * 재사용한다 — 그쪽은 배포되지 않아 프로덕션 문서가 0건이므로 충돌할 데이터가 없다.
 *
 * 🔴 그 스키마를 그대로 쓰지 않는 이유: actorUserId 가 ObjectId 인데 현재 행위자는 공유
 * 비밀번호 세션(`flower-admin:<jti>`)이라 전부 null 이 된다. 사람을 특정할 수 있는
 * actorLabel 을 따로 둔다. role:"admin" JWT 로 들어온 경우에만 actorUserId 가 채워진다.
 */
const adminAuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, trim: true, maxlength: 200 },
  actorLabel: { type: String, trim: true, maxlength: 120, default: "" },
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  mode: { type: String, enum: ["flower", "jwt", "anonymous"], default: "flower" },
  outcome: { type: String, enum: ["attempted", "granted", "denied"], default: "attempted" },
  ip: { type: String, trim: true, maxlength: 64, default: "" },
  userAgent: { type: String, trim: true, maxlength: 300, default: "" },
  requestId: { type: String, trim: true, maxlength: 120, default: "" },
  meta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { collection: "adminauditlogs", timestamps: { createdAt: true, updatedAt: false } });

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ actorLabel: 1, createdAt: -1 });

const idempotencyKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, default: null },
  endpoint: { type: String, trim: true, maxlength: 160, required: true, index: true },
  keyHash: { type: String, trim: true, maxlength: 96, required: true, index: true },
  requestHash: { type: String, trim: true, maxlength: 96, default: "" },
  status: { type: String, enum: ["processing", "success", "failed"], default: "processing", index: true },
  responseRef: { type: mongoose.Schema.Types.Mixed, default: null },
  // expiresAt 는 아래 TTL 인덱스(.index({expiresAt:1},{expireAfterSeconds:0}))로만 색인한다.
  // 필드 레벨 index:true 를 함께 두면 같은 키의 plain 인덱스와 TTL 인덱스가 충돌해
  // (IndexOptionsConflict) plain 쪽이 살아남아 TTL 이 적용되지 않는다.
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: "idempotency_keys" });

idempotencyKeySchema.index({ userId: 1, endpoint: 1, keyHash: 1 }, { unique: true });
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const abuseScoreSchema = new mongoose.Schema({
  subjectHash: { type: String, trim: true, maxlength: 128, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, default: null },
  endpoint: { type: String, trim: true, maxlength: 160, index: true, default: "" },
  kind: { type: String, enum: ["abuse", "rate_limit"], default: "abuse", index: true },
  score: { type: Number, default: 0, min: 0 },
  blockedUntil: { type: Date, default: null, index: true },
  lastReasons: { type: [String], default: [] },
  // expiresAt 는 아래 TTL 인덱스로만 색인한다(위 idempotency_keys 와 동일한 충돌 회피).
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: "abuse_scores" });

abuseScoreSchema.index({ subjectHash: 1, endpoint: 1, kind: 1 }, { unique: true });
abuseScoreSchema.index({ userId: 1, endpoint: 1, updatedAt: -1 });
abuseScoreSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 결정적 LLM 호출 응답 캐시. 캐시 키는 정규화된 요청 필드의 SHA-256(lib/llm-cache.ts).
// TTL 인덱스로 만료 문서 자동 정리.
const llmResponseCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, maxlength: 128 },
  text: { type: String, required: true },
  provider: { type: String, default: "", trim: true, maxlength: 40 },
  model: { type: String, default: "", trim: true, maxlength: 120 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: "llm_response_cache" });

llmResponseCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const serviceExecutionTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  executionKey: { type: String, required: true, trim: true, maxlength: 120 },
  reportType: { type: String, default: "", trim: true, maxlength: 80, index: true },
  reportId: { type: String, default: "", trim: true, maxlength: 120, index: true },
  sessionId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  paymentSessionId: { type: String, default: "", trim: true, maxlength: 160 },
  coinTransactionId: { type: String, default: "", trim: true, maxlength: 120, index: true },
  coinAmount: { type: Number, default: 0, min: 0 },
  idempotencyKey: { type: String, default: "", trim: true, maxlength: 120, index: true },
  featureKey: { type: String, required: true, trim: true, maxlength: 80, index: true },
  serviceId: { type: String, default: "", trim: true, maxlength: 120, index: true },
  productId: { type: String, default: "", trim: true, maxlength: 120, index: true },
  profileId: { type: String, default: "", trim: true, maxlength: 120, index: true },
  jobId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  orderId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  cost: { type: Number, default: 0, min: 0 },
  amount: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: "KRW", trim: true, maxlength: 16 },
  paymentProvider: { type: String, default: "", trim: true, maxlength: 40 },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  merchantUid: { type: String, default: "", trim: true, maxlength: 160, index: true },
  impUid: { type: String, default: "", trim: true, maxlength: 160, index: true },
  sourceTransactionId: { type: String, default: "", trim: true, maxlength: 120, index: true },
  paymentRef: {
    impUid: { type: String, default: "", trim: true, maxlength: 120 },
    merchantUid: { type: String, default: "", trim: true, maxlength: 120 },
    paymentId: { type: String, default: "", trim: true, maxlength: 120 },
    cancelEligible: { type: Boolean, default: false },
  },
  deliveryStatus: {
    type: String,
    enum: ["payment_pending", "paid", "entitlement_granting", "entitlement_granted", "generating", "delivered", "failed", "refund_pending", "refunded", "refund_failed"],
    default: "generating",
    index: true,
  },
  status: {
    type: String,
    enum: ["pending", "success", "failed", "refunded", "cancelled"],
    default: "pending",
    index: true,
  },
  reasonCode: { type: String, default: "", trim: true, maxlength: 80 },
  reasonMessage: { type: String, default: "", trim: true, maxlength: 500 },
  timeoutAt: { type: Date, required: true, index: true },
  nextRetryAt: { type: Date, default: Date.now, index: true },
  retryCount: { type: Number, default: 0, min: 0 },
  maxRetries: { type: Number, default: 5, min: 1, max: 20 },
  lock: {
    token: { type: String, default: "", trim: true, maxlength: 120 },
    until: { type: Date, default: null, index: true },
    acquiredAt: { type: Date, default: null },
  },
  heartbeatAt: { type: Date, default: null },
  generationStartedAt: { type: Date, default: null },
  generationCompletedAt: { type: Date, default: null },
  generationFailedAt: { type: Date, default: null },
  lastClientHeartbeatAt: { type: Date, default: null },
  clientClosedAt: { type: Date, default: null },
  abandonedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  refundRequestedAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  refundFailedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  compensatedAt: { type: Date, default: null },
  failureStage: { type: String, default: "", trim: true, maxlength: 80 },
  failureReason: { type: String, default: "", trim: true, maxlength: 500 },
  refundReason: { type: String, default: "", trim: true, maxlength: 160 },
  refundStatus: {
    type: String,
    enum: ["none", "pending", "refunded", "failed", "refund_failed"],
    default: "none",
    index: true,
  },
  refundIdempotencyKey: { type: String, default: "", trim: true, maxlength: 220, index: true },
  refundProviderResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  refundFailureReason: { type: String, default: "", trim: true, maxlength: 500 },
  premiumStatus: {
    type: String,
    enum: ["payment_pending", "paid", "generating", "completed", "failed", "abandoned", "refund_pending", "refunded", "refund_failed"],
    default: "generating",
    index: true,
  },
  compensation: {
    coinRefunded: { type: Boolean, default: false },
    coinRefundTxId: { type: String, default: "", trim: true, maxlength: 120 },
    monthlyCreditRefunded: { type: Boolean, default: false },
    monthlyCreditRefundAmount: { type: Number, default: 0, min: 0 },
    monthlyCreditRefundLedgerId: { type: String, default: "", trim: true, maxlength: 120 },
    paymentCancelled: { type: Boolean, default: false },
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  retentionUntil: { type: Date, default: null },
}, { timestamps: true });

serviceExecutionTransactionSchema.index({ userId: 1, executionKey: 1 }, { unique: true });
serviceExecutionTransactionSchema.index({ status: 1, timeoutAt: 1, nextRetryAt: 1 });
serviceExecutionTransactionSchema.index({ paymentId: 1, serviceId: 1, jobId: 1 });
serviceExecutionTransactionSchema.index({ refundIdempotencyKey: 1 });
serviceExecutionTransactionSchema.index({ retentionUntil: 1 }, { expireAfterSeconds: 0 });

const paidExecutionRecordSchema = new mongoose.Schema({
  executionId: { type: String, required: true, trim: true, maxlength: 160, unique: true, index: true },
  requestId: { type: String, required: true, trim: true, maxlength: 160, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  featureId: { type: String, required: true, trim: true, maxlength: 120, index: true },
  profileId: { type: String, required: true, trim: true, maxlength: 120, index: true },
  accessMode: { type: String, enum: ["per_use"], default: "per_use", index: true },
  accessMethod: { type: String, enum: ["pass", "family", "monthly", "single"], required: true, index: true },
  amountCoins: { type: Number, default: 0, min: 0 },
  amountKRW: { type: Number, default: 0, min: 0 },
  monthlyDeductedAmount: { type: Number, default: 0, min: 0 },
  passTier: { type: String, enum: ["", "standard", "premium", "vvip", "family"], default: "" },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  orderId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  status: {
    type: String,
    enum: ["paid_pending_generation", "generating", "completed", "generation_failed", "refunded", "cancelled"],
    default: "paid_pending_generation",
    index: true,
  },
  consumedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  resultId: { type: String, default: "", trim: true, maxlength: 160 },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  error: { type: mongoose.Schema.Types.Mixed, default: null },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
}, { timestamps: true, collection: "paid_execution_records" });

paidExecutionRecordSchema.index(
  { userId: 1, featureId: 1, profileId: 1, requestId: 1 },
  { unique: true },
);
paidExecutionRecordSchema.index(
  { paymentId: 1 },
  {
    name: "paymentId_unique_nonempty",
    unique: true,
    partialFilterExpression: {
      paymentId: { $exists: true, $type: "string", $gt: "" },
    },
  },
);

const newYearAiMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const newYearAiConsultationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  year: { type: Number, required: true, min: 1900, max: 2100, index: true },
  birthInfo: {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    gender: { type: String, required: true, trim: true, maxlength: 20 },
    birthDate: { type: String, required: true, trim: true, maxlength: 10 },
    birthTime: { type: String, default: "", trim: true, maxlength: 5 },
    calendarType: { type: String, enum: ["solar", "lunar"], required: true },
  },
  topic: { type: String, required: true, trim: true, maxlength: 1000 },
  accessType: { type: String, enum: ["pass", "paid", "subscription", "admin"], required: true, index: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  messages: { type: [newYearAiMessageSchema], default: [] },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
  inputHash: { type: String, required: true, trim: true, maxlength: 80, index: true },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating", index: true },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "newYearAiConsultations" });

newYearAiConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
newYearAiConsultationSchema.index({ userId: 1, createdAt: -1 });

const karmaDestinyAiMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, trim: true, maxlength: 80000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const karmaDestinyAiChapterSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true, maxlength: 40 },
  order: { type: Number, required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  content: { type: String, required: true, trim: true, maxlength: 14000 },
  summary: { type: String, default: "", trim: true, maxlength: 1200 },
  keyTakeaways: { type: [String], default: [] },
  highlightQuotes: { type: [String], default: [] },
  charCount: { type: Number, default: 0 },
  // ── 다섯 렌즈 리포트(schemaVersion 2) 전용. 전부 optional 이라 구 16장 문서는
  //    undefined 로 남고 마이그레이션 없이 그대로 재열람된다.
  symbol: { type: String, default: "", trim: true, maxlength: 4 },
  leadLens: { type: String, default: "", trim: true, maxlength: 20 },
  supportLens: { type: [String], default: [] },
  // 서버가 evidenceKeys 로 integratedResult 에서 직접 뽑은 근거. LLM 이 만든 값이 아니다.
  evidence: { type: mongoose.Schema.Types.Mixed, default: null },
  // 그 장이 담당한 영역의 에너지 강도({ domain, value, basis }).
  energyScore: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const karmaDestinyAiConsultationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  reportId: { type: String, default: "", trim: true, maxlength: 120, index: true },
  attemptId: { type: String, default: "", trim: true, maxlength: 180, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  birthInfo: {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    gender: { type: String, required: true, trim: true, maxlength: 20 },
    birthDate: { type: String, required: true, trim: true, maxlength: 10 },
    birthTime: { type: String, default: "", trim: true, maxlength: 5 },
    birthTimeUnknown: { type: Boolean, default: false },
    calendarType: { type: String, enum: ["solar", "lunar"], required: true },
    birthPlace: {
      city: { type: String, default: "", trim: true, maxlength: 100 },
      country: { type: String, default: "", trim: true, maxlength: 100 },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      timezone: { type: String, default: "", trim: true, maxlength: 80 },
    },
  },
  topic: { type: String, required: true, trim: true, maxlength: 100 },
  userQuestion: { type: String, default: "", trim: true, maxlength: 1600 },
  integratedResult: { type: mongoose.Schema.Types.Mixed, default: null },
  summaryCards: { type: mongoose.Schema.Types.Mixed, default: null },
  // 1 = 구 16장(3체계), 2 = 15장 다섯 렌즈. 생성 재개 시 장 정의가 바뀐 문서를 이어붙이면
  // 챕터 id 가 충돌해 결제 후 무결과가 되므로, 재개 가능 여부 판정에도 쓰인다.
  schemaVersion: { type: Number, default: 1, index: true },
  lensContribution: { type: mongoose.Schema.Types.Mixed, default: null },
  lensAvailability: { type: mongoose.Schema.Types.Mixed, default: null },
  accessType: { type: String, enum: ["pass", "paid", "monthly_credit", "membership_credit", "subscription", "admin"], required: true, index: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  billingRequestId: { type: String, default: "", trim: true, maxlength: 180, index: true },
  billingState: { type: mongoose.Schema.Types.Mixed, default: null },
  messages: { type: [karmaDestinyAiMessageSchema], default: [] },
  chapters: { type: [karmaDestinyAiChapterSchema], default: [] },
  chapterSummaries: { type: [mongoose.Schema.Types.Mixed], default: [] },
  finalLetter: { type: String, default: "", trim: true, maxlength: 14000 },
  generatedAt: { type: Date, default: null },
  totalCharCount: { type: Number, default: 0 },
  qualityCheck: { type: mongoose.Schema.Types.Mixed, default: null },
  generationProgress: { type: mongoose.Schema.Types.Mixed, default: null },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
  inputHash: { type: String, required: true, trim: true, maxlength: 80, index: true },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating", index: true },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "karmaDestinyAiConsultations" });

karmaDestinyAiConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
karmaDestinyAiConsultationSchema.index({ userId: 1, createdAt: -1 });

const ziweiAiMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, trim: true, maxlength: 80000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const ziweiAiPalaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
  earthlyBranch: { type: String, default: "", trim: true, maxlength: 20 },
  branchIndex: { type: Number, default: null },
  mainStars: { type: [String], default: [] },
  assistantStars: { type: [String], default: [] },
  maleficStars: { type: [String], default: [] },
  transformations: { type: [String], default: [] },
  brightness: { type: mongoose.Schema.Types.Mixed, default: {} },
  majorLuck: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const ziweiAiChartSchema = new mongoose.Schema({
  lifePalace: { type: String, default: "", trim: true, maxlength: 40 },
  bodyPalace: { type: String, default: "", trim: true, maxlength: 40 },
  palaces: { type: [ziweiAiPalaceSchema], default: [] },
  fourTransformations: {
    huaLu: { type: String, default: "", trim: true, maxlength: 40 },
    huaQuan: { type: String, default: "", trim: true, maxlength: 40 },
    huaKe: { type: String, default: "", trim: true, maxlength: 40 },
    huaJi: { type: String, default: "", trim: true, maxlength: 40 },
  },
  majorLuck: { type: mongoose.Schema.Types.Mixed, default: null },
  yearlyLuck: { type: mongoose.Schema.Types.Mixed, default: null },
  sanFangSiZheng: { type: mongoose.Schema.Types.Mixed, default: null },
  chartSummary: { type: String, default: "", trim: true, maxlength: 3000 },
  keyFeatures: { type: mongoose.Schema.Types.Mixed, default: null },
  lunar: { type: mongoose.Schema.Types.Mixed, default: null },
  bureau: { type: mongoose.Schema.Types.Mixed, default: null },
  uncertainty: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const ziweiAiConsultationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  birthInfo: {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    gender: { type: String, required: true, trim: true, maxlength: 20 },
    birthDate: { type: String, required: true, trim: true, maxlength: 10 },
    birthTime: { type: String, default: "", trim: true, maxlength: 5 },
    birthTimeUnknown: { type: Boolean, default: false },
    calendarType: { type: String, enum: ["solar", "lunar"], required: true },
    isLeapMonth: { type: Boolean, default: false },
  },
  topic: { type: String, required: true, trim: true, maxlength: 80 },
  userQuestion: { type: String, default: "", trim: true, maxlength: 1200 },
  ziweiChart: { type: ziweiAiChartSchema, default: () => ({}) },
  // 운명의 섬 12궁 심층 상담(별도 상품)이 이 컬렉션을 공유한다. 기존 문서는 기본값으로 무영향.
  serviceType: { type: String, default: "ziwei-ai", trim: true, maxlength: 60, index: true },
  palaceKey: { type: String, default: "", trim: true, maxlength: 20 },
  sectionKeys: { type: [String], default: [] },
  accessType: { type: String, enum: ["pass", "paid", "subscription", "admin"], required: true, index: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  messages: { type: [ziweiAiMessageSchema], default: [] },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
  inputHash: { type: String, required: true, trim: true, maxlength: 80, index: true },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating", index: true },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "ziweiAiConsultations" });

ziweiAiConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
ziweiAiConsultationSchema.index({ userId: 1, createdAt: -1 });

// 운명의 지도 심층 리포트 — 웨이브 A/B 로 나눠 도착하는 섹션을 누적 저장한다.
// 저장 이유 세 가지: ① 재열람 ② 웨이브 A~B 사이 연결이 끊겨도 결제한 내용이 남는다
// ③ 같은 idempotencyKey 재요청 시 재생성·재과금 대신 저장본을 돌려준다.
const destinyCompassSectionSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 60 },
  order: { type: Number, default: 0 },
  title: { type: String, default: "", trim: true, maxlength: 120 },
  system: { type: String, default: null, trim: true, maxlength: 40 },
  body: { type: String, default: "", maxlength: 20000 },
  chars: { type: Number, default: 0 },
  status: { type: String, enum: ["ok", "degraded", "failed"], default: "ok" },
  grounds: { type: mongoose.Schema.Types.Mixed, default: [] },
}, { _id: false });

const destinyCompassReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
  // seed 원문은 생년·응답을 담고 있어 저장하지 않는다 — 해시만 남긴다.
  inputHash: { type: String, required: true, trim: true, maxlength: 120, index: true },
  seedHash: { type: String, default: "", trim: true, maxlength: 40 },
  question: { type: String, default: "", trim: true, maxlength: 300 },
  emotion: { type: String, default: "", trim: true, maxlength: 24 },
  field: { type: mongoose.Schema.Types.Mixed, default: null },
  evidencePack: { type: mongoose.Schema.Types.Mixed, default: null },
  basis: { type: mongoose.Schema.Types.Mixed, default: null },
  systemConfidence: { type: mongoose.Schema.Types.Mixed, default: [] },
  sections: { type: [destinyCompassSectionSchema], default: [] },
  // partial = 웨이브 A 만 도착. completed = B 까지. 재열람은 partial 도 보여준다.
  status: { type: String, enum: ["generating", "partial", "completed", "generation_failed"], default: "generating", index: true },
  accessType: { type: String, default: "", trim: true, maxlength: 40 },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "destinyCompassReports" });

destinyCompassReportSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
destinyCompassReportSchema.index({ userId: 1, createdAt: -1 });

// 심화 자미두수 15챕터 리포트 — 4개씩 4배치로 도착하는 챕터를 누적 저장한다.
// destinyCompassReportSchema 와 같은 문제를 푸는 스키마다(웨이브로 나눠 오는 본문 + 재열람).
// 저장 이유 세 가지: ① 재열람 ② 배치 사이 연결이 끊겨도 결제한 내용이 남는다
// ③ 같은 idempotencyKey 재요청 시 재생성·재과금 대신 저장본을 돌려준다.
const ziweiDeepChapterSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true, maxlength: 60 },
  order: { type: Number, default: 0 },
  title: { type: String, default: "", trim: true, maxlength: 160 },
  body: { type: String, default: "", maxlength: 20000 },
  chars: { type: Number, default: 0 },
  provider: { type: String, default: "", trim: true, maxlength: 40 },
  ok: { type: Boolean, default: true },
}, { _id: false });

const ziweiDeepReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
  inputHash: { type: String, required: true, trim: true, maxlength: 120, index: true },
  birthInfo: {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    gender: { type: String, default: "", trim: true, maxlength: 20 },
    birthDate: { type: String, default: "", trim: true, maxlength: 10 },
    birthTime: { type: String, default: "", trim: true, maxlength: 5 },
    birthTimeUnknown: { type: Boolean, default: false },
    calendarType: { type: String, enum: ["solar", "lunar"], default: "solar" },
    isLeapMonth: { type: Boolean, default: false },
  },
  // 통합된 전문가 상담 입력(구 ziwei-ai-consultation 의 관심분야·자유질문).
  focusArea: { type: String, default: "", trim: true, maxlength: 40 },
  topic: { type: String, default: "", trim: true, maxlength: 80 },
  userQuestion: { type: String, default: "", trim: true, maxlength: 1200 },
  ziweiChart: { type: ziweiAiChartSchema, default: () => ({}) },
  chapters: { type: [ziweiDeepChapterSchema], default: [] },
  // partial = 일부 배치만 도착. completed = 15장 전부. 재열람은 partial 도 보여준다.
  status: { type: String, enum: ["generating", "partial", "completed", "generation_failed"], default: "generating", index: true },
  accessType: { type: String, default: "", trim: true, maxlength: 40 },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "ziweiDeepReports" });

ziweiDeepReportSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
ziweiDeepReportSchema.index({ userId: 1, createdAt: -1 });

const loveSecretAiMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, trim: true, maxlength: 60000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const loveSecretAiPersonInfoSchema = new mongoose.Schema({
  name: { type: String, default: "", trim: true, maxlength: 80 },
  gender: { type: String, default: "", trim: true, maxlength: 20 },
  birthDate: { type: String, default: "", trim: true, maxlength: 10 },
  birthTime: { type: String, default: "", trim: true, maxlength: 5 },
  birthTimeUnknown: { type: Boolean, default: false },
  calendarType: { type: String, enum: ["solar", "lunar", ""], default: "solar" },
}, { _id: false });

const loveSecretAiConsultationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  myInfo: { type: loveSecretAiPersonInfoSchema, required: true },
  partnerInfo: { type: loveSecretAiPersonInfoSchema, default: null },
  relationshipStatus: { type: String, required: true, trim: true, maxlength: 80, index: true },
  topic: { type: String, required: true, trim: true, maxlength: 80, index: true },
  userQuestion: { type: String, default: "", trim: true, maxlength: 1200 },
  // 🔴 Mixed 여야 한다. 엄격한 5키 서브도큐먼트였을 때는 v2 계산이 추가하는
  // version·calendar·facts 가 저장 시점에 조용히 버려졌다(mongoose strict).
  sajuResult: { type: mongoose.Schema.Types.Mixed, default: null },
  accessType: { type: String, enum: ["pass", "paid", "subscription", "admin"], required: true, index: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  keywords: { type: [String], default: [] },
  strategy: { type: String, default: "", trim: true, maxlength: 400 },
  messages: { type: [loveSecretAiMessageSchema], default: [] },
  attemptId: { type: String, default: "", trim: true, maxlength: 180, index: true },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
  inputHash: { type: String, required: true, trim: true, maxlength: 80, index: true },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating", index: true },
  // 섹션 그룹 일부가 실패한 채 전달된 상담. 운영이 찾아볼 수 있게 남긴다(자동 재생성은 하지 않는다).
  degraded: { type: Boolean, default: false, index: true },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "loveSecretAiConsultations" });

loveSecretAiConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
loveSecretAiConsultationSchema.index({ userId: 1, attemptId: 1 });
loveSecretAiConsultationSchema.index({ userId: 1, createdAt: -1 });

/**
 * 마스터 인연의 서 (MASTER_LOVE_CODEX)
 * 회당 결제(500코인=50,000원) 20챕터 전자책. 회당 결제지만 생성 결과는 영구 저장해
 * 같은 세션(sessionId)을 재결제 없이 다시 열람할 수 있게 한다.
 */
const masterLoveCodexChapterSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true, maxlength: 40 },
  order: { type: Number, required: true },
  symbol: { type: String, default: "", trim: true, maxlength: 8 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 16000 },
  chars: { type: Number, default: 0 },
  provider: { type: String, default: "", trim: true, maxlength: 40 },
  ok: { type: Boolean, default: true },
}, { _id: false });

/**
 * 마스터 인연의 서 궁합 모드의 상대 출생 정보.
 * 필드명은 loveSecretAiPersonInfoSchema 와 같게 맞춘다(프론트 AiPrefillSeed 와도 동일).
 * 상대는 생년월일만 필수다 — 시각·성별은 없을 수 있다.
 */
const masterLoveCodexPartnerSchema = new mongoose.Schema({
  name: { type: String, default: "", trim: true, maxlength: 80 },
  gender: { type: String, default: "", trim: true, maxlength: 20 },
  birthDate: { type: String, required: true, trim: true, maxlength: 10 },
  birthTime: { type: String, default: "", trim: true, maxlength: 5 },
  birthTimeUnknown: { type: Boolean, default: false },
  calendarType: { type: String, enum: ["solar", "lunar"], default: "solar" },
  isLeapMonth: { type: Boolean, default: false },
}, { _id: false });

const masterLoveCodexSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  // solo = 개인판(master-love-codex) / compat = 궁합판(master-love-codex-compat).
  // 기존 문서에는 이 필드가 없으므로 default "solo" 로 하위호환한다(마이그레이션 불필요).
  mode: { type: String, enum: ["solo", "compat"], default: "solo", index: true },
  birthInfo: {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    gender: { type: String, required: true, trim: true, maxlength: 20 },
    birthDate: { type: String, required: true, trim: true, maxlength: 10 },
    birthTime: { type: String, default: "", trim: true, maxlength: 5 },
    birthTimeUnknown: { type: Boolean, default: false },
    calendarType: { type: String, enum: ["solar", "lunar"], required: true },
    isLeapMonth: { type: Boolean, default: false },
  },
  partnerInfo: { type: masterLoveCodexPartnerSchema, default: null },
  prologueChoice: { type: String, default: "", trim: true, maxlength: 20 },
  sajuResult: { type: mongoose.Schema.Types.Mixed, default: null },
  ziweiChart: { type: mongoose.Schema.Types.Mixed, default: null },
  partnerSajuResult: { type: mongoose.Schema.Types.Mixed, default: null },
  partnerZiweiChart: { type: mongoose.Schema.Types.Mixed, default: null },
  compatibility: { type: mongoose.Schema.Types.Mixed, default: null },
  chapters: { type: [masterLoveCodexChapterSchema], default: [] },
  loveDna: { type: mongoose.Schema.Types.Mixed, default: null },
  generationProgress: { type: mongoose.Schema.Types.Mixed, default: null },
  totalCharCount: { type: Number, default: 0 },
  accessType: { type: String, enum: ["pass", "paid", "monthly_credit", "membership_credit", "subscription", "admin"], required: true, index: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  billingRequestId: { type: String, default: "", trim: true, maxlength: 180, index: true },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
  inputHash: { type: String, required: true, trim: true, maxlength: 80, index: true },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating", index: true },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "masterLoveCodexSessions" });

masterLoveCodexSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
masterLoveCodexSchema.index({ userId: 1, createdAt: -1 });

const lifeBookAiMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  // 인생 총운 본문 상한이 60,000자인데 저장되는 것은 그 본문을 감싼 JSON 이라 60000 으로는 모자란다.
  // (update validator 가 안 돌아 지금까지 조용히 통과했을 뿐 계약상 잘릴 수 있는 값이었다.)
  content: { type: String, required: true, trim: true, maxlength: 200000 },
  createdAt: { type: Date, default: Date.now },
  idempotencyKey: { type: String, default: "", trim: true, maxlength: 180 },
}, { _id: false });

const lifeBookAiConsultationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  birthInfo: {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    gender: { type: String, required: true, trim: true, maxlength: 20 },
    birthDate: { type: String, required: true, trim: true, maxlength: 10 },
    birthTime: { type: String, default: "", trim: true, maxlength: 5 },
    birthTimeUnknown: { type: Boolean, default: false },
    calendarType: { type: String, enum: ["solar", "lunar"], required: true },
  },
  sajuResult: {
    yearPillar: { type: String, default: "", trim: true, maxlength: 20 },
    monthPillar: { type: String, default: "", trim: true, maxlength: 20 },
    dayPillar: { type: String, default: "", trim: true, maxlength: 20 },
    hourPillar: { type: String, default: "", trim: true, maxlength: 20 },
    dayMaster: { type: String, default: "", trim: true, maxlength: 20 },
    fiveElements: { type: mongoose.Schema.Types.Mixed, default: null },
    tenGods: { type: mongoose.Schema.Types.Mixed, default: null },
    strength: { type: String, default: "", trim: true, maxlength: 120 },
    usefulGod: { type: String, default: "", trim: true, maxlength: 160 },
    unfavorableGod: { type: String, default: "", trim: true, maxlength: 160 },
    majorLuck: { type: mongoose.Schema.Types.Mixed, default: null },
    yearlyLuck: { type: mongoose.Schema.Types.Mixed, default: null },
    calculationMeta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  topic: { type: String, required: true, trim: true, maxlength: 120 },
  // 인생의 책(30,000원)과 인생 총운(50,000원)이 별도 SKU 다. consultationType 만으로는
  // "어느 SKU 로 과금됐는지"를 알 수 없어(구 SKU 로 결제된 총운 세션이 실재) 실제 과금 키를 남긴다.
  featureKey: { type: String, default: "life-book-ai-consultation", trim: true, maxlength: 80, index: true },
  accessType: { type: String, enum: ["pass", "paid", "subscription", "admin"], required: true, index: true },
  accessSource: { type: String, default: "", trim: true, maxlength: 80 },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  title: { type: String, default: "", trim: true, maxlength: 100 },
  keywords: { type: [String], default: [] },
  messages: { type: [lifeBookAiMessageSchema], default: [] },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
  inputHash: { type: String, required: true, trim: true, maxlength: 80, index: true },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating", index: true },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "lifeBookAiConsultations" });

lifeBookAiConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
lifeBookAiConsultationSchema.index({ userId: 1, createdAt: -1 });

const sukuyoCompatibilityAiMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, trim: true, maxlength: 60000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const sukuyoCompatibilityAiPersonSchema = new mongoose.Schema({
  name: { type: String, default: "", trim: true, maxlength: 80 },
  gender: { type: String, default: "", trim: true, maxlength: 40 },
  birthDate: { type: String, required: true, trim: true, match: birthDateRegex },
  birthTime: { type: String, default: "", trim: true, maxlength: 5 },
  calendarType: { type: String, enum: ["solar", "lunar"], required: true },
  isLeapMonth: { type: Boolean, default: false },
  shuku: { type: String, default: "", trim: true, maxlength: 40 },
  shukuIndex: { type: Number, default: null, min: 0, max: 26 },
}, { _id: false });

const sukuyoCompatibilityAiConsultationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 160 },
  personA: { type: sukuyoCompatibilityAiPersonSchema, required: true },
  personB: { type: sukuyoCompatibilityAiPersonSchema, required: true },
  sukuyoResult: {
    personAShuku: { type: String, required: true, trim: true, maxlength: 40 },
    personBShuku: { type: String, required: true, trim: true, maxlength: 40 },
    relationType: { type: String, required: true, trim: true, maxlength: 40 },
    distance: { type: String, enum: ["near", "middle", "far", ""], default: "" },
    distanceLabel: { type: String, default: "", trim: true, maxlength: 40 },
    direction: { type: String, default: "", trim: true, maxlength: 80 },
    forwardDistance: { type: Number, default: null },
    reverseDistance: { type: Number, default: null },
  },
  relationshipType: { type: String, required: true, trim: true, maxlength: 80 },
  topic: { type: String, required: true, trim: true, maxlength: 80 },
  accessType: { type: String, enum: ["pass", "paid", "subscription", "admin"], required: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  messages: { type: [sukuyoCompatibilityAiMessageSchema], default: [] },
  provider: { type: String, default: "", trim: true, maxlength: 80 },
  model: { type: String, default: "", trim: true, maxlength: 120 },
  // 생성 시작 시점에 시드를 먼저 쓰고 완료/실패에서 뒤집는다(worker/routes/sukuyo-compatibility-ai.js).
  // 이 필드가 없던 시절에는 findOne 과 create 사이 60~100초가 통째로 중복 생성 창이었다.
  // 🔴 이 필드 도입 이전 문서에는 status 자체가 없다. 라우트는 없는 값을 "completed" 로 읽어야 한다
  //    (consultationStatus) — 직접 비교하면 결제된 상담이 빈 시드로 덮인다.
  // index 를 달지 않은 이유: status 단독으로 조회하는 쿼리가 없고(목록은 {userId, status}),
  // 달면 autoIndex:false 인 프로덕션에서 verify:mongo-launch-indexes 가 누락으로 잡는다.
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating" },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "sukuyoCompatibilityAiConsultations" });

sukuyoCompatibilityAiConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
sukuyoCompatibilityAiConsultationSchema.index({ userId: 1, createdAt: -1 });

const vedicAiMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, trim: true, maxlength: 60000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const vedicAiConsultationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  birthInfo: {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    gender: { type: String, required: true, trim: true, maxlength: 20 },
    birthDate: { type: String, required: true, trim: true, match: birthDateRegex },
    birthTime: { type: String, default: "", trim: true, maxlength: 5 },
    birthTimeUnknown: { type: Boolean, default: false },
    birthPlace: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  topic: { type: String, required: true, trim: true, maxlength: 80, index: true },
  userQuestion: { type: String, default: "", trim: true, maxlength: 1500 },
  vedicChart: {
    ayanamsa: { type: String, default: "", trim: true, maxlength: 40 },
    ayanamsaDegree: { type: Number, default: null },
    lagna: { type: mongoose.Schema.Types.Mixed, default: null },
    moon: { type: mongoose.Schema.Types.Mixed, default: null },
    sun: { type: mongoose.Schema.Types.Mixed, default: null },
    planets: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rahuKetu: { type: mongoose.Schema.Types.Mixed, default: null },
    houses: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // 아래 5개는 calculateVedicAiChart()가 만드는 "예쁘게 포맷된" 파생 필드 —
    // 스키마에 없으면 대입 시점에 strict 모드가 조용히 버린다(원본 planets/houses/dasha는
    // 보존되어 화면 폴백엔 영향 적지만, 누락 자체는 버그이므로 추가).
    grahas: { type: [mongoose.Schema.Types.Mixed], default: [] },
    bhavas: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rashis: { type: [mongoose.Schema.Types.Mixed], default: [] },
    moonNakshatra: { type: mongoose.Schema.Types.Mixed, default: null },
    vimshottariDasha: { type: mongoose.Schema.Types.Mixed, default: null },
    calculationConfig: { type: mongoose.Schema.Types.Mixed, default: null },
    divisionalCharts: { type: mongoose.Schema.Types.Mixed, default: null },
    yogas: { type: [mongoose.Schema.Types.Mixed], default: [] },
    dasha: { type: mongoose.Schema.Types.Mixed, default: null },
    transits: { type: mongoose.Schema.Types.Mixed, default: null },
    chartSummary: { type: String, default: "", trim: true, maxlength: 1200 },
    calculationMeta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  accessType: { type: String, enum: ["pass", "paid", "subscription"], required: true, index: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  messages: { type: [vedicAiMessageSchema], default: [] },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
  inputHash: { type: String, required: true, trim: true, maxlength: 80, index: true },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating", index: true },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "vedicAiConsultations" });

vedicAiConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
vedicAiConsultationSchema.index({ userId: 1, createdAt: -1 });

const astrologyAiMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, trim: true, maxlength: 70000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const astrologyAiConsultationSchema = new mongoose.Schema({
  // 다른 상담 스키마와 동일한 세션 식별자. 이 필드가 스키마에 없으면 strict 모드가 create의
  // id를 조용히 버려 완료 저장(findOneAndUpdate({id}))과 결과 조회(findOne({id}))가 전부 미스된다.
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180 },
  inputHash: { type: String, required: true, trim: true, maxlength: 80, index: true },
  birthInfo: {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    gender: { type: String, default: "", trim: true, maxlength: 40 },
    birthDate: { type: String, required: true, trim: true, match: birthDateRegex },
    birthTime: { type: String, default: "", trim: true, maxlength: 5 },
    birthTimeUnknown: { type: Boolean, default: false },
    birthPlace: {
      city: { type: String, default: "", trim: true, maxlength: 80 },
      country: { type: String, default: "", trim: true, maxlength: 80 },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      timezone: { type: String, default: "", trim: true, maxlength: 80 },
      timezoneOffsetHours: { type: Number, default: null },
    },
  },
  topic: { type: String, required: true, trim: true, maxlength: 100 },
  userQuestion: { type: String, default: "", trim: true, maxlength: 1400 },
  astrologyChart: { type: mongoose.Schema.Types.Mixed, default: null },
  accessType: { type: String, enum: ["pass", "paid", "subscription", "admin"], required: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  messages: { type: [astrologyAiMessageSchema], default: [] },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating", index: true },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "astrologyAiConsultations" });

astrologyAiConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
astrologyAiConsultationSchema.index({ userId: 1, createdAt: -1 });

const neoOperationRoomMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, trim: true, maxlength: 70000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const neoOperationRoomConsultationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180 },
  inputHash: { type: String, required: true, trim: true, maxlength: 80, index: true },
  birthInfo: {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    gender: { type: String, default: "", trim: true, maxlength: 40 },
    birthDate: { type: String, required: true, trim: true, match: birthDateRegex },
    birthTime: { type: String, default: "", trim: true, maxlength: 5 },
    birthTimeUnknown: { type: Boolean, default: false },
    calendarType: { type: String, enum: ["solar", "lunar"], default: "solar" },
    birthPlace: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  selectedMethod: { type: String, enum: ["saju", "ziwei", "vedic", "astrology"], required: true, index: true },
  topic: { type: String, required: true, trim: true, maxlength: 120 },
  intensity: { type: String, enum: ["soft", "standard", "roar"], required: true },
  question: { type: String, required: true, trim: true, maxlength: 1200 },
  methodSummary: { type: mongoose.Schema.Types.Mixed, default: null },
  initialBriefing: { type: mongoose.Schema.Types.Mixed, default: null },
  realityCheck: { type: mongoose.Schema.Types.Mixed, default: null },
  refinedOrder: { type: mongoose.Schema.Types.Mixed, default: null },
  versionHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  accessType: { type: String, enum: ["pass", "paid", "subscription", "admin"], required: true, index: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  messages: { type: [neoOperationRoomMessageSchema], default: [] },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating", index: true },
  refinementStatus: { type: String, enum: ["idle", "generating", "completed", "generation_failed"], default: "idle", index: true },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  refinementError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "neoOperationRoomConsultations" });

neoOperationRoomConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
neoOperationRoomConsultationSchema.index({ userId: 1, createdAt: -1 });

// 나크샤트라 결정판 AI 심화 상담(2덱: 숙요/베다). 네오 작전실 스키마를 본떴으나 refine·method선택·주제·강도가
// 없어 더 린하다. 항상 숙요+베다 두 덱을 동기 생성해 `decks`에 담는다. 결제/멱등 계약은 네오와 동일(멱등키·usageAppliedAt).
const nakshatraAiConsultationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180 },
  inputHash: { type: String, required: true, trim: true, maxlength: 80, index: true },
  birthInfo: { type: mongoose.Schema.Types.Mixed, default: null },
  question: { type: String, default: "", trim: true, maxlength: 1200 },
  factSummary: { type: mongoose.Schema.Types.Mixed, default: null },
  decks: { type: mongoose.Schema.Types.Mixed, default: null },
  // 21섹션을 배치(4개/요청)로 생성하므로 완료분을 누적 보관한다. decks 는 완료 시 이걸로 조립한 결과.
  // 서버가 진행 위치의 정본이다 — 클라이언트가 보낸 인덱스를 믿지 않는다(master-love-codex 패턴).
  sections: { type: [mongoose.Schema.Types.Mixed], default: [] },
  generationProgress: { type: mongoose.Schema.Types.Mixed, default: null },
  totalCharCount: { type: Number, default: 0 },
  accessType: { type: String, enum: ["pass", "paid", "subscription", "admin"], required: true, index: true },
  // 🔴 배치 생성은 정산(applyUsageOnce)이 마지막 배치에서 일어난다. 그 시점엔 원래 요청의 access.source 가
  // 없으므로 세션에 보존한다 — 이걸 잃으면 billing-gate 로 이미 차감된 월정석을 완료 시 한 번 더 소비한다.
  accessSource: { type: String, default: "", trim: true, maxlength: 40 },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  messages: { type: [neoOperationRoomMessageSchema], default: [] },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "generating", index: true },
  usageAppliedAt: { type: Date, default: null },
  generationError: { type: mongoose.Schema.Types.Mixed, default: null },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "nakshatraAiConsultations" });

nakshatraAiConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
nakshatraAiConsultationSchema.index({ userId: 1, createdAt: -1 });

// Guardian Fortune usage is deliberately isolated from membership, monthly credit,
// points, and pass entitlements. These schemas are declarations only; index creation
// still follows the project's normal migration/operations process.
const guardianFortuneGuestUsageSchema = new mongoose.Schema({
  guestIdHash: { type: String, required: true, unique: true, trim: true, maxlength: 128, index: true },
  totalUsed: { type: Number, default: 0, min: 0 },
  reserved: { type: Number, default: 0, min: 0 },
  firstUsedAt: { type: Date, default: null },
  lastUsedAt: { type: Date, default: null },
  reservationUpdatedAt: { type: Date, default: null },
}, { timestamps: true, collection: "guardianFortuneGuestUsages" });

const guardianFortuneDailyUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  dateKey: { type: String, required: true, trim: true, maxlength: 10, index: true },
  freeLimit: { type: Number, default: 3, min: 0, max: 3 },
  freeUsed: { type: Number, default: 0, min: 0, max: 3 },
  reserved: { type: Number, default: 0, min: 0, max: 3 },
  reservationUpdatedAt: { type: Date, default: null },
}, { timestamps: true, collection: "guardianFortuneDailyUsages" });
guardianFortuneDailyUsageSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

// The legacy daily collection remains read-only migration input. New guidance
// quota is lifetime-scoped so a midnight never grants another free reading.
const guardianFortuneAccountUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
  freeLimit: { type: Number, default: 3, min: 0, max: 3 },
  freeUsed: { type: Number, default: 0, min: 0, max: 3 },
  reserved: { type: Number, default: 0, min: 0, max: 3 },
  reservationUpdatedAt: { type: Date, default: null },
  legacyMigratedAt: { type: Date, default: null },
}, { timestamps: true, collection: "guardianFortuneAccountUsages" });

const guardianFortuneAnonymousMergeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  guestIdHash: { type: String, required: true, trim: true, maxlength: 128 },
  mergedGuestUsed: { type: Number, default: 0, min: 0, max: 1 },
}, { timestamps: true, collection: "guardianFortuneAnonymousMerges" });
guardianFortuneAnonymousMergeSchema.index({ userId: 1, guestIdHash: 1 }, { unique: true });

const fortuneChatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  anonymousSessionId: { type: String, default: "", trim: true, maxlength: 128, index: true },
  characterId: { type: String, enum: ["flower_pig", "yeoni", "neo"], default: "flower_pig" },
  selectedTopic: { type: String, default: "", maxlength: 80 },
  mode: { type: String, enum: ["free_guidance", "fusion_deep_reading"], default: "free_guidance" },
  paymentStatus: { type: String, default: "idle", maxlength: 40 },
  generationStatus: { type: String, default: "idle", maxlength: 40 },
  messages: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true, collection: "fortuneChatSessions" });
fortuneChatSessionSchema.index({ userId: 1, updatedAt: -1 });

const guardianFortuneGenerationAttemptSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  guestIdHash: { type: String, default: "", trim: true, maxlength: 128, index: true },
  source: { type: String, enum: ["guest_free", "daily_free", "blocked"], default: "blocked" },
  dateKey: { type: String, required: true, trim: true, maxlength: 10, index: true },
  status: { type: String, enum: ["reserved", "completed", "released", "blocked"], default: "reserved", index: true },
  errorCode: { type: String, default: "", trim: true, maxlength: 100 },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true, collection: "guardianFortuneGenerationAttempts" });

guardianFortuneGenerationAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const guardianFortuneSharedSnapshotSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true, trim: true, maxlength: 96, index: true },
  mode: { type: String, enum: ["yeoni", "neo"], required: true },
  topic: { type: String, enum: ["daily", "love", "money_work", "relationship", "mind", "decision"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  openingLine: { type: String, required: true, maxlength: 1200 },
  innerState: { type: String, required: true, maxlength: 2400 },
  coreReading: { type: String, required: true, maxlength: 3200 },
  topicAdvice: { type: String, required: true, maxlength: 3200 },
  cautionPattern: { type: String, required: true, maxlength: 1800 },
  luckyAction: { type: String, required: true, maxlength: 1400 },
  premiumCta: {
    ctaKey: { type: String, trim: true, maxlength: 120 },
    label: { type: String, trim: true, maxlength: 120 },
    targetPath: { type: String, trim: true, maxlength: 200 },
    reason: { type: String, trim: true, maxlength: 1000 },
  },
  shareText: { type: String, required: true, trim: true, maxlength: 320 },
  locale: { type: String, required: true, trim: true, maxlength: 20, default: "ko-KR" },
  status: { type: String, enum: ["active", "deleted", "expired"], default: "active", index: true },
  sourceRequestId: { type: String, trim: true, maxlength: 120, sparse: true, unique: true },
  createdAt: { type: Date, required: true, default: Date.now, index: true },
  expiresAt: { type: Date, required: true, index: true },
}, { collection: "guardianFortuneSharedSnapshots" });
guardianFortuneSharedSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
guardianFortuneSharedSnapshotSchema.index({ status: 1, createdAt: -1 });

const fusionFortuneGenerationAttemptSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  dateKey: { type: String, required: true, trim: true, maxlength: 10, index: true },
  status: { type: String, enum: ["reserved", "completed", "released", "blocked"], default: "reserved", index: true },
  errorCode: { type: String, default: "", trim: true, maxlength: 100 },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true, collection: "fusionFortuneGenerationAttempts" });
fusionFortuneGenerationAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 초융합 상담 보관본 — 위 attempt(10분 TTL 중복요청 락)와는 목적이 다르다. 여기에는 TTL 이 없다.
// 3만원짜리 결과가 새로고침 한 번에 사라지던 것을 막고 재열람·PDF 를 가능하게 한다.
//
// 🔴 프라이버시 경계: 생년월일·생시·출생지·고민 원문은 저장하지 않는다
//    (worker/lib/fusion-fortune.js 의 buildFusionFortuneContext 가 지키는 것과 같은 선).
//    화면에 다시 보여 줄 결과 본문과, 목록에서 구분할 최소 정보만 남긴다.
const fusionFortuneConsultationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  // 결제 증빙이 묶인 requestId. 같은 요청을 재시도해도 문서는 하나다(결제 1회 = 보관본 1개).
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 180, index: true },
  title: { type: String, default: "", trim: true, maxlength: 200 },
  inputSummary: {
    topic: { type: String, default: "", trim: true, maxlength: 80 },
    calendarType: { type: String, default: "solar", trim: true, maxlength: 10 },
    gender: { type: String, default: "unspecified", trim: true, maxlength: 20 },
    nickname: { type: String, default: "", trim: true, maxlength: 40 },
    birthTimeKnown: { type: Boolean, default: true },
    birthPlaceKnown: { type: Boolean, default: false },
  },
  // 클라이언트가 스트림에서 받는 것과 같은 구조. 재열람 시 그대로 돌려줘 렌더 경로를 하나로 유지한다.
  result: { type: mongoose.Schema.Types.Mixed, required: true },
  visibleTextLength: { type: Number, default: 0 },
  generationSource: { type: String, default: "", trim: true, maxlength: 40 },
  // 분량이 목표에 못 미친 채로 배달된 결과인지. 재열람·PDF 에서도 같은 안내를 보여 주려면
  // 보관본에 남아 있어야 한다(옛 보관본에는 없으므로 기본값은 완전 등급으로 읽는다).
  qualityTier: { type: String, default: "full", trim: true, maxlength: 20 },
  qualityNotice: { type: String, default: "", trim: true, maxlength: 300 },
  status: { type: String, enum: ["generating", "completed", "generation_failed"], default: "completed", index: true },
  featureKey: { type: String, default: "fusion-fortune-consultation", trim: true, maxlength: 80 },
  accessType: { type: String, default: "paid", trim: true, maxlength: 40 },
  llmMeta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "fusionFortuneConsultations" });
// NOTE: db.js 는 autoIndex:false 로 연결하므로 이 선언만으로는 인덱스가 생기지 않는다 —
// scripts/migrations/20260812-add-fusion-fortune-consultation-indexes.mjs 를 1회 실행할 것.
fusionFortuneConsultationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
fusionFortuneConsultationSchema.index({ userId: 1, createdAt: -1 });

// socialAccounts.<provider>.id defaults to "" (not absent), so a plain sparse index wouldn't
// exclude non-social users — a partial filter on non-empty values keeps these lean the same
// way pointHistorySchema's dedupeKey index does. findOrCreateSocialUser (worker/routes/auth.js)
// queries these on every social login; without this, it's an unindexed scan over all users.
// NOTE: db.js connects with autoIndex:false, so this declaration alone does not create the
// index in production — re-run `npm run migrate:auth-core-indexes` once against the DB
// (scripts/migrations/20260705-add-auth-core-indexes.mjs already targets User.createIndexes()).
["google", "naver", "kakao"].forEach((provider) => {
  userSchema.index(
    { [`socialAccounts.${provider}.id`]: 1 },
    {
      partialFilterExpression: {
        [`socialAccounts.${provider}.id`]: { $exists: true, $type: "string", $gt: "" },
      },
    },
  );
});

// 월정석 만료 스윕(runMonthlyCreditExpiryTask)이 만료 예정 lot을 가진 유저만 좁혀 조회하도록.
// NOTE: db.js는 autoIndex:false로 연결하므로 이 선언만으로는 실제 인덱스가 생성되지 않는다 —
// scripts/migrations/20260711-add-monthly-credit-lot-expiry.mjs를 DB에 1회 실행할 것.
userSchema.index({ "profileSubscription.membershipCreditLots.expiresAt": 1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const ProfileCard = mongoose.models.ProfileCard || mongoose.model("ProfileCard", profileCardSchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
export const PointHistory = mongoose.models.PointHistory || mongoose.model("PointHistory", pointHistorySchema);
export const MonthlyCreditLedger = mongoose.models.MonthlyCreditLedger
  || mongoose.model("MonthlyCreditLedger", monthlyCreditLedgerSchema);
export const ContentEntitlement = mongoose.models.ContentEntitlement
  || mongoose.model("ContentEntitlement", contentEntitlementSchema);
export const PaymentFailureLog = mongoose.models.PaymentFailureLog || mongoose.model("PaymentFailureLog", paymentFailureLogSchema);
export const PaymentWebhookEvent = mongoose.models.PaymentWebhookEvent
  || mongoose.model("PaymentWebhookEvent", paymentWebhookEventSchema);
export const CheckoutFunnelEvent = mongoose.models.CheckoutFunnelEvent
  || mongoose.model("CheckoutFunnelEvent", checkoutFunnelEventSchema);
export const SecurityEvent = mongoose.models.SecurityEvent || mongoose.model("SecurityEvent", securityEventSchema);

export const AdminAuditLog = mongoose.models.AdminAuditLog || mongoose.model("AdminAuditLog", adminAuditLogSchema);
export const IdempotencyKey = mongoose.models.IdempotencyKey || mongoose.model("IdempotencyKey", idempotencyKeySchema);
export const AbuseScore = mongoose.models.AbuseScore || mongoose.model("AbuseScore", abuseScoreSchema);
export const LlmResponseCache = mongoose.models.LlmResponseCache
  || mongoose.model("LlmResponseCache", llmResponseCacheSchema);
export const RefreshTokenSession = mongoose.models.RefreshTokenSession || mongoose.model("RefreshTokenSession", refreshTokenSessionSchema);
export const ServiceExecutionTransaction = mongoose.models.ServiceExecutionTransaction
  || mongoose.model("ServiceExecutionTransaction", serviceExecutionTransactionSchema);
export const PaidExecutionRecord = mongoose.models.PaidExecutionRecord
  || mongoose.model("PaidExecutionRecord", paidExecutionRecordSchema);
export const NewYearAiConsultation = mongoose.models.NewYearAiConsultation
  || mongoose.model("NewYearAiConsultation", newYearAiConsultationSchema);
export const KarmaDestinyAiConsultation = mongoose.models.KarmaDestinyAiConsultation
  || mongoose.model("KarmaDestinyAiConsultation", karmaDestinyAiConsultationSchema);
export const ZiweiAiConsultation = mongoose.models.ZiweiAiConsultation
  || mongoose.model("ZiweiAiConsultation", ziweiAiConsultationSchema);
export const LoveSecretAiConsultation = mongoose.models.LoveSecretAiConsultation
  || mongoose.model("LoveSecretAiConsultation", loveSecretAiConsultationSchema);
export const DestinyCompassReport = mongoose.models.DestinyCompassReport
  || mongoose.model("DestinyCompassReport", destinyCompassReportSchema);

export const ZiweiDeepReport = mongoose.models.ZiweiDeepReport
  || mongoose.model("ZiweiDeepReport", ziweiDeepReportSchema);
export const MasterLoveCodexSession = mongoose.models.MasterLoveCodexSession
  || mongoose.model("MasterLoveCodexSession", masterLoveCodexSchema);
export const LifeBookAiConsultation = mongoose.models.LifeBookAiConsultation
  || mongoose.model("LifeBookAiConsultation", lifeBookAiConsultationSchema);
export const SukuyoCompatibilityAiConsultation = mongoose.models.SukuyoCompatibilityAiConsultation
  || mongoose.model("SukuyoCompatibilityAiConsultation", sukuyoCompatibilityAiConsultationSchema);
export const VedicAiConsultation = mongoose.models.VedicAiConsultation
  || mongoose.model("VedicAiConsultation", vedicAiConsultationSchema);
export const AstrologyAiConsultation = mongoose.models.AstrologyAiConsultation
  || mongoose.model("AstrologyAiConsultation", astrologyAiConsultationSchema);
export const NeoOperationRoomConsultation = mongoose.models.NeoOperationRoomConsultation
  || mongoose.model("NeoOperationRoomConsultation", neoOperationRoomConsultationSchema);
export const NakshatraAiConsultation = mongoose.models.NakshatraAiConsultation
  || mongoose.model("NakshatraAiConsultation", nakshatraAiConsultationSchema);
export const GuardianFortuneGuestUsage = mongoose.models.GuardianFortuneGuestUsage
  || mongoose.model("GuardianFortuneGuestUsage", guardianFortuneGuestUsageSchema);
export const GuardianFortuneDailyUsage = mongoose.models.GuardianFortuneDailyUsage
  || mongoose.model("GuardianFortuneDailyUsage", guardianFortuneDailyUsageSchema);
export const GuardianFortuneAccountUsage = mongoose.models.GuardianFortuneAccountUsage
  || mongoose.model("GuardianFortuneAccountUsage", guardianFortuneAccountUsageSchema);
export const GuardianFortuneAnonymousMerge = mongoose.models.GuardianFortuneAnonymousMerge
  || mongoose.model("GuardianFortuneAnonymousMerge", guardianFortuneAnonymousMergeSchema);
export const FortuneChatSession = mongoose.models.FortuneChatSession
  || mongoose.model("FortuneChatSession", fortuneChatSessionSchema);
export const GuardianFortuneGenerationAttempt = mongoose.models.GuardianFortuneGenerationAttempt
  || mongoose.model("GuardianFortuneGenerationAttempt", guardianFortuneGenerationAttemptSchema);
export const GuardianFortuneSharedSnapshot = mongoose.models.GuardianFortuneSharedSnapshot
  || mongoose.model("GuardianFortuneSharedSnapshot", guardianFortuneSharedSnapshotSchema);
export const FusionFortuneGenerationAttempt = mongoose.models.FusionFortuneGenerationAttempt
  || mongoose.model("FusionFortuneGenerationAttempt", fusionFortuneGenerationAttemptSchema);
export const FusionFortuneConsultation = mongoose.models.FusionFortuneConsultation
  || mongoose.model("FusionFortuneConsultation", fusionFortuneConsultationSchema);

const userRpgProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  profileId: { type: String, required: true, trim: true, maxlength: 120 },
  currentLevel: { type: Number, default: 1, min: 1, index: true },
  totalExp: { type: Number, default: 0, min: 0 },
  currentLevelExp: { type: Number, default: 0, min: 0 },
  nextLevelExp: { type: Number, default: 100, min: 1 },
  unlockedSkills: { type: [String], default: [] },
  unlockedSecretFortunes: { type: [String], default: [] },
  unlockedMilestoneRewards: { type: [String], default: [] },
  streakDays: { type: Number, default: 0, min: 0 },
  longestStreakDays: { type: Number, default: 0, min: 0 },
  lastQuestDateKst: { type: String, default: "", trim: true, maxlength: 10, index: true },
  lastQuestCompletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "user_rpg_progresses" });

userRpgProgressSchema.index({ userId: 1, profileId: 1 }, { unique: true });
userRpgProgressSchema.index({ userId: 1, updatedAt: -1 });
userRpgProgressSchema.index({ userId: 1, currentLevel: 1 });

export const UserRpgProgress = mongoose.models.UserRpgProgress
  || mongoose.model("UserRpgProgress", userRpgProgressSchema);

const userDailyQuestLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  profileId: { type: String, required: true, trim: true, maxlength: 120 },
  questDateKst: { type: String, required: true, trim: true, maxlength: 10, index: true },
  questId: { type: String, required: true, trim: true, maxlength: 150 },
  questType: { type: String, default: "daily_rpg", trim: true, maxlength: 50 },
  element: { type: String, default: "", trim: true, maxlength: 20 },
  expReward: { type: Number, default: 0, min: 0 },
  completedAt: { type: Date, default: null, index: true },
  evidenceType: { type: String, default: "server_generated_quest", trim: true, maxlength: 50 },
  status: {
    type: String,
    enum: ["completed", "rejected", "reversed"],
    default: "completed",
    index: true,
  },
  idempotencyKey: { type: String, default: "", trim: true, maxlength: 180 },
  missionSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "user_daily_quest_logs" });

userDailyQuestLogSchema.index({ userId: 1, profileId: 1, questDateKst: 1, questId: 1 }, { unique: true });
userDailyQuestLogSchema.index({ userId: 1, questDateKst: 1 });
userDailyQuestLogSchema.index({ userId: 1, profileId: 1, questDateKst: 1 });

export const UserDailyQuestLog = mongoose.models.UserDailyQuestLog
  || mongoose.model("UserDailyQuestLog", userDailyQuestLogSchema);

const userRpgRewardLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  profileId: { type: String, required: true, trim: true, maxlength: 120 },
  rewardType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    index: true,
  },
  rewardKey: { type: String, required: true, trim: true, maxlength: 150 },
  level: { type: Number, default: 0, min: 0, index: true },
  idempotencyKey: { type: String, default: "", trim: true, maxlength: 180 },
  meta: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "user_rpg_reward_logs" });

userRpgRewardLogSchema.index({ userId: 1, profileId: 1, rewardType: 1, rewardKey: 1 }, { unique: true });
userRpgRewardLogSchema.index({ userId: 1, profileId: 1, level: 1 });
userRpgRewardLogSchema.index({ userId: 1, createdAt: -1 });

export const UserRpgRewardLog = mongoose.models.UserRpgRewardLog
  || mongoose.model("UserRpgRewardLog", userRpgRewardLogSchema);

const dailyFortuneSubscriptionSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: emailRegex },
  subDaily: { type: Boolean, default: true },
  subMonthly: { type: Boolean, default: false },
  birthYear: { type: Number, default: null, min: 1900, max: 2100 },
  birthDate: { type: String, default: "", trim: true, maxlength: 10 },
  birthHour: { type: Number, default: null, min: 0, max: 23 },
  birthMinute: { type: Number, default: null, min: 0, max: 59 },
  calendarType: { type: String, default: "solar", trim: true, maxlength: 20 },
  timezone: { type: String, default: "Asia/Seoul", trim: true, maxlength: 40 },
  sajuSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  source: { type: String, default: "saju-analysis", trim: true, maxlength: 40 },
  isActive: { type: Boolean, default: true, index: true },
  lastSentAt: { type: Date, default: null },
  lastMailError: { type: String, default: "", trim: true, maxlength: 240 },
  lastMailErrorAt: { type: Date, default: null },
  unsubscribedAt: { type: Date, default: null },
}, { timestamps: true });

dailyFortuneSubscriptionSchema.index({ isActive: 1, subDaily: 1 });

export const DailyFortuneSubscription = mongoose.models.DailyFortuneSubscription
  || mongoose.model("DailyFortuneSubscription", dailyFortuneSubscriptionSchema);

const insightFeaturedImageSchema = new mongoose.Schema({
  url: { type: String, default: "", trim: true },
  alt: { type: String, default: "", trim: true },
  width: { type: Number, default: 0, min: 0 },
  height: { type: Number, default: 0, min: 0 },
}, { _id: false });

const contentSeoSchema = new mongoose.Schema({
  metaTitle: { type: String, default: "", trim: true },
  metaDescription: { type: String, default: "", trim: true },
  ogTitle: { type: String, default: "", trim: true },
  ogDescription: { type: String, default: "", trim: true },
  ogImage: { type: String, default: "", trim: true },
  canonicalUrl: { type: String, default: "", trim: true },
}, { _id: false });

const insightSchema = new mongoose.Schema({
  type: { type: String, default: "fortune_insight", trim: true, index: true },
  title: { type: String, required: true, trim: true },
  summary: { type: String, default: "", trim: true },
  subtitle: { type: String, default: "", trim: true },
  slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
  excerpt: { type: String, default: "", trim: true },
  content: { type: String, default: "" },
  contentFormat: { type: String, default: "html", trim: true },
  contentHtml: { type: String, default: "" },
  contentJson: { type: mongoose.Schema.Types.Mixed, default: {} },
  revision: { type: Number, default: 1, min: 1 },
  revisionHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },

  featuredImage: { type: insightFeaturedImageSchema, default: () => ({}) },
  thumbnailUrl: { type: String, default: "", trim: true },

  category: { type: String, default: "", trim: true },
  tags: { type: [String], default: [] },

  seo: { type: contentSeoSchema, default: () => ({}) },

  metaTitle: { type: String, default: "", trim: true },
  metaDescription: { type: String, default: "", trim: true },
  keywords: { type: [String], default: [] },
  canonicalUrl: { type: String, default: "", trim: true },

  ogTitle: { type: String, default: "", trim: true },
  ogDescription: { type: String, default: "", trim: true },
  ogImage: { type: String, default: "", trim: true },

  twitterTitle: { type: String, default: "", trim: true },
  twitterDescription: { type: String, default: "", trim: true },
  twitterImage: { type: String, default: "", trim: true },

  authorId: { type: String, default: "", trim: true },
  authorName: { type: String, default: "", trim: true },
  author: { type: String, default: "", trim: true },

  status: {
    type: String,
    enum: ["draft", "scheduled", "published", "archived", "private", "trash"],
    default: "draft",
    required: true,
  },

  isPublished: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  noIndex: { type: Boolean, default: false },

  viewCount: { type: Number, default: 0, min: 0 },
  readingTime: { type: Number, default: 0, min: 0 },

  publishedAt: { type: Date, default: null },
}, { timestamps: true });

insightSchema.index({ type: 1, status: 1, updatedAt: -1 });
insightSchema.index({ status: 1, updatedAt: -1 });
insightSchema.index({ category: 1, updatedAt: -1 });
insightSchema.index({ isFeatured: 1, updatedAt: -1 });

export const Insight = mongoose.models.Insight || mongoose.model("Insight", insightSchema);

// 구 오버라이드 컬렉션. 신규 편집은 전부 CmsEntry 로 가고, 이 모델은 유명인 사주의
// 기존 발행본을 읽기 위해서만 남는다(웹소설이 라이트 노벨로 대체되며 story/chapter 는 폐기).
const contentOverrideSchema = new mongoose.Schema({
  source: { type: String, enum: ["famous-saju"], required: true },
  key: { type: String, required: true, trim: true },
  fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  updatedBy: { type: String, default: "", trim: true },
}, { timestamps: true });

contentOverrideSchema.index({ source: 1, key: 1 }, { unique: true });

export const ContentOverride = mongoose.models.ContentOverride || mongoose.model("ContentOverride", contentOverrideSchema);

/* 통합 CMS 엔트리. 관리자가 고치는 모든 텍스트/프롬프트가 여기 한 컬렉션에 들어간다.
   무엇을 편집할 수 있는지는 lib/cms/registry.mjs 가 선언하고, 이 스키마는 그 값을 담기만 한다
   (네임스페이스를 enum 으로 못 박지 않는 이유 — 새 콘텐츠군 추가에 스키마 변경이 따라오면
    "코드 수정 없이 늘어난다"는 전제가 깨진다).

   channel 이 전달 방식을 가른다:
     runtime — 워커가 바로 읽어 서빙(즉시 반영). AI 프롬프트·공지·버튼 문구 등.
     build   — 정적 빌드에 구워짐(사이트 반영 필요). SEO 본문·라이트 노벨·서비스 소개 등.
   정적 export 라 사용자 화면 문구는 대부분 build 로 갈 수밖에 없다. */
const cmsEntrySchema = new mongoose.Schema({
  namespace: { type: String, required: true, trim: true },
  key: { type: String, required: true, trim: true },
  locale: { type: String, default: "ko", trim: true, lowercase: true },
  fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    enum: ["draft", "review", "scheduled", "published", "archived"],
    default: "draft",
    required: true,
  },
  channel: { type: String, enum: ["runtime", "build"], default: "build" },
  publishAt: { type: Date, default: null },
  unpublishAt: { type: Date, default: null },
  version: { type: Number, default: 1, min: 1 },
  note: { type: String, default: "", trim: true, maxlength: 500 },
  updatedBy: { type: String, default: "", trim: true },
}, { timestamps: true });

cmsEntrySchema.index({ namespace: 1, key: 1, locale: 1 }, { unique: true });
cmsEntrySchema.index({ status: 1, updatedAt: -1 });
cmsEntrySchema.index({ channel: 1, status: 1 });

export const CmsEntry = mongoose.models.CmsEntry || mongoose.model("CmsEntry", cmsEntrySchema);

/* 버전 스냅샷. 엔트리 본문에 배열로 쌓지 않고 별도 컬렉션으로 뺀 이유는, 문서 안에 이력을 무한히
   누적하면 문서가 부풀어 결국 저장 자체가 실패하기 때문이다(환불 마커 누적으로 영구 500 이 났던 전례).
   키당 CMS_REVISION_KEEP 개까지만 남기고 오래된 것부터 지운다. */
const cmsRevisionSchema = new mongoose.Schema({
  namespace: { type: String, required: true, trim: true },
  key: { type: String, required: true, trim: true },
  locale: { type: String, default: "ko", trim: true, lowercase: true },
  version: { type: Number, required: true, min: 1 },
  fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, default: "draft", trim: true },
  note: { type: String, default: "", trim: true, maxlength: 500 },
  updatedBy: { type: String, default: "", trim: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

cmsRevisionSchema.index({ namespace: 1, key: 1, locale: 1, version: -1 });

export const CmsRevision = mongoose.models.CmsRevision || mongoose.model("CmsRevision", cmsRevisionSchema);

const destinyBiasCardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, default: "", trim: true, maxlength: 160 },
  headline: { type: String, default: "", trim: true, maxlength: 240 },
  summary: { type: String, default: "", trim: true, maxlength: 1200 },
  themeKey: { type: String, default: "moonlight_neon", trim: true, maxlength: 40 },
  score: { type: Number, default: 0, min: 0, max: 100 },
  grade: { type: String, default: "", trim: true, maxlength: 8 },
  reportText: { type: String, default: "" },
  canonical: { type: mongoose.Schema.Types.Mixed, default: null },
  sharePayload: { type: mongoose.Schema.Types.Mixed, default: null },
  source: { type: String, default: "destiny-bias", trim: true, maxlength: 80 },
}, { timestamps: true });

destinyBiasCardSchema.index({ userId: 1, createdAt: -1 });

export const DestinyBiasCard = mongoose.models.DestinyBiasCard
  || mongoose.model("DestinyBiasCard", destinyBiasCardSchema);

import { mongoose } from "./db.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: emailRegex },
  profileImage: { type: String, default: "", trim: true },
  phoneNumber: { type: String, default: "", trim: true, match: /^01\d{8,9}$/ },
  passwordHash: { type: String, required: false, default: "", select: false },
  birthDate: { type: String, required: true, default: "1900-01-01", match: birthDateRegex },
  birthTime: { type: String, required: true, default: "00:00", match: birthTimeRegex },
  gender: { type: String, required: true, enum: ["M", "F", "OTHER"], default: "OTHER" },
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
  usagePasses: {
    type: [{
      category: { type: String, enum: ["saju", "tarot", "saju_unlock", "fortune_30", "fortune_50", "compat"], required: true },
      remainingUses: { type: Number, min: 0, default: 0 },
      purchasedUses: { type: Number, min: 0, default: 0 },
      productId: { type: String, default: "", trim: true, maxlength: 80 },
      lastPaymentId: { type: String, default: "", trim: true, maxlength: 120 },
      lastGrantedAt: { type: Date, default: null },
      updatedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
  localAuth: {
    enabled: { type: Boolean, default: true },
    activatedAt: { type: Date, default: Date.now },
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
    passTotalUses: { type: Number, default: 0, min: 0 },
    passRemainingUses: { type: Number, default: 0, min: 0 },
    passUsedCount: { type: Number, default: 0, min: 0 },
    maxCoveredCoin: { type: Number, default: 0, min: 0 },
    freeLimit: { type: Number, default: 0, min: 0 },
    passLimit: { type: Number, default: 0, min: 0 },
    membershipCreditBalance: { type: Number, default: 0, min: 0 },
    membershipCreditGranted: { type: Number, default: 0, min: 0 },
    membershipCreditUsed: { type: Number, default: 0, min: 0 },
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
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

pointHistorySchema.index({ userId: 1, createdAt: -1 });

const monthlyCreditLedgerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: {
    type: String,
    enum: ["MONTHLY_CREDIT_GRANT", "MONTHLY_CREDIT_SPEND"],
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
  serviceId: { type: String, default: "", trim: true, maxlength: 80, index: true },
  serviceKey: { type: String, required: true, trim: true, maxlength: 80, index: true },
  contentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  contentKey: { type: String, required: true, trim: true, maxlength: 120, index: true },
  contentType: { type: String, default: "", trim: true, maxlength: 80, index: true },
  scope: { type: String, enum: Object.values(CONTENT_ENTITLEMENT_SCOPES), required: true, default: CONTENT_ENTITLEMENT_SCOPES.PROFILE, index: true },
  status: { type: String, enum: Object.values(CONTENT_ENTITLEMENT_STATUSES), required: true, default: CONTENT_ENTITLEMENT_STATUSES.ACTIVE, index: true },
  source: { type: String, enum: Object.values(CONTENT_ENTITLEMENT_SOURCES), required: true },
  unlockedBy: { type: String, default: "", trim: true, maxlength: 80, index: true },
  orderId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  paymentId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  passId: { type: String, default: "", trim: true, maxlength: 160, index: true },
  coinAmount: { type: Number, default: 0, min: 0 },
  coinPrice: { type: Number, default: 0, min: 0 },
  amountKRW: { type: Number, default: 0, min: 0 },
  unlockedAt: { type: Date, required: true, default: Date.now, index: true },
  expiresAt: { type: Date, default: null, index: true },
}, { timestamps: true, collection: "content_entitlements" });

contentEntitlementSchema.index(
  { userId: 1, profileId: 1, serviceKey: 1, contentKey: 1, scope: 1 },
  { unique: true },
);
contentEntitlementSchema.index({ userId: 1, serviceKey: 1, status: 1, expiresAt: 1 });

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
  cost: { type: Number, default: 0, min: 0 },
  sourceTransactionId: { type: String, default: "", trim: true, maxlength: 120, index: true },
  paymentRef: {
    impUid: { type: String, default: "", trim: true, maxlength: 120 },
    merchantUid: { type: String, default: "", trim: true, maxlength: 120 },
    paymentId: { type: String, default: "", trim: true, maxlength: 120 },
    cancelEligible: { type: Boolean, default: false },
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
  refundedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  compensatedAt: { type: Date, default: null },
  failureStage: { type: String, default: "", trim: true, maxlength: 80 },
  failureReason: { type: String, default: "", trim: true, maxlength: 500 },
  refundReason: { type: String, default: "", trim: true, maxlength: 160 },
  refundStatus: {
    type: String,
    enum: ["none", "pending", "refunded", "failed"],
    default: "none",
    index: true,
  },
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
    usagePassRefunded: { type: Boolean, default: false },
    usagePassCategory: { type: String, default: "", trim: true, maxlength: 80 },
    paymentCancelled: { type: Boolean, default: false },
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  retentionUntil: { type: Date, default: null },
}, { timestamps: true });

serviceExecutionTransactionSchema.index({ userId: 1, executionKey: 1 }, { unique: true });
serviceExecutionTransactionSchema.index({ status: 1, timeoutAt: 1, nextRetryAt: 1 });
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
    unique: true,
    sparse: true,
    partialFilterExpression: {
      paymentId: { $exists: true, $type: "string", $gt: "" },
    },
  },
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const ProfileCard = mongoose.models.ProfileCard || mongoose.model("ProfileCard", profileCardSchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
export const PointHistory = mongoose.models.PointHistory || mongoose.model("PointHistory", pointHistorySchema);
export const MonthlyCreditLedger = mongoose.models.MonthlyCreditLedger
  || mongoose.model("MonthlyCreditLedger", monthlyCreditLedgerSchema);
export const ContentEntitlement = mongoose.models.ContentEntitlement
  || mongoose.model("ContentEntitlement", contentEntitlementSchema);
export const PaymentFailureLog = mongoose.models.PaymentFailureLog || mongoose.model("PaymentFailureLog", paymentFailureLogSchema);
export const RefreshTokenSession = mongoose.models.RefreshTokenSession || mongoose.model("RefreshTokenSession", refreshTokenSessionSchema);
export const ServiceExecutionTransaction = mongoose.models.ServiceExecutionTransaction
  || mongoose.model("ServiceExecutionTransaction", serviceExecutionTransactionSchema);
export const PaidExecutionRecord = mongoose.models.PaidExecutionRecord
  || mongoose.model("PaidExecutionRecord", paidExecutionRecordSchema);

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

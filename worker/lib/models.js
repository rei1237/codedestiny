import { mongoose } from "./db.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: emailRegex },
  profileImage: { type: String, default: "", trim: true },
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
  twoFA: {
    enabled: { type: Boolean, default: false, index: true },
    totpSecret: { type: String, default: "" },
    backupCodesHash: { type: [String], default: [] },
  },
  adminRefreshTokenHash: { type: String, default: "" },
  adminLastActivityAt: { type: Date, default: null },
  profileSubscription: {
    tier: { type: String, enum: ["free", "standard", "premium", "vvip"], default: "free" },
    source: { type: String, enum: ["coin", "card"], default: "coin" },
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
  has_started_paid_service: { type: Boolean, default: false, index: true },
  first_service_access_date: { type: Date, default: null },
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  impUid: { type: String, unique: true, sparse: true, index: true, trim: true },
  merchantUid: { type: String, unique: true, sparse: true, index: true, trim: true },
  paymentAmount: { type: Number, required: true, min: 0 },
  expectedChargedPoints: { type: Number, min: 0, default: 0 },
  chargedPoints: { type: Number, required: true, min: 0, default: 0 },
  paymentMethod: { type: String, trim: true, default: "unknown" },
  status: { type: String, enum: ["pending", "success", "failed", "cancelled"], default: "pending", index: true },
  failureCode: { type: String, trim: true, maxlength: 80 },
  failureMessage: { type: String, trim: true, maxlength: 500 },
  failureStage: { type: String, trim: true, maxlength: 80 },
  lastErrorAt: { type: Date },
  confirmAttempts: { type: Number, default: 0, min: 0 },
  paidAt: { type: Date },
  source: { type: String, enum: ["prepare", "confirm", "webhook", "system"], default: "confirm" },
  paymentType: {
    type: String,
    enum: ["point_charge", "subscription_initial", "subscription_recurring"],
    default: "point_charge",
    index: true,
  },
  subscriptionTier: {
    type: String,
    enum: ["standard", "premium", "vvip", ""],
    default: "",
  },
  rawPortOne: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

paymentSchema.index({ userId: 1, createdAt: -1 });

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

const refreshTokenSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  userAgent: { type: String, default: "", trim: true, maxlength: 300 },
  ip: { type: String, default: "", trim: true, maxlength: 120 },
  expiresAt: { type: Date, required: true, index: true },
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

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
export const PointHistory = mongoose.models.PointHistory || mongoose.model("PointHistory", pointHistorySchema);
export const PaymentFailureLog = mongoose.models.PaymentFailureLog || mongoose.model("PaymentFailureLog", paymentFailureLogSchema);
export const RefreshTokenSession = mongoose.models.RefreshTokenSession || mongoose.model("RefreshTokenSession", refreshTokenSessionSchema);

const dailyFortuneSubscriptionSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: emailRegex },
  subDaily: { type: Boolean, default: true },
  subMonthly: { type: Boolean, default: false },
  birthYear: { type: Number, default: null, min: 1900, max: 2100 },
  source: { type: String, default: "saju-analysis", trim: true, maxlength: 40 },
  isActive: { type: Boolean, default: true, index: true },
  lastSentAt: { type: Date, default: null },
  unsubscribedAt: { type: Date, default: null },
}, { timestamps: true });

dailyFortuneSubscriptionSchema.index({ email: 1 }, { unique: true });
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
    enum: ["draft", "published", "archived", "private", "trash"],
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

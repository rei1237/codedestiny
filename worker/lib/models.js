import { mongoose } from "./db.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: emailRegex },
  passwordHash: { type: String, required: false, default: "", select: false },
  birthDate: { type: String, required: true, default: "1900-01-01", match: birthDateRegex },
  birthTime: { type: String, required: true, default: "00:00", match: birthTimeRegex },
  gender: { type: String, required: true, enum: ["M", "F", "OTHER"], default: "OTHER" },
  joinedAt: { type: Date, default: Date.now },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  points: { type: Number, default: 0, min: 0 },
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
  twoFA: {
    enabled: { type: Boolean, default: false, index: true },
    totpSecret: { type: String, default: "" },
    backupCodesHash: { type: [String], default: [] },
  },
  adminRefreshTokenHash: { type: String, default: "" },
  adminLastActivityAt: { type: Date, default: null },
  profileSubscription: {
    tier: { type: String, enum: ["free", "standard", "premium", "vvip"], default: "free" },
    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    firstSubAt: { type: Date, default: null },
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

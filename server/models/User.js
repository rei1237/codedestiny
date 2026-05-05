const mongoose = require("mongoose");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 40,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: emailRegex,
  },
  passwordHash: {
    type: String,
    required: false,
    default: "",
    select: false,
  },
  birthDate: {
    type: String,
    required: true,
    default: "1900-01-01",
    match: birthDateRegex,
  },
  birthTime: {
    type: String,
    required: true,
    default: "00:00",
    match: birthTimeRegex,
  },
  gender: {
    type: String,
    required: true,
    enum: ["M", "F", "OTHER"],
    default: "OTHER",
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  points: {
    type: Number,
    default: 0,
    min: 0,
  },
  recentConsumeRequestIds: {
    type: [String],
    default: [],
  },
  unlockedFeatures: {
    type: [String],
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
  destinyProfiles: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  destinyProfilesCurrentId: {
    type: String,
    default: "",
  },
  /**
   * 2FA(TOTP) 설정
   * - 이 값은 관리자 로그인에서만 사용한다.
   * - 보안 상 이유로 일반 사용자 인증/기능 흐름에는 영향을 주지 않도록 optional 필드로 둔다.
   */
  twoFA: {
    enabled: { type: Boolean, default: false, index: true },
    // otplib의 generateSecret 결과(Base32)
    totpSecret: { type: String, default: "" },
    // 백업코드의 bcrypt 해시 배열(원문은 절대 저장하지 않는다)
    backupCodesHash: { type: [String], default: [] },
  },
  /**
   * 동시 세션 1개만 허용을 위한 리프레시 토큰 해시 저장(관리자 전용)
   * - refresh token 원문은 저장하지 않고, 해시만 저장한다.
   */
  adminRefreshTokenHash: { type: String, default: "" },
  /**
   * 마지막 관리자 활동 시간(30분 비활동 로그아웃 구현을 위한 상태값)
   * - 강제 로그아웃은 서버 메모리/캐시에 함께 구현 가능하지만,
   *   서버 재시작에도 어느 정도 동작을 유지하기 위해 DB 값도 보조로 둔다.
   */
  adminLastActivityAt: { type: Date, default: null },
  /**
   * 프로필 카드 다중 구독
   * - free:     프로필 1개
   * - standard(115코인/월): 프로필 3개
   * - premium(360코인/월): 프로필 7개
   * - vvip(700코인/월): 프로필 15개
   * 구독은 30일 기간 기반으로 유지. 코인 잔액이 충분하면 만료 시 자동 갱신.
   */
  profileSubscription: {
    tier:       { type: String, enum: ["free", "standard", "premium", "vvip"], default: "free" },
    source: { type: String, enum: ["coin", "card"], default: "coin" },
    startedAt:  { type: Date, default: null },
    expiresAt:  { type: Date, default: null },
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
  // 구독형 디지털 콘텐츠 서비스 개시 기록
  // - 멤버십 전용 콘텐츠 열람 확인 팝업의 [확인] 클릭 시 true
  // - 환불 분쟁 대응용 최초 개시 시각 보관
  has_started_paid_service: { type: Boolean, default: false, index: true },
  first_service_access_date: { type: Date, default: null },
}, {
  timestamps: true,
});

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);

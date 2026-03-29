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
    required: true,
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
}, {
  timestamps: true,
});

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);

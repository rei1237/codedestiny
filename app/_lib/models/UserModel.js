/**
 * Next.js App Router / CF Pages 전용 User 모델 (ESM)
 * - server/models/User.js의 CJS 버전과 동일한 스키마 유지
 */

import mongoose from "mongoose";
import { dbConnect } from "../dbConnect.js";

let _UserModel = null;

export async function getUserModel() {
  const m = await dbConnect();

  if (_UserModel) return _UserModel;

  // mongoose.models 캐시 확인 (hot-reload 환경)
  if (mongoose.models && mongoose.models.User) {
    _UserModel = mongoose.models.User;
    return _UserModel;
  }

  const { Schema } = mongoose;

  const userSchema = new Schema(
    {
      name:         { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
      email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, default: "", select: false },
      birthDate:    { type: String, required: true, default: "1900-01-01" },
      birthTime:    { type: String, required: true, default: "00:00" },
      gender:       { type: String, enum: ["M", "F", "OTHER"], default: "OTHER" },
      joinedAt:     { type: Date, default: Date.now },
      role:         { type: String, enum: ["user", "admin"], default: "user" },
      points:       { type: Number, default: 0, min: 0 },
      unlockedFeatures: { type: [String], default: [] },
      paidFeatures: { type: [String], default: [] },
      licenses: {
        standard: { type: Number, default: 0, min: 0 },
        premium: { type: Number, default: 0, min: 0 },
        vvip: { type: Number, default: 0, min: 0 },
        status: { type: String, default: "" },
        expiresAt: { type: Date, default: null },
      },
      // 계정 상태 (ban 기능)
      status:       { type: String, enum: ["active", "banned", "suspended", "withdrawn"], default: "active" },
      banReason:    { type: String, default: "" },
      bannedAt:     { type: Date, default: null },
      // 마지막 로그인
      lastLoginAt:  { type: Date, default: null },
      localAuth: {
        enabled:     { type: Boolean, default: true },
        activatedAt: { type: Date, default: Date.now },
      },
      socialAccounts: {
        google: { id: { type: String, default: "" }, connectedAt: { type: Date, default: null } },
        naver:  { id: { type: String, default: "" }, connectedAt: { type: Date, default: null } },
        kakao:  { id: { type: String, default: "" }, connectedAt: { type: Date, default: null } },
      },
      profileSubscription: {
        tier:       { type: String, enum: ["free", "standard", "premium", "vvip", "honey_standard", "honey_premium", "honey_vvip"], default: "free" },
        planId:     { type: String, enum: ["free", "honey_standard", "honey_premium", "honey_vvip"], default: "free" },
        status:     { type: String, enum: ["none", "active", "expired", "renewal_failed", "canceled"], default: "none" },
        startedAt:  { type: Date, default: null },
        expiresAt:  { type: Date, default: null },
        currentPeriodStart: { type: Date, default: null },
        currentPeriodEnd: { type: Date, default: null },
        firstSubAt: { type: Date, default: null },
        autoRenewEnabled: { type: Boolean, default: false },
        cancelAtPeriodEnd: { type: Boolean, default: false },
        cancelRequestedAt: { type: Date, default: null },
        priceCoins: { type: Number, default: 0, min: 0 },
        profileLimit: { type: Number, default: 1, min: 1 },
        freeServiceThresholdCoins: { type: Number, default: 0, min: 0 },
        lastRenewedAt: { type: Date, default: null },
        lastRenewalFailedAt: { type: Date, default: null },
        renewalFailReason: { type: String, enum: ["", "INSUFFICIENT_COINS", "PAYMENT_ERROR", "UNKNOWN"], default: "" },
      },
      monthlySubscription: {
        active: { type: Boolean, default: false },
        status: { type: String, default: "" },
        tier: { type: String, default: "" },
        startedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
        source: { type: String, default: "" },
      },
      has_started_paid_service: { type: Boolean, default: false, index: true },
      first_service_access_date: { type: Date, default: null },
      // 다마고치 펫 (계정당 1마리)
      tamagotchi: { type: mongoose.Schema.Types.Mixed, default: null },
      // 운세 프로필 (생년월일/출생시간/성별 등, 운세 서비스 제공 목적으로만 사용)
      destinyProfiles: { type: [mongoose.Schema.Types.Mixed], default: [] },
      destinyCurrentProfileId: { type: String, default: "" },
    },
    { timestamps: true },
  );

  userSchema.index({ email: 1 }, { unique: true });

  // 컬렉션 이름 명시 (3번째 인수) → mongoose 자동 복수화('users')와 동일하나 명시해 mismatch 방지
  _UserModel = mongoose.model("User", userSchema, "users");
  return _UserModel;
}

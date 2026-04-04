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
      // 계정 상태 (ban 기능)
      status:       { type: String, enum: ["active", "banned", "suspended"], default: "active" },
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
        tier:       { type: String, enum: ["free", "standard", "premium", "vvip"], default: "free" },
        startedAt:  { type: Date, default: null },
        expiresAt:  { type: Date, default: null },
        firstSubAt: { type: Date, default: null },
      },
    },
    { timestamps: true },
  );

  userSchema.index({ email: 1 }, { unique: true });

  // 컬렉션 이름 명시 (3번째 인수) → mongoose 자동 복수화('users')와 동일하나 명시해 mismatch 방지
  _UserModel = mongoose.model("User", userSchema, "users");
  return _UserModel;
}

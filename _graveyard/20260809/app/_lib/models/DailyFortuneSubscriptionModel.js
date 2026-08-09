/**
 * Next.js App Router / CF Pages 전용 DailyFortuneSubscription 모델 (ESM)
 * - server/models/DailyFortuneSubscription.js의 CJS 버전과 동일한 스키마 유지
 */

import mongoose from "mongoose";
import { dbConnect } from "../dbConnect.js";

let _Model = null;

export async function getDailyFortuneSubscriptionModel() {
  await dbConnect();

  if (_Model) return _Model;

  if (mongoose.models && mongoose.models.DailyFortuneSubscription) {
    _Model = mongoose.models.DailyFortuneSubscription;
    return _Model;
  }

  const { Schema } = mongoose;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const schema = new Schema(
    {
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: emailRegex,
      },
      subDaily: { type: Boolean, default: true },
      subMonthly: { type: Boolean, default: false },
      birthYear: { type: Number, default: null, min: 1900, max: 2100 },
      source: { type: String, default: "saju-analysis", trim: true, maxlength: 40 },
      isActive: { type: Boolean, default: true, index: true },
      lastSentAt: { type: Date, default: null },
      unsubscribedAt: { type: Date, default: null },
    },
    { timestamps: true },
  );

  schema.index({ email: 1 }, { unique: true });
  schema.index({ isActive: 1, subDaily: 1 });

  _Model = mongoose.model("DailyFortuneSubscription", schema);
  return _Model;
}

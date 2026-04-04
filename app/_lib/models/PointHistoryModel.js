/**
 * Next.js App Router / CF Pages 전용 PointHistory 모델 (ESM)
 */

import mongoose from "mongoose";
import { dbConnect } from "../dbConnect.js";

let _PointHistoryModel = null;

export async function getPointHistoryModel() {
  await dbConnect();

  if (_PointHistoryModel) return _PointHistoryModel;
  if (mongoose.models && mongoose.models.PointHistory) {
    _PointHistoryModel = mongoose.models.PointHistory;
    return _PointHistoryModel;
  }

  const { Schema } = mongoose;

  const schema = new Schema(
    {
      userId:      { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      kind:        { type: String, enum: ["charge", "deduct", "refund", "adjust"], required: true, index: true },
      delta:       { type: Number, required: true },
      balanceAfter:{ type: Number, required: true, min: 0 },
      reason:      { type: String, trim: true, default: "" },
      featureKey:  { type: String, trim: true, default: "" },
      metadata:    { type: Schema.Types.Mixed },
    },
    { timestamps: true },
  );

  _PointHistoryModel = mongoose.model("PointHistory", schema);
  return _PointHistoryModel;
}

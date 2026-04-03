/**
 * Next.js App Router / CF Pages 전용 PointHistory 모델 (ESM)
 */

import { dbConnect } from "../dbConnect.js";

let _PointHistoryModel = null;

export async function getPointHistoryModel() {
  const m = await dbConnect();

  if (_PointHistoryModel) return _PointHistoryModel;
  if (m.models && m.models.PointHistory) {
    _PointHistoryModel = m.models.PointHistory;
    return _PointHistoryModel;
  }

  const { Schema } = m;

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

  _PointHistoryModel = m.model("PointHistory", schema);
  return _PointHistoryModel;
}

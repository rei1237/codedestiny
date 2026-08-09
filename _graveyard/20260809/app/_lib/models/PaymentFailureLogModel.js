/**
 * Next.js App Router / CF Pages 전용 PaymentFailureLog 모델 (ESM)
 */

import mongoose from "mongoose";
import { dbConnect } from "../dbConnect.js";

let _PaymentFailureLogModel = null;

export async function getPaymentFailureLogModel() {
  await dbConnect();

  if (_PaymentFailureLogModel) return _PaymentFailureLogModel;
  if (mongoose.models && mongoose.models.PaymentFailureLog) {
    _PaymentFailureLogModel = mongoose.models.PaymentFailureLog;
    return _PaymentFailureLogModel;
  }

  const { Schema } = mongoose;

  const schema = new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
      impUid: {
        type: String,
        trim: true,
        index: true,
      },
      merchantUid: {
        type: String,
        trim: true,
        index: true,
      },
      source: {
        type: String,
        enum: ["prepare", "confirm", "webhook", "client", "system"],
        default: "system",
        index: true,
      },
      stage: {
        type: String,
        trim: true,
        default: "unknown",
      },
      code: {
        type: String,
        trim: true,
        maxlength: 80,
      },
      message: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      status: {
        type: Number,
      },
      expectedAmount: {
        type: Number,
      },
      clientAmount: {
        type: Number,
      },
      portOneAmount: {
        type: Number,
      },
      portOneStatus: {
        type: String,
        trim: true,
        maxlength: 40,
      },
      requestMeta: {
        ip: { type: String, trim: true, maxlength: 120 },
        userAgent: { type: String, trim: true, maxlength: 300 },
        requestId: { type: String, trim: true, maxlength: 120 },
      },
      payload: {
        type: Schema.Types.Mixed,
      },
      rawPortOne: {
        type: Schema.Types.Mixed,
      },
    },
    { timestamps: true },
  );

  schema.index({ createdAt: -1 });
  schema.index({ source: 1, createdAt: -1 });

  _PaymentFailureLogModel = mongoose.model("PaymentFailureLog", schema, "paymentfailurelogs");
  return _PaymentFailureLogModel;
}

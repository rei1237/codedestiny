/**
 * Next.js App Router / CF Pages 전용 Payment 모델 (ESM)
 */

import mongoose from "mongoose";
import { dbConnect } from "../dbConnect.js";

let _PaymentModel = null;

export async function getPaymentModel() {
  await dbConnect();

  if (_PaymentModel) return _PaymentModel;
  if (mongoose.models && mongoose.models.Payment) {
    _PaymentModel = mongoose.models.Payment;
    return _PaymentModel;
  }

  const { Schema } = mongoose;

  const schema = new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      impUid: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
        trim: true,
      },
      merchantUid: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
        trim: true,
      },
      paymentAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      expectedChargedPoints: {
        type: Number,
        min: 0,
        default: 0,
      },
      chargedPoints: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      paymentMethod: {
        type: String,
        trim: true,
        default: "unknown",
      },
      status: {
        type: String,
        enum: ["pending", "success", "failed", "cancelled"],
        default: "pending",
        index: true,
      },
      failureCode: {
        type: String,
        trim: true,
        maxlength: 80,
      },
      failureMessage: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      failureStage: {
        type: String,
        trim: true,
        maxlength: 80,
      },
      lastErrorAt: {
        type: Date,
      },
      confirmAttempts: {
        type: Number,
        default: 0,
        min: 0,
      },
      paidAt: {
        type: Date,
      },
      source: {
        type: String,
        enum: ["prepare", "confirm", "webhook", "system"],
        default: "confirm",
      },
      rawPortOne: {
        type: Schema.Types.Mixed,
      },
    },
    { timestamps: true },
  );

  schema.index({ userId: 1, createdAt: -1 });

  _PaymentModel = mongoose.model("Payment", schema, "payments");
  return _PaymentModel;
}

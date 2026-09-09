import { mongoose } from "./db.js";
import { GIFT_STATUS } from "../../lib/payment/gift-policy.js";

const objectId = mongoose.Schema.Types.ObjectId;
const giftSchema = new mongoose.Schema({
  giftId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true, unique: true },
  paymentId: String,
  purchaserUserId: { type: objectId, required: true },
  recipientUserId: objectId,
  productId: String,
  productSnapshot: mongoose.Schema.Types.Mixed,
  policyVersion: String,
  senderName: String,
  recipientName: String,
  giftMessage: String,
  status: { type: String, enum: Object.values(GIFT_STATUS), required: true },
  claimTokenHash: String,
  tokenVersion: { type: Number, default: 0 },
  purchasedAt: Date, claimedAt: Date, expiresAt: Date,
  refundRequestedAt: Date, refundRequestId: String, refundPreviousStatus: String,
  reviewRequired: Boolean, paymentCancellation: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
giftSchema.index({ claimTokenHash: 1 }, { unique: true, partialFilterExpression: { claimTokenHash: { $type: "string" } } });
giftSchema.index({ purchaserUserId: 1, _id: -1 });
giftSchema.index({ recipientUserId: 1, _id: -1 });
giftSchema.index({ status: 1, expiresAt: 1 });
giftSchema.index({ paymentId: 1 });

const grantSchema = new mongoose.Schema({
  giftId: { type: String, required: true, unique: true },
  source: { type: String, enum: ["GIFT"], default: "GIFT" },
  purchaserUserId: objectId, recipientUserId: objectId,
  orderId: String, paymentId: String,
  before: mongoose.Schema.Types.Mixed, after: mongoose.Schema.Types.Mixed,
  grantedAt: Date,
}, { timestamps: true });
const contextSchema = new mongoose.Schema({
  contextHash: { type: String, unique: true, required: true },
  claimTokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
contextSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Gift = mongoose.models.Gift || mongoose.model("Gift", giftSchema);
export const GiftGrant = mongoose.models.GiftGrant || mongoose.model("GiftGrant", grantSchema);
export const GiftClaimContext = mongoose.models.GiftClaimContext || mongoose.model("GiftClaimContext", contextSchema);

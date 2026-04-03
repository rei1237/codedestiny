const mongoose = require("mongoose");

const pointHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  kind: {
    type: String,
    enum: ["charge", "deduct", "refund", "adjust", "share_reward"],
    required: true,
    index: true,
  },
  delta: {
    type: Number,
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
    min: 0,
  },
  reason: {
    type: String,
    trim: true,
    default: "",
  },
  featureKey: {
    type: String,
    trim: true,
    default: "",
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
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
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

pointHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.PointHistory || mongoose.model("PointHistory", pointHistorySchema);

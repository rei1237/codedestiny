const mongoose = require("mongoose");

const paymentFailureLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
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
    type: mongoose.Schema.Types.Mixed,
  },
  rawPortOne: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

paymentFailureLogSchema.index({ createdAt: -1 });
paymentFailureLogSchema.index({ source: 1, createdAt: -1 });

module.exports = mongoose.models.PaymentFailureLog || mongoose.model("PaymentFailureLog", paymentFailureLogSchema);

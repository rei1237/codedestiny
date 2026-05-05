const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
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
  paymentType: {
    type: String,
    enum: ["point_charge", "subscription_initial", "subscription_recurring"],
    default: "point_charge",
    index: true,
  },
  subscriptionTier: {
    type: String,
    enum: ["standard", "premium", "vvip", ""],
    default: "",
  },
  rawPortOne: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

paymentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

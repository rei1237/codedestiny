const mongoose = require("mongoose");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const dailyFortuneSubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: emailRegex,
  },
  subDaily: {
    type: Boolean,
    default: true,
  },
  subMonthly: {
    type: Boolean,
    default: false,
  },
  source: {
    type: String,
    default: "saju-analysis",
    trim: true,
    maxlength: 40,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastSentAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

dailyFortuneSubscriptionSchema.index({ email: 1 }, { unique: true });
dailyFortuneSubscriptionSchema.index({ isActive: 1, subDaily: 1 });

module.exports = mongoose.models.DailyFortuneSubscription
  || mongoose.model("DailyFortuneSubscription", dailyFortuneSubscriptionSchema);

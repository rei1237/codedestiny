const mongoose = require("mongoose");

const translationUsageSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, trim: true, index: true },
    monthKey: { type: String, required: true, trim: true, index: true }, // YYYY-MM (UTC)
    charsUsed: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

translationUsageSchema.index({ provider: 1, monthKey: 1 }, { unique: true });

module.exports =
  mongoose.models.TranslationUsage || mongoose.model("TranslationUsage", translationUsageSchema);


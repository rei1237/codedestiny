const mongoose = require("mongoose");

const translationCacheSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, trim: true, index: true },
    sourceLang: { type: String, required: true, trim: true, index: true },
    targetLang: { type: String, required: true, trim: true, index: true },
    originalTextHash: { type: String, required: true, trim: true, index: true },
    originalText: { type: String, required: true },
    translatedText: { type: String, required: true },
  },
  { timestamps: true },
);

translationCacheSchema.index(
  { provider: 1, sourceLang: 1, targetLang: 1, originalTextHash: 1 },
  { unique: true },
);

module.exports =
  mongoose.models.TranslationCache || mongoose.model("TranslationCache", translationCacheSchema);


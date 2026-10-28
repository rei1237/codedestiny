import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';

// Estimated Gemini spend. Day rows ('d|date|model|service') keep the per-service
// breakdown; one month row ('m|month') keeps the running total and the budget
// thresholds already announced. Tokens and USD only: no request, customer or
// prompt data.
const llmUsageSchema = new mongoose.Schema({
  _id: String,
  kind: String,
  month: String,
  date: String,
  model: String,
  service: String,
  calls: Number,
  inputTokens: Number,
  cachedInputTokens: Number,
  outputTokens: Number,
  thinkingTokens: Number,
  usdMicros: Number,
  unpricedCalls: Number,
  alertedThresholds: [Number],
}, { timestamps: true, versionKey: false });
llmUsageSchema.index({ kind: 1, month: 1 });

export const LlmUsage = scopedModel(mongoose.models.LlmUsage || mongoose.model('LlmUsage', llmUsageSchema));

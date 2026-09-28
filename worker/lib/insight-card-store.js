import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';
import { INSIGHT_BRANDS, INSIGHT_LOCALES } from '../../lib/insight-card.mjs';

// Separate from paid results: no user/result reference and no access to the library.
const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  brand: { type: String, enum: Object.keys(INSIGHT_BRANDS), required: true },
  source: { type: String, enum: ['paid', 'daily', 'free'], required: true },
  locale: { type: String, enum: INSIGHT_LOCALES, required: true },
  day: { type: String, required: true, maxlength: 10 },
  text: { type: String, required: true, maxlength: 240 },
  revokeHash: { type: String, required: true, select: false },
  revoked: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
}, { collection: 'publicInsightCards', versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const InsightCard = scopedModel(mongoose.models.InsightCard || mongoose.model('InsightCard', schema));

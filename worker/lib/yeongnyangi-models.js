import { mongoose } from './db.js';

// One immutable purchase intent also owns the chart snapshot and completed chapters.
// Users, profiles and PG orders remain in the existing CD collections.
const schema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  profileId: { type: String, required: true },
  productId: { type: String, required: true },
  featureKey: { type: String, required: true },
  amountKRW: { type: Number, required: true },
  fingerprint: { type: String, required: true },
  state: { type: String, required: true, enum: ['CREATED','PAID','GENERATING','COMPLETED','FORTUNE_FAILED','REFUNDED'] },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  chapters: { type: [mongoose.Schema.Types.Mixed], default: [] },
  completedChapters: { type: Number, default: 0 },
  leaseToken: { type: String, default: '' },
  leaseUntil: { type: Date, default: null },
  paymentGeneration: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  additionalAttempts: { type: Number, default: 0 },
  recoveryAudit: { type: [mongoose.Schema.Types.Mixed], default: [] },
  errorCode: { type: String, default: '' },
  completedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'yeongnyangi_requests' });
schema.index({ userId: 1, createdAt: -1, _id: -1 });
export const YeongnyangiRequest = mongoose.models.YeongnyangiRequest || mongoose.model('YeongnyangiRequest', schema);

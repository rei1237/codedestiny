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
  chapterAttempts: { type: mongoose.Schema.Types.Mixed, default: {} },
  nextAttemptAt: { type: Date, default: null },
  queuedUntil: { type: Date, default: null },
  queuedChapter: { type: Number, default: -1 },
  additionalAttempts: { type: Number, default: 0 },
  recoveryAudit: { type: [mongoose.Schema.Types.Mixed], default: [] },
  errorCode: { type: String, default: '' },
  completedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'yeongnyangi_requests' });
schema.index({ userId: 1, createdAt: -1, _id: -1 });
export const YeongnyangiRequest = mongoose.models.YeongnyangiRequest || mongoose.model('YeongnyangiRequest', schema);

const anchovyAccountSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  balance: { type: Number, required: true, default: 0, min: 0 },
}, { timestamps: true, collection: 'yeongnyangi_anchovy_accounts' });

const anchovyLedgerSchema = new mongoose.Schema({
  _id: { type: String, required: true, maxlength: 80 },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  kind: { type: String, required: true, enum: ['attendance','unlock'] },
  amount: { type: Number, required: true, enum: [1,-1] },
}, { timestamps: true, collection: 'yeongnyangi_anchovy_ledger' });

const freeReadingSchema = new mongoose.Schema({
  _id: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  category: { type: String, required: true, maxlength: 40 },
  profileId: { type: String, default: '', maxlength: 80 },
  input: { type: mongoose.Schema.Types.Mixed, required: true },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  claim: { type: String, default: '', maxlength: 80 },
  leaseUntil: { type: Date, default: null },
}, { timestamps: true, collection: 'yeongnyangi_free_readings' });

export const YeongnyangiAnchovyAccount = mongoose.models.YeongnyangiAnchovyAccount
  || mongoose.model('YeongnyangiAnchovyAccount', anchovyAccountSchema);
export const YeongnyangiAnchovyLedger = mongoose.models.YeongnyangiAnchovyLedger
  || mongoose.model('YeongnyangiAnchovyLedger', anchovyLedgerSchema);
export const YeongnyangiFreeReading = mongoose.models.YeongnyangiFreeReading
  || mongoose.model('YeongnyangiFreeReading', freeReadingSchema);

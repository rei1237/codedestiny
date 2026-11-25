import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';
import { ACCESS_METHODS, PER_USE_SOURCES } from '../yeongnyangi/access-methods.js';

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
  state: { type: String, required: true, enum: ['AWAITING_DRAW','CREATED','PAID','GENERATING','AWAITING_FOLLOWUP','COMPLETED','FORTUNE_FAILED','REFUNDED'] },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  accessMethod: { type: String, enum: ACCESS_METHODS, default: null },
  // Fortune-chat consultations only: the counsellor voice, and the per-use payment or pass usage that unlocked them.
  persona: { type: String, enum: ['yeoni','neo'], default: undefined },
  perUseEvidenceId: { type: String, default: undefined },
  perUseSource: { type: String, enum: PER_USE_SOURCES, default: undefined },
  // Pass budget consumed at activation, kept so a later restore knows the cycle and amount.
  perUsePassRefund: { type: mongoose.Schema.Types.Mixed, default: undefined },
  packEntitlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseEntitlement', default: null },
  passEvidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'PointHistory', default: null },
  moonstoneLedgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyCreditLedger', default: null },
  passProfileLimit: { type: Number, default: 0 },
  passMaxCoveredCoin: { type: Number, default: 0 },
  passCycleKey: { type: String, default: '' },
  passCoinCost: { type: Number, default: 0 },
  passTier: { type: String, default: '' },
  passMonthlyLimitCoin: { type: Number, default: 0 },
  passPolicyVersion: { type: String, default: '' },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  // Consented public campaign metadata is separate from the immutable reading inputs.
  growthAttribution: { type: mongoose.Schema.Types.Mixed, default: undefined },
  // Versioned generation evidence is separate from the immutable purchase snapshot.
  generationCheckpoint: { type: mongoose.Schema.Types.Mixed, default: undefined },
  chapters: { type: [mongoose.Schema.Types.Mixed], default: [] },
  correction: { type: mongoose.Schema.Types.Mixed, default: undefined },
  completedChapters: { type: Number, default: 0 },
  leaseToken: { type: String, default: '' },
  leaseUntil: { type: Date, default: null },
  paymentGeneration: { type: Number, default: 0 },
  paymentClaimOrderId: { type: String, default: '' },
  attempts: { type: Number, default: 0 },
  chapterAttempts: { type: mongoose.Schema.Types.Mixed, default: {} },
  manualRecoveryGrants: { type: mongoose.Schema.Types.Mixed, default: {} },
  systemRecoveryGrants: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Chapter attempts handed back after a refusal Gemini never billed: {ordinal: count} (UNBILLED_ATTEMPT_RETURNS cap).
  unbilledReturns: { type: mongoose.Schema.Types.Mixed, default: undefined },
  // Held order: {reason, chapter, epoch, alertPending, at, resumes}. Never set to null (dotted writes).
  hold: { type: mongoose.Schema.Types.Mixed, default: undefined },
  nextAttemptAt: { type: Date, default: null },
  queuedUntil: { type: Date, default: null },
  queuedChapter: { type: Number, default: -1 },
  additionalAttempts: { type: Number, default: 0 },
  recoveryAudit: { type: [mongoose.Schema.Types.Mixed], default: [] },
  errorCode: { type: String, default: '' },
  lastFailure: { code: String, stage: String, at: Date },
  firstContentAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  // Result polling heartbeat (view-heartbeat.js, at most one write per 20s). Rows created before this field existed
  // lack it; the completion-mail sweep treats missing like null (never viewed) inside its 24h completedAt window.
  lastViewedAt: { type: Date, default: null },
  // Completion mail claim and marker (completion-mail.js): null = not sent yet; skipped says why none went out.
  completionMailSentAt: { type: Date, default: null },
  completionMailSkipped: { type: String, enum: ['watching','no_email','config'], default: undefined },
}, { timestamps: true, collection: 'yeongnyangi_requests' });
schema.index({ userId: 1, createdAt: -1, _id: -1 });
// Completion-mail sweep (completion-mail.js sendPendingCompletionMails): equality on state + unsent marker, range/sort on completedAt.
schema.index({ state: 1, completionMailSentAt: 1, completedAt: 1 }, { name: "completion_mail_sweep" });
export const YeongnyangiRequest = scopedModel(mongoose.models.YeongnyangiRequest || mongoose.model('YeongnyangiRequest', schema));

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

export const YeongnyangiAnchovyAccount = scopedModel(mongoose.models.YeongnyangiAnchovyAccount
  || mongoose.model('YeongnyangiAnchovyAccount', anchovyAccountSchema));
export const YeongnyangiAnchovyLedger = scopedModel(mongoose.models.YeongnyangiAnchovyLedger
  || mongoose.model('YeongnyangiAnchovyLedger', anchovyLedgerSchema));
export const YeongnyangiFreeReading = scopedModel(mongoose.models.YeongnyangiFreeReading
  || mongoose.model('YeongnyangiFreeReading', freeReadingSchema));

import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';

// String _id uses Mongo's built-in unique index; no uninstalled secondary index is relied on.
const preferenceSchema = new mongoose.Schema({
  _id: String,
  consent: { granted: Boolean, at: Date, source: String, version: String, text: String },
  history: [{ _id: false, granted: Boolean, at: Date, source: String, version: String, text: String }],
  dismissed: { type: Boolean, default: false },
}, { timestamps: true });
const relationshipSchema = new mongoose.Schema({
  _id: String, relationship: { type: String, enum: ['friend', 'blocked', 'unknown'] },
  relationshipAt: Date, verifiedAt: Date, addedAt: Date, resourceId: String, source: String,
}, { timestamps: true });
const campaignSchema = new mongoose.Schema({
  _id: String, creativeId: String, status: { type: String, enum: ['draft', 'reviewed', 'paused', 'reported'], default: 'draft' },
  recipients: Number, unitCostKRW: Number, vatRate: Number, budgetKRW: Number, expectedKRW: Number,
  scheduledAt: Date, audienceEvidence: String, reviewedAt: Date, reviewedBy: String,
  report: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
export const CrmPreference = scopedModel(mongoose.models.CrmPreference || mongoose.model('CrmPreference', preferenceSchema));
export const CrmRelationship = scopedModel(mongoose.models.CrmRelationship || mongoose.model('CrmRelationship', relationshipSchema));
export const CrmCampaign = scopedModel(mongoose.models.CrmCampaign || mongoose.model('CrmCampaign', campaignSchema));

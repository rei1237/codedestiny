import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';

// One document per provider (_id 'gemini'). Holds only codes and times for the
// spend-cap/billing outage alert; no request, customer or prompt data.
const providerHealthSchema = new mongoose.Schema({
  _id: String,
  code: String,
  lastSeenAt: Date,
  alertClaimedAt: Date,
  alertedAt: Date,
  recoveredAt: Date,
}, { timestamps: true, versionKey: false });

export const ProviderHealth = scopedModel(mongoose.models.ProviderHealth || mongoose.model('ProviderHealth', providerHealthSchema));

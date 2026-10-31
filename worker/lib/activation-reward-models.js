import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';
import { ACTIVATION_REWARD_KINDS } from '../../js/core/activation-reward-policy.mjs';

// No TTL: the receipt must still prevent another grant after its moonstone lot expires.
const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  kind: { type: String, enum: ACTIVATION_REWARD_KINDS, required: true },
  status: { type: String, enum: ['started', 'verified', 'granted'], required: true },
  policyVersion: { type: String, required: true },
  profileId: String,
  proofId: String,
  amount: Number,
  grantedAt: Date,
  grantStartedAt: Date,
  expiresAt: Date,
}, { timestamps: true, collection: 'activation_rewards' });

export const ActivationReward = scopedModel(mongoose.models.ActivationReward || mongoose.model('ActivationReward', schema));

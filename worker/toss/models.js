import {mongoose} from '../lib/db.js';
import {scopedModel} from '../lib/db-scope-connection.js';
const model = (name, definition, options = {}) => scopedModel(mongoose.models[name] || mongoose.model(name,
  new mongoose.Schema(definition, {timestamps:true,...options})));

// Separate identity namespace: no synthetic email and no merging into web User.
export const TossIdentity = model('TossIdentity', {
  _id: String, ownerId: {type:mongoose.Schema.Types.ObjectId,required:true},
  encryptedKey: {type:mongoose.Schema.Types.Mixed,required:true},
  active: {type:Boolean,default:true}, revision: {type:Number,default:0},
  disconnectedAt: Date, unlinkPending: {type:Boolean,default:false},
  unlinkAttempts: {type:Number,default:0}, unlinkNextAttemptAt: Date, unlinkLeaseUntil: Date,
}, {collection:'toss_identities'});
export const TossSession = model('TossSession', {
  _id: String, identityId: {type:String,required:true}, revision: {type:Number,required:true},
  environment: {type:String,enum:['DEFAULT','SANDBOX'],required:true}, expiresAt: {type:Date,required:true},
}, {collection:'toss_sessions'});
export const TossPurchase = model('TossPurchase', {
  _id: String, identityId: {type:String,required:true}, ownerId: {type:mongoose.Schema.Types.ObjectId,required:true},
  sku: {type:String,required:true}, productId: {type:String,required:true},
  tarotFlowId: {type:String,default:''}, featureKey: {type:String,default:''}, executionId: {type:String,default:''},
  nativeService: {type:String,enum:['','tea','neo'],default:''},
  serviceId: {type:String,enum:['yeongnyangi','yeoni','neo'],default:'yeongnyangi'},
  approvedPriceKRW: {type:Number,required:true}, priceEvidence: {type:String,required:true},
  status: {type:String,enum:['PAYMENT_COMPLETED','PURCHASED','REFUNDED'],required:true},
  requestId: {type:String,default:null}, verifiedAt: {type:Date,required:true}, grantedAt: Date,
  reconcileAfter: Date, reconcileState: {type:String,enum:['checking','verified','retry','inactive']},
  commitMarker: String, environment: {type:String,enum:['DEFAULT','SANDBOX'],required:true},
}, {collection:'toss_purchases'});
// Each consultation is locked to at most one order using its existing unique request _id.
// Purchase _id is the platform orderId; there is no TTL on purchases or paid results.

// Original service input is immutable before purchase and retained for recovery.
// _id binds one account/environment/service/attempt to at most one paid order.
export const TossNativeConsultation = model('TossNativeConsultation', {
  _id:String,identityId:{type:String,required:true},ownerId:{type:mongoose.Schema.Types.ObjectId,required:true},
  environment:{type:String,enum:['DEFAULT','SANDBOX'],required:true},
  nativeService:{type:String,enum:['tea','neo'],required:true},
  requestId:{type:String,required:true},resultId:{type:String,required:true},
  featureKey:{type:String,required:true},inputHash:{type:String,required:true},
  input:{type:mongoose.Schema.Types.Mixed,required:true},
  pricing:{type:mongoose.Schema.Types.Mixed,required:true},
  sku:{type:String,required:true},approvedPriceKRW:{type:Number,required:true},priceEvidence:{type:String,required:true},
  orderId:{type:String,default:null},status:{type:String,enum:['prepared','paid','refunded'],default:'prepared'},
}, {collection:'toss_native_consultations'});

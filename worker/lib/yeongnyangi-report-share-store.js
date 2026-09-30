import {mongoose} from './db.js';
import {scopedModel} from './db-scope-connection.js';

const schema=new mongoose.Schema({
 _id:{type:String,required:true},ownerId:{type:mongoose.Schema.Types.ObjectId,required:true,index:true},requestId:{type:String,required:true},
 public:{type:mongoose.Schema.Types.Mixed,required:true},chartHash:{type:String,required:true},revoked:{type:Boolean,default:false},expiresAt:{type:Date,required:true},
},{collection:'yeongnyangiReportShares',versionKey:false});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export const YeongnyangiReportShare=scopedModel(mongoose.models.YeongnyangiReportShare||mongoose.model('YeongnyangiReportShare',schema));

import {mongoose,connectDb,mongoTransactionOptions} from '../lib/db.js';
import {scopeConnection} from '../lib/db-scope-connection.js';
import {TossIdentity,TossSession} from './models.js';
import {TossError} from './policy.js';
import {identityId,seal,unseal,hash,sessionToken} from './crypto.js';
import {loginIdentity,unlinkIdentity} from './partner.js';

export async function tossTransaction(task) {
  const session=await (scopeConnection() || mongoose).startSession();
  try { let result; await session.withTransaction(async()=>{result=await task(session);},mongoTransactionOptions()); return result; }
  finally {await session.endSession();}
}
export async function createTossSession(env, input) {
  const verified=await loginIdentity(env,input);
  const id=await identityId(env,verified.userKey), encryptedKey=await seal(env,verified.userKey,id);
  const token=sessionToken(), tokenHash=await hash(token), expiresAt=new Date(Date.now()+60*60*1000);
  await connectDb(env);
  await tossTransaction(async session=>{
    const existing=await TossIdentity.findById(id).session(session).lean();
    if(existing?.unlinkPending)throw new TossError('TOSS_UNLINK_PENDING',409);
    const identity=await TossIdentity.findOneAndUpdate({_id:id},{$set:{encryptedKey,active:true},
      $setOnInsert:{ownerId:new mongoose.Types.ObjectId(),revision:0}},{upsert:true,new:true,session}).lean();
    // A concurrent unlink writes the same identity and invalidates every earlier session.
    await TossSession.create([{_id:tokenHash,identityId:id,revision:identity.revision,environment:verified.referrer,expiresAt}],{session});
  });
  return {token,expiresAt:expiresAt.toISOString()};
}
export async function requireTossSession(request,env) {
  const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if(!token)throw new TossError('LOGIN_REQUIRED',401);
  await connectDb(env);
  const session=await TossSession.findOne({_id:await hash(token),expiresAt:{$gt:new Date()}}).lean();
  if(!session)throw new TossError('SESSION_EXPIRED',401);
  const identity=await TossIdentity.findOne({_id:session.identityId,revision:session.revision,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  return {...identity,userId:String(identity.ownerId),sessionId:session._id,environment:session.environment,
    userKey:await unseal(env,identity.encryptedKey,identity._id)};
}
export async function invalidateIdentity(env,id,{queueUnlink=false}={}) {
  await connectDb(env);
  await tossTransaction(async session=>{
    await TossIdentity.updateOne({_id:id,active:true},{$set:{active:false,disconnectedAt:new Date()},$inc:{revision:1}},{session});
    await TossIdentity.updateOne({_id:id},{$set:{unlinkPending:queueUnlink,unlinkAttempts:queueUnlink?1:0,
      unlinkNextAttemptAt:queueUnlink?new Date(Date.now()+600000):null,unlinkLeaseUntil:null}},{session});
    await TossSession.deleteMany({identityId:id},{session});
  });
}
export async function disconnectIdentity(env,auth) {
  // Local access is revoked immediately; own unlink never depends on a callback.
  await invalidateIdentity(env,auth._id,{queueUnlink:true});
  try {
    await unlinkIdentity(env,auth.userKey);
    await TossIdentity.updateOne({_id:auth._id},{$set:{unlinkPending:false}});
    return {remoteUnlink:'completed'};
  } catch { return {remoteUnlink:'pending'}; }
}

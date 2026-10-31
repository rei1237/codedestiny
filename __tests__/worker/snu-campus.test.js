/** @jest-environment node */
import { createHash } from 'node:crypto';
import { jest } from '@jest/globals';
import { isSnuEmail, SNU_SAJU_FEATURES, isSnuSajuFeature } from '../../js/core/snu-campus-policy.mjs';
const UID='507f1f77bcf86cd799439011';const KEY='snu:'+createHash('sha256').update('student@snu.ac.kr').digest('hex');let email,member,profileBirth;
const chain=value=>({select(){return this},lean:async()=>typeof value==='function'?value():value});
const model={findById:id=>chain(()=>member?._id===id?member:null),
 findOneAndUpdate:(filter,update)=>chain(()=>{
  if(!member&&update.$setOnInsert)member={...update.$setOnInsert};
  if(filter.tokenHash&&member.tokenHash!==filter.tokenHash)return null;
  if(filter.revision!==undefined&&member.revision!==filter.revision)return null;
  if(filter.$or&&member.birthKey)return null;
  if(update.$set)Object.assign(member,update.$set);if(update.$inc)for(const[k,v]of Object.entries(update.$inc))member[k]=(member[k]||0)+v;
  return member;
 }),
 updateOne:jest.fn(async(filter,update)=>{if(!member&&update.$setOnInsert)member={_id:filter._id,...update.$setOnInsert};if(update.$set)Object.assign(member,update.$set);if(update.$inc)for(const[k,v]of Object.entries(update.$inc))member[k]=(member[k]||0)+v;}),
};
const reserve=jest.fn(async()=>({accountKey:'hashed'}));
const send=jest.fn(async()=>({ok:true})),grant=jest.fn(async()=>({status:'ACTIVE'}));let api;
beforeAll(async()=>{
 class Schema{constructor(){} }Schema.Types={};
 await jest.unstable_mockModule('../../worker/lib/db.js',()=>({mongoose:{Schema,models:{SnuCampusMember:model}}}));
 await jest.unstable_mockModule('../../worker/lib/db-scope-connection.js',()=>({scopedModel:x=>x}));
 await jest.unstable_mockModule('../../worker/lib/models.js',()=>({User:{findById:()=>chain(()=>({_id:UID,email}))}}));
 await jest.unstable_mockModule('../../worker/lib/resend.js',()=>({sendEmail:send}));
 await jest.unstable_mockModule('../../worker/lib/content-unlocks.js',()=>({grantPermanentUnlock:grant}));
 await jest.unstable_mockModule('../../worker/lib/birth-scoped-unlock-identity.js',()=>({resolveBirthUnlockIdentity:jest.fn(async({profileId})=>{if(profileId==='other')throw Object.assign(new Error('invalid'),{code:'INVALID_PROFILE'});return{profileId,birthKey:profileBirth}})}));
 await jest.unstable_mockModule('../../worker/lib/snulife-code.js',()=>({reserveSnulifeCode:reserve}));
 api=await import('../../worker/lib/snu-campus.js');
});
beforeEach(()=>{jest.clearAllMocks();email='student@snu.ac.kr';member=null;reserve.mockResolvedValue({accountKey:'hashed'});profileBirth='birth-one';grant.mockResolvedValue({status:'ACTIVE'});});
test.each(['student@snu.ac.kr.evil.com','snu.ac.kr@evil.com','student@other.ac.kr','student@snu.ac.kr\n@evil.com'])('domain spoof %s is denied',value=>expect(isSnuEmail(value)).toBe(false));
test('only reviewed non-LLM keys can be granted',()=>{expect(SNU_SAJU_FEATURES).toHaveLength(10);for(const key of ['saju-ai','fortune-chat-consultation','yeongnyangi-saju-mackerel','future-service'])expect(isSnuSajuFeature(key)).toBe(false);});
test('typing a school email without verification cannot unlock',async()=>{await expect(api.unlockSnuSaju(UID,'own')).rejects.toMatchObject({payload:{code:'SNU_VERIFICATION_REQUIRED'}});expect(grant).not.toHaveBeenCalled();});
test('challenge is hashed, account-bound, and cannot be requested repeatedly',async()=>{
 await api.requestSnuVerification(UID,{SITE_URL:'https://example.com'});const mail=send.mock.calls[0][1],token=mail.text.match(/token=([a-f0-9]+)/)[1];
 expect(member.tokenHash).not.toBe(token);expect(member.tokenHash).toHaveLength(64);expect(mail.to).toBe(email);
 await expect(api.requestSnuVerification(UID,{})).rejects.toMatchObject({payload:{code:'SNU_EMAIL_RATE_LIMIT'}});
 email='other@snu.ac.kr';await expect(api.verifySnuEmail(UID,token)).rejects.toMatchObject({payload:{code:'SNU_EMAIL_REQUIRED'}});email='student@snu.ac.kr';
 await api.verifySnuEmail(UID,token);expect(member.tokenHash).toBe('');expect((await api.readSnuCampus(UID)).verified).toBe(true);
});
test('expired or wrong token cannot verify',async()=>{
 await api.requestSnuVerification(UID,{});await expect(api.verifySnuEmail(UID,'a'.repeat(64))).rejects.toMatchObject({payload:{code:'SNU_LINK_INVALID'}});expect(member.attempts).toBe(1);
 member.challengeExpiresAt=new Date(0);await expect(api.verifySnuEmail(UID,'a'.repeat(64))).rejects.toMatchObject({payload:{code:'SNU_LINK_EXPIRED'}});
});
test('one verified birth profile is pinned; grants preserve existing rights',async()=>{
 member={_id:KEY,userId:UID,email,verifiedAt:new Date(),revision:1};await api.unlockSnuSaju(UID,'own');expect(grant).toHaveBeenCalledTimes(10);
 for(const [args]of grant.mock.calls){expect(args.insertOnly).toBe(true);expect(args.source).toBe('ADMIN');expect(args.evidenceId).toMatch(/^snu:/);expect(isSnuSajuFeature(args.featureKey)).toBe(true);}
 expect(member.grantedFeatureKeys).toHaveLength(10);profileBirth='different';await expect(api.unlockSnuSaju(UID,'own')).rejects.toMatchObject({payload:{code:'SNU_PROFILE_ALREADY_SELECTED'}});
});
test('revoked existing entitlement is not falsely reported as unlocked',async()=>{
 member={_id:KEY,userId:UID,email,verifiedAt:new Date(),revision:1};grant.mockResolvedValueOnce({status:'REFUNDED'});const r=await api.unlockSnuSaju(UID,'own');expect(r.complete).toBe(false);expect(r.unlockedFeatureKeys).toHaveLength(9);
});

test('recreated account cannot claim an email already pinned to another account',async()=>{member={_id:KEY,userId:'previous-account',email,verifiedAt:new Date(),revision:1};expect((await api.readSnuCampus(UID)).verified).toBe(false);await expect(api.requestSnuVerification(UID,{})).rejects.toMatchObject({payload:{code:'SNU_ACCOUNT_CHANGED'}});expect(grant).not.toHaveBeenCalled();});

test('ordinary email account with code receipt can unlock without school verification',async()=>{email='member@example.com';member={_id:'snulife:'+createHash('sha256').update(UID).digest('hex'),userId:UID,verifiedAt:new Date(),revision:0};expect((await api.readSnuCampus(UID)).verified).toBe(true);await api.unlockSnuSaju(UID,'own');expect(grant).toHaveBeenCalledTimes(10);expect(send).not.toHaveBeenCalled();});

test('ordinary email can redeem code and retain receipt without sending mail',async()=>{email='member@example.com';await api.claimSnulifeCode(UID,'TEST-ONLY',{});expect(reserve).toHaveBeenCalledWith(UID,'TEST-ONLY',{});expect((await api.readSnuCampus(UID)).verified).toBe(true);expect(send).not.toHaveBeenCalled();});
test('failed code reservation never creates membership',async()=>{reserve.mockRejectedValueOnce(new Error('sold out'));await expect(api.claimSnulifeCode(UID,'TEST-ONLY',{})).rejects.toThrow('sold out');expect(member).toBeNull();});

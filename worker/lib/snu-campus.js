import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';
import { User } from './models.js';
import { createHttpError } from './http.js';
import { sendEmail } from './resend.js';
import { normalizeSnuEmail, SNU_SAJU_FEATURES, SNU_SAJU_VERSION } from '../../js/core/snu-campus-policy.mjs';
import { resolveBirthUnlockIdentity } from './birth-scoped-unlock-identity.js';
import { grantPermanentUnlock } from './content-unlocks.js';

const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  email: { type: String }, userId: { type: String, required: true },
  verifiedAt: Date, tokenHash: String, challengeExpiresAt: Date, requestedAt: Date,
  sendDay: String, sendCount: Number, attempts: Number, revision: { type: Number, default: 0 },
  campaignId: String, campaignMode: String, campaignEndsAt: Date, campaignLimit: Number,
  profileId: String, birthKey: String, grantVersion: String, grantedFeatureKeys: [String],
}, { timestamps: true, collection: 'snu_campus_members' });
export const SnuCampusMember = scopedModel(mongoose.models.SnuCampusMember || mongoose.model('SnuCampusMember', schema));
const failure = (status, code, message) => createHttpError(status, message, { code });
const hash = async token => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), value => value.toString(16).padStart(2, '0')).join('');
// The built-in unique _id prevents email reuse even when autoIndex is disabled.
const memberId = async email => `snu:${await hash(email)}`;
const codeMemberId = async userId => `snulife:${await hash(String(userId))}`;
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');

async function account(userId) {
  const user = await User.findById(userId).select('email').lean();
  if (!user) throw failure(401, 'UNAUTHORIZED', '로그인한 계정을 다시 확인해 주세요.');
  return { user, email: normalizeSnuEmail(user.email) };
}

export async function readSnuCampus(userId) {
  const { email } = await account(userId);
  const codeMember = await SnuCampusMember.findById(await codeMemberId(userId)).lean();
  const member = codeMember || (email ? await SnuCampusMember.findById(await memberId(email)).lean() : null);
  const verified = Boolean(member?.userId === String(userId) && member?.verifiedAt && (codeMember || email && member.email === email));
  return { eligibleEmail: Boolean(email), verified, email: email || null,
    profileId: verified ? member.profileId || null : null,
    campaign: verified && member.campaignId ? { mode: member.campaignMode, endsAt: member.campaignEndsAt, limit: member.campaignLimit } : null,
    unlockedFeatureKeys: verified ? member.grantedFeatureKeys || [] : [], features: SNU_SAJU_FEATURES };
}

export async function claimSnulifeCode(userId, code, env) {
  const existing = await readSnuCampus(userId);
  if (existing.verified) return existing;
  const { reserveSnulifeCode } = await import('./snulife-code.js');
  const receipt = await reserveSnulifeCode(userId, code, env);
  await SnuCampusMember.updateOne({ _id: await codeMemberId(userId) }, { $setOnInsert: { userId: String(userId), verifiedAt: new Date(), revision: 0, campaignId: receipt.campaignId, campaignMode: receipt.mode, campaignEndsAt: receipt.endsAt, campaignLimit: receipt.limit } }, { upsert: true });
  return readSnuCampus(userId);
}

export async function requestSnuVerification(userId, env) {
  const { email } = await account(userId);
  if (!email) throw failure(403, 'SNU_EMAIL_REQUIRED', '학교 이메일(@snu.ac.kr)로 가입한 계정에서 받을 수 있어요.');
  let current;
  try {
    current = await SnuCampusMember.findOneAndUpdate({ _id: await memberId(email) },
      { $setOnInsert: { _id: await memberId(email), userId: String(userId), email, revision: 0, attempts: 0, sendCount: 0 } }, { upsert: true, new: true }).lean();
  } catch (error) {
    if (Number(error?.code) === 11000) throw failure(409, 'SNU_EMAIL_ALREADY_LINKED', '이 학교 이메일의 기존 계정에서 혜택을 확인해 주세요.');
    throw error;
  }
  if (current.email !== email || current.userId !== String(userId)) throw failure(409, 'SNU_ACCOUNT_CHANGED', '학교 이메일 연결 정보를 확인해야 해요. 고객센터에 문의해 주세요.');
  if (current.verifiedAt) return { alreadyVerified: true, ...(await readSnuCampus(userId)) };
  const now = new Date(), day = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
  if (now.getTime() - new Date(current.requestedAt || 0).getTime() < 60000 || current.sendDay === day && current.sendCount >= 5)
    throw failure(429, 'SNU_EMAIL_RATE_LIMIT', '인증 메일은 잠시 뒤 다시 요청해 주세요. 하루 최대 5회 보낼 수 있어요.');
  const token = randomToken();
  const updated = await SnuCampusMember.findOneAndUpdate({ _id: current._id, userId: String(userId), revision: current.revision, verifiedAt: null },
    { $set: { tokenHash: await hash(token), challengeExpiresAt: new Date(now.getTime() + 20 * 60000), requestedAt: now,
      attempts: 0, sendDay: day, sendCount: current.sendDay === day ? current.sendCount + 1 : 1 }, $inc: { revision: 1 } }, { new: true }).lean();
  if (!updated) throw failure(409, 'SNU_EMAIL_PENDING', '인증 메일을 준비 중이에요. 잠시 후 확인해 주세요.');
  const base = new URL(env.SITE_URL || 'https://code-destiny.com');
  const url = `${base.origin}/snu/#token=${token}`;
  const mail = await sendEmail(env, { to: email, subject: '연이가 준비한 SNU 사주 선물, 학교 이메일을 확인해 주세요',
    text: `안녕하세요, 연이에요.\n아래 링크에서 학교 이메일을 확인하면 사주 콘텐츠 선물을 받을 수 있어요.\n${url}\n링크는 20분 동안 유효해요. 요청하지 않았다면 이 메일을 무시해 주세요.`,
    html: `<p>안녕하세요, 연이에요.</p><p>학교 이메일을 확인하고 사주 콘텐츠 선물을 받아 보세요.</p><p><a href="${url}">학교 이메일 확인하기</a></p><p>20분 안에, 메일을 요청한 계정으로 로그인해 열어 주세요. 요청하지 않았다면 이 메일을 무시해 주세요.</p>`,
    idempotencyKey: `snu-verify:${userId}:${updated.revision}` });
  if (!mail.ok) throw failure(503, 'SNU_EMAIL_UNAVAILABLE', '인증 메일을 보내지 못했어요. 잠시 후 다시 요청해 주세요.');
  return { sent: true, expiresInMinutes: 20 };
}

export async function verifySnuEmail(userId, token) {
  const { email } = await account(userId);
  const member = email ? await SnuCampusMember.findById(await memberId(email)).lean() : null;
  if (!email || !member || member.email !== email || member.userId !== String(userId)) throw failure(403, 'SNU_EMAIL_REQUIRED', '인증 메일을 요청한 학교 계정으로 로그인해 주세요.');
  if (member.verifiedAt) return readSnuCampus(userId);
  if (!/^[a-f0-9]{64}$/.test(String(token || '')) || member.attempts >= 5 || !(new Date(member.challengeExpiresAt).getTime() > Date.now()))
    throw failure(400, 'SNU_LINK_EXPIRED', '인증 링크를 다시 받아 주세요. 링크는 20분 동안 사용할 수 있어요.');
  const tokenHash = await hash(token);
  if (member.tokenHash !== tokenHash) {
    await SnuCampusMember.updateOne({ _id: member._id, revision: member.revision }, { $inc: { attempts: 1 } });
    throw failure(400, 'SNU_LINK_INVALID', '가장 최근에 받은 인증 링크를 열어 주세요.');
  }
  const verified = await SnuCampusMember.findOneAndUpdate({ _id: member._id, email, tokenHash, attempts: { $lt: 5 }, challengeExpiresAt: { $gt: new Date() }, verifiedAt: null },
    { $set: { verifiedAt: new Date(), tokenHash: '', challengeExpiresAt: null }, $inc: { revision: 1 } }, { new: true }).lean();
  if (!verified) throw failure(409, 'SNU_VERIFY_PENDING', '확인 상태가 바뀌었어요. 페이지를 다시 열어 주세요.');
  return readSnuCampus(userId);
}

export async function unlockSnuSaju(userId, profileId) {
  const status = await readSnuCampus(userId);
  if (!status.verified) throw failure(403, 'SNU_VERIFICATION_REQUIRED', 'SNULIFE 제휴 코드를 등록하면 사주 선물을 열 수 있어요.');
  const identity = await resolveBirthUnlockIdentity({ userId: String(userId), profileId, featureKey: 'section_summary' });
  const codeMember = await SnuCampusMember.findById(await codeMemberId(userId)).lean();
  const id = codeMember ? codeMember._id : await memberId(status.email);
  let member = await SnuCampusMember.findOneAndUpdate({ _id: id, userId: String(userId), verifiedAt: { $ne: null },
    $or: [{ birthKey: null }, { birthKey: '' }] }, { $set: { profileId: identity.profileId, birthKey: identity.birthKey, grantVersion: SNU_SAJU_VERSION } }, { new: true }).lean();
  if (!member) member = await SnuCampusMember.findById(id).lean();
  if (!member || member.userId !== String(userId)) throw failure(409, 'SNU_ACCOUNT_CHANGED', '학교 계정을 다시 확인해 주세요.');
  if (member.birthKey !== identity.birthKey) throw failure(409, 'SNU_PROFILE_ALREADY_SELECTED', '처음 선택한 본인 프로필에서 선물을 확인해 주세요.');
  const granted = [];
  for (const { featureKey } of SNU_SAJU_FEATURES) {
    const entitlement = await grantPermanentUnlock({ userId: String(userId), profileId: identity.profileId, featureKey,
      source: 'ADMIN', evidenceId: `snu:${SNU_SAJU_VERSION}:${userId}`, insertOnly: true });
    if (entitlement.status === 'ACTIVE') granted.push(featureKey);
  }
  await SnuCampusMember.updateOne({ _id: member._id, userId: String(userId), birthKey: identity.birthKey }, { $set: { grantedFeatureKeys: granted } });
  return { ...(await readSnuCampus(userId)), complete: granted.length === SNU_SAJU_FEATURES.length };
}

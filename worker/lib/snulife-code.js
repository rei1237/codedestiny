import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';
import { createHttpError } from './http.js';

export const SNULIFE_CAMPAIGN = 'snulife-saju-20261031-v1';
export const SNULIFE_LIMIT = 1000;
export const SNULIFE_REVIEW_CAMPAIGN = `${SNULIFE_CAMPAIGN}-review`;
export const SNULIFE_REVIEW_LIMIT = 3;
const schema = new mongoose.Schema({
  _id: String, codeHash: String, startsAt: Date, endsAt: Date,
  claimedAccounts: { type: [String], default: [] },
}, { collection: 'snulife_code_campaigns', timestamps: true });
export const SnulifeCodeCampaign = scopedModel(mongoose.models.SnulifeCodeCampaign || mongoose.model('SnulifeCodeCampaign', schema));
const failure = (status, code, message) => createHttpError(status, message, { code });
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
export const snulifeAccountKey = (userId, campaignId = SNULIFE_CAMPAIGN) => digest(`${campaignId}:${userId}`);

// Fail closed until the separately approved campaign dates and code are configured.
export async function reserveSnulifeCode(userId, input, env = {}, now = new Date()) {
  const reviewCode = String(env.SNULIFE_REVIEW_CODE || '').trim();
  const review = reviewCode.length >= 10 && typeof input === 'string' && input.trim() === reviewCode;
  const code = review ? reviewCode : String(env.SNULIFE_BENEFIT_CODE || '').trim();
  const startsAt = new Date((review ? env.SNULIFE_REVIEW_STARTS_AT : env.SNULIFE_STARTS_AT) || '');
  const endsAt = new Date((review ? env.SNULIFE_REVIEW_ENDS_AT : env.SNULIFE_ENDS_AT) || '');
  const campaignId = review ? SNULIFE_REVIEW_CAMPAIGN : SNULIFE_CAMPAIGN;
  const limit = review ? SNULIFE_REVIEW_LIMIT : SNULIFE_LIMIT;
  const maximumEnd = new Date(startsAt);
  if (review) maximumEnd.setTime(maximumEnd.getTime() + 14 * 86400000);
  else { const day = maximumEnd.getUTCDate(); maximumEnd.setUTCDate(1); maximumEnd.setUTCMonth(maximumEnd.getUTCMonth() + 3); const last = new Date(Date.UTC(maximumEnd.getUTCFullYear(), maximumEnd.getUTCMonth() + 1, 0)).getUTCDate(); maximumEnd.setUTCDate(Math.min(day, last)); }
  if (review && code === String(env.SNULIFE_BENEFIT_CODE || '').trim()) throw failure(503, 'SNULIFE_NOT_READY', '제휴 혜택을 준비 중이에요. 게시 안내를 확인해 주세요.');
  if (code.length < 10 || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt || endsAt > maximumEnd)
    throw failure(503, 'SNULIFE_NOT_READY', '제휴 혜택을 준비 중이에요. 게시 안내를 확인해 주세요.');
  if (now < startsAt || now >= endsAt) throw failure(410, 'SNULIFE_CLOSED', '제휴 코드 등록 기간이 아니에요. 이미 받은 선물은 다시 볼 수 있어요.');
  if (typeof input !== 'string' || input.trim() !== code) throw failure(400, 'SNULIFE_CODE_INVALID', 'SNULIFE 게시물의 제휴 코드를 다시 확인해 주세요.');
  const codeHash = await digest(code), accountKey = await snulifeAccountKey(userId, campaignId);
  // Unique _id serializes initialization; duplicate initializers can use the winning document.
  try {
    await SnulifeCodeCampaign.updateOne({ _id: campaignId }, { $setOnInsert: { codeHash, startsAt, endsAt, claimedAccounts: [] } }, { upsert: true });
  } catch (error) { if (Number(error?.code) !== 11000) throw error; }
  const campaign = await SnulifeCodeCampaign.findOneAndUpdate({
    _id: campaignId, codeHash, startsAt, endsAt,
    $or: [{ claimedAccounts: accountKey }, { [`claimedAccounts.${limit - 1}`]: { $exists: false } }],
  }, { $addToSet: { claimedAccounts: accountKey } }, { new: true }).lean();
  if (!campaign) throw failure(409, 'SNULIFE_UNAVAILABLE', '준비한 코드 수량이 마감됐거나 안내가 변경됐어요. 기존 선물은 내 계정에서 확인해 주세요.');
  return { accountKey, endsAt, campaignId, mode: review ? 'review' : 'public', limit, claimedCount: campaign.claimedAccounts.length };
}

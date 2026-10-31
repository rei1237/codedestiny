import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';
import { createHttpError } from './http.js';

export const SNULIFE_CAMPAIGN = 'snulife-saju-20261031-v1';
export const SNULIFE_LIMIT = 1000;
const schema = new mongoose.Schema({
  _id: String, codeHash: String, startsAt: Date, endsAt: Date,
  claimedAccounts: { type: [String], default: [] },
}, { collection: 'snulife_code_campaigns', timestamps: true });
export const SnulifeCodeCampaign = scopedModel(mongoose.models.SnulifeCodeCampaign || mongoose.model('SnulifeCodeCampaign', schema));
const failure = (status, code, message) => createHttpError(status, message, { code });
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
export const snulifeAccountKey = userId => digest(`${SNULIFE_CAMPAIGN}:${userId}`);

// Fail closed until the separately approved campaign dates and code are configured.
export async function reserveSnulifeCode(userId, input, env = {}, now = new Date()) {
  const code = String(env.SNULIFE_BENEFIT_CODE || '').trim();
  const startsAt = new Date(env.SNULIFE_STARTS_AT || ''), endsAt = new Date(env.SNULIFE_ENDS_AT || '');
  const maximumEnd = new Date(startsAt); maximumEnd.setUTCMonth(maximumEnd.getUTCMonth() + 3);
  if (code.length < 10 || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt || endsAt > maximumEnd)
    throw failure(503, 'SNULIFE_NOT_READY', '제휴 혜택을 준비 중이에요. 게시 안내를 확인해 주세요.');
  if (now < startsAt || now >= endsAt) throw failure(410, 'SNULIFE_CLOSED', '제휴 코드 등록 기간이 아니에요. 이미 받은 선물은 다시 볼 수 있어요.');
  if (typeof input !== 'string' || input.trim() !== code) throw failure(400, 'SNULIFE_CODE_INVALID', 'SNULIFE 게시물의 제휴 코드를 다시 확인해 주세요.');
  const codeHash = await digest(code), accountKey = await snulifeAccountKey(userId);
  // Unique _id serializes initialization; duplicate initializers can use the winning document.
  try {
    await SnulifeCodeCampaign.updateOne({ _id: SNULIFE_CAMPAIGN }, { $setOnInsert: { codeHash, startsAt, endsAt, claimedAccounts: [] } }, { upsert: true });
  } catch (error) { if (Number(error?.code) !== 11000) throw error; }
  const campaign = await SnulifeCodeCampaign.findOneAndUpdate({
    _id: SNULIFE_CAMPAIGN, codeHash, startsAt, endsAt,
    $or: [{ claimedAccounts: accountKey }, { [`claimedAccounts.${SNULIFE_LIMIT - 1}`]: { $exists: false } }],
  }, { $addToSet: { claimedAccounts: accountKey } }, { new: true }).lean();
  if (!campaign) throw failure(409, 'SNULIFE_UNAVAILABLE', '준비한 코드 수량이 마감됐거나 안내가 변경됐어요. 기존 선물은 내 계정에서 확인해 주세요.');
  return { accountKey, endsAt };
}

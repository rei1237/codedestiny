import { lunarToSolar } from '../../lib/korean-calendar/index.js';
import { createHash } from 'node:crypto';
import { getHoneyUnlockProduct } from './honey-unlock-catalog.js';
const HONEY_SCOPE = 'FORTUNE_TEA_HOUSE';
import { connectDb, withMongoRetry } from './db.js';
import { createHttpError } from './http.js';

const fail = (status, code) => createHttpError(status, code, { code });
export function honeyUseInputHash(featureKey, input = {}) {
  let value;
  if (featureKey === 'compat-sukuyo-compatibility') {
    const date = String(input.date || '');
    const cal = String(input.calType || 'solar');
    const [year, month, day] = date.split('-').map(Number);
    const hour = Number(input.hour), minute = Number(input.minute || 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || year < 1582 || year > 2400 || month < 1 || month > 12 || day < 1 || day > (cal === 'solar' ? 31 : 30)
      || !['solar', 'lunar', 'lunar_leap'].includes(cal) || !Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59
      || (cal === 'solar' && new Date(Date.UTC(year, month - 1, day)).getUTCMonth() !== month - 1)) throw fail(400, 'INVALID_HONEY_INPUT');
    if (cal !== 'solar' && !lunarToSolar(year, month, day, cal === 'lunar_leap')) throw fail(400, 'INVALID_HONEY_INPUT');
    value = [date, cal, hour, minute, ['M','F'].includes(input.gender) ? input.gender : 'OTHER'];
  } else if (featureKey === 'tarot-myeongri-three-card') {
    let cards; try { cards = JSON.parse(String(input.cards || '')); } catch { throw fail(400, 'INVALID_HONEY_INPUT'); }
    if (!Array.isArray(cards) || cards.length !== 3 || cards.some(c => !c || !/^[\w-]{1,64}$/.test(String(c.id)))) throw fail(400, 'INVALID_HONEY_INPUT');
    value = [String(input.cat || '').slice(0, 80), cards.map(c => [String(c.id), !!c.rev, String(c.pos || '').slice(0,80)])];
  } else throw fail(400, 'INVALID_HONEY_PRODUCT');
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export async function unlockHoneyUse({ userId, product, profileId, requestId, input }, store) {
  if (product.serviceScope !== 'GGULGGUL' || product.billingType !== 'per_use') throw fail(400, 'INVALID_HONEY_PRODUCT');
  const prefix = product.featureKey === 'compat-sukuyo-compatibility' ? `sukuyo-paid:${product.featureKey}|${profileId}|` : `${product.featureKey}:`;
  if (!String(requestId || '').startsWith(prefix) || !/^hny[a-z0-9]{6,32}$/.test(String(requestId).slice(prefix.length))) throw fail(400, 'INVALID_REQUEST_ID');
  const inputHash = honeyUseInputHash(product.featureKey, input);
  const _id = `honey-use:${userId}:${requestId}`;
  const execute = () => store.transaction(async session => {
    if (!profileId || !await store.findProfile({ userId, profileId }, session)) throw fail(403, 'PROFILE_NOT_OWNED');
    const prior = await store.ledgers.findOne({ _id }, { session });
    if (prior && (prior.featureKey !== product.featureKey || prior.profileId !== profileId || prior.inputHash !== inputHash)) throw fail(409, 'HONEY_REQUEST_MISMATCH');
    if (!prior) {
      await store.ledgers.insertOne({ _id, userId, profileId, featureKey: product.featureKey, inputHash,
        type: 'spend', reason: 'HONEY_PER_USE', amount: product.honeyCost, serviceScope: HONEY_SCOPE, idempotencyKey: requestId, createdAt: new Date() }, { session });
      const debit = await store.wallets.updateOne({ userId, serviceScope: HONEY_SCOPE, balance: { $gte: product.honeyCost } },
        { $inc: { balance: -product.honeyCost, totalSpent: product.honeyCost }, $set: { updatedAt: new Date() } }, { session });
      if (!debit.modifiedCount) throw fail(402, 'INSUFFICIENT_HONEY_DROPS');
    }
    return { featureKey: product.featureKey, profileId, requestId, unlocked: true, spent: prior ? 0 : product.honeyCost, replayed: !!prior,
      accessGrant: { featureKey: product.featureKey, profileId, requestId, evidenceId: _id, accessMethod: 'HONEY' } };
  });
  try { return await execute(); } catch (error) { if (Number(error?.code) !== 11000) throw error; return execute(); }
}
export async function readHoneyUseReceipt(env, { userId, featureKey, profileId, requestId }) {
  const product = getHoneyUnlockProduct(featureKey);
  if (!product || product.serviceScope !== 'GGULGGUL' || product.billingType !== 'per_use' || !requestId || !profileId) return null;
  const { honeyCollections } = await import('./honey-wallet.js');
  await connectDb(env);
  return withMongoRetry(env, () => honeyCollections().ledgers.findOne({ _id: `honey-use:${userId}:${requestId}`, userId: String(userId),
    featureKey, profileId, reason: 'HONEY_PER_USE', type: 'spend', amount: product.honeyCost, serviceScope: HONEY_SCOPE }));
}

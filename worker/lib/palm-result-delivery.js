import { createHash } from 'node:crypto';
import { connectDb } from './db.js';
import { ServiceExecutionTransaction } from './models.js';
import { verifyPerUsePayment } from './nakshatra-paid-access.js';
import { isPaidResultRevoked } from './paid-result-revocation.js';
import { FEATURE_KEY_PRICE_TABLE } from './paid-feature-registry.js';
import { createHttpError } from './http.js';
import { palmCopy } from './palm-locale-copy.js';

const featureKey = 'palm-reading-general';
const executionKey = (userId, requestId) => 'palm-analysis:' + createHash('sha256').update(JSON.stringify([String(userId), requestId])).digest('hex');
const unavailable = () => createHttpError(503, palmCopy().resultStorageUnavailable, { code: 'RESULT_STORAGE_UNAVAILABLE', retryable: true });

export async function savePalmAnalysis(env, userId, requestId, result, rawText = "") {
  if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 120) throw createHttpError(422, palmCopy().requestIdRequired, { code: 'REQUEST_ID_REQUIRED' });
  const filter = { userId, executionKey: executionKey(userId, requestId) };
  try {
    await connectDb(env);
    // Only the returned interpretation is kept. Uploaded images and biometric
    // source payloads never enter this snapshot.
    const saved = { ...result, requestId, analysisSaved: true };
    const row = await ServiceExecutionTransaction.findOneAndUpdate(filter, { $setOnInsert: {
      ...filter, featureKey, reportType: 'palmAnalysis', reportId: filter.executionKey,
      idempotencyKey: requestId, status: 'success', premiumStatus: 'completed',
      metadata: { palmResult: saved, ...(rawText ? { palmRaw: rawText } : {}) }, completedAt: new Date(),
    } }, { upsert: true, returnDocument: 'after' }).lean();
    if (!row?.metadata?.palmResult) throw unavailable();
    const confirmed = await ServiceExecutionTransaction.findOne(filter).lean();
    if (JSON.stringify(confirmed?.metadata?.palmResult) !== JSON.stringify(row.metadata.palmResult)) throw unavailable();
    return confirmed.metadata.palmResult;
  } catch { throw unavailable(); }
}

export async function readPaidPalmAnalysis(env, userId, requestId = '', accessMethod = '') {
  let row;
  try {
    await connectDb(env);
    row = await ServiceExecutionTransaction.findOne({ userId, featureKey, ...(requestId ? { executionKey: executionKey(userId, requestId) } : {}) }).sort({ createdAt: -1 }).lean();
  } catch { throw unavailable(); }
  if (!row?.metadata?.palmResult) throw createHttpError(404, palmCopy().resultNotFound, { code: 'RESULT_NOT_FOUND' });
  const original = row.idempotencyKey;
  const input = { userId, featureKey, requestId: original, coinPrice: FEATURE_KEY_PRICE_TABLE[featureKey].cost };
  let proof = await verifyPerUsePayment(env, { ...input, requireExisting: true });
  // 이용권 즉시 사용은 사용 기록을 뒤에서 쓴다 — 기록보다 먼저 온 조회는 이 판독의 requestId 로 이용권을 직접 확정한다
  // (소비 마커로 멱등). requestId 없이 '최근 판독'을 여는 조회는 소비하지 않는다.
  if (proof?.proven === false && requestId && String(accessMethod).toLowerCase() === 'pass') proof = await verifyPerUsePayment(env, input);
  if (proof?.proven === null) throw unavailable();
  if (!proof?.proven || await isPaidResultRevoked(userId, featureKey, [original, row.executionKey])) throw createHttpError(403, palmCopy().paidAccessRequired, { code: 'PAID_ACCESS_REQUIRED' });
  return { ...row.metadata.palmResult, saved: true };
}

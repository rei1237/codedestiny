import { createHash } from 'node:crypto';
import { connectDb } from './db.js';
import { ServiceExecutionTransaction } from './models.js';
import { verifyPerUsePayment } from './nakshatra-paid-access.js';
import { isPaidResultRevoked } from './paid-result-revocation.js';
import { FEATURE_KEY_PRICE_TABLE } from './paid-feature-registry.js';
import { createHttpError } from './http.js';

const featureKey = 'palm-reading-general';
const executionKey = (userId, requestId) => 'palm-analysis:' + createHash('sha256').update(JSON.stringify([String(userId), requestId])).digest('hex');
const unavailable = () => createHttpError(503, '저장된 손금 판독을 확인하지 못했어요. 같은 판독으로 다시 시도해 주세요.', { code: 'RESULT_STORAGE_UNAVAILABLE', retryable: true });

export async function savePalmAnalysis(env, userId, requestId, result) {
  if (typeof requestId !== 'string' || requestId.length < 8 || requestId.length > 120) throw createHttpError(422, '판독 요청 ID가 필요합니다.', { code: 'REQUEST_ID_REQUIRED' });
  const filter = { userId, executionKey: executionKey(userId, requestId) };
  try {
    await connectDb(env);
    // Only the returned interpretation is kept. Uploaded images and biometric
    // source payloads never enter this snapshot.
    const saved = { ...result, requestId, analysisSaved: true };
    const row = await ServiceExecutionTransaction.findOneAndUpdate(filter, { $setOnInsert: {
      ...filter, featureKey, reportType: 'palmAnalysis', reportId: filter.executionKey,
      idempotencyKey: requestId, status: 'success', premiumStatus: 'completed',
      metadata: { palmResult: saved }, completedAt: new Date(),
    } }, { upsert: true, returnDocument: 'after' }).lean();
    if (!row?.metadata?.palmResult) throw unavailable();
    const confirmed = await ServiceExecutionTransaction.findOne(filter).lean();
    if (JSON.stringify(confirmed?.metadata?.palmResult) !== JSON.stringify(row.metadata.palmResult)) throw unavailable();
    return confirmed.metadata.palmResult;
  } catch { throw unavailable(); }
}

export async function readPaidPalmAnalysis(env, userId, requestId = '') {
  let row;
  try {
    await connectDb(env);
    row = await ServiceExecutionTransaction.findOne({ userId, featureKey, ...(requestId ? { executionKey: executionKey(userId, requestId) } : {}) }).sort({ createdAt: -1 }).lean();
  } catch { throw unavailable(); }
  if (!row?.metadata?.palmResult) throw createHttpError(404, '저장된 판독을 찾을 수 없습니다.', { code: 'RESULT_NOT_FOUND' });
  const original = row.idempotencyKey;
  const proof = await verifyPerUsePayment(env, { userId, featureKey, requestId: original, coinPrice: FEATURE_KEY_PRICE_TABLE[featureKey].cost, requireExisting: true });
  if (proof?.proven === null) throw unavailable();
  if (!proof?.proven || await isPaidResultRevoked(userId, featureKey, [original, row.executionKey])) throw createHttpError(403, '이 판독의 결제 내역을 확인해 주세요.', { code: 'PAID_ACCESS_REQUIRED' });
  return { ...row.metadata.palmResult, saved: true };
}

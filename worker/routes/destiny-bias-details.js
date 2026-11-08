import { requireUserFromRequest } from '../lib/auth.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { ServiceExecutionTransaction } from '../lib/models.js';
import { json, methodNotAllowed } from '../lib/http.js';
import { enforceSensitiveEndpointSecurity } from '../lib/security/index.js';
import { readArchiveJson, archiveSignature, upsertPaidResultArchive } from '../lib/paid-result-archive.js';
import { isStoredPaidResultRevoked } from '../lib/paid-result-revocation.js';
import { verifyPerUsePayment, logPerUsePaymentProof } from '../lib/nakshatra-paid-access.js';
import { FEATURE_KEY_PRICE_TABLE } from '../lib/paid-feature-registry.js';
import { BIAS_DETAILS_FEATURE, readOrSaveBiasDetails } from '../lib/destiny-bias-paid-details.js';

export async function handleDestinyBiasDetails(request, env, save) {
  if (request.method !== 'POST') return methodNotAllowed();
  const auth = await requireUserFromRequest(request, env);
  const security = await enforceSensitiveEndpointSecurity({ env, request, userId: auth.userId,
    endpoint: 'destiny-bias:details', allowedMethods: ['POST'], requireJson: true,
    rateLimit: { limit: 30, windowSeconds: 60 }, rateLimitKey: `${auth.userId}:bias-details`, maxPayloadBytes: 65536 });
  if (!security.ok) return security.response;
  const parsed = await readArchiveJson(request);
  if (parsed.tooLarge || parsed.invalid) return json({ ok: false, error: { code: 'INVALID_BODY', message: '리포트 요청 형식을 확인해 주세요.' } }, { status: 400 });
  await connectDb(env);
  const result = await readOrSaveBiasDetails({ userId: auth.userId, input: parsed.body, save }, {
    find: query => withMongoRetry(env, () => ServiceExecutionTransaction.findOne(query).sort({ createdAt: 1 }).lean()),
    revoked: isStoredPaidResultRevoked,
    signature: archiveSignature,
    prove: async input => {
      const proof = await verifyPerUsePayment(env, { ...input, featureKey: 'destiny-bias-analyze', coinPrice: FEATURE_KEY_PRICE_TABLE[BIAS_DETAILS_FEATURE].cost });
      logPerUsePaymentProof('destiny-bias-analyze', proof);
      return proof;
    },
    save: async input => {
      try { return await upsertPaidResultArchive(env, input); }
      catch (error) {
        if (Number(error?.code) !== 11000) throw error;
        return withMongoRetry(env, () => ServiceExecutionTransaction.findOne({ userId: input.userId, executionKey: input.executionKey }).lean());
      }
    },
  });
  return json(result.body, { status: result.status, headers: { 'Cache-Control': 'private, no-store' } });
}

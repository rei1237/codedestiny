import { Types } from 'mongoose';
import { connectDb, withMongoRetry } from './db.js';
import * as models from './models.js';
import { runWithAiLocale } from './ai-locale-context.js';

// Each adapter resumes an existing owner-scoped record through its normal
// payment, lease, persistence and per-part budget checks. No insert or grant here.
import { CONSULTATION_RECOVERY_ADAPTERS } from './consultation-recovery-registry.js';
export { CONSULTATION_RECOVERY_ADAPTERS };

const loadAdapters = {
  'astrology-ai': () => import('../routes/astrology-ai.js'),
  'vedic-ai': () => import('../routes/vedic-ai.js'),
  'ziwei-ai': () => import('../routes/ziwei-ai.js'),
  'sukuyo-compatibility-ai': () => import('../routes/sukuyo-compatibility-ai.js'),
  'new-year-ai': () => import('../routes/new-year-ai.js'),
  'life-book-ai': () => import('../routes/life-book-ai.js'),
  'love-secret-ai': () => import('../routes/love-secret-ai.js'),
  'neo-operation-room': () => import('../routes/neo-operation-room.js'),
  'nakshatra-ai': () => import('../routes/nakshatra-ai.js'),
  'ziwei-island-ai': () => import('../routes/ziwei-island-ai.js'),
  'human-design-report': () => import('../routes/human-design-report.js'),
  'destiny-compass-ai': () => import('../routes/destiny-compass-ai.js'),
  'relationship-boundary-test': () => import('../routes/relationship-boundary-test.js'),
  'naming-prompt': () => import('../routes/naming-prompt.js'),
  'celestial-harmony': () => import('../routes/celestial-harmony.js'),
  'fortune': () => import('../routes/fortune.js'),
  'karma-destiny-ai': () => import('../routes/karma-destiny-ai.js'),
  'fortune-tea-house': () => import('../routes/fortune-tea-house.js'),
};
const IDLE_MS = 300000, MAX_AGE_MS = 7 * 86400000, TASK_MS = 240000, WAVE_MS = 65000;
export function consultationRecoveryFilter(now, extra) {
  return { ...extra, _id: { $gte: Types.ObjectId.createFromTime(Math.floor((now - MAX_AGE_MS) / 1000)) },
    status: { $in: ['generating', 'partial', 'delivery_pending', ...(extra.featureKey === 'tarot-celestial-harmony' ? ['pending'] : [])] },
    updatedAt: { $lt: new Date(now - IDLE_MS) }, userId: { $exists: true, $ne: null } };
}
export async function runConsultationRecovery(env, options = {}) {
  const now = options.now || Date.now(), deadline = now + TASK_MS;
  await (options.connectDb || connectDb)(env);
  const catalog = options.adapters || CONSULTATION_RECOVERY_ADAPTERS;
  // Rotate first service so a slow provider cannot permanently starve later ones.
  const offset = Math.floor(now / 600000) % catalog.length;
  const adapters = [...catalog.slice(offset), ...catalog.slice(0, offset)];
  const outcomes = [];
  for (const [route, modelName, extra] of adapters) {
    if (Date.now() + WAVE_MS > deadline) break;
    try {
      const adapter = options.loadAdapter ? await options.loadAdapter(route) : await loadAdapters[route]();
      const model = (options.models || models)[modelName];
      const docs = !modelName ? await adapter.findRecoverableConsultations(env, consultationRecoveryFilter(now, extra)) : await withMongoRetry(env, () => model.find(consultationRecoveryFilter(now, extra))
        .sort({ _id: 1 }).limit(1).select('id executionId executionKey userId locale llmMeta.locale llmMeta.resumeBody.locale').lean());
      for (const doc of docs) {
        if (!doc.userId || !(doc.id || doc._id || doc.resultId)) continue;
        const response = await runWithAiLocale(doc.locale || doc.llmMeta?.locale || doc.llmMeta?.resumeBody?.locale || 'ko',
          () => adapter.resumeConsultationOnServer(env, doc));
        // Never log body/raw, payment IDs or birth inputs.
        outcomes.push({ service: route, status: response.status });
      }
    } catch (error) {
      outcomes.push({ service: route, code: String(error?.code || 'RECOVERY_PENDING').slice(0, 80) });
    }
  }
  console.log('[consultation-recovery]', JSON.stringify({ outcomes }));
  return { ok: true, outcomes };
}

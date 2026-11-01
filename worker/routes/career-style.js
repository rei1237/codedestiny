import { requireUserFromRequest } from '../lib/auth.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { ProfileCard, ServiceExecutionTransaction } from '../lib/models.js';
import { findActivePaidContentUnlock } from '../lib/content-unlocks.js';
import { upsertPaidResultArchive } from '../lib/paid-result-archive.js';
import { json, readJson, methodNotAllowed, handleRouteError } from '../lib/http.js';
import { enforceSensitiveEndpointSecurity } from '../lib/security/index.js';
import { readCareerStyle } from '../lib/career-style-access.js';

export async function handleCareerStyle(request, env) {
  let response;
  try {
    if (!['GET', 'POST'].includes(request.method)) return methodNotAllowed();
    const auth = await requireUserFromRequest(request, env);
    if (request.method === 'POST') {
      const security = await enforceSensitiveEndpointSecurity({ env, request, userId: auth.userId,
        endpoint: 'saju:career-style', allowedMethods: ['POST'], requireJson: true,
        rateLimit: { limit: 20, windowSeconds: 60 }, rateLimitKey: `${auth.userId}:career-style`, maxPayloadBytes: 4096 });
      if (!security.ok) return security.response;
    }
    const body = request.method === 'POST' ? await readJson(request) : null;
    const profileId = String(body?.profileId || new URL(request.url).searchParams.get('profileId') || '').trim();
    await connectDb(env);
    const result = await readCareerStyle({ userId: String(auth.userId), profileId, statusOnly: request.method === 'GET' }, {
      findProfile: query => withMongoRetry(env, () => ProfileCard.findOne(query).lean()),
      findUnlock: findActivePaidContentUnlock,
      findResult: query => withMongoRetry(env, () => ServiceExecutionTransaction.findOne(query).lean()),
      saveResult: async ({ userId, profileId, executionKey, featureKey, report, entitlement, card }) => {
        const input = { userId, profileId, executionKey, featureKey, reportType: featureKey, reportId: executionKey,
          requestId: String(entitlement.requestId || executionKey),
          transactionId: String(entitlement.paymentId || entitlement.orderId || entitlement.evidenceId || ''),
          preserveOriginal: true,
          metadata: { careerReport: report, accessEntitlementId: String(entitlement._id || ''), birthKey: entitlement.birthKey || '', cardName: card.name || '' },
          archive: { title: '나의 일 스타일', subtitle: report.title, summary: report.sections[0].paragraphs.join('\n\n'),
            sections: report.sections.map(section => ({ title: section.title, body: [
              ...section.paragraphs, ...section.analysisParagraphs,
              ...(section.axes || []).map(axis => `${axis.title}\n${axis.basis}\n${axis.reading}\n${axis.easy}\n${axis.support}`),
              ...(section.roles || []).map(role => `${role.title}\n${role.reason}\n${role.skill}\n${role.activity}`),
              ...(section.insights || []).map(item => `${item.title}\n${item.basis}\n${item.scene}\n${item.condition}\n${item.action}`),
              section.analysisNote || '',
            ].filter(Boolean).join('\n\n') })) },
        };
        try { return await upsertPaidResultArchive(env, input); }
        catch (error) {
          if (Number(error?.code) !== 11000) throw error;
          return ServiceExecutionTransaction.findOne({ userId, executionKey }).lean();
        }
      },
    });
    response = json({ ok: true, ...result });
  } catch (error) { response = await handleRouteError(error, { request, env }); }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

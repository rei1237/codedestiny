import { json, getRoutePath, notFound, methodNotAllowed } from '../lib/http.js';
import { incrementRateLimit } from '../lib/rate-limit.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { RecommendationProduct, RecommendationSetting, RecommendationMetric } from '../lib/recommendation-models.js';
import { RECOMMENDATIONS_RELEASED, DEFAULT_SETTINGS, normalizeContext, selectProducts, isEnabled, providerEnabled, cleanEvent } from '../../js/recommendations-core.mjs';

export async function readCatalogue(env) {
  await connectDb(env);
  const [setting, rows] = await Promise.all([
    withMongoRetry(env, () => RecommendationSetting.findById('coupang').lean()),
    withMongoRetry(env, () => RecommendationProduct.find({ _id: { $gt: '' } }).sort({ _id: 1 }).limit(500).lean()),
  ]);
  return { settings: setting?.data || DEFAULT_SETTINGS, products: rows.map(row => row.data) };
}
const disabled = () => json({ enabled: false, products: [] }, { headers: { 'Cache-Control': 'no-store' } });
export async function handleRecommendationRoutes(request, env) {
  const path = getRoutePath(request, '/api/recommendations');
  if (!['/', '', '/events'].includes(path)) return notFound();
  if ((path === '/events' && request.method !== 'POST') || (path !== '/events' && request.method !== 'GET')) return methodNotAllowed();
  // Approval-pending builds never read/write the operational database on public traffic.
  if (!RECOMMENDATIONS_RELEASED) return path === '/events' ? new Response(null, { status: 204 }) : disabled();
  try {
    if (path === '/events') {
      const origin = request.headers.get('Origin');
      if (!['https://code-destiny.com', 'https://staging.code-destiny.com', 'https://localhost'].includes(origin)) return new Response(null, { status: 403 });
      if (/bot|crawler|spider|headless/i.test(request.headers.get('User-Agent') || '') || request.headers.get('Purpose') || request.headers.get('Sec-Purpose')?.includes('prefetch')) return new Response(null, { status: 204 });
      if (Number(request.headers.get('Content-Length') || 0) > 1024) return new Response(null, { status: 413 });
      const raw = await request.text();
      if (raw.length > 1024) return new Response(null, { status: 413 });
      const event = cleanEvent(JSON.parse(raw));
      if (!event) return new Response(null, { status: 400 });
      // Global analytics budget, not a visitor/IP profile. Attribution remains approximate.
      const limit = await incrementRateLimit({ subjectHash: 'recommendations-events', endpoint: '/api/recommendations/events', windowMs: 60000, env });
      if (limit.count > 600) return new Response(null, { status: 429 });
      const { settings, products } = await readCatalogue(env);
      if (!isEnabled(settings, event.service)) return new Response(null, { status: 204 });
      if (event.productId !== 'block' && !products.some(p => p.id === event.productId && p.status === 'active' && providerEnabled(settings, p.providerId))) return new Response(null, { status: 400 });
      const day = new Date().toISOString().slice(0, 10);
      const id = [day, event.service, event.placement, event.productId, event.event].join('|');
      await withMongoRetry(env, () => RecommendationMetric.updateOne({ _id: id }, { $setOnInsert: { day, ...event }, $inc: { count: 1 } }, { upsert: true }));
      return new Response(null, { status: 204 });
    }
    const q = new URL(request.url).searchParams;
    const input = normalizeContext({ service: q.get('service'), category: q.get('category'), interests: q.getAll('interest'), practiceTags: q.getAll('topic'), source: q.get('source'), currency: q.get('currency'), color: q.get('color'), motif: q.get('motif'), species: q.get('species'), groupId: q.get('group'), maxPrice: q.get('maxPrice'), exclude: q.getAll('exclude') });
    const { settings, products } = await readCatalogue(env);
    if (!isEnabled(settings, input.service)) return disabled();
    return json({ enabled: true, products: selectProducts(products.filter(p => providerEnabled(settings, p.providerId)), input).slice(0, 60) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return disabled(); } // Failure never enters fortune/payment recovery or logs request data.
}

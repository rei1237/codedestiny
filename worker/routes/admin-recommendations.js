import { json, notFound, methodNotAllowed } from '../lib/http.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { RecommendationProduct, RecommendationSetting, RecommendationMetric, RecommendationReport } from '../lib/recommendation-models.js';
import { PARTNER_ACCOUNT, RECOMMENDATIONS_RELEASED, DEFAULT_SETTINGS, cleanSettings, PROVIDERS, CURRENCIES, cleanProduct, reviewProduct, reviewErrors, validateAffiliateUrl, validId, serviceRule, selectProducts } from '../../js/recommendations-core.mjs';
import { readCatalogue } from './recommendations.js';

// Invoked only after authorizeAdminRequest in the existing admin router.
export async function handleAdminRecommendationRoutes(path, request, env) {
  try {
    if (request.method === 'GET' && path === '/') {
      const catalogue = await readCatalogue(env);
      return json({ ...catalogue, account: PARTNER_ACCOUNT, released: RECOMMENDATIONS_RELEASED, products: catalogue.products.map(p => ({ ...p, urlFormatValid: validateAffiliateUrl(p.affiliateUrl, p.providerId), reviewErrors: reviewErrors(p) })) });
    }
    if (request.method === 'GET' && path === '/metrics') {
      await connectDb(env);
      const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const [metrics, reports] = await Promise.all([
        withMongoRetry(env, () => RecommendationMetric.find({ _id: { $gte: from } }).sort({ _id: -1 }).limit(5000).lean()),
        withMongoRetry(env, () => RecommendationReport.find({ _id: { $gt: '' } }).sort({ _id: -1 }).limit(100).lean()),
      ]);
      return json({ metrics, reports: reports.map(r => r.data), source: 'own_events', reportingWindowDays: 30, possiblyTruncated: metrics.length === 5000, serviceProtection: 'existing_analytics' });
    }
    if (request.method !== 'POST') return methodNotAllowed();
    const raw = await request.text();
    if (raw.length > 16000) return json({ error: 'payload_too_large' }, { status: 413 });
    const body = JSON.parse(raw);
    if (path === '/preview') {
      // Unsaved drafts can be inspected; this returns no usable external URL.
      const p = cleanProduct(body.product);
      return json({ product: { ...p, affiliateUrl: '', preview: true }, reviewErrors: reviewErrors(p) });
    }
    await connectDb(env);
    if (path === '/product') {
      const product = cleanProduct(body);
      const existing = await withMongoRetry(env, () => RecommendationProduct.findById(product.id).lean());
      if (!existing) {
        const count = await withMongoRetry(env, () => RecommendationProduct.countDocuments({ _id: { $gt: '' } }));
        if (count >= 500) return json({ error: 'catalogue_limit', message: '수동 카탈로그 한도는 500개입니다.' }, { status: 409 });
      }
      // Every edit invalidates approval; an operator must recheck changed facts.
      await withMongoRetry(env, () => RecommendationProduct.updateOne({ _id: product.id }, { $set: { data: product } }, { upsert: true }));
      return json({ ok: true, product });
    }
    if (path === '/review' || path === '/pause') {
      if (!validId(body.id)) return json({ error: 'invalid_id' }, { status: 400 });
      const row = await withMongoRetry(env, () => RecommendationProduct.findById(body.id).lean());
      if (!row) return notFound();
      const product = path === '/review' ? reviewProduct(row.data, body.checks) : { ...row.data, status: 'paused' };
      // Compare revision to prevent a stale review from approving a concurrent edit.
      const result = await withMongoRetry(env, () => RecommendationProduct.updateOne({ _id: body.id, updatedAt: row.updatedAt }, { $set: { data: product } }));
      if (!result.modifiedCount) return json({ error: 'conflict', message: '상품이 변경되었습니다. 다시 불러와 확인해 주세요.' }, { status: 409 });
      return json({ ok: true, product });
    }
    if (path === '/settings') {
      if (body.enabled === true && !RECOMMENDATIONS_RELEASED) return json({ error: 'approval_release_required', message: '승인 전 빌드에서는 공개할 수 없습니다.' }, { status: 409 });
      const settings = cleanSettings(body);
      if (settings.enabled && (!settings.approved || !settings.mediaRegistered)) return json({ error: 'approval_required' }, { status: 409 });
      await withMongoRetry(env, () => RecommendationSetting.updateOne({ _id: 'coupang' }, { $set: { data: settings } }, { upsert: true }));
      return json({ ok: true, settings });
    }
    if (path === '/report') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.from) || !/^\d{4}-\d{2}-\d{2}$/.test(body.to) || body.from > body.to || typeof body.evidence !== 'string' || body.evidence.trim().length < 10 || body.evidence.length > 1000) throw new Error('보고 기간과 공식 리포트 근거를 확인해 주세요.');
      const providerId = body.providerId || 'coupang', currency = body.currency || 'KRW';
      if (!PROVIDERS.includes(providerId) || !CURRENCIES.includes(currency)) throw new Error('판매처와 통화를 확인해 주세요.');
      body.commission = body.commission === undefined ? body.commissionKRW : body.commission;
      const fields = ['clicks', 'orders', 'cancellations', 'commission'];
      if (!fields.every(k => body[k] === null || (Number.isFinite(body[k]) && body[k] >= 0 && (k === 'commission' || Number.isSafeInteger(body[k]))))) throw new Error('확인하지 못한 실적은 빈칸으로 남겨 주세요.');
      const report = { from: body.from, to: body.to, evidence: body.evidence.trim(), providerId, currency, source: providerId + '_official_manual', verifiedAt: new Date().toISOString(), ...Object.fromEntries(fields.map(k => [k, body[k]])) };
      await withMongoRetry(env, () => RecommendationReport.updateOne({ _id: providerId + '_' + currency + '_' + body.from + '_' + body.to }, { $set: { data: report } }, { upsert: true }));
      return json({ ok: true, report });
    }
    if (path === '/selection-preview') {
      const { products } = await readCatalogue(env);
      return json({ products: selectProducts(products, body).map(p => ({ ...p, affiliateUrl: '', preview: true })) });
    }
    return notFound();
  } catch (error) {
    // Do not expose database details or arbitrary request text.
    const safe = error instanceof SyntaxError ? '입력 형식을 확인해 주세요.' : String(error?.message || '');
    return json({ error: 'recommendation_request_failed', message: /^[가-힣]/.test(safe) ? safe : '저장하지 못했습니다. 입력을 확인하거나 다시 시도해 주세요.' }, { status: 400 });
  }
}

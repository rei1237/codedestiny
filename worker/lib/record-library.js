import { CHAT_FEATURE_KEYS } from '../../lib/fortune/chat-products.js';
import * as models from './models.js';
import { mongoose } from './db.js';
import { scopeConnection } from './db-scope-connection.js';
import { RECORD_SERVICES, SAVED_FEATURES, savedRecordPath } from '../../lib/records/service-registry.js';
import { resolveReviewProductByFeatureKey } from './review-product-catalog.js';
import { isStoredPaidResultRevoked } from './paid-result-revocation.js';
import { listServerPricedFeatureKeys, normalizePaidFeatureKey, getPaidFeatureBillingType } from './paid-feature-registry.js';
import { createHttpError } from './http.js';
import { getMasterLoveCodexPlan } from './master-love-codex-prompt.mjs';
import { getMasterLoveCodexCompatPlan } from './master-love-codex-compat-prompt.mjs';
import { codexDedupedChapterFloor } from './master-love-codex-quality.js';

export const RECORD_METADATA_PROJECTION = Object.freeze({
  _id: 1, id: 1, sessionId: 1, resultId: 1, executionKey: 1, createdAt: 1,
  title: 1, topic: 1, question: 1, userQuestion: 1, questionSummary: 1, selectedTopic: 1,
  status: 1, generationStatus: 1, premiumStatus: 1, stage: 1, mode: 1,
  featureKey: 1, featureId: 1, serviceType: 1, reportType: 1, consultationType: 1, characterId: 1,
  state: 1, persona: 1, completedChapters: 1, questionExcerpt: 1, paymentId: 1, orderId: 1, merchantUid: 1,
  'snapshot.analysis.consultation.question': 1,
  'metadata.paidNarrative.body.question': 1, 'metadata.paidNarrative.body.userQuestion': 1,
  'metadata.paidNarrative.body.topic': 1, 'metadata.archive.title': 1,
  'result.title': 1, 'result.sessionTitle': 1, 'result.question': 1, 'result.questionSummary': 1, 'initialBriefing.operationTitle': 1,
  'inputSummary.topic': 1, 'llmMeta.input.consultationType': 1,
});
export const readRecordField = (doc, path) => path.split('.').reduce((value, key) => value?.[key], doc);
const clean = (value, size = 600) => typeof value === 'string' ? value.trim().slice(0, size) : '';
const questionFields = ['question', 'userQuestion', 'questionSummary', 'selectedTopic', 'snapshot.analysis.consultation.question', 'inputSummary.topic', 'metadata.paidNarrative.body.question', 'metadata.paidNarrative.body.userQuestion', 'result.question', 'result.questionSummary'];
const titleFields = ['title', 'result.title', 'result.sessionTitle', 'initialBriefing.operationTitle', 'metadata.archive.title', 'metadata.paidNarrative.body.topic', 'topic'];
export function recordStatus(doc, source) {
  const status = clean(doc.state || doc.premiumStatus || doc.generationStatus || doc.status, 40).toLowerCase();
  if (['refunded', 'cancelled', 'canceled', 'revoked'].includes(doc.status)) return 'revoked';
  if(status!=='refunded'&&(doc.refundStatus==='pending'||doc.generationCheckpoint?.deliveryRefund?.status==='pending'))return 'refund_pending';
  if (doc.stage === 1 || ['partial', 'delivery_pending'].includes(status)) return 'partial';
  if (['completed', 'success', 'delivered'].includes(status)) {
    if (source.id === 'codex' && Array.isArray(doc.chapterManifest)) {
      const plan = doc.mode === 'compat' ? getMasterLoveCodexCompatPlan() : getMasterLoveCodexPlan();
      if (!plan.chapters.every(spec => doc.chapterManifest.some(row => row.id === spec.id && row.ok !== false && row.chars >= codexDedupedChapterFloor(spec)))) return 'partial';
    }
    if (source.id === 'chat-consultation' && doc.manifestCount > doc.completedChapters) return 'partial';
    return 'completed';
  }
  if (['generating', 'pending', 'processing', 'created', 'paid', 'awaiting_followup', 'awaiting_draw'].includes(status)) return doc.partCount > 0 ? 'partial' : 'generating';
  if (['failed', 'fortune_failed', 'generation_failed', 'abandoned', 'refund_failed'].includes(status)) return 'failed';
  if (['refunded', 'cancelled'].includes(status)) return 'revoked';
  if (source.group === 'chat') return 'conversation';
  // Legacy models whose schema predates status have persisted result documents.
  return status || 'saved';
}
export function recordMetadata(source, doc) {
  const id = String(doc[source.idField] || doc._id || '');
  const featureKey = clean(doc.featureKey || doc.featureId || doc.serviceType || (source.id === 'codex' && doc.mode === 'compat' ? 'master-love-codex-compat' : source.featureKey), 160);
  const product = featureKey && resolveReviewProductByFeatureKey(featureKey);
  const variant = SAVED_FEATURES[featureKey];
  const name = source.dynamic ? (variant?.name || product?.name || source.name) :
    source.id === 'life-book' && (featureKey === 'life-fortune-ai-consultation' || (doc.consultationType || doc.llmMeta?.input?.consultationType) === 'lifeFortune') ? '인생 총운' :
      source.id === 'ziwei' && doc.serviceType === 'ziwei-island-palace-consult' ? '운명의 섬 12궁 상담' : source.name;
  const status = recordStatus(doc, source);
  return { id, source: source.id, key: `${source.id}:${id}`, serviceId: featureKey || source.id, serviceName: name,
    title: titleFields.map(field => clean(readRecordField(doc, field), 200)).find(Boolean) || name,
    question: questionFields.map(field => clean(readRecordField(doc, field))).find(Boolean) || clean(doc.questionExcerpt) || clean(doc.summaryExcerpt),
    createdAt: doc.createdAt && Number.isFinite(Date.parse(doc.createdAt)) ? new Date(doc.createdAt).toISOString() : null,
    status, group: source.dynamic ? variant?.group || source.group : source.group, character: clean(doc.persona || doc.characterId || source.character, 30),
    href: savedRecordPath(source.id, id), startHref: variant?.href || product?.href || source.href,
    recoveryHref: source.id === 'tea' ? `/fortune-tea-house/?recoverResultId=${encodeURIComponent(id)}` : source.resultPath && source.group !== 'chat' ? source.resultPath + encodeURIComponent(id) : '/points/history/',
    nativeHref: status === 'completed' && source.resultPath && doc[source.idField] ? source.resultPath + encodeURIComponent(id) : '',
  };
}
export function ownerQuery(userId) {
  const values = [String(userId)];
  if (mongoose.Types.ObjectId.isValid(String(userId))) values.push(new mongoose.Types.ObjectId(String(userId)));
  // Native queries preserve both historical String and ObjectId ownership, without identity aliases.
  return { userId: { $in: values } };
}
function collectionFor(source) {
  const db = (scopeConnection() || mongoose.connection).db;
  return db.collection(source.collection || models[source.model].collection.collectionName);
}
const paidRecordFeatureKeys = [...new Set([...listServerPricedFeatureKeys(), ...Object.keys(SAVED_FEATURES)])].filter(key => {
  const normalized = normalizePaidFeatureKey(key);
  return getPaidFeatureBillingType(key) && normalized !== 'human-design-chart' && !normalized.startsWith('destiny-bias-');
});

export function sourceCondition(source) {
  return { $and: [resultCondition(source),
    { accessType: { $nin: ['free', 'free_trial'] }, accessSource: { $nin: ['free', 'free_trial'] } },
    ...(source.dynamic ? [{ [source.id === 'executions' ? 'featureKey' : 'featureId']: { $in: paidRecordFeatureKeys } }] : []),
  ] };
}

function resultCondition(source) {
  if (source.id === 'chat') return { 'messages.0': { $exists: true } };
  if (source.where) return source.where;
  if (source.id === 'executions') return { reportType: { $ne: 'expertFollowUp' }, $or: [
    { 'metadata.result': { $exists: true } }, { 'metadata.archive': { $exists: true } },
    { 'metadata.paidNarrative': { $exists: true } }, { 'metadata.palmResult': { $exists: true } }, { 'metadata.celestialDelivery': { $exists: true } },
  ] };
  if (source.id === 'paid-results') return { $or: [
    { 'result.namingPrompt': { $exists: true } }, { 'result.report': { $exists: true } },
    { 'result.result': { $exists: true } }, { 'result.resultText': { $exists: true } },
    { 'result.text': { $exists: true } }, { 'result.content': { $exists: true } },
    { 'result.sajuAi': { $exists: true } }, { 'result.prashnaResult': { $exists: true } },
    { featureId: { $in: ['tarot-year-fortune', 'saju_ai_prompt_generator', 'premium-naming-prompt', 'vedic_prashna_prompt'] } },
  ] };
  return {};
}
const cursorError = () => createHttpError(400, '목록 위치가 유효하지 않아요. 처음부터 다시 확인해 주세요.', { code: 'INVALID_CURSOR' });
export function decodeRecordCursor(value, userId, queryKey) {
  if (!value) return { version: 1, user: String(userId), query: queryKey, cutoff: new Date().toISOString(), positions: {}, done: [] };
  if (value.length > 16000) throw cursorError();
  let cursor;
  try { cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); } catch { throw cursorError(); }
  if (cursor.version !== 1 || cursor.user !== String(userId) || cursor.query !== queryKey ||
      !Number.isFinite(Date.parse(cursor.cutoff)) || !cursor.positions || !Array.isArray(cursor.done)) throw cursorError();
  for (const position of Object.values(cursor.positions)) {
    if (!position || typeof position.id !== 'string' || position.id.length > 240 ||
      (position.at !== null && !Number.isFinite(Date.parse(position.at))) || !['string', 'objectId'].includes(position.type) ||
      (position.type === 'objectId' && !mongoose.Types.ObjectId.isValid(position.id))) throw cursorError();
  }
  return cursor;
}
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const positionFor = doc => ({ at: doc.createdAt ? new Date(doc.createdAt).toISOString() : null, id: String(doc._id), type: typeof doc._id === 'string' ? 'string' : 'objectId' });
export function recordPageQuery(source, userId, cursor, search) {
  const conditions = [ownerQuery(userId), sourceCondition(source), { $or: [{ createdAt: { $lte: new Date(cursor.cutoff) } }, { createdAt: null }] }];
  const position = cursor.positions[source.id];
  if (position) {
    const id = position.type === 'objectId' ? new mongoose.Types.ObjectId(position.id) : position.id;
    conditions.push(position.at ? { $or: [
      { createdAt: { $lt: new Date(position.at) } }, { createdAt: new Date(position.at), _id: { $lt: id } }, { createdAt: null },
    ] } : { createdAt: null, _id: { $lt: id } });
  }
  if (search) {
    const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fields = [...titleFields, ...questionFields].map(field => ({ [field]: { $regex: pattern, $options: 'i' } }));
    if (source.id === 'chat') fields.push({ messages: { $elemMatch: { $and: [{ $or: [{ role: 'user' }, { speaker: 'user' }] }, { $or: [{ content: { $regex: pattern, $options: 'i' } }, { text: { $regex: pattern, $options: 'i' } }] }] } } });
    conditions.push({ $or: fields });
  }
  return { $and: conditions };
}
// Per-store keyset positions advance ONLY for emitted rows. Failed stores keep their
// position, including on the last page, so retries never skip their unread records.
export async function listRecords(userId, params, readPage = async (source, query, limit) => {
  const firstQuestion = { $arrayElemAt: [{ $map: { input: { $filter: { input: { $ifNull: ['$messages', []] }, as: 'message', cond: { $or: [{ $eq: ['$$message.role', 'user'] }, { $eq: ['$$message.speaker', 'user'] }] }, limit: 1 } }, as: 'message', in: { $ifNull: ['$$message.content', '$$message.text'] } } }, 0] };
  const projection = { ...RECORD_METADATA_PROJECTION,
    summaryExcerpt: { $substrCP: [{ $convert: { input: { $ifNull: ['$summary', '$result.summary'] }, to: 'string', onError: '', onNull: '' } }, 0, 600] },
    questionExcerpt: { $substrCP: [{ $convert: { input: firstQuestion, to: 'string', onError: '', onNull: '' } }, 0, 600] },
    ...(source.id === 'codex' ? { chapterManifest: { $map: { input: { $ifNull: ['$chapters', []] }, as: 'chapter', in: { id: '$$chapter.id', ok: '$$chapter.ok', chars: { $strLenCP: { $convert: { input: { $ifNull: ['$$chapter.body', '$$chapter.content'] }, to: 'string', onError: '', onNull: '' } } } } } } } : {}),
    ...(source.id === 'chat-consultation' ? { refundStatus:'$generationCheckpoint.deliveryRefund.status',manifestCount: { $size: { $ifNull: ['$snapshot.manifest', []] } } } : {}),
    ...(source.id === 'executions' ? { partCount: { $size: { $objectToArray: { $ifNull: ['$metadata.paidNarrative.parts', {}] } } } } : {}),
    ...(source.id === 'tea' ? { partCount: { $size: { $objectToArray: { $ifNull: ['$generationCheckpoint.parts', {}] } } } } : {}),
  };
  // A Payment mirror is the same naming delivery as its paid execution. Resolve
  // that relationship before limiting, so dedupe cannot lose a later page.
  const mirror = source.id === 'legacy-naming' ? [{ $lookup: {
    from: models.PaidExecutionRecord.collection.collectionName, let: { merchant: '$merchantUid' },
    pipeline: [{ $match: { ...ownerQuery(userId), featureId: 'premium-naming-prompt', $expr: { $and: [{ $ne: ['$$merchant', null] }, { $ne: ['$$merchant', ''] }, { $eq: ['$paymentId', '$$merchant'] }] } } }, { $limit: 1 }, { $project: { _id: 1 } }], as: '_mirror',
  } }, { $match: { '_mirror.0': { $exists: false } } }] : source.id === 'executions' ? [{ $lookup: {
    from: models.FortuneChatSession.collection.collectionName,
    let: { messageId: { $concat: [{ $ifNull: ['$metadata.paidNarrative.body.requestId', ''] }, ':1'] }, feature: '$featureKey' },
    pipeline: [{ $match: { ...ownerQuery(userId), $expr: { $and: [{ $eq: ['$$feature', 'fortune-chat-consultation'] }, { $ne: ['$$messageId', ':1'] }, { $in: ['$$messageId', { $ifNull: ['$messages.id', []] }] }] } } }, { $limit: 1 }, { $project: { _id: 1 } }], as: '_conversation',
  } }, { $match: { '_conversation.0': { $exists: false } } }] : [];
  return collectionFor(source).aggregate([{ $match: query }, { $sort: { createdAt: -1, _id: -1 } }, ...mirror, { $limit: limit }, { $project: projection }], { maxTimeMS: 5000 }).toArray();
}) {
  const search = clean(params.get('q'), 160), group = params.get('group') || 'all';
  if (!['all', 'report', 'chat', 'chart'].includes(group)) throw cursorError();
  const size = Math.max(1, Math.min(30, Number(params.get('limit')) || 20));
  const sourceId = params.get('source') || '';
  if (sourceId && !RECORD_SERVICES.some(source => source.id === sourceId)) throw cursorError();
  const cursor = decodeRecordCursor(params.get('cursor'), userId, `${group}:${search}${sourceId ? ':source=' + sourceId : ''}`);
  const sources = RECORD_SERVICES.filter(source => (!sourceId || source.id === sourceId) && (group === 'all' || source.group === group || source.dynamic) && !cursor.done.includes(source.id));
  const pages = [];
  for (let offset = 0; offset < sources.length; offset += 4) {
    pages.push(...await Promise.all(sources.slice(offset, offset + 4).map(async source => {
      try {
        const query = recordPageQuery(source, userId, cursor, search);
        if (source.dynamic && group !== 'all') query.$and.push(group === 'chat' ? { featureKey: { $in: CHAT_FEATURE_KEYS } } : group === 'chart' ? { _id: null } : { featureKey: { $nin: CHAT_FEATURE_KEYS } });
        return { source, rows: await readPage(source, query, size + 1) };
      }
      catch { return { source, error: true, rows: [] }; }
    })));
  }
  const failures = pages.filter(page => page.error).map(page => ({ source: page.source.id, name: page.source.name }));
  if (pages.length && failures.length === pages.length) return { ok: false, items: [], failures, retryCursor: encode(cursor) };
  const candidates = pages.flatMap(page => page.rows.map(doc => ({ source: page.source, doc, item: recordMetadata(page.source, doc) })));
  candidates.sort((a, b) => (Date.parse(b.item.createdAt || '') || 0) - (Date.parse(a.item.createdAt || '') || 0) || b.source.id.localeCompare(a.source.id) || String(b.doc._id).localeCompare(String(a.doc._id)));
  const selected = candidates.slice(0, size);
  for (const row of selected) cursor.positions[row.source.id] = positionFor(row.doc);
  for (const page of pages) if (!page.error && page.rows.length <= size && selected.filter(row => row.source.id === page.source.id).length === page.rows.length) cursor.done.push(page.source.id);
  const hasMore = failures.length > 0 || candidates.length > size || pages.some(page => page.rows.length > size);
  return { ok: true, items: selected.map(row => row.item), failures, nextCursor: hasMore ? encode(cursor) : null };
}

function withoutSecrets(value) {
  if (Array.isArray(value)) return value.map(withoutSecrets);
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/token|authorization|password|secret|^(?:lease.*|lock|llmMeta|generationCheckpoint|providerResponse|resumeInputs|resumeBody|prompt|systemPrompt|tasks|internalBasis|source|provider|engineMeta)$/i.test(key)).map(([key, item]) => [key, withoutSecrets(item)]));
}
export async function readRecord(userId, sourceId, id) {
  const source = RECORD_SERVICES.find(item => item.id === sourceId);
  if (!source || !id || id.length > 240) return null;
  let recordId = id;
  if (source.idField === '_id' && source.id !== 'chat-consultation' && mongoose.Types.ObjectId.isValid(id)) recordId = new mongoose.Types.ObjectId(id);
  const identity = source.idField !== '_id' && mongoose.Types.ObjectId.isValid(id) ? { $or: [{ [source.idField]: id }, { _id: new mongoose.Types.ObjectId(id) }] } : { [source.idField]: recordId };
  const doc = await collectionFor(source).findOne({ $and: [ownerQuery(userId), sourceCondition(source), identity] });
  if (!doc) return null;
  if (source.id === 'chat-consultation') doc.manifestCount = doc.snapshot?.manifest?.length || 0;
  doc.partCount = Object.keys(doc.metadata?.paidNarrative?.parts || doc.generationCheckpoint?.parts || {}).length;
  const record = recordMetadata(source, doc);
  record.title = titleFields.map(field => readRecordField(doc, field)).find(value => typeof value === 'string' && value.trim()) || record.title;
  record.question = questionFields.map(field => readRecordField(doc, field)).find(value => typeof value === 'string' && value.trim()) ||
    (doc.messages || []).find(message => message.role === 'user' || message.speaker === 'user')?.content || (doc.messages || []).find(message => message.speaker === 'user')?.text || '';
  if (source.id === 'ziwei' && doc.serviceType === 'ziwei-island-palace-consult') {
    record.startHref = '/island-consult/';
    record.nativeHref = record.status === 'completed' ? `/island-consult/?sessionId=${encodeURIComponent(record.id)}` : '';
    record.recoveryHref = `/island-consult/?sessionId=${encodeURIComponent(record.id)}`;
  }
  if (source.id === 'codex' && record.status === 'completed') {
    const { isCodexArchiveComplete } = await import('../routes/master-love-codex.js');
    if (!isCodexArchiveComplete(doc)) { record.status = 'partial'; record.nativeHref = ''; }
  }
  if (record.status === 'revoked' || (record.serviceId && source.featureKey !== '' && await isStoredPaidResultRevoked(userId, record.serviceId, doc)) ||
      (source.dynamic && (doc.featureKey || doc.featureId) && await isStoredPaidResultRevoked(userId, doc.featureKey || doc.featureId, doc))) {
    throw createHttpError(403, '취소·환불된 상담 결과는 제공할 수 없어요.', { code: 'RESULT_REVOKED' });
  }
  let content = source.id === 'executions' ? doc.metadata?.result || doc.metadata?.archive || doc.metadata?.palmResult || doc.metadata?.celestialDelivery?.reading || {} :
    source.id === 'paid-results' ? doc.result : source.id === 'legacy-naming' ? doc.namingPrompt || doc.pricingSnapshot?.namingPrompt : doc;
  if (source.id === 'codex') content = { ...doc, status: record.status };
  if (source.id === 'chat-consultation') {
    const { presentFortune } = await import('../yeongnyangi/service.ts');
    content = { ...presentFortune(doc), persona: doc.persona };
    record.nativeHref = '';
  }
  if (source.id === 'human-design-reading' && doc.calculationId) {
    const chartSource = RECORD_SERVICES.find(item => item.id === 'human-design-chart');
    const saved = await collectionFor(chartSource).findOne({ $and: [ownerQuery(userId), { id: doc.calculationId }] });
    if (saved?.calculation) content = { ...content, calculation: saved.calculation };
  }
  if (source.id === 'tea' && !doc.result && doc.generationCheckpoint?.parts) {
    const checkpoint = doc.generationCheckpoint;
    content = { sections: (checkpoint.groups || []).filter(group => checkpoint.parts[group.key]).map(group => ({ title: group.label, ...(typeof checkpoint.parts[group.key] === 'string' ? { body: checkpoint.parts[group.key] } : checkpoint.parts[group.key]) })) };
    if (content.sections.length && record.status === 'generating') record.status = 'partial';
  }
  if (source.id === 'executions') {
    const saved = doc.metadata?.paidNarrative;
    const original = saved?.body || {};
    content = { ...content,
      ...(!doc.metadata?.result && !doc.metadata?.archive && saved?.parts ? { chapters: Object.entries(saved.parts).filter(([,part]) => typeof part === 'string' && part.trim()).map(([key,body]) => ({ title: saved.tasks?.find(task => task.id === key)?.title || key, body })) } : {}),
      ...(original.cards ? { cards: original.cards } : {}),
      ...(saved?.base?.reading?.positionBreakdown ? { savedCards: saved.base.reading.positionBreakdown } : {}),
      ...(saved?.input?.cards ? { cards: saved.input.cards } : {}),
      ...(doc.metadata?.celestialDelivery?.body?.cards ? { cards: doc.metadata.celestialDelivery.body.cards } : {}),
    };
  }
  return { record, content: withoutSecrets(content) };
}

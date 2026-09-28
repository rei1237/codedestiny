import { connectDb } from '../lib/db.js';
import { incrementRateLimit } from '../lib/rate-limit.js';
import { InsightCard } from '../lib/insight-card-store.js';
import { INSIGHT_ID, INSIGHT_TOKEN, INSIGHT_TTL, projectInsight, publicInsight, insightDigest } from '../../lib/insight-card.mjs';

const reply = (body, status = 200) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer',
} });
// Bounded before JSON parsing, even if Content-Length is absent or misleading.
async function smallBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let size = 0; const chunks = [];
  try {
    for (;;) { const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 4096) { await reader.cancel(); return null; } chunks.push(value); }
    const all = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(all));
  } catch { return null; } finally { reader.releaseLock(); }
}
export async function handleInsightCardRoutes(request, env, dependencies = {}) {
  const model = dependencies.model || InsightCard;
  const connect = dependencies.connect || connectDb;
  const rate = dependencies.rate || incrementRateLimit;
  const now = dependencies.now || new Date();
  const path = new URL(request.url).pathname;
  const id = path.slice('/api/fortune/cards/'.length);
  const method = request.method;
  const collection = path === '/api/fortune/cards';
  if (!(collection && method === 'POST') && !(INSIGHT_ID.test(id) && ['GET', 'DELETE'].includes(method))) return reply({error:'NOT_FOUND'}, 404);
  try {
    if (method === 'GET') {
      await connect(env);
      const row = await model.findOne({_id:id, revoked:false, expiresAt:{$gt:now}}).lean();
      return row ? reply(publicInsight(row)) : reply({error:'NOT_FOUND'}, 404);
    }
    const origin = request.headers.get('Origin');
    if (origin && !(dependencies.allowOrigin ? dependencies.allowOrigin(origin) : origin === new URL(request.url).origin)) return reply({error:'ORIGIN_DENIED'}, 403);
    if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return reply({error:'JSON_REQUIRED'}, 415);
    const body = await smallBody(request);
    if (!INSIGHT_TOKEN.test(body?.token || '')) return reply({error:'INVALID_CARD'}, 400);
    const revokeHash = await insightDigest(body.token);
    const expectedId = 'ic_' + revokeHash.slice(0, 40);
    if (method === 'DELETE') {
      if (expectedId !== id) return reply({error:'NOT_FOUND'}, 404);
      const subjectHash = await insightDigest('insight-card:' + (request.headers.get('CF-Connecting-IP') || 'unknown'));
      const limit = await rate({subjectHash, endpoint:'insight_card_revoke', windowMs:600000, env});
      if (limit.count > 60) return reply({error:'RATE_LIMITED'}, 429);
      await connect(env);
      // Also tombstone a pending creation. A delayed POST must not resurrect it.
      // Keep only the opaque authority after revocation; no excerpt or TTL remains.
      await model.updateOne({_id:id, revokeHash}, {$set:{revoked:true, text:''},
        $setOnInsert:{revokeHash}, $unset:{expiresAt:1}}, {upsert:true});
      return reply({ok:true});
    }
    const card = projectInsight(body, now);
    if (!card) return reply({error:'INVALID_CARD'}, 400);
    const subjectHash = await insightDigest('insight-card:' + (request.headers.get('CF-Connecting-IP') || 'unknown'));
    const limit = await rate({subjectHash, endpoint:'insight_card_create', windowMs:600000, env});
    if (limit.count > 10) return reply({error:'RATE_LIMITED'}, 429);
    await connect(env);
    const row = await model.findOneAndUpdate({_id:expectedId}, {$setOnInsert:{...card, revokeHash,
      revoked:false, expiresAt:new Date(now.getTime()+INSIGHT_TTL)}}, {upsert:true, returnDocument:'after'}).lean();
    if (!row || row.revoked || new Date(row.expiresAt) <= now) return reply({error:'CARD_EXPIRED'}, 410);
    return reply(publicInsight(row), 201);
  } catch { return reply({error:'CARD_UNAVAILABLE'}, 503); }
}

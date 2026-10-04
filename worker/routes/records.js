import { requireUserFromRequest } from '../lib/auth.js';
import { connectDb } from '../lib/db.js';
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from '../lib/http.js';
import { listRecords, readRecord } from '../lib/record-library.js';

export async function handleRecordRoutes(request, env) {
  try {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    const auth = await requireUserFromRequest(request, env);
    await connectDb(env);
    const url = new URL(request.url), path = getRoutePath(request, '/api/records');
    const headers = { 'Cache-Control': 'private, no-store' };
    if (path === '/' || path === '') {
      const result = await listRecords(auth.userId, url.searchParams);
      return json(result, { status: result.ok ? 200 : 503, headers });
    }
    if (path === '/detail') {
      const result = await readRecord(auth.userId, url.searchParams.get('source'), url.searchParams.get('id'));
      return result ? json({ ok: true, ...result }, { headers }) : notFound();
    }
    return notFound();
  } catch (error) { return handleRouteError(error, { request, env, trace: { route: 'records' } }); }
}

import * as models from './models.js';
import { RECORD_SERVICES } from '../../lib/records/service-registry.js';

// Offline-maintenance contract, never called by list/detail or Worker startup.
// MongoDB createIndex with the same keys/name is repeatable; no data is moved,
// no prior indexes/retention rules are removed. Deployment operators can invoke
// this only in their approved maintenance environment with an existing db handle.
export function recordIndexPlan() {
  return [...new Set(RECORD_SERVICES.map(source => source.collection || models[source.model].collection.collectionName))]
    .map(collection => ({ collection, keys: { userId: 1, createdAt: -1, _id: -1 }, name: 'records_owner_created_id_v1' }));
}
export async function ensureRecordIndexes(db) {
  for (const { collection, keys, name } of recordIndexPlan()) {
    await db.collection(collection).createIndex(keys, { name, background: true });
  }
}

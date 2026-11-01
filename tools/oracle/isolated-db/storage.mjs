import { check, fail, LIMITS, COLLECTIONS, FEATURE } from './config.mjs';

export function memoryBackend(roundTrip = structuredClone) {
  const rows = new Map(), consultations = new Map();
  const api = map => ({
    async findOne(query) { return map.has(query._id) ? roundTrip(map.get(query._id)) : null; },
    async insertOne(row) {
      if (map.has(row._id)) throw Object.assign(new Error('duplicate'), { code: 11000 });
      map.set(row._id, roundTrip(row));
    },
  });
  return { preparations: [api(rows), api(rows)], consultations: api(consultations), async close() {} };
}

export async function mongoBackend(target, MongoClient) {
  const options = { directConnection: true, retryWrites: false, maxPoolSize: 1, minPoolSize: 0,
    serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000, socketTimeoutMS: 5000,
    appName: 'code-destiny-cr006-isolated-audit', readPreference: 'primary' };
  const clients = [new MongoClient(target.uri, options), new MongoClient(target.uri, options)];
  try {
    const connections = await Promise.allSettled(clients.map(client => client.connect()));
    check(connections.every(result => result.status === 'fulfilled'), 'AUDIT_CONNECTION_FAILED');
    const databases = clients.map(client => client.db(target.database));
    // Never resume or clean an existing DB. A partially completed experiment is preserved.
    const existing = await databases[0].listCollections({}, { nameOnly: true }).toArray();
    check(existing.length === 0, 'AUDIT_DATABASE_NOT_EMPTY');
    return {
      preparations: databases.map(db => db.collection(COLLECTIONS.preparations)),
      consultations: databases[0].collection(COLLECTIONS.consultations),
      async close() { await Promise.allSettled(clients.map(client => client.close())); },
    };
  } catch (error) { await Promise.allSettled(clients.map(client => client.close())); throw error; }
}

export function boundedStore(backend, cases) {
  const readable = new Set(Object.values(cases.ids));
  const writable = new Set(Object.entries(cases.ids).filter(([key]) => key !== 'missing').map(([, id]) => id));
  const inserted = { preparations: new Set(), consultations: new Set() };
  const count = { reads: 0, insertAttempts: 0, preparationRows: 0, consultationRows: 0 };
  function readBudget() { check(++count.reads <= LIMITS.reads, 'AUDIT_READ_LIMIT'); }
  function insertBudget() { check(++count.insertAttempts <= LIMITS.insertAttempts, 'AUDIT_WRITE_LIMIT'); }
  const models = backend.preparations.map(collection => ({
    findById(id) { return { lean: async () => {
      check(readable.has(id), 'AUDIT_RECORD_OUT_OF_SCOPE'); readBudget();
      return collection.findOne({ _id: id }, { maxTimeMS: 5000 });
    } }; },
    async create(record) {
      check(writable.has(record._id) && record.featureKey === FEATURE && record.authorityVersion === 'legacy', 'AUDIT_RECORD_OUT_OF_SCOPE');
      const key = Object.keys(cases.ids).find(key => cases.ids[key] === record._id), expected = cases.entries[key];
      check(record.userId === expected.userId && record.requestId === expected.requestId && record.inputHash === expected.inputHash, 'AUDIT_RECORD_OUT_OF_SCOPE');
      insertBudget();
      await collection.insertOne(structuredClone(record));
      inserted.preparations.add(record._id); count.preparationRows = inserted.preparations.size;
      check(count.preparationRows <= LIMITS.preparations, 'AUDIT_WRITE_LIMIT');
    },
  }));
  return {
    models, count,
    async saveConsultation(record) {
      check(cases.consultationIds.includes(record._id) && record.userId === cases.owner, 'AUDIT_RECORD_OUT_OF_SCOPE');
      insertBudget(); await backend.consultations.insertOne(structuredClone(record));
      inserted.consultations.add(record._id); count.consultationRows = inserted.consultations.size;
      check(count.consultationRows <= LIMITS.consultations, 'AUDIT_WRITE_LIMIT');
    },
    async readConsultation(id) {
      check(cases.consultationIds.includes(id), 'AUDIT_RECORD_OUT_OF_SCOPE'); readBudget();
      const record = await backend.consultations.findOne({ _id: id }, { maxTimeMS: 5000 });
      if (!record || record.userId !== cases.owner) fail('AUDIT_RECORD_OUT_OF_SCOPE');
      return record;
    },
  };
}

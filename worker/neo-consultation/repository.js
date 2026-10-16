import { mongoose } from '../lib/db.js';
// 별도 상담 주문 문서. 기존 구매 결과·결제 문서를 이관하지 않는다.
const schema = new mongoose.Schema({
  _id: String, userId: { type: String, required: true }, version: Number,
  data: mongoose.Schema.Types.Mixed,
}, { collection: 'neo_email_consultations', versionKey: false, autoIndex: false });
export const NeoEmailConsultation = mongoose.models.NeoEmailConsultation || mongoose.model('NeoEmailConsultation', schema);
const unwrap = result => result && (Object.hasOwn(result, 'value') ? result.value : result);
export function createNeoRepository(db) {
  return {
    async get(id) { return (await db.findOne(NeoEmailConsultation, { _id: id }))?.data || null; },
    async list(userId) {
      return (await db.find(NeoEmailConsultation, userId ? { userId } : {'data.payment.status':{$in:['paid','refunded','cancelled']}}, { limit: 200, sort: { 'data.createdAt': -1 } })).map(row => row.data);
    },
    async insert(row) {
      const result = unwrap(await db.findOneAndUpdate(NeoEmailConsultation, { _id: row.id },
        { $setOnInsert: { _id: row.id, userId: row.userId, version: row.version, data: row } }, { upsert: true, returnDocument: 'after' }));
      if (result?.userId !== row.userId) throw new Error('DUPLICATE_ORDER');
    },
    async compareAndSwap(id, version, next) {
      const result = unwrap(await db.findOneAndUpdate(NeoEmailConsultation, { _id: id, version },
        { $set: { version: next.version, data: next } }, { returnDocument: 'after' }));
      return Boolean(result);
    },
  };
}

import { mongoose } from '../lib/db.js';
import { neoError } from '../../lib/neo-consultation/contract.js';

export const NEO_DAILY_QUESTION_LIMIT = 30;
export const neoKoreanDate = value => new Date(Date.parse(value) + 9 * 3600000).toISOString().slice(0,10);
const schema = new mongoose.Schema({_id:String,used:Number,quotes:[String]}, {collection:'neo_email_capacity',versionKey:false,autoIndex:false});
const Capacity = mongoose.models.NeoEmailCapacity || mongoose.model('NeoEmailCapacity',schema);
const unwrap = result => result && (Object.hasOwn(result,'value') ? result.value : result);

// 결제 준비일(KST)의 수량을 원자적으로 예약한다. 지연 승인 가능성이 남은 자리는 자동 재판매하지 않는다.
export async function reserveNeoCapacity(db, row) {
  const day = row.capacityDay;
  const key = row.quote.id;
  try {
    await db.findOneAndUpdate(Capacity,{_id:day},{$setOnInsert:{_id:day,used:0,quotes:[]}}, {upsert:true,returnDocument:'after'});
  } catch (error) { if (error.code !== 11000) throw error; }
  const existing = await db.findOne(Capacity,{_id:day});
  if (existing?.quotes?.includes(key)) return;
  const reserved = unwrap(await db.findOneAndUpdate(Capacity,{
    _id:day,quotes:{$ne:key},used:{$lte:NEO_DAILY_QUESTION_LIMIT-row.quote.quantity},
  },{$inc:{used:row.quote.quantity},$addToSet:{quotes:key}}, {returnDocument:'after'}));
  if (reserved) return;
  if ((await db.findOne(Capacity,{_id:day}))?.quotes?.includes(key)) return;
  throw neoError('DAILY_CAPACITY_FULL','오늘 접수 가능한 질문 수가 찼습니다. 다음 날 다시 신청해 주세요.',409);
}

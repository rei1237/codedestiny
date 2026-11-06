import { FortuneError } from '../shared/contracts';

export async function sukuyoForReading(env: Record<string, unknown>, moment: {
  year:number; month:number; day:number; hour:number; minute:number; timezoneOffsetHours:number;
  calendarType:'solar'; latitude?:number; longitude?:number;
}, verified: boolean) {
  if (verified && env.SUKUYO_IMD_NEW_ORDERS_V1 === 'true') {
    const { verifiedSukuyoForCivilTime } = await import('../../../lib/sukuyo-verified-provider.js');
    const result = verifiedSukuyoForCivilTime(moment);
    if (!result) throw new FortuneError('PRECISION_UNAVAILABLE',503);
    return result;
  }
  const { calculateSukuyoForMoment } = await import('../../../lib/sukuyo-astronomy.js');
  return calculateSukuyoForMoment(env,moment,{strictSwiss:true});
}

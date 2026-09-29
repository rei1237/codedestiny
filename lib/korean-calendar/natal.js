/** Natal chart contract. Calendar conversion once; term instant and local mean clock are distinct. */
import { ganji } from './ganji.js';
import { lunarToSolar, TABLE_FINGERPRINT } from './core.js';
import { formatPillar } from './labels.js';
export const SAJU_ENGINE_VERSION = 'saju-natal-v2';
export const SAJU_POLICY_VERSION = 'local-mean-minute-shift23-v1';
export const SAJU_DEFAULT_PLACE = Object.freeze({name:'서울 (출생지 미입력 기본값)',longitude:126.978,latitude:37.5665,timezone:'Asia/Seoul'});
function natalParts(timestamp) {
  const d=new Date(timestamp);
  return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),hour:d.getUTCHours(),minute:d.getUTCMinutes()};
}
function natalFail(code) { const e=new Error(code); e.code=code; throw e; }
function natalWall(parts) { return Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute); }
export function resolveNatalInstant(civil,timezone) {
  let formatter;
  try { formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}); }
  catch { natalFail('INVALID_BIRTH_TIMEZONE'); }
  const offsetAt=t=>{
    const p=Object.fromEntries(formatter.formatToParts(t).map(v=>[v.type,v.value]));
    return (Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-t)/60000;
  };
  const wall=natalWall(civil);
  const candidates=[...new Set([-2,-1,0,1,2].map(d=>offsetAt(wall+d*86400000)))];
  const valid=candidates.filter(o=>offsetAt(wall-o*60000)===o);
  if(valid.length!==1)natalFail('AMBIGUOUS_BIRTH_TIME');
  const offsetMinutes=valid[0],timestamp=wall-offsetMinutes*60000;
  // ICU labels distinguish historical summer time. No present-day offset is substituted.
  const names=new Intl.DateTimeFormat('en-US',{timeZone:timezone,timeZoneName:'long'});
  const daylight=t=>/daylight|summer/i.test(names.formatToParts(t).find(p=>p.type==='timeZoneName')?.value||'');
  const dstApplied=daylight(timestamp);
  const standardSamples=Array.from({length:12},(_,i)=>Date.UTC(civil.year,i,15,12)).filter(t=>!daylight(t));
  const standardOffsetMinutes=dstApplied&&standardSamples.length?offsetAt(standardSamples.reduce((a,b)=>Math.abs(a-timestamp)<Math.abs(b-timestamp)?a:b)):offsetMinutes;
  return {timestamp,iso:new Date(timestamp).toISOString(),offsetMinutes,standardOffsetMinutes,dstApplied,dstMinutes:offsetMinutes-standardOffsetMinutes};
}
export function calculateNatalSaju(input={}) {
  const rawDate=String(input.birthDate||'');
  const date=/^(\d{4})-(\d{2})-(\d{2})$/.exec(rawDate);
  if(!date)natalFail('INVALID_BIRTH_DATE');
  let year=+date[1],month=+date[2],day=+date[3];
  const calendarType=String(input.calendarType||'solar');
  if(!['solar','lunar','lunar_leap'].includes(calendarType))natalFail('INVALID_CALENDAR_TYPE');
  const leapMonth=input.isLeapMonth===true||input.leapMonth===true||calendarType==='lunar_leap';
  if(calendarType!=='solar') {
    const solar=lunarToSolar(year,month,day,leapMonth);
    if(!solar)natalFail('INVALID_LUNAR_DATE');
    ({year,month,day}=solar);
  }
  const timeUnknown=input.birthTimeUnknown===true||!input.birthTime;
  const time=/^(\d{2}):(\d{2})$/.exec(timeUnknown?'12:00':String(input.birthTime));
  if(!time||+time[1]>23||+time[2]>59)natalFail('INVALID_BIRTH_TIME');
  const civil={year,month,day,hour:+time[1],minute:+time[2]};
  const check=natalParts(natalWall(civil));
  if(year<1900||year>2100||JSON.stringify(civil)!==JSON.stringify(check))natalFail('INVALID_BIRTH_DATE');
  const rawPlace=input.birthPlace;
  // Legacy adapters serialize missing location as an object of null/empty fields.
  const emptyPlace=rawPlace && typeof rawPlace==='object' && Object.values(rawPlace).every(v=>v===null||v===undefined||v==='');
  const supplied=emptyPlace?undefined:rawPlace;
  const place=supplied?{...supplied}: {...SAJU_DEFAULT_PLACE};
  if(!Number.isFinite(place.longitude)||Math.abs(place.longitude)>180||!place.timezone)natalFail('INVALID_BIRTH_PLACE');
  const instant=resolveNatalInstant(civil,place.timezone);
  // UTC -> local mean solar clock. Algebraically: longitude correction minus DST.
  // Round the total minutes to nearest integer (Math.round), including date rollover.
  const longitudeCorrectionMinutes=(place.longitude-instant.standardOffsetMinutes/4)*4;
  const totalCorrectionMinutes=longitudeCorrectionMinutes-instant.dstMinutes;
  const corrected=natalParts(natalWall(civil)+Math.round(totalCorrectionMinutes)*60000);
  const termClock=natalParts(instant.timestamp+9*3600000);
  const terms=ganji(termClock,{nightZiPolicy:'keep-day'});
  const daily=ganji(timeUnknown?{...civil,hour:12,minute:0}:corrected,{nightZiPolicy:'shift-day'});
  if(!terms||!daily)natalFail('CALENDAR_OUT_OF_RANGE');
  const text=p=>formatPillar(p.stemIndex,p.branchIndex,'hanja');
  const pillars={year:text(terms.year),month:text(terms.month),day:text(daily.day),hour:timeUnknown?null:text(daily.hour)};
  const calculationMeta={
    engineVersion:SAJU_ENGINE_VERSION,policyVersion:SAJU_POLICY_VERSION,tableFingerprint:TABLE_FINGERPRINT,
    original:{birthDate:rawDate,birthTime:timeUnknown?null:String(input.birthTime),calendarType,leapMonth,...(input.originalCalendar?{originalCalendar:input.originalCalendar}:{})},
    location:{...place,assumed:!supplied},civil:{...civil,hour:timeUnknown?null:civil.hour,minute:timeUnknown?null:civil.minute},
    instant:timeUnknown?null:instant,termClock,termTimeAssumed:timeUnknown,
    correction:{method:'LOCAL_MEAN_TIME',standardMeridian:instant.standardOffsetMinutes/4,longitudeCorrectionMinutes,equationOfTimeMinutes:0,dstMinutes:instant.dstMinutes,totalCorrectionMinutes,appliedMinutes:Math.round(totalCorrectionMinutes),rounding:'nearest-minute-Math.round'},
    corrected:timeUnknown?null:corrected,nightZiPolicy:'shift-day',
    dayBoundaryRule:'corrected 23:00-23:59 uses next civil day; 00:00-00:59 uses current civil day; hour stem uses that same day stem',
    timeUnknown,dayPillarCivilDate:daily.meta.dayPillarCivilDate,
  };
  return {pillars,calculationMeta};
}

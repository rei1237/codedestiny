import {buildNakshatraLordReport} from '../../../../worker/lib/nakshatra-lord-report.js';
import {buildNakshatraDashaMap} from '../../../../worker/lib/nakshatra-dasha-map.js';
import {buildNakshatraMuhurta} from '../../../../worker/lib/nakshatra-muhurta.js';
import {buildNakshatraVvipCodex} from '../../../../worker/lib/nakshatra-vvip-codex.js';
import {buildVimshottariDasha,nakshatraInfo} from '../../../../worker/lib/vedic-derived-calculations.js';
import {buildSukuyoFromMoonLongitude} from '../../../../worker/lib/sukuyo-coordinate.js';

// Numeric Swiss inputs are synthetic and never obtained over the network. The
// report engines, their text, and their section schemas come from the website.
export function fixtureMansionReport(kind,body,now){
  const moon=123.4567;
  const nak=nakshatraInfo(moon),sukuyo=buildSukuyoFromMoonLongitude(moon);
  if(kind==='muhurta'){
    const days=Array.from({length:60},(_,i)=>{
      const day=new Date(Date.parse(body.startDate+'T00:00:00Z')+i*86400000);
      const longitude=(moon+i*13)%360;
      return {date:day.toISOString().slice(0,10),weekdayIndex:day.getUTCDay(),sukuyoIndex:buildSukuyoFromMoonLongitude(longitude).index,moonLongitude:longitude};
    });
    return buildNakshatraMuhurta({purposeKey:body.purpose,myMansionIndex:sukuyo.index,myNakIndex:nak.index,days});
  }
  const birthUtc=new Date('1990-01-01T03:00:00Z');
  const input={nakIndex:nak.index,nak,sukuyo,pada:nak.pada,dasha:buildVimshottariDasha(moon,birthUtc,now),birthUtc,now,timeUnknown:true};
  if(kind==='lord-report')return buildNakshatraLordReport(input);
  if(kind==='dasha-map')return buildNakshatraDashaMap(input);
  return buildNakshatraVvipCodex(input);
}
import {assembleNatalCodex,assembleTodayMoon} from '../../../../worker/lib/nakshatra-codex.js';
import {assembleNakshatraCompat} from '../../../../worker/lib/nakshatra-compat.js';
import {japaneseSukuyoFromDate} from '../../../../worker/lib/nakshatra-japanese-calendar.js';

function fixturePerson(p){
  const birthUtc=new Date(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)-p.timezone*3600000);
  const calendarDate=p.timeUnknown?new Date(Date.UTC(p.year,p.month-1,p.day,3)):birthUtc;
  const moonLon=(p.month*19+p.day*7)%360;
  return {birthUtc,moonLon,sukuyo:japaneseSukuyoFromDate(calendarDate),gender:p.gender,
    uncertainty:p.timeUnknown?{possibleNakshatras:['모의 달 구간'],note:'모의 천문 입력 · 출생 시각 미상'}:null};
}
export function fixtureMansionReading(path,body,now){
  if(path==='/nakshatra/compat')return {ok:true,...assembleNakshatraCompat(fixturePerson(body.a),fixturePerson(body.b))};
  const person=fixturePerson(body);
  return {ok:true,...assembleNatalCodex({...person,japaneseSukuyo:person.sukuyo,timeUnknown:body.timeUnknown,now,
    rawChart:{planets:{Moon:person.moonLon},ascendant:0}})};
}

export function fixtureTodayMoon(index){
  return {ok:true,...assembleTodayMoon({moonLon:123.4567,myMansionIndex:index})};
}

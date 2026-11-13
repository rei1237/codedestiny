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
  return buildNakshatraVvipCodex({nak,sukuyo,pada:nak.pada,dasha:buildVimshottariDasha(moon,birthUtc,now),birthUtc,now,timeUnknown:true});
}

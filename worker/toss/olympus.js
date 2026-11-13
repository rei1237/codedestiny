import {getSwissWesternChart} from '../lib/swiss-ephemeris.js';
import {chartInput} from '../yeongnyangi/fortune/shared/time.ts';
import {TossError} from './policy.js';
import {SIGNS} from '../../lib/fortune/olympus-daily.mjs';

// Same tropical longitudes as js/olympus-oracle.js. Keep unrounded sign
// indices to avoid moving a planet into the next sign at a rounding boundary.
export async function olympusPlacements(clock,env,calculate=getSwissWesternChart){
  const {year,month,day,hour,minute,timezone,lat,lon}=clock||{};
  const date=new Date(Date.UTC(year,month-1,day));
  if(![year,month,day,hour,minute].every(Number.isInteger)||year<1900||year>2100||
    date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day||
    hour<0||hour>23||minute<0||minute>59||![timezone,lat,lon].every(Number.isFinite)||
    Math.abs(timezone)>14||Math.abs(lat)>=90||Math.abs(lon)>180)throw new TossError('BIRTH_INVALID',400);
  let offset=timezone;
  if(clock.timeZone){
    const pad=value=>String(value).padStart(2,'0');
    try{offset=chartInput({birthDate:[year,pad(month),pad(day)].join('-'),birthTime:pad(hour)+':'+pad(minute),birthPlace:{timezone:clock.timeZone,latitude:lat,longitude:lon}}).timezone;}
    catch{throw new TossError('BIRTH_INVALID',400);}
  }
  let chart;
  try{chart=await calculate(env,{year,month,day,hour,minute,timezone:offset,lat,lon},{strictSwiss:true,localOnly:true,allowFallback:false});}
  catch{throw new TossError('CHART_UNAVAILABLE',503);}
  if(chart?.engineQuality!=='swiss'||chart.fallbackUsed!==false)throw new TossError('CHART_UNAVAILABLE',503);
  const placements={};
  for(const name of ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Asc']){
    const point=name==='Asc'?chart.ascendant:chart.planets?.[name];
    if(!SIGNS[point?.sign]||!Number.isFinite(point?.degree))throw new TossError('CHART_UNAVAILABLE',503);
    placements[name.toLowerCase()]={key:SIGNS[point.sign].key,deg:Math.round(point.degree*10)/10};
  }
  return {placements};
}

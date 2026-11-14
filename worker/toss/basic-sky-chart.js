import {flowerBirthInput} from './birth-input.js';
import {TossError} from './policy.js';
import {validateInput} from '../yeongnyangi/fortune/shared/input.ts';
import {chartInput} from '../yeongnyangi/fortune/shared/time.ts';
import {getSwissWesternChart,getSwissVedicPlanets} from '../lib/swiss-ephemeris.js';
import {GRAHA_KO,GRAHA_ORDER,signIndex,signKoName,houseFromReference,nakshatraInfo} from '../lib/vedic-derived-calculations.js';
import {getNakshatraAttributes} from '../../constants/nakshatra-attributes.js';

const westernBodies={Sun:'태양',Moon:'달',Mercury:'수성',Venus:'금성',Mars:'화성',Jupiter:'목성',Saturn:'토성',Uranus:'천왕성',Neptune:'해왕성',Pluto:'명왕성'};
const unavailable=()=>new TossError('CHART_UNAVAILABLE',503);
const longitude=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<360;
const house=value=>Number.isInteger(value)&&value>=1&&value<=12;

// Read-only basic chart. The premium readings, transit interpretations, profile and purchase stores are not involved.
export async function basicSkyChart(system,body,env,{engines={astrology:getSwissWesternChart,vedic:getSwissVedicPlanets},requestUrl}={}){
  if(!['astrology','vedic'].includes(system))throw new TossError('NOT_FOUND',404);
  if(body?.birth?.date?.timeUnknown)throw new TossError('BIRTH_TIME_REQUIRED');
  let clock;
  try{
    // Neither chart uses gender. The shared adapter omits the field for OTHER.
    const raw=flowerBirthInput({...body?.birth,gender:'OTHER'});
    const input=validateInput(raw,system);
    clock=chartInput(input.personA);
  }catch{throw new TossError('BIRTH_INVALID');}
  let chart;
  try{chart=await engines[system](env,clock,{strictSwiss:true,allowFallback:false,localOnly:true,requestUrl});}
  catch{throw unavailable();}
  if(chart?.fallbackUsed!==false||chart.engineQuality!=='swiss')throw unavailable();
  if(system==='astrology'){
    if(chart.houseSystem!=='placidus'||!chart.ascendant?.signKo)throw unavailable();
    const positions=Object.entries(westernBodies).map(([key,name])=>{
      const p=chart.planets?.[key];
      if(!p?.signKo||!longitude(p.longitude)||!house(p.house))throw unavailable();
      return {name,sign:p.signKo,house:p.house};
    });
    return {system,ascendant:chart.ascendant.signKo,positions};
  }
  if(!longitude(chart.ascendantSidereal)||!longitude(chart.planets?.Moon))throw unavailable();
  const asc=signIndex(chart.ascendantSidereal),moon=nakshatraInfo(chart.planets.Moon);
  const mansion=getNakshatraAttributes(moon.index);
  if(!mansion)throw unavailable();
  const positions=GRAHA_ORDER.map(key=>{
    const lon=chart.planets[key];
    if(!longitude(lon))throw unavailable();
    return {name:GRAHA_KO[key],sign:signKoName(lon),house:houseFromReference(signIndex(lon),asc)};
  });
  return {system,ascendant:signKoName(chart.ascendantSidereal),positions,mansion:{name:mansion.nameKo,pada:moon.pada}};
}

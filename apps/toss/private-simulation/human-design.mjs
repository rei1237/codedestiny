// Synthetic ephemeris for isolated UI tests; never falls back to a provider.
import {assembleChart} from '../../../lib/human-design/chart.js';
import {DIRECT_PLANETS} from '../../../lib/human-design/planets.js';
export function privateHumanDesign(birth){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birth?.birthDate||'')||!/^\d{2}:\d{2}$/.test(birth?.birthTime||'')||!birth?.timezone)return Response.json({error:'BIRTH_INVALID'},{status:422});
 const longitudes=shift=>Object.fromEntries(DIRECT_PLANETS.map((planet,index)=>[planet,(index*29+shift)%360]));
 return Response.json({stored:false,chart:assembleChart({personalityLongitudes:longitudes(12),designLongitudes:longitudes(284)})});
}

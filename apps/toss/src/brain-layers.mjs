export async function readBrainLayers(request,birth,gender){
 if(!birth||!['male','female'].includes(gender))throw Error('BIRTH_REQUIRED');
 const {birthDate,birthTime,timezone,latitude,longitude}=birth;
 const [hd,vedic]=await Promise.allSettled([
   request('/human-design/chart',{birth:{...birth,calendar:'solar'}}),
   request('/canonical/vedic-ai/basis',{birthDate,birthTime,timezone,gender,calendarType:'solar',birthPlace:{latitude,longitude,timezone},locale:'ko'}),
 ]);
 const hdChart=hd.status==='fulfilled'&&hd.value?.stored===false?hd.value.chart:null;
 const vedicBasis=vedic.status==='fulfilled'&&Array.isArray(vedic.value?.groups)?vedic.value:null;
 return {hdChart,vedicBasis};
}

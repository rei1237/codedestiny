// Private AIT only. Reuse deterministic originals and the existing explicitly
// synthetic astronomy fixtures; never fall back to a remote calculation.
const mansionFixtures=()=>import('../test/offline/mansion-reports.mjs');
const respond=(value,status=200)=>Response.json(value,{status});

export async function privatePublicCalculation(request,url,path,now=()=>new Date()){
 const method=request.method;
 if(path==='/manse/calculate'&&method==='POST'){
  const [{calculateTossManse},{saju}]=await Promise.all([import('../../../worker/toss/manse.js'),import('../../../worker/yeongnyangi/fortune/saju/index.ts')]);
  try{return respond(await calculateTossManse(await request.json(),saju));}catch(error){return respond({error:error.code||'INVALID_BIRTH'},400);}
 }
 if(path==='/pet-saju/catalog'&&method==='GET')return respond((await import('../../../worker/toss/pet-saju.js')).tossPetCatalog());
 if(path==='/pet-saju/blueprint'&&method==='POST'){
  try{return respond((await import('../../../worker/toss/pet-saju.js')).calculateTossPet(await request.json()));}catch(error){return respond({error:error.code||'INVALID_INPUT'},error.status||400);}
 }
 if(path==='/canonical/compass/moon'&&method==='POST')return respond({mansionIdx:3,calculationBasis:'mock',birthTimeKnown:false});
 if(path==='/canonical/compass/calendar'&&method==='POST')return respond({source:'unavailable',solarTerms:[]});
 if(path==='/canonical/compass/narrate'&&method==='POST')return respond({ok:true,pigCommentary:(await request.json()).baseText});
 if(path==='/nakshatra/today'&&method==='GET')return respond((await mansionFixtures()).fixtureTodayMoon(url.searchParams.get('sukuyoIndex')));
 if(path==='/nakshatra/resolve'&&method==='POST')return respond((await mansionFixtures()).fixtureMansionReading(path,await request.json(),now()));
 if(path==='/tarot-library/free'&&method==='POST'){
  const {freeTarotReading}=await import('../../../worker/toss/tarot-library.js'),{flowId,input}=await request.json();
  try{return respond(await freeTarotReading(flowId,input));}catch(error){return respond({error:error.code||'INVALID_INPUT'},error.status||400);}
 }
 if(path==='/charts/vedic'&&method==='POST')return privateChart(request,'vedic');
 return null;
}

function privateChart(request,system){
 return request.json().then(body=>{
  if(body?.birth?.date?.timeUnknown)return respond({error:'BIRTH_TIME_REQUIRED'},400);
  const names=system==='vedic'?['태양','달','화성','수성','목성','금성','토성','라후','케투']:['태양','달','수성','금성','화성','목성','토성','천왕성','해왕성','명왕성'];
  return respond({system,ascendant:'양자리',positions:names.map((name,i)=>({name,sign:'양자리',house:i+1})),...(system==='vedic'?{mansion:{name:'아슈위니',pada:1}}:{})});
 });
}

// Caller must authenticate before entering here. Saved profile data is selected
// only from that account's fixture state, exactly as the offline server does.
export async function privateOwnedCalculation(request,url,path,state,now=()=>new Date()){
 if(request.method!=='POST')return null;
 if(path==='/charts/astrology')return privateChart(request,'astrology');
 if(path==='/nakshatra/compat')return respond((await mansionFixtures()).fixtureMansionReading(path,await request.json(),now()));
 if(['/nakshatra/muhurta','/nakshatra/vvip-codex','/nakshatra/lord-report','/nakshatra/dasha-map'].includes(path)){
  const body=await request.json();
  if(!state.profiles.some(profile=>profile.profileId===body.profileId))return respond({error:'PROFILE_NOT_FOUND'},404);
  return respond({ok:true,report:(await mansionFixtures()).fixtureMansionReport(path.split('/').pop(),body,now())});
 }
 if(path==='/olympus/placements'){
  const {day}=await request.json();if(!Number.isInteger(day))return respond({error:'BIRTH_INVALID'},400);
  const keys=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio'];
  return respond({placements:Object.fromEntries(['sun','moon','asc','mercury','venus','mars','jupiter','saturn'].map((planet,i)=>[planet,{key:keys[(day+i)%8],deg:10+i}]))});
 }
 if(path==='/today-hub'){
  const {profileId,period}=await request.json();
  if(!['today','tomorrow'].includes(period)||typeof profileId!=='string')return respond({error:'INVALID_INPUT'},400);
  if(profileId&&!state.profiles.some(profile=>profile.profileId===profileId))return respond({error:'PROFILE_NOT_FOUND'},404);
  const {hubDay}=await import('../../../lib/fortune/hub-period.mjs');
  const {buildTodayNumberDetail,buildTodayNumberPublic}=await import('../../../worker/lib/today-number-detail.js');
  const target=hubDay(period,now()),number=profileId?buildTodayNumberDetail({month:1,day:1},target):buildTodayNumberPublic(target);
  const demo=(system,label)=>({system,label,anchor:'모의 차트',headline:'테스트용 '+label,body:'비공개 모의 차트 입력 표시 확인',sections:[]});
  return respond({ok:true,date:[target.year,target.month,target.day].map(n=>String(n).padStart(2,'0')).join('-'),personalized:!!profileId,
   systems:{saju:demo('saju','사주 일진'),sukuyo:demo('sukuyo','숙요 27수'),vedic:demo('vedic','베다 판창가'),number}});
 }
 if(path==='/canonical/fpti/deep-report/free'){
  const {profileId,birthInput}=await request.json(),profile=state.profiles.find(row=>row.profileId===profileId);
  if(!profile)return respond({error:'INVALID_PROFILE'},404);
  if(birthInput?.birthDate!==profile.birthDate||birthInput?.calendarType!==profile.calendarType||birthInput?.birthTimeUnknown!==profile.timeUnknown)return respond({error:'PROFILE_INPUT_MISMATCH'},409);
  const {fixtureFptiReport}=await import('../test/offline/fpti-report.mjs');
  return respond({ok:true,data:{source:'public',accessSource:'public',featureKey:'premium-fpti-report',profileId,saved:false,report:await fixtureFptiReport(profile)}});
 }
 return null;
}

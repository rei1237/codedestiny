export type HoraryPromptRequest={question:string;questionSky:{topic:string;relationship:string;situation:string;localTime:unknown;location:Record<string,unknown>}};
// 질문 시각·장소만 정리해 서버 generate 에 싣는다. 차트 계산과 프롬프트 조립은 서버(prepareHoraryPrompt)가 한다.
export async function buildHoraryRequest(draft:Record<string,unknown>):Promise<HoraryPromptRequest>{
 let location;
 if(draft.locationSource==='geolocation'&&draft.locationPlace===draft.questionPlace){
  location={latitude:Number(draft.locationLatitude),longitude:Number(draft.locationLongitude),accuracy:Number(draft.locationAccuracy),source:'geolocation'};
 }else{
  const response=await fetch(`/api/geocode?place=${encodeURIComponent(String(draft.questionPlace||''))}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  const place=await response.json();
  if(!response.ok||place.fallback||!Number.isFinite(place.lat)||!Number.isFinite(place.lng))throw new Error('질문 당시 장소를 찾지 못했어요. 현재 위치를 사용하거나 도시와 국가를 함께 입력해 주세요.');
  location={latitude:place.lat,longitude:place.lng,name:place.name,source:'city-search'};
 }
 return {question:String(draft.horaryQuestion||draft.question||''),questionSky:{topic:'general',relationship:'',situation:String(draft.context||''),localTime:draft.questionDateTime,location}};
}

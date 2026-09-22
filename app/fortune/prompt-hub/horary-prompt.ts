import type {FreeReading} from '@/worker/yeongnyangi/fortune/free/categories';
export async function buildHoraryPrompt(draft:Record<string,unknown>):Promise<string>{
 let location;
 if(draft.locationSource==='geolocation'&&draft.locationPlace===draft.questionPlace){
  location={latitude:Number(draft.locationLatitude),longitude:Number(draft.locationLongitude),accuracy:Number(draft.locationAccuracy),source:'geolocation'};
 }else{
  const response=await fetch(`/api/geocode?place=${encodeURIComponent(String(draft.questionPlace||''))}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  const place=await response.json();
  if(!response.ok||place.fallback||!Number.isFinite(place.lat)||!Number.isFinite(place.lng))throw new Error('질문 당시 장소를 찾지 못했어요. 현재 위치를 사용하거나 도시와 국가를 함께 입력해 주세요.');
  location={latitude:place.lat,longitude:place.lng,name:place.name,source:'city-search'};
 }
 const response=await fetch('/api/yeongnyangi/free/horary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:draft.horaryQuestion||draft.question,questionSky:{topic:'general',relationship:'',situation:String(draft.context||''),localTime:draft.questionDateTime,location}}),signal:AbortSignal.timeout(30000)});
 const data=await response.json();
 if(!response.ok||!data.result?.prompt)throw new Error(data.message||data.error?.message||'호라리 차트를 계산하지 못했어요. 장소와 시각을 확인해 주세요.');
 return (data.result as FreeReading).prompt;
}

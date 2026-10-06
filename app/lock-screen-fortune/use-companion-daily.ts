"use client";
import {useEffect,useState} from 'react';
import {useAiProfileSeed} from '@/app/hooks/useAiProfileSeed';
import {getApiUrl} from '@/app/_lib/api-config';
import {getKstDateKey} from '@/lib/lock-screen-content';

type Card={anchor:string;headline:string;body:string;personalized:boolean;label:string};
type Payload={ok:boolean;date:string;systems:Record<string,Card|null>};
let epoch=0;
const cache=new Map<string,Payload>();
const inFlight=new Map<string,Promise<Payload>>();
// Memory only: personal readings never enter native notification storage or durable public caches.
export function useCompanionDaily(locale:string,dateKey:string,enabled:boolean){
  const {seed,seedVersion}=useAiProfileSeed();
  const [data,setData]=useState<Payload|null>(null);
  const [failed,setFailed]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const params=new URLSearchParams({locale});
  if(seed?.birthDate){params.set('birth',seed.birthDate);if(seed.birthTime&&!seed.birthTimeUnknown)params.set('time',seed.birthTime);params.set('cal',seed.calendarType==='lunar'?'lunar':'solar');params.set('gender',seed.gender==='male'?'male':'female');}
  const query=params.toString();
  const key=JSON.stringify([query,dateKey,Intl.DateTimeFormat().resolvedOptions().timeZone,seedVersion]);
  useEffect(()=>{
    const clear=(event:Event)=>{const source=(event as CustomEvent).detail?.source;if(source==='subscription-sync'||source==='membership-cache')return;epoch++;cache.clear();inFlight.clear();setData(null);setAttempt(n=>n+1);};
    const reconnect=()=>setAttempt(n=>n+1);
    window.addEventListener('cd:auth-changed',clear);window.addEventListener('online',reconnect);
    return()=>{window.removeEventListener('cd:auth-changed',clear);window.removeEventListener('online',reconnect);};
  },[]);
  useEffect(()=>{
    if(!enabled)return;
    const generation=epoch;
    let alive=true;setData(null);setFailed(false);
    const cached=cache.get(key);
    if(cached&&cached.date===getKstDateKey(new Date())){setData(cached);return;}
    let request=inFlight.get(key);
    if(!request){
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
      request=fetch(getApiUrl(`/api/fortune/today-hub?${query}`),{credentials:'omit',headers:{'x-code-destiny-locale':locale},signal:controller.signal}).then(async r=>{
        if(!r.ok)throw new Error('DAILY_UNAVAILABLE');const p=await r.json() as Payload;
        if(generation!==epoch)throw new Error('ACCOUNT_CHANGED');
        if(!p.ok||!p.systems||p.date!==getKstDateKey(new Date()))throw new Error('DAILY_STALE');
        if(cache.size>=8)cache.clear();cache.set(key,p);return p;
      }).finally(()=>{clearTimeout(timer);if(inFlight.get(key)===request)inFlight.delete(key);});
      inFlight.set(key,request);
    }
    request.then(p=>{if(alive)setData(p);}).catch(()=>{if(alive)setFailed(true);});
    return()=>{alive=false;};
  },[key,query,locale,dateKey,attempt,enabled]);
  return {data,failed,profile:seed,retry:()=>setAttempt(n=>n+1)};
}

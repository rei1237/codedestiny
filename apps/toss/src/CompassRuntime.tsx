import {api,canonicalResponse,hasTossSession} from './platform';

export async function compassFetch(path:string,init:RequestInit,timeout?:number){
  const routes:Record<string,string>={'/api/kasi/calendar':'/canonical/compass/calendar','/api/destiny-compass/narrate':'/canonical/compass/narrate'};
  if(!Object.hasOwn(routes,path))throw Error('UNKNOWN_COMPASS_ROUTE');
  const request=new Request(new URL(path,location.origin),{...init,signal:init.signal||(timeout?AbortSignal.timeout(timeout):undefined),credentials:'omit'});
  return canonicalResponse(routes[path],request);
}
export async function calculateSukuyoForMoment(_env:unknown,moment:unknown){return api('/canonical/compass/moon',moment);}
export async function hasFreeReadingSession(){
  if(!hasTossSession())return false;
  const data=await api<{authenticated:boolean;user?:{id:string}}>('/canonical/auth/me');
  return data.authenticated===true&&Boolean(data.user?.id);
}
export function useAiProfileSeed(){return {seed:null};}
// The original web RPG ledger and historical prepaid archives belong to web accounts.
export function readRpgSnapshot(){return null;}
export async function readCollectibles(){return [];}
export function checkInToday(){}
export function collectItem(){}
export function awardRpg(){}
export function saveCompassArchive(){}

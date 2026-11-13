import {api,hasTossSession} from './platform';
export type TravelHistory={key?:string;recent:string[];winners:string[]};
function ids(value:unknown,max:number){
 return Array.isArray(value)?value.filter((id):id is string=>typeof id==='string'&&id.length<120).slice(0,max):[];
}
export async function loadTravelHistory(birthKey:string):Promise<TravelHistory>{
 const blank={recent:[],winners:[]};
 try{
   const scope=hasTossSession()?(await api<{storageScope:string}>('/session')).storageScope:'guest';
   if(!scope)return blank;
   const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope+'|'+birthKey));
   const key='cd:toss:energy:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
   const data=JSON.parse(localStorage.getItem(key)||'null');
   return {key,recent:ids(data?.recent,60),winners:ids(data?.winners,7)};
 }catch{return blank;}
}
export function saveTravelHistory(travel:TravelHistory){
 if(!travel.key)return;
 try{localStorage.setItem(travel.key,JSON.stringify({recent:travel.recent.slice(0,60),winners:travel.winners.slice(0,7)}));}catch{/* Storage is optional for public calculations. */}
}

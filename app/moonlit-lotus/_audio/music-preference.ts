// 참배 흐름 음악 선호. f91990b19 의 cd:moonlit-music:v1(auto·muted·volume)에 trackId·sfx 를 더한다.
// 저장소는 없을 수도, 던질 수도, 망가진 값을 줄 수도 있다. 어떤 경우에도 기본값으로 돌아간다.
export const MUSIC_PREFERENCE_KEY='cd:moonlit-music:v1';
export const DEFAULT_VOLUME=.3;
export type MusicPreference={auto:boolean;muted:boolean;volume:number;trackId:string;sfx:boolean};
type Reader=Pick<Storage,'getItem'>|null|undefined;
type Writer=Pick<Storage,'setItem'>|null|undefined;
export function defaultPreference(trackId:string):MusicPreference{
 return {auto:true,muted:false,volume:DEFAULT_VOLUME,trackId,sfx:true};
}
export function parsePreference(raw:string|null|undefined,trackIds:readonly string[],fallbackTrack:string):MusicPreference{
 const base=defaultPreference(fallbackTrack);
 let saved:unknown;
 try{saved=JSON.parse(raw||'{}');}catch{return base;}
 if(!saved||typeof saved!=='object'||Array.isArray(saved))return base;
 const value=saved as Record<string,unknown>;
 const volume=typeof value.volume==='number'&&Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):base.volume;
 const trackId=typeof value.trackId==='string'&&trackIds.includes(value.trackId)?value.trackId:fallbackTrack;
 return {auto:value.auto!==false,muted:value.muted===true,volume,trackId,sfx:value.sfx!==false};
}
export function readPreference(storage:Reader,trackIds:readonly string[],fallbackTrack:string):MusicPreference{
 try{return parsePreference(storage?.getItem(MUSIC_PREFERENCE_KEY),trackIds,fallbackTrack);}
 catch{return defaultPreference(fallbackTrack);}
}
export function writePreference(storage:Writer,preference:MusicPreference):boolean{
 try{if(!storage)return false;storage.setItem(MUSIC_PREFERENCE_KEY,JSON.stringify(preference));return true;}
 catch{return false;}
}
/** 사생활 보호 창·차단된 사이트 데이터에서는 localStorage 접근 자체가 던진다. */
export function browserStorage():Storage|null{
 try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}
}

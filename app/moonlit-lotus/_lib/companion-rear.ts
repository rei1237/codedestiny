import {BOW_CLIP} from '../model-review/sprite-clips';
import {isZodiac,speciesOf,companionName,type RoomLook,type ZodiacSpecies} from './companions';
import {REAR_BASE,rearPoseAt} from './yeoni-rear';
import timelines from './companion-rear-timelines.json';
export type RearCharacterId='yeoni'|'cat'|'hanbi'|ZodiacSpecies;
export function rearCharacterId(kind:string,look:RoomLook,image:string):RearCharacterId {
 const species=speciesOf(look,image);
 if(kind==='cat'||kind==='custom'&&species==='yeongnyangi')return 'cat';
 if(kind==='custom'&&(species==='hanbi'||isZodiac(species)))return species;
 return 'yeoni';
}
export const rearBase=(id:RearCharacterId)=>id==='yeoni'?REAR_BASE:`/assets/moonlit-lotus/companions-rear-v1/${id}`;
export const rearLabel=(id:RearCharacterId)=>id==='yeoni'?'연이':id==='cat'?'영냥이':id==='hanbi'?'서한비':companionName(id);
const downMs=BOW_CLIP.filter(p=>p.sheet==='bow-down').slice(0,-1).reduce((s,p)=>s+p.ms,0)+BOW_CLIP.filter(p=>p.sheet==='bow-lower').reduce((s,p)=>s+p.ms,0);
const upMs=BOW_CLIP.filter(p=>p.sheet==='bow-up').reduce((s,p)=>s+p.ms,0);
/** Presentation only: the existing session owns time, pause and completion. */
export function companionRearPoseAt(id:RearCharacterId,elapsed:number){
 if(id==='yeoni')return rearPoseAt(elapsed);
 const t=Number.isFinite(elapsed)?Math.max(0,elapsed):0,sequence=timelines[id];
 if(t>=downMs+upMs)return {sheet:'down',frame:0};
 // A quiet hold at the lowest pose uses existing cycle time, not an extra timer.
 const frames=t<downMs?sequence.down:sequence.up,progress=t<downMs?Math.min(1,t/(downMs-650)):(t-downMs)/upMs;
 return frames[Math.min(frames.length-1,Math.floor(progress*frames.length))];
}

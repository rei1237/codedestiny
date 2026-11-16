import {bowDrawingAt} from './bow-drawing';
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
/** Presentation only: the existing session owns time, pause and completion. */
export function companionRearPoseAt(id:RearCharacterId,elapsed:number){
 if(id==='yeoni')return rearPoseAt(elapsed);
 return bowDrawingAt(timelines[id].down,elapsed);
}

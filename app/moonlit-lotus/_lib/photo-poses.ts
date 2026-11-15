import {ASSET_BASE} from '../model-review/sprite-clips';
import {COMPANION_ART,HANBI_ART,isZodiac,speciesOf,zodiacSheet,type RoomLook} from './companions';

export const PHOTO_POSES=[['smile','다정한 미소'],['greeting','반가운 인사'],['meditation','고요한 명상'],['prayer','두 손 모아'],['cheer','작은 응원'],['rest','포근한 쉼']] as const;
export const PHOTO_ART_POSES=[['cheek','볼하트'],['cuddle','꼬옥 안아줘'],['tea','차 한 잔, 윙크'],['hooray','오늘도 해냈어']] as const;
export type PhotoPose=typeof PHOTO_POSES[number][0]|typeof PHOTO_ART_POSES[number][0];
/** Photo frames are presentation only; never call the bow session controller. */
export function photoDrawing(kind:string,look:RoomLook,image:string,pose:PhotoPose){
 const species=speciesOf(look,image);
 if(PHOTO_ART_POSES.some(([id])=>id===pose)){
  const id=kind==='cat'?'cat':kind==='custom'?(species==='yeongnyangi'?'cat':species||'yeoni'):'yeoni';
  return {url:`/assets/moonlit-lotus/photo-v1/${id}/${pose}.webp`,frame:0,standalone:true};
 }
 const legacy=pose as typeof PHOTO_POSES[number][0];
 if(kind==='custom'&&isZodiac(species))return {url:zodiacSheet(species),frame:{smile:0,greeting:2,meditation:3,prayer:4,cheer:2,rest:6}[legacy]};
 if(kind==='cat'||kind==='custom'&&(species==='hanbi'||species==='yeongnyangi'))return {url:(kind==='custom'&&species==='hanbi'?HANBI_ART:COMPANION_ART+'/cat')+'-motion.webp',frame:{smile:0,greeting:6,meditation:9,prayer:12,cheer:14,rest:11}[legacy]};
 const [sheet,frame]=({smile:['expressions',0],greeting:['expressions',6],meditation:['rest',3],prayer:['bow-down',2],cheer:['expressions',14],rest:['rest',11]} as const)[legacy];
 return {url:ASSET_BASE+'/'+sheet+'.webp',frame};
}

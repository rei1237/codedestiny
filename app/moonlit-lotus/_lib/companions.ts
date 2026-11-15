import {petSpriteMarkup} from '@/js/core/profile-pet-card.mjs';
export const COMPANIONS=[['mouse','쥐'],['ox','소'],['tiger','호랑이'],['rabbit','토끼'],['dragon','용'],['snake','뱀'],['horse','말'],['sheep','양'],['monkey','원숭이'],['rooster','닭'],['dog','강아지'],['pig','돼지'],['lion','사자'],['giraffe','기린'],['rhino','코뿔소']] as const;
export const COMPANION_ART='/assets/moonlit-lotus/companions-v2';
export type RoomLook={species?:string;headwear?:number;trim?:number};
export function speciesOf(look:RoomLook,image:string){const species=look.species&&look.species!=='profile'?look.species:image.match(/\/([a-z]+)-body\.webp$/)?.[1];return species==='yeongnyangi'?'yeongnyangi':COMPANIONS.some(([id])=>id===species)?species!:'rabbit';}
export function roomMarkup(look:RoomLook,portrait:string){
 if((!look.species||look.species==='profile')&&portrait)return portrait;
 const species=speciesOf(look,'');
 return petSpriteMarkup({speciesId:species,name:COMPANIONS.find(([id])=>id===species)?.[1]||'친구',coat:'natural',eggType:'flower',traits:{expression:0,pattern:0,accessory:0},appearance:{version:2,headwear:look.headwear||0,neckwear:0,prop:0,trim:look.trim||0,charm:2,pattern:0}});
}
export function walkDrawing(kind:string,look:RoomLook,image:string){const species=speciesOf(look,image);return kind==='yeoni'?{url:'/assets/moonlit-lotus/yeoni/2d-v2/walk.webp',rows:4,frames:16}:kind==='cat'||species==='yeongnyangi'?{url:COMPANION_ART+'/cat-walk.webp',rows:4,frames:16}:{url:COMPANION_ART+'/'+species+'-walk.webp',rows:1,frames:4};}

/** Temple-only artwork. Never changes the profile pet's ownership or growth. */
export const COMPANIONS = [
  ['mouse','쥐'], ['ox','소'], ['tiger','호랑이'], ['rabbit','토끼'],
  ['dragon','용'], ['snake','뱀'], ['horse','말'], ['sheep','양'],
  ['monkey','원숭이'], ['rooster','닭'], ['dog','강아지'], ['pig','돼지'],
] as const;
export type ZodiacSpecies = typeof COMPANIONS[number][0];
export const COMPANION_ART = '/assets/moonlit-lotus/companions-v2';
export const HANBI_ART = '/assets/moonlit-lotus/unique-v1/hanbi';
export const ZODIAC_ART = '/assets/moonlit-lotus/zodiac-v1';
export type RoomLook = {species?:string;headwear?:number;trim?:number};
export function isZodiac(value:unknown):value is ZodiacSpecies {
  return COMPANIONS.some(([id])=>id===value);
}
export function speciesOf(look:RoomLook,image:string):ZodiacSpecies|'yeongnyangi'|'hanbi'|null {
  const species=look.species&&look.species!=='profile'?look.species:image.match(/\/([a-z]+)-body\.webp$/)?.[1];
  return species==='hanbi'?'hanbi':species==='yeongnyangi'?'yeongnyangi':isZodiac(species)?species:null;
}
export function companionName(species:ZodiacSpecies) {
  return COMPANIONS.find(([id])=>id===species)![1];
}
export const zodiacSheet=(species:ZodiacSpecies)=>`${ZODIAC_ART}/${species}.webp`;
export const zodiacBow=(species:ZodiacSpecies)=>`${ZODIAC_ART}/${species}-bow.webp`;
export const zodiacStill=(species:ZodiacSpecies)=>`${ZODIAC_ART}/${species}-still.webp`;
/** Normalized session time, never an independent counter or completion event. */
export const ZODIAC_BOW = [
  [0,0], [.06,1], [.12,2], [.18,3], [.24,4], [.30,5], [.36,6], [.42,7], [.48,8], [.60,9], [.66,10], [.72,11], [.78,12], [.84,13], [.90,14], [.96,15],
] as const;
export function zodiacFrame(activity:string,progress:number,step:number) {
  if(activity==='bow') {
    const t=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
    return [...ZODIAC_BOW].reverse().find(([time])=>t>=time)![1];
  }
  if(activity==='meditation')return 3;
  if(activity==='prayer')return 4;
  if(activity==='greeting'||activity==='affirmation')return [0,2,2,0][step%4];
  return [0,0,0,0,0,1,1,0][step%8];
}
export function walkDrawing(kind:string,look:RoomLook,image:string) {
  const species=speciesOf(look,image);
  if(kind==='custom'&&species==='hanbi')return {url:HANBI_ART+'-walk.webp',rows:4,frames:16,offset:0};
  if(kind==='cat'||kind==='custom'&&species==='yeongnyangi')return {url:COMPANION_ART+'/cat-walk.webp',rows:4,frames:16,offset:0};
  if(kind==='custom'&&isZodiac(species))return {url:zodiacSheet(species),rows:4,frames:4,offset:12};
  return {url:'/assets/moonlit-lotus/yeoni/2d-v2/walk.webp',rows:4,frames:16,offset:0};
}

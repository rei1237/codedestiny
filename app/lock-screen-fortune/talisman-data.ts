import { approvedAssets, categories, scenes } from "../app/talismans/catalog";
import { lookName } from "../app/home-widget/looks";

// Official names and portraits follow app/world/world-data.js.
export const TALISMAN_CATEGORIES = [
 {id:'peace',label:'마음의 평온',en:'Peace of mind',line:'잠시 숨을 고르고, 나의 속도를 되찾아요.',english:'Pause, breathe, and return to your own pace.',color:'#d8c8ed'},
 {id:'love',label:'사랑과 관계',en:'Love & relationships',line:'다정함 속에서도 나의 마음을 존중해요.',english:'Make room for kindness and your own feelings.',color:'#f2c9d2'},
 {id:'work',label:'재물과 일',en:'Money & work',line:'오늘 할 수 있는 작은 일부터 차근차근 쌓아요.',english:'Build steadily, one small task at a time.',color:'#e8d39b'},
 {id:'study',label:'학업과 도전',en:'Learning & courage',line:'완벽한 시작보다 꾸준한 한 걸음을 선택해요.',english:'Choose a steady step over a perfect start.',color:'#bcdedb'},
 {id:'begin',label:'새로운 시작',en:'New beginnings',line:'익숙하지 않은 길에서도 나의 가능성을 살펴요.',english:'Leave room for possibility on an unfamiliar path.',color:'#cbd8b3'},
] as const;
export const TALISMAN_GROUPS = [{id:'yeoni',label:'꽃돼지 연이',en:'Flower pig Yeoni'},{id:'cat',label:'영냥이',en:'Yeongnyangi'},{id:'world',label:'세계관 캐릭터',en:'Story characters'}] as const;
export const TALISMAN_CHARACTERS = [
 {id:'yeongnyangi',group:'cat',name:'영냥이',en:'Yeongnyangi',image:'/assets/yeongnyangi/original/hero-480.webp',alt:'남색 모자를 쓴 흰 고양이 영냥이'},
 {id:'cat-quote',group:'cat',name:'영냥이 · 생각하는 시간',en:'Yeongnyangi · Reflection',image:'/assets/yeongnyangi/companion/quote.webp',alt:'생각하는 영냥이'},
 {id:'cat-daily',group:'cat',name:'영냥이 · 오늘의 동행',en:'Yeongnyangi · Daily companion',image:'/assets/yeongnyangi/companion/daily.webp',alt:'오늘의 운세와 함께하는 영냥이'},
 {id:'yeoni',group:'yeoni',name:'꽃돼지 연이',en:'Flower pig Yeoni',image:'/assets/yeongnyangi/companion/yeoni.webp',alt:'꽃 장식을 한 꽃돼지 연이'},
 {id:'pig1',group:'yeoni',name:'연이 · 방긋',en:'Yeoni · Grin',image:'/images/fortune-tea-house/flower-pig-single-a.webp',alt:'방긋 웃는 꽃돼지 연이'},
 {id:'pig2',group:'yeoni',name:'연이 · 생글',en:'Yeoni · Smile',image:'/images/fortune-tea-house/flower-pig-single-b.webp',alt:'생글 웃는 꽃돼지 연이'},
 {id:'moka',group:'world',name:'모카',en:'Moka',image:'/images/novel/world/moka.webp',alt:'헤드폰을 쓴 수달 요리사 모카'},
 {id:'yun',group:'world',name:'윤달',en:'Yundal',image:'/images/novel/world/yun.webp',alt:'넉살 좋게 웃는 점술가 윤달'},
 {id:'luna',group:'world',name:'루나 언니',en:'Luna',image:'/images/novel/world/luna.webp',alt:'분홍 앞치마를 한 루나'},
 {id:'rab',group:'world',name:'청토끼',en:'Blue Rabbit',image:'/images/novel/world/rab.webp',alt:'청토끼 금융의 주인 파란 토끼'},
 {id:'crow',group:'world',name:'까마귀',en:'Crow',image:'/images/novel/world/crow.webp',alt:'후드를 쓴 까마귀 재판관'},
 {id:'universe',group:'world',name:'우주',en:'Universe',image:'/images/novel/world/universe.webp',alt:'헤드셋을 쓴 상담원 우주'},
] as const;
export const DEFAULT_TALISMAN_ID = 'peace:yeongnyangi';
export const LOCK_ARTWORK = approvedAssets().filter(asset => asset.category !== "daily");
export function artworkName(asset: (typeof LOCK_ARTWORK)[number], locale: string) {
 const title = lookName(asset.id, locale);
 if (title !== asset.id) return title;
 const scene = scenes.find(scene => scene.id === asset.scene);
 const category = categories.find(category => category.id === asset.category);
 return locale === "ko" ? [scene?.ko, category?.ko].filter(Boolean).join(" · ") : asset.id;
}
export function resolveTalisman(id: unknown) {
 const art = typeof id === "string" && id.startsWith("art:") ? LOCK_ARTWORK.find(asset => "art:" + asset.id === id) : undefined;
 if (art) {
  const companion = TALISMAN_CHARACTERS.find(c => c.id === (art.scene === "yeongnyangi" ? "yeongnyangi" : "yeoni"))!;
  const categoryId = art.category === "wealth" || art.category === "career" ? "work" : art.category === "study" ? "study" : "love";
  const category = TALISMAN_CATEGORIES.find(c => c.id === categoryId)!;
  const image = "/assets/talismans/widget/" + art.id.replace("-yeongnyangi-v2", "") + ".webp";
  return {id: "art:" + art.id, category, character: {...companion, image, alt: artworkName(art,"ko"), en: artworkName(art,"en")}};
 }
 const [categoryId,characterId,extra] = typeof id === 'string' ? id.split(':') : [];
 const category=TALISMAN_CATEGORIES.find(c=>c.id===categoryId);
 const character=TALISMAN_CHARACTERS.find(c=>c.id===characterId);
 if(!category || !character || extra!==undefined) return {id:DEFAULT_TALISMAN_ID,category:TALISMAN_CATEGORIES[0],character:TALISMAN_CHARACTERS[0]};
 return {id:category.id+':'+character.id,category,character};
}
export function migrateTalisman(id: unknown, legacyPose: unknown) {
 if(id!==undefined) return resolveTalisman(id).id;
 return resolveTalisman('peace:'+(typeof legacyPose==='string'?legacyPose:'yeongnyangi')).id;
}
export function talismanCopy(locale:string) {
 return locale==='ko'?{title:'오늘의 부적',change:'부적 변경하기',category:'마음을 담을 주제',character:'함께할 캐릭터',preview:'미리보기',apply:'적용하기',cancel:'취소',close:'닫기',saved:'부적을 변경했어요.',note:'오늘의 마음을 다잡는 작은 상징이에요.'}
 :{title:'Your daily talisman',change:'Change talisman',category:'Choose a theme',character:'Choose a companion',preview:'Preview',apply:'Apply',cancel:'Cancel',close:'Close',saved:'Talisman updated.',note:'A small reminder of your intentions for today.'};
}
